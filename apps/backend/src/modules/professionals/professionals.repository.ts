import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  IProfessionalsRepository,
  ProfessionalWithProfile,
} from '@obrafacil/shared';

const PROF_JOIN_COLS = `
  p.id, p.profile_id, p.specialty, p.bio, p.rating_avg, p.jobs_completed,
  p.is_verified, p.latitude, p.longitude, p.created_at,
  pr.id AS pr_id, pr.clerk_id, pr.full_name, pr.avatar_url,
  pr.phone, pr.role, pr.created_at AS pr_created_at, pr.updated_at AS pr_updated_at
`;

function mapRow(row: Record<string, unknown>): ProfessionalWithProfile {
  return {
    id: row.id as string,
    profile_id: row.profile_id as string,
    specialty: row.specialty as string,
    bio: (row.bio as string | null) ?? null,
    rating_avg: Number(row.rating_avg),
    jobs_completed: Number(row.jobs_completed),
    is_verified: Boolean(row.is_verified),
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    created_at: String(row.created_at),
    profiles: {
      id: row.pr_id as string,
      clerk_id: row.clerk_id as string,
      full_name: row.full_name as string,
      avatar_url: (row.avatar_url as string | null) ?? null,
      phone: (row.phone as string | null) ?? null,
      role: row.role as 'client' | 'professional' | 'store',
      created_at: String(row.pr_created_at),
      updated_at: String(row.pr_updated_at),
    },
  };
}

@Injectable()
export class ProfessionalsRepository implements IProfessionalsRepository {
  constructor(private readonly db: DatabaseService) {}

  async search({
    query,
    city,
    limit = 20,
    offset = 0,
  }: {
    query?: string;
    service?: string;
    city?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProfessionalWithProfile[]> {
    const { rows } = await this.db.query(
      `SELECT ${PROF_JOIN_COLS}
       FROM professionals p
       INNER JOIN profiles pr ON pr.id = p.profile_id
       WHERE ($1::text IS NULL OR pr.full_name ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR pr.full_name ILIKE '%' || $2 || '%')
       ORDER BY p.rating_avg DESC
       LIMIT $3 OFFSET $4`,
      [query ?? null, city ?? null, limit, offset],
    );
    return rows.map(mapRow);
  }

  async findById(id: string): Promise<ProfessionalWithProfile | null> {
    const { rows } = await this.db.query(
      `SELECT ${PROF_JOIN_COLS}
       FROM professionals p
       INNER JOIN profiles pr ON pr.id = p.profile_id
       WHERE p.id = $1`,
      [id],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }

  async findByIdWithReviews(
    id: string,
  ): Promise<(ProfessionalWithProfile & { reviews: unknown[] }) | null> {
    const { rows } = await this.db.query(
      `SELECT ${PROF_JOIN_COLS},
         COALESCE(
           json_agg(
             json_build_object(
               'id', rv.id, 'rating', rv.rating, 'comment', rv.comment,
               'created_at', rv.created_at,
               'profiles', json_build_object('id', rp.id, 'full_name', rp.full_name, 'avatar_url', rp.avatar_url)
             ) ORDER BY rv.created_at DESC
           ) FILTER (WHERE rv.id IS NOT NULL),
           '[]'
         ) AS reviews
       FROM professionals p
       INNER JOIN profiles pr ON pr.id = p.profile_id
       LEFT JOIN reviews rv ON rv.professional_id = p.id
       LEFT JOIN profiles rp ON rp.id = rv.reviewer_id
       WHERE p.id = $1
       GROUP BY p.id, pr.id`,
      [id],
    );
    if (!rows.length) return null;
    const base = mapRow(rows[0]);
    return { ...base, reviews: (rows[0].reviews as unknown[]) ?? [] };
  }

  async findByClerkId(
    clerkId: string,
  ): Promise<ProfessionalWithProfile | null> {
    const { rows } = await this.db.query(
      `SELECT ${PROF_JOIN_COLS}
       FROM professionals p
       INNER JOIN profiles pr ON pr.id = p.profile_id
       WHERE pr.clerk_id = $1`,
      [clerkId],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }

  async findByProfileId(
    profileId: string,
  ): Promise<ProfessionalWithProfile | null> {
    const { rows } = await this.db.query(
      `SELECT ${PROF_JOIN_COLS}
       FROM professionals p
       INNER JOIN profiles pr ON pr.id = p.profile_id
       WHERE p.profile_id = $1`,
      [profileId],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }
}
