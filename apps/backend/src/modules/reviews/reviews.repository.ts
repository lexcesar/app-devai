import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import type { Review, ReviewWithReviewer } from '@obrafacil/shared';

@Injectable()
export class ReviewsRepository {
  constructor(private readonly db: DatabaseService) {}

  async findByWorkId(workId: string): Promise<ReviewWithReviewer | null> {
    const { rows } = await this.db.query(
      `SELECT
         r.id, r.work_id, r.professional_id, r.reviewer_id,
         r.rating, r.comment, r.created_at,
         json_build_object(
           'id',         p.id,
           'full_name',  p.full_name,
           'avatar_url', p.avatar_url,
           'avatar_id',  p.avatar_id
         ) AS profiles
       FROM reviews r
       INNER JOIN profiles p ON p.id = r.reviewer_id
       WHERE r.work_id = $1
       LIMIT 1`,
      [workId],
    );
    return rows.length ? (rows[0] as unknown as ReviewWithReviewer) : null;
  }

  async create(data: {
    workId: string;
    professionalId: string;
    reviewerId: string;
    rating: number;
    comment?: string | null;
  }): Promise<Review> {
    const { rows } = await this.db.query(
      `INSERT INTO reviews (work_id, professional_id, reviewer_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        data.workId,
        data.professionalId,
        data.reviewerId,
        data.rating,
        data.comment ?? null,
      ],
    );
    return rows[0] as unknown as Review;
  }
}
