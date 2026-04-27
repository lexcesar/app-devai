import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../core/guards/clerk-auth.guard';
import { CurrentAccount } from '../../core/decorators/current-account.decorator';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsRepository } from './professionals.repository';
import { DatabaseService } from '../../database/database.service';
import {
  UpdateProfessionalSchema,
  computeCompleteness,
  deriveVisibilityStatus,
} from '@obrafacil/shared';
import type { AccountContext } from '@obrafacil/shared';

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
  search(
    @Query() query: Record<string, string>,
    @CurrentAccount() account: AccountContext,
  ) {
    // Exclude the authenticated user's own professional profile from results
    // so a professional cannot see or hire themselves.
    return this.service.search(query, account.profile.id);
  }

  @Get('me/dashboard')
  async myDashboard(@CurrentAccount() account: AccountContext) {
    if (account.actingAs !== 'professional') {
      throw new ForbiddenException('Apenas profissionais acessam o dashboard');
    }
    const pro = await this.repo.findByProfileId(account.profile.id);
    if (!pro) {
      throw new ForbiddenException('Perfil profissional não encontrado');
    }

    const completeness = computeCompleteness({
      specialty: pro.specialty,
      bio: pro.bio,
      full_name: pro.profiles.full_name,
    });

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
             WHERE w.professional_id = $1 AND w.status IN ('scheduled', 'active')
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
        id: account.profile.id,
        full_name: account.profile.full_name,
        avatar_url: account.profile.avatar_url,
      },
      professional: {
        id: pro.id,
        rating: pro.rating_avg,
        rating_count: pro.jobs_completed,
        visibility_status: pro.visibility_status,
        is_complete: completeness.complete,
        missing_fields: completeness.missing,
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

  @Get('me')
  @ApiOperation({ summary: 'Perfil profissional do usuário autenticado' })
  async getMyProfile(@CurrentAccount() account: AccountContext) {
    const pro = await this.repo.findByProfileId(account.profile.id);
    if (!pro) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }
    return pro;
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar perfil profissional' })
  async updateMyProfile(
    @CurrentAccount() account: AccountContext,
    @Body() body: unknown,
  ) {
    const input = UpdateProfessionalSchema.parse(body);

    const pro = await this.repo.findByProfileId(account.profile.id);
    if (!pro) {
      throw new NotFoundException('Perfil profissional não encontrado');
    }

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.specialty !== undefined) {
      setClauses.push(`specialty = $${idx++}`);
      values.push(input.specialty);
    }
    if (input.bio !== undefined) {
      setClauses.push(`bio = $${idx++}`);
      values.push(input.bio);
    }
    if (input.city !== undefined) {
      setClauses.push(`city = $${idx++}`);
      values.push(input.city);
    }
    if (input.display_name !== undefined) {
      setClauses.push(`display_name = $${idx++}`);
      values.push(input.display_name);
    }

    // Recompute visibility_status based on merged data after patch
    const mergedSpecialty = input.specialty ?? pro.specialty;
    const mergedBio = input.bio ?? pro.bio;
    const completeness = computeCompleteness({
      specialty: mergedSpecialty,
      bio: mergedBio,
      full_name: pro.profiles.full_name,
    });
    const newStatus = deriveVisibilityStatus(completeness);
    // Only change if not already inactive (user did not manually deactivate)
    if (pro.visibility_status !== 'inactive') {
      setClauses.push(`visibility_status = $${idx++}`);
      values.push(newStatus);
      if (newStatus === 'active' && pro.visibility_status !== 'active') {
        setClauses.push(`published_at = $${idx++}`);
        values.push(new Date().toISOString());
      }
    }

    if (setClauses.length > 0) {
      values.push(pro.id);
      await this.db.query(
        `UPDATE professionals SET ${setClauses.join(', ')} WHERE id = $${idx}`,
        values,
      );
    }

    const updated = await this.repo.findByProfileId(account.profile.id);
    const finalCompleteness = computeCompleteness({
      specialty: updated?.specialty,
      bio: updated?.bio,
      full_name: updated?.profiles.full_name,
    });
    return {
      ...updated,
      is_complete: finalCompleteness.complete,
      missing_fields: finalCompleteness.missing,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const pro = await this.repo.findByIdWithReviews(id);
    if (!pro) throw new NotFoundException('Profissional não encontrado');
    return pro;
  }
}
