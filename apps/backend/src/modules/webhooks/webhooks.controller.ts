import {
  Controller,
  Post,
  Req,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Webhook } from 'svix';
import type { Request } from 'express';
import { DatabaseService } from '../../database/database.service';

type ClerkWebhookEvent = {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string;
    phone_numbers?: Array<{ phone_number: string }>;
    public_metadata?: { role?: string };
  };
};

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly db: DatabaseService) {}

  @Post('clerk')
  async handleClerkWebhook(@Req() req: Request) {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new InternalServerErrorException('Webhook secret not configured');
    }

    const svixId = req.headers['svix-id'] as string | undefined;
    const svixTimestamp = req.headers['svix-timestamp'] as string | undefined;
    const svixSignature = req.headers['svix-signature'] as string | undefined;

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Missing Svix headers');
    }

    const body = JSON.stringify(req.body as unknown);

    let event: ClerkWebhookEvent;
    try {
      const wh = new Webhook(webhookSecret);
      event = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as ClerkWebhookEvent;
    } catch {
      throw new BadRequestException('Invalid webhook signature');
    }

    if (event.type === 'user.created' || event.type === 'user.updated') {
      const {
        id,
        first_name,
        last_name,
        image_url,
        phone_numbers,
        public_metadata,
      } = event.data;
      const fullName =
        [first_name, last_name].filter(Boolean).join(' ') || 'Usuário';
      const phone = phone_numbers?.[0]?.phone_number ?? null;
      const role =
        (public_metadata?.role as 'client' | 'professional' | 'store') ??
        'client';

      try {
        await this.db.query(
          `INSERT INTO profiles (clerk_id, full_name, avatar_url, phone, role)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (clerk_id) DO UPDATE SET
             full_name = CASE
               WHEN profiles.full_name = 'Usuário' OR profiles.full_name = ''
               THEN EXCLUDED.full_name
               ELSE profiles.full_name
             END,
             avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
             phone = EXCLUDED.phone,
             role = EXCLUDED.role,
             updated_at = now()`,
          [id, fullName, image_url ?? null, phone, role],
        );
      } catch (err) {
        this.logger.error('Database upsert error:', err);
        throw new InternalServerErrorException('Database error');
      }
    }

    if (event.type === 'user.deleted') {
      await this.db.query('DELETE FROM profiles WHERE clerk_id = $1', [
        event.data.id,
      ]);
    }

    return { received: true };
  }
}
