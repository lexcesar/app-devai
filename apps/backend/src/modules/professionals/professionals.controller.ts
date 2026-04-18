import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../core/guards/clerk-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsRepository } from './professionals.repository';
import { DatabaseService } from '../../database/database.service';
import type { Profile } from '@obrafacil/shared';

@ApiTags('professionals')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('v1/professionals')
export class ProfessionalsController {
  constructor(
    private readonly service: ProfessionalsService,
    private readonly repo: ProfessionalsRepository,
    private readonly db: DatabaseService,
  ) {}

  @Get()
  search(@Query() query: Record<string, string>) {
    return this.service.search(query);
  }

  @Get('me/dashboard')
  async myDashboard(@CurrentUser() profile: Profile) {
    if (profile.role !== 'professional') {
      throw new ForbiddenException('Apenas profissionais acessam o dashboard');
    }
    const pro = await this.repo.findByProfileId(profile.id);
    if (!pro) {
      throw new ForbiddenException('Perfil profissional não encontrado');
    }

    const [upcomingVisits, activeWorks, pendingConversations, doneWorks] =
      await Promise.all([
        this.db.query(
          `SELECT v.id, v.scheduled_at, v.status, v.address,
                  p.full_name AS client_name
             FROM visits v
             INNER JOIN profiles p ON p.id = v.client_id
             WHERE v.professional_id = $1
               AND v.status = 'confirmed'
               AND v.scheduled_at >= now() - interval '1 day'
             ORDER BY v.scheduled_at ASC
             LIMIT 10`,
          [pro.id],
        ),
        this.db.query(
          `SELECT w.id, w.title, w.status, w.progress_pct, w.next_step,
                  p.full_name AS client_name
             FROM works w
             INNER JOIN profiles p ON p.id = w.client_id
             WHERE w.professional_id = $1 AND w.status = 'active'
             ORDER BY w.started_at DESC
             LIMIT 10`,
          [pro.id],
        ),
        this.db.query(
          `SELECT count(*)::int AS total
             FROM conversations c
             WHERE c.professional_id = $1`,
          [pro.id],
        ),
        this.db.query(
          `SELECT count(*)::int AS total
             FROM works w
             WHERE w.professional_id = $1 AND w.status = 'completed'`,
          [pro.id],
        ),
      ]);

    return {
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      },
      professional: {
        id: pro.id,
        rating: pro.rating_avg,
        rating_count: pro.jobs_completed,
      },
      stats: {
        upcoming_visits: upcomingVisits.rows.length,
        active_works: activeWorks.rows.length,
        pending_conversations: pendingConversations.rows[0]?.total ?? 0,
        completed_works: doneWorks.rows[0]?.total ?? 0,
      },
      upcoming_visits: upcomingVisits.rows,
      active_works: activeWorks.rows,
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.repo.findByIdWithReviews(id);
  }
}
