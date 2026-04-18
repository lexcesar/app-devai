import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import type { Request } from 'express';
import { DEV_USER_ID_HEADER, type Profile } from '@obrafacil/shared';
import { DatabaseService } from '../../database/database.service';

// Express lowercases header names; compare against the lowercase form.
const BYPASS_HEADER_LC = DEV_USER_ID_HEADER.toLowerCase();

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { profile: Profile }>();

    if (process.env.DISABLE_CLERK_AUTH === 'true') {
      request.profile = await this.resolveBypassProfile(request);
      return true;
    }

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
    return true;
  }

  private async resolveBypassProfile(request: Request): Promise<Profile> {
    const headerClerkId = this.readBypassHeader(request);

    if (headerClerkId) {
      const profile = await this.findProfileByClerkId(headerClerkId);
      if (!profile) {
        // Do not echo the caller-supplied clerk_id in the response body to
        // avoid boolean enumeration of valid identifiers.
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

  // JIT provisioning covers Clerk users who log in before the Clerk webhook
  // creates their profile row. ON CONFLICT makes this idempotent with the
  // webhook's upsert (see webhooks.controller.ts). Default role is 'client';
  // professionals/stores must be promoted out-of-band.
  private async resolveOrProvisionProfile(
    clerkUserId: string,
    tokenPayload: Record<string, unknown>,
  ): Promise<Profile> {
    const existing = await this.findProfileByClerkId(clerkUserId);
    if (existing) return existing;

    const fullName = this.extractName(tokenPayload);
    const { rows } = await this.db.query<Profile>(
      `INSERT INTO profiles (clerk_id, full_name, role)
       VALUES ($1, $2, 'client')
       ON CONFLICT (clerk_id) DO UPDATE SET updated_at = now()
       RETURNING *`,
      [clerkUserId, fullName],
    );
    if (!rows.length) {
      throw new UnauthorizedException('Falha ao provisionar perfil');
    }
    return rows[0];
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
