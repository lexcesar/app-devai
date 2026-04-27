import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { IWorksRepository, Work, WorkFull } from '@obrafacil/shared';

const WORKS_WITH_FULL = `
  SELECT
    w.id, w.client_id, w.professional_id, w.visit_id, w.title, w.status, w.progress_pct,
    w.next_step, w.photos, w.started_at, w.completed_at, w.created_at, w.updated_at,
    json_build_object(
      'id', pr.id, 'profile_id', pr.profile_id, 'specialty', pr.specialty,
      'bio', pr.bio, 'rating_avg', pr.rating_avg, 'jobs_completed', pr.jobs_completed,
      'is_verified', pr.is_verified, 'latitude', pr.latitude, 'longitude', pr.longitude,
      'created_at', pr.created_at,
      'profiles', json_build_object(
        'id', pp.id, 'clerk_id', pp.clerk_id, 'full_name', pp.full_name,
        'avatar_url', pp.avatar_url, 'phone', pp.phone, 'role', pp.role,
        'created_at', pp.created_at, 'updated_at', pp.updated_at
      )
    ) AS professionals,
    json_build_object(
      'id', cp.id, 'clerk_id', cp.clerk_id, 'full_name', cp.full_name,
      'avatar_url', cp.avatar_url, 'phone', cp.phone, 'role', cp.role,
      'created_at', cp.created_at, 'updated_at', cp.updated_at
    ) AS client
  FROM works w
  INNER JOIN professionals pr ON pr.id = w.professional_id
  INNER JOIN profiles pp ON pp.id = pr.profile_id
  INNER JOIN profiles cp ON cp.id = w.client_id
`;

@Injectable()
export class WorksRepository implements IWorksRepository {
  constructor(private readonly db: DatabaseService) {}

  async findAllByClient(clientId: string): Promise<WorkFull[]> {
    const { rows } = await this.db.query(
      `${WORKS_WITH_FULL} WHERE w.client_id = $1 ORDER BY w.created_at DESC`,
      [clientId],
    );
    return rows as unknown as WorkFull[];
  }

  async findAllByProfessional(professionalId: string): Promise<WorkFull[]> {
    const { rows } = await this.db.query(
      `${WORKS_WITH_FULL} WHERE pr.id = $1 ORDER BY w.created_at DESC`,
      [professionalId],
    );
    return rows as unknown as WorkFull[];
  }

  async findById(id: string): Promise<WorkFull | null> {
    const { rows } = await this.db.query(`${WORKS_WITH_FULL} WHERE w.id = $1`, [
      id,
    ]);
    return rows.length ? (rows[0] as unknown as WorkFull) : null;
  }

  async updateProgress(id: string, progressPct: number): Promise<Work> {
    const { rows } = await this.db.query(
      `UPDATE works SET progress_pct = $1, updated_at = now()
       WHERE id = $2 RETURNING *`,
      [progressPct, id],
    );
    return rows[0] as unknown as Work;
  }

  async cancelByVisitId(visitId: string): Promise<void> {
    await this.db.query(
      `UPDATE works
         SET status = 'cancelled'::work_status, updated_at = now()
       WHERE visit_id = $1 AND status = 'scheduled'`,
      [visitId],
    );
  }

  async updateStatus(
    id: string,
    status: 'scheduled' | 'active' | 'completed' | 'cancelled',
  ): Promise<Work> {
    const { rows } = await this.db.query(
      `UPDATE works
         SET status = $1::work_status,
             started_at = CASE WHEN $1 = 'active' AND started_at IS NULL THEN now() ELSE started_at END,
             completed_at = CASE WHEN $1 = 'completed' THEN now() ELSE completed_at END,
             progress_pct = CASE WHEN $1 = 'completed' THEN 100 ELSE progress_pct END,
             updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [status, id],
    );
    return rows[0] as unknown as Work;
  }

  async findByVisitId(visitId: string): Promise<WorkFull | null> {
    const { rows } = await this.db.query(
      `${WORKS_WITH_FULL} WHERE w.visit_id = $1`,
      [visitId],
    );
    return rows.length ? (rows[0] as unknown as WorkFull) : null;
  }

  async createFromVisit(visit: {
    id: string;
    client_id: string;
    professional_id: string;
    address?: string | null;
  }): Promise<Work> {
    const title = `Serviço agendado${visit.address ? ` - ${visit.address}` : ''}`;
    const { rows } = await this.db.query(
      `INSERT INTO works
         (visit_id, client_id, professional_id, title, status, progress_pct, photos)
       VALUES ($1, $2, $3, $4, 'scheduled', 0, '{}')
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [visit.id, visit.client_id, visit.professional_id, title],
    );
    // ON CONFLICT DO NOTHING returns empty rows on duplicate — look up existing
    if (!rows.length) {
      const existing = await this.db.query(
        `SELECT * FROM works WHERE visit_id = $1`,
        [visit.id],
      );
      return existing.rows[0] as unknown as Work;
    }
    return rows[0] as unknown as Work;
  }
}
