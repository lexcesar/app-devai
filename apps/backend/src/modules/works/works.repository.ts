import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  IWorksRepository,
  Work,
  WorkWithProfessional,
} from '@obrafacil/shared';

const WORKS_WITH_PROF = `
  SELECT
    w.id, w.client_id, w.professional_id, w.title, w.status, w.progress_pct,
    w.next_step, w.photos, w.started_at, w.completed_at, w.created_at, w.updated_at,
    json_build_object(
      'id', pr.id, 'profile_id', pr.profile_id, 'specialty', pr.specialty,
      'bio', pr.bio, 'rating_avg', pr.rating_avg, 'jobs_completed', pr.jobs_completed,
      'is_verified', pr.is_verified, 'latitude', pr.latitude, 'longitude', pr.longitude,
      'created_at', pr.created_at,
      'profiles', json_build_object(
        'id', p.id, 'clerk_id', p.clerk_id, 'full_name', p.full_name,
        'avatar_url', p.avatar_url, 'phone', p.phone, 'role', p.role,
        'created_at', p.created_at, 'updated_at', p.updated_at
      )
    ) AS professionals
  FROM works w
  INNER JOIN professionals pr ON pr.id = w.professional_id
  INNER JOIN profiles p ON p.id = pr.profile_id
`;

@Injectable()
export class WorksRepository implements IWorksRepository {
  constructor(private readonly db: DatabaseService) {}

  async findAllByClient(clientId: string): Promise<WorkWithProfessional[]> {
    const { rows } = await this.db.query(
      `${WORKS_WITH_PROF} WHERE w.client_id = $1 ORDER BY w.created_at DESC`,
      [clientId],
    );
    return rows as unknown as WorkWithProfessional[];
  }

  async findAllByProfessional(
    professionalId: string,
  ): Promise<WorkWithProfessional[]> {
    const { rows } = await this.db.query(
      `${WORKS_WITH_PROF} WHERE pr.id = $1 ORDER BY w.created_at DESC`,
      [professionalId],
    );
    return rows as unknown as WorkWithProfessional[];
  }

  async findById(id: string): Promise<WorkWithProfessional | null> {
    const { rows } = await this.db.query(`${WORKS_WITH_PROF} WHERE w.id = $1`, [
      id,
    ]);
    return rows.length ? (rows[0] as unknown as WorkWithProfessional) : null;
  }

  async updateProgress(id: string, progressPct: number): Promise<Work> {
    const { rows } = await this.db.query(
      `UPDATE works SET progress_pct = $1, updated_at = now()
       WHERE id = $2 RETURNING *`,
      [progressPct, id],
    );
    return rows[0] as unknown as Work;
  }

  async updateStatus(
    id: string,
    status: 'scheduled' | 'active' | 'completed',
  ): Promise<Work> {
    const { rows } = await this.db.query(
      `UPDATE works
         SET status = $1,
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
}
