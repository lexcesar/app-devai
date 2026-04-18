import { WorksRepository } from './works.repository';

describe('WorksRepository', () => {
  let db: { query: jest.Mock };
  let repo: WorksRepository;

  beforeEach(() => {
    db = { query: jest.fn() };
    repo = new WorksRepository(db as never);
  });

  describe('findAllByClient', () => {
    it('filters by client_id only', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'w1', client_id: 'c1' }] });
      const result = await repo.findAllByClient('c1');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE w.client_id = $1'),
        ['c1'],
      );
      expect(result).toEqual([{ id: 'w1', client_id: 'c1' }]);
    });

    it('orders by created_at DESC (most recent first)', async () => {
      db.query.mockResolvedValue({ rows: [] });
      await repo.findAllByClient('c1');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY w.created_at DESC'),
        expect.any(Array),
      );
    });
  });

  describe('findAllByProfessional', () => {
    it('filters by professional id', async () => {
      db.query.mockResolvedValue({
        rows: [{ id: 'w1', professional_id: 'p1' }],
      });
      await repo.findAllByProfessional('p1');
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE pr.id = $1'),
        ['p1'],
      );
    });
  });

  describe('findById', () => {
    it('returns single row when found', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'w1' }] });
      expect(await repo.findById('w1')).toEqual({ id: 'w1' });
    });

    it('returns null when not found', async () => {
      db.query.mockResolvedValue({ rows: [] });
      expect(await repo.findById('missing')).toBeNull();
    });
  });

  describe('updateProgress', () => {
    it('updates progress_pct and touches updated_at', async () => {
      db.query.mockResolvedValue({ rows: [{ id: 'w1', progress_pct: 50 }] });
      await repo.updateProgress('w1', 50);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE works SET progress_pct = $1'),
        [50, 'w1'],
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = now()'),
        expect.any(Array),
      );
    });
  });
});
