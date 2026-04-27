/**
 * ProfessionalsRepository unit tests — valida a estrutura SQL gerada e os
 * critérios de busca que garantem o "Fluxo 3: Busca pública de profissionais".
 *
 * Estes testes são especialmente importantes porque:
 *   1. O INNER JOIN account_roles é o guardião que impede profissionais
 *      desativados de aparecerem na busca pública.
 *   2. O filtro visibility_status = 'active' garante que apenas perfis
 *      completos e ativos sejam retornados.
 *   3. O mapeamento de termos de serviço normaliza a busca por categoria.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ProfessionalsRepository } from './professionals.repository';
import { DatabaseService } from '../../database/database.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Cria uma linha "raw" retornada pelo pg que a função mapRow consegue processar. */
function makeRawRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  // Column names must match what pg returns for the COLS query in professionals.repository.ts:
  //   pr.id AS pr_id, pr.clerk_id, pr.full_name, pr.avatar_url,
  //   pr.phone, pr.role, pr.created_at AS pr_created_at, pr.updated_at AS pr_updated_at
  return {
    id: 'pro-uuid',
    profile_id: 'profile-uuid',
    specialty: 'Eletricista Residencial',
    bio: 'Trabalhando há 12 anos em instalações elétricas residenciais.',
    rating_avg: '4.9',
    jobs_completed: 128,
    is_verified: true,
    latitude: '-23.5505',
    longitude: '-46.6333',
    visibility_status: 'active',
    display_name: null,
    city: null,
    published_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    pr_id: 'profile-uuid',
    clerk_id: 'clerk-001',
    full_name: 'Ricardo Silva',
    avatar_url: null,
    phone: null,
    role: 'professional',
    pr_created_at: new Date().toISOString(),
    pr_updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ProfessionalsRepository', () => {
  let repo: ProfessionalsRepository;
  let db: jest.Mocked<Pick<DatabaseService, 'query'>>;

  beforeEach(async () => {
    const dbMock = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionalsRepository,
        { provide: DatabaseService, useValue: dbMock },
      ],
    }).compile();

    repo = module.get<ProfessionalsRepository>(ProfessionalsRepository);
    db = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── search — SQL structure ─────────────────────────────────────────────────

  describe('search — estrutura SQL (Fluxo 3: Busca pública)', () => {
    it('inclui INNER JOIN account_roles na query de busca', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await repo.search({});

      const sql: string = (
        (db.query as jest.Mock).mock.calls[0] as unknown[]
      )[0] as string;
      expect(sql).toContain('INNER JOIN account_roles ar');
    });

    it("filtra por ar.role = 'professional' na condição do JOIN", async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await repo.search({});

      const sql: string = (
        (db.query as jest.Mock).mock.calls[0] as unknown[]
      )[0] as string;
      expect(sql).toContain("ar.role = 'professional'");
    });

    it('filtra por ar.is_active = true na condição do JOIN', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await repo.search({});

      const sql: string = (
        (db.query as jest.Mock).mock.calls[0] as unknown[]
      )[0] as string;
      expect(sql).toContain('ar.is_active = true');
    });

    it("filtra por p.visibility_status = 'active' no WHERE", async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await repo.search({});

      const sql: string = (
        (db.query as jest.Mock).mock.calls[0] as unknown[]
      )[0] as string;
      expect(sql).toContain("p.visibility_status = 'active'");
    });

    it('usa parâmetros posicionais ($1, $2, $3, $4) — sem interpolação de string', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await repo.search({ query: 'Ricardo', limit: 20, offset: 0 });

      const sql: string = (
        (db.query as jest.Mock).mock.calls[0] as unknown[]
      )[0] as string;
      // Deve usar $1, $2 etc. para prevenir SQL injection
      expect(sql).toMatch(/\$1/);
      expect(sql).toMatch(/\$2/);
      // O valor real não deve estar interpolado diretamente no SQL
      expect(sql).not.toContain('Ricardo');
    });

    it('passa o query string como $1 nos parâmetros', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await repo.search({ query: 'Jackson' });

      const params: unknown[] = (
        (db.query as jest.Mock).mock.calls[0] as unknown[]
      )[1] as unknown[];
      expect(params[0]).toBe('Jackson');
    });

    it('passa null como $1 quando query não é fornecido', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await repo.search({});

      const params: unknown[] = (
        (db.query as jest.Mock).mock.calls[0] as unknown[]
      )[1] as unknown[];
      expect(params[0]).toBeNull();
    });
  });

  // ── search — mapeamento de termos de serviço ──────────────────────────────

  describe('search — normalização de categorias de serviço', () => {
    async function captureServiceParam(service: string): Promise<unknown> {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });
      await repo.search({ service });
      const params: unknown[] = (
        (db.query as jest.Mock).mock.calls[0] as unknown[]
      )[1] as unknown[];
      return params[1]; // $2 = mappedService
    }

    it.each([
      // Terms with accent (é) match the repository condition: s.includes('elétric')
      ['elétrico', 'eletric'],
      ['Reparos elétricos', 'eletric'],
      ['hidráulica', 'encanad'],
      ['encanador', 'encanad'],
      ['pintura', 'pint'],
      ['pedreiro', 'pedreir'],
      ['Marceneiro', 'marceneir'],
      ['diarista', 'diarista'],
    ])('mapeia "%s" para "%s"', async (input, expected) => {
      const result = await captureServiceParam(input);
      expect(result).toBe(expected);
    });

    it('preserva o termo original quando não há mapeamento conhecido', async () => {
      const result = await captureServiceParam('serralheiro');
      // Nenhuma das chaves de mapeamento corresponde → usa o valor original
      expect(result).toBe('serralheiro');
    });
  });

  // ── search — comportamento com resultados ─────────────────────────────────

  describe('search — retorno de resultados', () => {
    it('retorna lista vazia quando nenhum profissional é encontrado', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.search({ query: 'xyztermoquenonexiste' });

      expect(result).toEqual([]);
    });

    it('retorna lista de profissionais mapeados corretamente', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [makeRawRow()] });

      const result = await repo.search({});

      expect(result).toHaveLength(1);
      expect(result[0].specialty).toBe('Eletricista Residencial');
      expect(result[0].visibility_status).toBe('active');
      expect(result[0].profiles.full_name).toBe('Ricardo Silva');
    });

    it('retorna múltiplos profissionais na ordem retornada pelo banco', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [
          makeRawRow({
            id: 'pro-1',
            full_name: 'Ricardo Silva',
            rating_avg: '4.9',
          }),
          makeRawRow({
            id: 'pro-2',
            full_name: 'José da Silva',
            rating_avg: '4.8',
          }),
          makeRawRow({
            id: 'pro-3',
            full_name: 'Ana Rodrigues',
            rating_avg: '4.7',
          }),
        ],
      });

      const result = await repo.search({});

      expect(result).toHaveLength(3);
      expect(result.map((p) => p.profiles.full_name)).toEqual([
        'Ricardo Silva',
        'José da Silva',
        'Ana Rodrigues',
      ]);
    });

    it('usa limite e offset padrão quando não fornecidos', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await repo.search({});

      const params: unknown[] = (
        (db.query as jest.Mock).mock.calls[0] as unknown[]
      )[1] as unknown[];
      // $3 = limit, $4 = offset
      expect(typeof params[2]).toBe('number'); // limite tem valor padrão
      expect(params[3]).toBe(0); // offset padrão é 0
    });
  });

  // ── findByProfileId ────────────────────────────────────────────────────────

  describe('findByProfileId (Fluxo 4: Persistência)', () => {
    it('retorna o perfil profissional quando encontrado', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [makeRawRow()] });

      const result = await repo.findByProfileId('profile-uuid');

      expect(result).not.toBeNull();
      expect(result?.specialty).toBe('Eletricista Residencial');
    });

    it('retorna null quando o perfil não existe', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findByProfileId('nonexistent-uuid');

      expect(result).toBeNull();
    });

    it('usa parâmetro posicional $1 para o profile_id', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      await repo.findByProfileId('profile-uuid');

      const params: unknown[] = (
        (db.query as jest.Mock).mock.calls[0] as unknown[]
      )[1] as unknown[];
      expect(params[0]).toBe('profile-uuid');

      // O uuid não deve estar interpolado diretamente no SQL
      const sql: string = (
        (db.query as jest.Mock).mock.calls[0] as unknown[]
      )[0] as string;
      expect(sql).not.toContain('profile-uuid');
    });

    it('converte rating_avg de string para número', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({
        rows: [makeRawRow({ rating_avg: '4.90' })],
      });

      const result = await repo.findByProfileId('profile-uuid');

      expect(typeof result?.rating_avg).toBe('number');
      expect(result?.rating_avg).toBeCloseTo(4.9);
    });
  });

  // ── findById ───────────────────────────────────────────────────────────────

  describe('findById (busca por id público)', () => {
    it('retorna o profissional quando encontrado pelo id', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [makeRawRow()] });

      const result = await repo.findById('pro-uuid');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('pro-uuid');
    });

    it('retorna null quando o profissional não existe', async () => {
      (db.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await repo.findById('nonexistent-uuid');

      expect(result).toBeNull();
    });
  });
});
