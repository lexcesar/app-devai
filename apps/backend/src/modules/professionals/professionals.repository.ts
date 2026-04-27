import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  IProfessionalsRepository,
  ProfessionalWithProfile,
} from '@obrafacil/shared';

// ── Column list for reads from the `professionals` table + profiles JOIN ─────
const COLS = `
  p.id, p.profile_id, p.specialty, p.bio,
  p.rating_avg, p.jobs_completed,
  p.is_verified, p.latitude, p.longitude, p.created_at,
  p.visibility_status, p.display_name, p.city, p.published_at,
  pr.id AS pr_id, pr.clerk_id, pr.full_name, pr.avatar_url, pr.avatar_id,
  pr.phone, pr.role, pr.created_at AS pr_created_at, pr.updated_at AS pr_updated_at
`;

function mapRow(row: Record<string, unknown>): ProfessionalWithProfile {
  return {
    id: row.id as string,
    profile_id: row.profile_id as string,
    specialty: row.specialty as string,
    bio: (row.bio as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
    rating_avg: Number(row.rating_avg),
    jobs_completed: Number(row.jobs_completed),
    is_verified: Boolean(row.is_verified),
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    visibility_status:
      (row.visibility_status as 'draft' | 'active' | 'inactive') ?? 'draft',
    published_at: (row.published_at as string | null) ?? null,
    created_at: String(row.created_at),
    profiles: {
      id: row.pr_id as string,
      clerk_id: row.clerk_id as string,
      full_name: row.full_name as string,
      avatar_url: (row.avatar_url as string | null) ?? null,
      avatar_id: (row.avatar_id as string | null) ?? null,
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

  // ── Public reads (use the view — eligibility already applied) ─────────────

  async search({
    query,
    service,
    city: _city,
    limit = 20,
    offset = 0,
    excludeProfileId,
  }: {
    query?: string;
    service?: string;
    city?: string;
    limit?: number;
    offset?: number;
    /** Profile ID to exclude from results (prevents self-hire) */
    excludeProfileId?: string;
  }): Promise<ProfessionalWithProfile[]> {
    const normalizeAndMapTerm = (term?: string): string | null => {
      if (!term) return null;
      const s = term
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (s.includes('eletric')) return 'eletric';
      if (s.includes('hidraul') || s.includes('encanador')) return 'encanad';
      if (s.includes('pintur') || s.includes('pintor')) return 'pint';
      if (s.includes('diarista') || s.includes('limpez')) return 'diarista';
      if (s.includes('pedreiro') || s.includes('reform')) return 'pedreir';
      if (s.includes('marceneir') || s.includes('moveis')) return 'marceneir';

      return term;
    };

    const queryTerm = normalizeAndMapTerm(query);
    const serviceTerm = normalizeAndMapTerm(service);
    // Raw (non-normalized) service name for direct match against specialties
    // stored as the literal service category (e.g. "Instalações Hidráulicas").
    const serviceRaw = service ?? null;

    const { rows } = await this.db.query(
      `SELECT ${COLS}
       FROM professionals p
       INNER JOIN profiles pr ON pr.id = p.profile_id
       INNER JOIN account_roles ar
         ON ar.profile_id = p.profile_id
         AND ar.role = 'professional'
         AND ar.is_active = true
       WHERE p.visibility_status = 'active'
         AND EXISTS (
           SELECT 1 FROM availability_slots av
           WHERE av.professional_id = p.id
         )
         AND ($1::text IS NULL OR pr.full_name ILIKE '%' || $1 || '%' OR p.bio ILIKE '%' || $1 || '%' OR p.specialty ILIKE '%' || $1 || '%')
         AND ($2::text IS NULL OR p.specialty ILIKE '%' || $2 || '%' OR p.bio ILIKE '%' || $2 || '%'
              OR ($6::text IS NOT NULL AND p.specialty ILIKE '%' || $6 || '%'))
         AND ($5::uuid IS NULL OR p.profile_id != $5)
       ORDER BY p.rating_avg DESC, p.published_at DESC
       LIMIT $3 OFFSET $4`,
      [
        queryTerm,
        serviceTerm,
        limit ?? 10,
        offset ?? 0,
        excludeProfileId ?? null,
        serviceRaw,
      ],
    );
    return rows.map(mapRow);
  }

  /** Public detail. */
  async findById(id: string): Promise<ProfessionalWithProfile | null> {
    const { rows } = await this.db.query(
      `SELECT ${COLS}
       FROM professionals p
       INNER JOIN profiles pr ON pr.id = p.profile_id
       WHERE p.id = $1`,
      [id],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }

  /** Public detail with reviews. */
  async findByIdWithReviews(
    id: string,
  ): Promise<(ProfessionalWithProfile & { reviews: unknown[] }) | null> {
    const { rows } = await this.db.query(
      `SELECT ${COLS},
          COALESCE(
            json_agg(
              json_build_object(
                'id', rv.id, 'rating', rv.rating, 'comment', rv.comment,
                'created_at', rv.created_at,
                'profiles', json_build_object('id', rp.id, 'full_name', rp.full_name, 'avatar_url', rp.avatar_url, 'avatar_id', rp.avatar_id)
              ) ORDER BY rv.created_at DESC
            ) FILTER (WHERE rv.id IS NOT NULL),
            '[]'
          ) AS reviews
        FROM professionals p
        INNER JOIN profiles pr ON pr.id = p.profile_id
        LEFT JOIN reviews rv ON rv.professional_id = p.id
        LEFT JOIN profiles rp ON rp.id = rv.reviewer_id
        WHERE p.id = $1
        GROUP BY p.id, p.profile_id, p.specialty, p.bio,
                 p.rating_avg, p.jobs_completed, p.is_verified,
                 p.latitude, p.longitude, p.created_at,
                 pr.id, pr.clerk_id, pr.full_name, pr.avatar_url, pr.avatar_id,
                 pr.phone, pr.role, pr.created_at, pr.updated_at`,
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
      `SELECT ${COLS}
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
      `SELECT ${COLS}
       FROM professionals p
       INNER JOIN profiles pr ON pr.id = p.profile_id
       WHERE p.profile_id = $1`,
      [profileId],
    );
    return rows.length ? mapRow(rows[0]) : null;
  }
}
