import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Notification } from '@obrafacil/shared';

@Injectable()
export class NotificationsRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: {
    profileId: string;
    type: string;
    title: string;
    message: string;
    link?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    if (data.metadata != null) {
      await this.db.query(
        `INSERT INTO notifications (profile_id, type, title, message, link, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          data.profileId,
          data.type,
          data.title,
          data.message,
          data.link ?? null,
          JSON.stringify(data.metadata),
        ],
      );
    } else {
      await this.db.query(
        `INSERT INTO notifications (profile_id, type, title, message, link)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          data.profileId,
          data.type,
          data.title,
          data.message,
          data.link ?? null,
        ],
      );
    }
  }

  async findByProfile(profileId: string, limit = 20): Promise<Notification[]> {
    const { rows } = await this.db.query(
      `SELECT * FROM notifications
       WHERE profile_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [profileId, limit],
    );
    return rows as unknown as Notification[];
  }

  async countUnread(profileId: string): Promise<number> {
    const { rows } = await this.db.query(
      `SELECT COUNT(*) AS count FROM notifications
       WHERE profile_id = $1 AND is_read = false`,
      [profileId],
    );
    return Number(rows[0]?.count ?? 0);
  }

  async markAsRead(id: string, profileId: string): Promise<void> {
    await this.db.query(
      `UPDATE notifications SET is_read = true
       WHERE id = $1 AND profile_id = $2`,
      [id, profileId],
    );
  }

  async markAllAsRead(profileId: string): Promise<void> {
    await this.db.query(
      `UPDATE notifications SET is_read = true
       WHERE profile_id = $1 AND is_read = false`,
      [profileId],
    );
  }
}
