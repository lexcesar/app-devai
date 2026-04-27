import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type {
  IAvailabilityRepository,
  IVisitsRepository,
  AvailabilitySlot,
  Visit,
  VisitFull,
} from '@obrafacil/shared';

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
    // PostgreSQL returns time columns as "HH:MM:SS"; normalize to "HH:MM"
    return rows.map((row) => ({
      ...row,
      start_time: (row.start_time as string).slice(0, 5),
      end_time: (row.end_time as string).slice(0, 5),
    })) as unknown as AvailabilitySlot[];
  }

  async replaceAll(
    professionalId: string,
    slots: { weekday: number; start_time: string; end_time: string }[],
  ): Promise<AvailabilitySlot[]> {
    // Normalize HH:MM:SS → HH:MM from incoming payload (frontend may retain
    // the full format from a previous DB read), then deduplicate by (weekday, start_time).
    const normalizeTime = (t: string) => t.slice(0, 5);
    const seen = new Map<
      string,
      { weekday: number; start_time: string; end_time: string }
    >();
    for (const slot of slots) {
      const st = normalizeTime(slot.start_time);
      const et = normalizeTime(slot.end_time);
      seen.set(`${slot.weekday}:${st}`, {
        weekday: slot.weekday,
        start_time: st,
        end_time: et,
      });
    }
    const uniqueSlots = Array.from(seen.values());

    if (uniqueSlots.length === 0) {
      await this.db.query(
        `DELETE FROM availability_slots WHERE professional_id = $1`,
        [professionalId],
      );
      return [];
    }

    // Use an explicit transaction: DELETE first, then INSERT as separate
    // statements so PostgreSQL sees the deletions before evaluating the
    // unique constraint (professional_id, weekday, start_time).
    // A single-statement CTE (WITH deleted AS (DELETE ...) INSERT ...)
    // does NOT work here because both sides of the CTE share the same
    // snapshot and the INSERT still "sees" the old rows, causing a
    // unique constraint violation (pg error 23505).
    const rows = await this.db.transaction(async (query) => {
      await query(`DELETE FROM availability_slots WHERE professional_id = $1`, [
        professionalId,
      ]);

      const values: unknown[] = [professionalId];
      const placeholders = uniqueSlots.map((slot, i) => {
        const base = i * 3 + 2;
        values.push(slot.weekday, slot.start_time, slot.end_time);
        return `($1, $${base}, $${base + 1}, $${base + 2})`;
      });

      const { rows: inserted } = await query(
        `INSERT INTO availability_slots (professional_id, weekday, start_time, end_time)
         VALUES ${placeholders.join(', ')}
         RETURNING *`,
        values,
      );
      return inserted as Record<string, unknown>[];
    });

    // Normalize HH:MM:SS → HH:MM
    return rows.map((row) => ({
      ...row,
      start_time: (row.start_time as string).slice(0, 5),
      end_time: (row.end_time as string).slice(0, 5),
    })) as unknown as AvailabilitySlot[];
  }
}

@Injectable()
export class VisitsRepository implements IVisitsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findAllByClient(clientId: string): Promise<VisitFull[]> {
    const { rows } = await this.db.query(
      `${VISITS_WITH_DETAIL} WHERE v.client_id = $1 ORDER BY v.scheduled_at DESC`,
      [clientId],
    );
    return rows as unknown as VisitFull[];
  }

  /** Active visits for a professional (for availability computation) */
  async findActiveByProfessional(professionalId: string): Promise<Visit[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM visits WHERE professional_id = $1 AND status != 'cancelled'`,
      [professionalId],
    );
    return rows as unknown as Visit[];
  }

  async findAllByProfessional(profileId: string): Promise<VisitFull[]> {
    const { rows } = await this.db.query(
      `${VISITS_WITH_DETAIL}
       WHERE pp.id = $1
       ORDER BY v.scheduled_at DESC`,
      [profileId],
    );
    return rows as unknown as VisitFull[];
  }

  async findById(id: string): Promise<VisitFull | null> {
    const { rows } = await this.db.query(
      `${VISITS_WITH_DETAIL} WHERE v.id = $1`,
      [id],
    );
    return rows.length ? (rows[0] as unknown as VisitFull) : null;
  }

  async create({
    clientId,
    professionalId,
    scheduledAt,
    street,
    streetNumber,
    complement,
    neighborhood,
    cityName,
    stateCode,
    requesterName,
    serviceType,
    description,
    address,
    notes,
  }: {
    clientId: string;
    professionalId: string;
    scheduledAt: string;
    street?: string;
    streetNumber?: string;
    complement?: string;
    neighborhood?: string;
    cityName?: string;
    stateCode?: string;
    requesterName?: string;
    serviceType?: string;
    description?: string;
    address?: string;
    notes?: string;
  }): Promise<Visit> {
    const { rows } = await this.db.query(
      `INSERT INTO visits (
         client_id, professional_id, scheduled_at, status,
         street, street_number, complement, neighborhood, city_name, state_code,
         requester_name, service_type, description,
         address, notes
       )
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        clientId,
        professionalId,
        scheduledAt,
        street ?? null,
        streetNumber ?? null,
        complement ?? null,
        neighborhood ?? null,
        cityName ?? null,
        stateCode ?? null,
        requesterName ?? null,
        serviceType ?? null,
        description ?? null,
        address ?? null,
        notes ?? null,
      ],
    );
    return rows[0] as unknown as Visit;
  }

  async updateStatus(
    id: string,
    status: string,
    cancelledBy?: string,
    rejectionReason?: string,
  ): Promise<Visit> {
    const { rows } = await this.db.query(
      `UPDATE visits SET status = $1, cancelled_by = $2, rejection_reason = $3, updated_at = now()
       WHERE id = $4 RETURNING *`,
      [status, cancelledBy ?? null, rejectionReason ?? null, id],
    );
    return rows[0] as unknown as Visit;
  }
}
