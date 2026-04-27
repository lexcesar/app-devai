import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { DatabaseService } from '../../database/database.service';
import { DEV_USER_ID_HEADER, type Profile } from '@obrafacil/shared';

jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
}));

import { verifyToken } from '@clerk/backend';

type Rows<T> = { rows: T[] };

const BYPASS_HEADER_LC = DEV_USER_ID_HEADER.toLowerCase();

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    clerk_id: 'demo_client_001',
    full_name: 'Carlos Alberto',
    avatar_url: null,
    phone: null,
    role: 'client',
    created_at: '2026-04-18T00:00:00Z',
    updated_at: '2026-04-18T00:00:00Z',
    ...overrides,
  } as Profile;
}

function makeContext(headers: Record<string, unknown> = {}): {
  ctx: ExecutionContext;
  request: { headers: Record<string, unknown>; profile?: Profile };
} {
  const request: { headers: Record<string, unknown>; profile?: Profile } = {
    headers,
  };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

describe('ClerkAuthGuard', () => {
  let db: { query: jest.Mock };
  let guard: ClerkAuthGuard;
  const envKeys = ['DISABLE_CLERK_AUTH', 'CLERK_SECRET_KEY'] as const;
  const originalValues: Record<string, string | undefined> = {};

  beforeAll(() => {
    for (const k of envKeys) originalValues[k] = process.env[k];
  });

  beforeEach(() => {
    db = { query: jest.fn() };
    guard = new ClerkAuthGuard(db as unknown as DatabaseService);
    (verifyToken as jest.Mock).mockReset();
  });

  afterEach(() => {
    for (const k of envKeys) {
      if (originalValues[k] === undefined) delete process.env[k];
      else process.env[k] = originalValues[k];
    }
  });

  describe('bypass mode', () => {
    beforeEach(() => {
      process.env.DISABLE_CLERK_AUTH = 'true';
    });

    it('returns first client profile (ORDER BY) when no header present', async () => {
      const profile = makeProfile();
      db.query.mockResolvedValueOnce({ rows: [profile] } as Rows<Profile>);

      const { ctx, request } = makeContext({});
      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE role = 'client'"),
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY id ASC'),
      );
      expect(request.profile).toEqual(profile);
    });

    it('uses X-Dev-User-Id header when present', async () => {
      const profile = makeProfile({
        id: '00000000-0000-0000-0000-000000000011',
        clerk_id: 'demo_client_002',
        full_name: 'Joana Mendes',
      });
      db.query.mockResolvedValueOnce({ rows: [profile] } as Rows<Profile>);

      const { ctx, request } = makeContext({
        [BYPASS_HEADER_LC]: 'demo_client_002',
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM profiles WHERE clerk_id = $1',
        ['demo_client_002'],
      );
      expect(request.profile).toEqual(profile);
    });

    it('handles array-valued header by using first element', async () => {
      const profile = makeProfile({
        clerk_id: 'demo_client_002',
      });
      db.query.mockResolvedValueOnce({ rows: [profile] } as Rows<Profile>);

      const { ctx } = makeContext({
        [BYPASS_HEADER_LC]: ['demo_client_002'],
      });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT * FROM profiles WHERE clerk_id = $1',
        ['demo_client_002'],
      );
    });

    it('falls back to ORDER BY when header is empty or whitespace', async () => {
      db.query.mockResolvedValueOnce({
        rows: [makeProfile()],
      } as Rows<Profile>);

      const { ctx } = makeContext({ [BYPASS_HEADER_LC]: '   ' });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE role = 'client'"),
      );
    });

    it('throws 401 when header points to unknown clerk_id', async () => {
      db.query.mockResolvedValueOnce({ rows: [] } as Rows<Profile>);

      const { ctx } = makeContext({ [BYPASS_HEADER_LC]: 'ghost_user' });
      await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('does not leak the supplied clerk_id in the 401 error message', async () => {
      db.query.mockResolvedValueOnce({ rows: [] } as Rows<Profile>);

      const { ctx } = makeContext({
        [BYPASS_HEADER_LC]: 'super_secret_id_hint',
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(/^Não autorizado$/);
    });

    it('throws 401 when no client profile exists in seed', async () => {
      db.query.mockResolvedValueOnce({ rows: [] } as Rows<Profile>);

      const { ctx } = makeContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        /Bypass profile não encontrado/,
      );
    });
  });

  describe('clerk real mode', () => {
    beforeEach(() => {
      process.env.DISABLE_CLERK_AUTH = 'false';
      process.env.CLERK_SECRET_KEY = 'sk_test_dummy';
      // Default: getActiveRoles returns empty (graceful degradation)
      db.query.mockResolvedValue({ rows: [] });
    });

    it('returns existing profile when clerk_id found (UPSERT returns existing row)', async () => {
      (verifyToken as jest.Mock).mockResolvedValue({
        sub: 'user_real_123',
        first_name: 'Alex',
      });
      const profile = makeProfile({ clerk_id: 'user_real_123' });
      // UPSERT resolves with existing profile (ON CONFLICT DO UPDATE ... RETURNING *)
      db.query.mockResolvedValueOnce({ rows: [profile] } as Rows<Profile>);

      const { ctx, request } = makeContext({ authorization: 'Bearer tok' });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      // 3 queries: UPSERT profiles + INSERT account_roles client + getActiveRoles
      expect(db.query).toHaveBeenCalledTimes(3);
      expect(request.profile).toEqual(profile);
    });

    it('ignores X-Dev-User-Id header in real mode (no impersonation path)', async () => {
      (verifyToken as jest.Mock).mockResolvedValue({
        sub: 'user_real_123',
        name: 'Alex',
      });
      const profile = makeProfile({ clerk_id: 'user_real_123' });
      db.query.mockResolvedValueOnce({ rows: [profile] } as Rows<Profile>);

      const { ctx } = makeContext({
        authorization: 'Bearer tok',
        [BYPASS_HEADER_LC]: 'demo_client_002',
      });
      await guard.canActivate(ctx);

      // Should call the UPSERT, not a plain SELECT
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO profiles'),
        ['user_real_123', 'Alex', null],
      );
    });

    it('JIT-provisions a new client profile when clerk_id is unknown', async () => {
      (verifyToken as jest.Mock).mockResolvedValue({
        sub: 'user_new_456',
        first_name: 'Alex',
        last_name: 'Cesar',
      });
      const inserted = makeProfile({
        clerk_id: 'user_new_456',
        full_name: 'Alex Cesar',
      });
      // Single UPSERT handles both insert and conflict — no pre-select needed
      db.query.mockResolvedValueOnce({ rows: [inserted] } as Rows<Profile>);

      const { ctx, request } = makeContext({ authorization: 'Bearer tok' });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);

      expect(db.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('INSERT INTO profiles'),
        ['user_new_456', 'Alex Cesar', null],
      );
      expect(request.profile).toEqual(inserted);
    });

    it('JIT uses token `name` claim when present (priority over first/last)', async () => {
      (verifyToken as jest.Mock).mockResolvedValue({
        sub: 'user_new_789',
        name: 'Maria Silva',
        first_name: 'Should',
        last_name: 'Ignore',
      });
      const inserted = makeProfile({
        clerk_id: 'user_new_789',
        full_name: 'Maria Silva',
      });
      db.query.mockResolvedValueOnce({ rows: [inserted] } as Rows<Profile>);

      const { ctx } = makeContext({ authorization: 'Bearer tok' });
      await guard.canActivate(ctx);

      expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), [
        'user_new_789',
        'Maria Silva',
        null,
      ]);
    });

    it('JIT falls back to "Usuário" when no name fields are present', async () => {
      (verifyToken as jest.Mock).mockResolvedValue({ sub: 'user_nameless' });
      const inserted = makeProfile({
        clerk_id: 'user_nameless',
        full_name: 'Usuário',
      });
      db.query.mockResolvedValueOnce({ rows: [inserted] } as Rows<Profile>);

      const { ctx } = makeContext({ authorization: 'Bearer tok' });
      await guard.canActivate(ctx);

      expect(db.query).toHaveBeenNthCalledWith(1, expect.any(String), [
        'user_nameless',
        'Usuário',
        null,
      ]);
    });

    it('throws 401 when JIT UPSERT returns no rows', async () => {
      (verifyToken as jest.Mock).mockResolvedValue({ sub: 'user_race' });
      // UPSERT returns empty (should not happen in practice, but guard must handle it)
      db.query.mockResolvedValueOnce({ rows: [] } as Rows<Profile>);

      const { ctx } = makeContext({ authorization: 'Bearer tok' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        /Falha ao provisionar perfil/,
      );
    });

    it('throws 401 when token verification fails', async () => {
      (verifyToken as jest.Mock).mockRejectedValue(new Error('bad token'));

      const { ctx } = makeContext({ authorization: 'Bearer tok' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(/Token inválido/);
    });

    it('throws 401 when Authorization header is missing', async () => {
      const { ctx } = makeContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        /Token de autenticação ausente/,
      );
    });

    it('throws 401 when only X-Dev-User-Id is present without Authorization (ordering anchor)', async () => {
      const { ctx } = makeContext({
        [BYPASS_HEADER_LC]: 'demo_client_001',
      });
      await expect(guard.canActivate(ctx)).rejects.toThrow(
        /Token de autenticação ausente/,
      );
      // DB must not be touched — guard rejects before any profile lookup.
      expect(db.query).not.toHaveBeenCalled();
    });
  });
});
