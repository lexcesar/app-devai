import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  IAvailabilityRepository,
  IVisitsRepository,
  AvailabilitySlot,
  Visit,
  VisitWithProfessional,
  VisitWithClient,
} from '@obrafacil/shared';

const VISITS_WITH_PROF = `
  SELECT
    v.id, v.client_id, v.professional_id, v.scheduled_at, v.status,
    v.address, v.notes, v.cancelled_by, v.created_at, v.updated_at,
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
  FROM visits v
  INNER JOIN professionals pr ON pr.id = v.professional_id
  INNER JOIN profiles p ON p.id = pr.profile_id
`;

const VISITS_WITH_DETAIL = `
  SELECT
    v.id, v.client_id, v.professional_id, v.scheduled_at, v.status,
    v.address, v.notes, v.cancelled_by, v.created_at, v.updated_at,
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
  FROM visits v
  INNER JOIN professionals pr ON pr.id = v.professional_id
  INNER JOIN profiles pp ON pp.id = pr.profile_id
  INNER JOIN profiles cp ON cp.id = v.client_id
`;

const VISITS_WITH_CLIENT = `
  SELECT
    v.id, v.client_id, v.professional_id, v.scheduled_at, v.status,
    v.address, v.notes, v.cancelled_by, v.created_at, v.updated_at,
    json_build_object(
      'id', cp.id, 'clerk_id', cp.clerk_id, 'full_name', cp.full_name,
      'avatar_url', cp.avatar_url, 'phone', cp.phone, 'role', cp.role,
      'created_at', cp.created_at, 'updated_at', cp.updated_at
    ) AS client
  FROM visits v
  INNER JOIN profiles cp ON cp.id = v.client_id
`;

@Injectable()
export class AvailabilityRepository implements IAvailabilityRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByProfessional(
    professionalId: string,
  ): Promise<AvailabilitySlot[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM availability_slots WHERE professional_id = $1 ORDER BY weekday, start_time`,
      [professionalId],
    );
    return rows as unknown as AvailabilitySlot[];
  }

  async replaceAll(
    professionalId: string,
    slots: { weekday: number; start_time: string; end_time: string }[],
  ): Promise<AvailabilitySlot[]> {
    if (slots.length === 0) {
      await this.db.query(
        `DELETE FROM availability_slots WHERE professional_id = $1`,
        [professionalId],
      );
      return [];
    }

    // Use CTE to DELETE + INSERT atomically in a single statement
    const values: unknown[] = [professionalId];
    const placeholders = slots.map((slot, i) => {
      const base = i * 3 + 2; // offset by 1 for professionalId param
      values.push(slot.weekday, slot.start_time, slot.end_time);
      return `($1, $${base}, $${base + 1}, $${base + 2})`;
    });

    const { rows } = await this.db.query(
      `WITH deleted AS (
        DELETE FROM availability_slots WHERE professional_id = $1
      )
      INSERT INTO availability_slots (professional_id, weekday, start_time, end_time)
      VALUES ${placeholders.join(', ')}
      RETURNING *`,
      values,
    );
    return rows as unknown as AvailabilitySlot[];
  }
}

@Injectable()
export class VisitsRepository implements IVisitsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findAllByClient(clientId: string): Promise<VisitWithProfessional[]> {
    const { rows } = await this.db.query(
      `${VISITS_WITH_PROF} WHERE v.client_id = $1 ORDER BY v.scheduled_at DESC`,
      [clientId],
    );
    return rows as unknown as VisitWithProfessional[];
  }

  /** Active visits for a professional (for availability computation) */
  async findActiveByProfessional(professionalId: string): Promise<Visit[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM visits WHERE professional_id = $1 AND status != 'cancelled'`,
      [professionalId],
    );
    return rows as unknown as Visit[];
  }

  async findAllByProfessional(profileId: string): Promise<VisitWithClient[]> {
    const { rows } = await this.db.query(
      `${VISITS_WITH_CLIENT}
       INNER JOIN professionals pr ON pr.id = v.professional_id
       WHERE pr.profile_id = $1
       ORDER BY v.scheduled_at DESC`,
      [profileId],
    );
    return rows as unknown as VisitWithClient[];
  }

  async findById(
    id: string,
  ): Promise<(VisitWithProfessional & VisitWithClient) | null> {
    const { rows } = await this.db.query(
      `${VISITS_WITH_DETAIL} WHERE v.id = $1`,
      [id],
    );
    return rows.length
      ? (rows[0] as unknown as VisitWithProfessional & VisitWithClient)
      : null;
  }

  async create({
    clientId,
    professionalId,
    scheduledAt,
    address,
    notes,
  }: {
    clientId: string;
    professionalId: string;
    scheduledAt: string;
    address?: string;
    notes?: string;
  }): Promise<Visit> {
    const { rows } = await this.db.query(
      `INSERT INTO visits (client_id, professional_id, scheduled_at, address, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [clientId, professionalId, scheduledAt, address ?? null, notes ?? null],
    );
    return rows[0] as unknown as Visit;
  }

  async updateStatus(
    id: string,
    status: string,
    cancelledBy?: string,
  ): Promise<Visit> {
    const { rows } = await this.db.query(
      `UPDATE visits SET status = $1, cancelled_by = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [status, cancelledBy ?? null, id],
    );
    return rows[0] as unknown as Visit;
  }
}
