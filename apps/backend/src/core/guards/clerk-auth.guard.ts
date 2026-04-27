import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken, createClerkClient } from '@clerk/backend';
import type { Request } from 'express';
import {
  ACTING_AS_HEADER,
  DEV_USER_ID_HEADER,
  type AccountContext,
  type Profile,
  type UserRole,
} from '@obrafacil/shared';
import { DatabaseService } from '../../database/database.service';

// Express lowercases header names; compare against the lowercase form.
const BYPASS_HEADER_LC = DEV_USER_ID_HEADER.toLowerCase();
const ACTING_AS_HEADER_LC = ACTING_AS_HEADER.toLowerCase();

const VALID_ROLES: UserRole[] = ['client', 'professional', 'store'];

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { profile: Profile; account: AccountContext }>();

    if (process.env.DISABLE_CLERK_AUTH === 'true') {
      request.profile = await this.resolveBypassProfile(request);
    } else {
      const authHeader = request.headers['authorization'];
      if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Token de autenticação ausente');
      }

      const token = authHeader.slice(7);

      let clerkUserId: string;
      let tokenPayload: Record<string, unknown>;
      try {
        const payload = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY!,
        });
        clerkUserId = payload.sub;
        tokenPayload = payload as unknown as Record<string, unknown>;
      } catch {
        throw new UnauthorizedException('Token inválido ou expirado');
      }

      request.profile = await this.resolveOrProvisionProfile(
        clerkUserId,
        tokenPayload,
      );
    }

    // Resolve account context (roles + actingAs)
    request.account = await this.resolveAccountContext(request);
    return true;
  }

  // ── Account context ────────────────────────────────────────────────────────

  private async resolveAccountContext(
    request: Request & { profile: Profile },
  ): Promise<AccountContext> {
    const profile = request.profile;
    const roles = await this.getActiveRoles(profile.id);

    // Fallback: if account_roles table doesn't exist yet (migration pending),
    // default to the legacy profile.role.
    const effectiveRoles = roles.length > 0 ? roles : [profile.role];

    const requestedRole = this.readActingAsHeader(request);
    let actingAs: UserRole;

    if (requestedRole && effectiveRoles.includes(requestedRole)) {
      actingAs = requestedRole;
    } else {
      // Default: primary role (or first active role).
      // If the requested role is not active (e.g. stale cookie), fall back
      // silently rather than throwing 403 — the cookie will be corrected
      // by the client on the next role switch.
      actingAs = profile.role;
    }

    return { profile, roles: effectiveRoles, actingAs };
  }

  private async getActiveRoles(profileId: string): Promise<UserRole[]> {
    try {
      const { rows } = await this.db.query<{ role: UserRole }>(
        `SELECT role FROM account_roles WHERE profile_id = $1 AND is_active = true`,
        [profileId],
      );
      return rows.map((r) => r.role);
    } catch {
      // Table may not exist in older envs — degrade gracefully
      return [];
    }
  }

  private readActingAsHeader(request: Request): UserRole | null {
    const raw = request.headers[ACTING_AS_HEADER_LC];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim().toLowerCase() as UserRole;
    return VALID_ROLES.includes(trimmed) ? trimmed : null;
  }

  // ── Existing helpers (unchanged) ──────────────────────────────────────────

  private async resolveBypassProfile(request: Request): Promise<Profile> {
    const headerClerkId = this.readBypassHeader(request);

    if (headerClerkId) {
      const profile = await this.findProfileByClerkId(headerClerkId);
      if (!profile) {
        throw new UnauthorizedException('Não autorizado');
      }
      return profile;
    }

    const { rows } = await this.db.query<Profile>(
      "SELECT * FROM profiles WHERE role = 'client' ORDER BY id ASC LIMIT 1",
    );
    if (!rows.length) {
      throw new UnauthorizedException(
        'Bypass profile não encontrado — seed do banco está vazio?',
      );
    }
    return rows[0];
  }

  private readBypassHeader(request: Request): string | null {
    const raw = request.headers[BYPASS_HEADER_LC];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private async findProfileByClerkId(clerkId: string): Promise<Profile | null> {
    const { rows } = await this.db.query<Profile>(
      'SELECT * FROM profiles WHERE clerk_id = $1',
      [clerkId],
    );
    return rows.length ? rows[0] : null;
  }

  private async resolveOrProvisionProfile(
    clerkUserId: string,
    tokenPayload: Record<string, unknown>,
  ): Promise<Profile> {
    let fullName = this.extractName(tokenPayload);
    let avatarUrl: string | null = null;

    // JWT standard claims do not include name/avatar by default.
    // Fall back to the Clerk Users API to get the real user data.
    if (fullName === 'Usuário') {
      try {
        const clerk = createClerkClient({
          secretKey: process.env.CLERK_SECRET_KEY!,
        });
        const user = await clerk.users.getUser(clerkUserId);
        const parts = [user.firstName, user.lastName].filter(
          (p): p is string => typeof p === 'string' && p.trim().length > 0,
        );
        if (parts.length) fullName = parts.join(' ');
        avatarUrl = user.imageUrl ?? null;
      } catch {
        // Non-fatal: keep fallback name, profile will be corrected on next login
      }
    }

    const { rows } = await this.db.query<Profile>(
      `INSERT INTO profiles (clerk_id, full_name, avatar_url, role)
       VALUES ($1, $2, $3, 'client')
       ON CONFLICT (clerk_id) DO UPDATE SET
         full_name = CASE
           WHEN profiles.full_name = 'Usuário' OR profiles.full_name = ''
             THEN EXCLUDED.full_name
           ELSE profiles.full_name
         END,
         avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
         updated_at = now()
       RETURNING *`,
      [clerkUserId, fullName, avatarUrl],
    );
    if (!rows.length) {
      throw new UnauthorizedException('Falha ao provisionar perfil');
    }
    const profile = rows[0];

    // Guarantee the 'client' role exists in account_roles for every user.
    // Without this, users who only have 'professional' in account_roles lose
    // access to the client role switch because getActiveRoles() returns a
    // non-empty array and the fallback to profile.role no longer fires.
    await this.db.query(
      `INSERT INTO account_roles (profile_id, role, is_active, is_primary)
       VALUES ($1, 'client', true, true)
       ON CONFLICT (profile_id, role) DO NOTHING`,
      [profile.id],
    );

    return profile;
  }

  private extractName(tokenPayload: Record<string, unknown>): string {
    const name = tokenPayload['name'];
    if (typeof name === 'string' && name.trim()) return name.trim();
    const first = tokenPayload['first_name'];
    const last = tokenPayload['last_name'];
    const parts = [first, last].filter(
      (p): p is string => typeof p === 'string' && p.trim().length > 0,
    );
    return parts.length ? parts.join(' ') : 'Usuário';
  }
}
