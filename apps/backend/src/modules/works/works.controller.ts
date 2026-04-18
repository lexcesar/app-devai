import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../core/guards/clerk-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { WorksRepository } from './works.repository';
import { ProfessionalsRepository } from '../professionals/professionals.repository';
import type { Profile } from '@obrafacil/shared';

@ApiTags('works')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('v1/works')
export class WorksController {
  constructor(
    private readonly repo: WorksRepository,
    private readonly professionalsRepo: ProfessionalsRepository,
  ) {}

  @Get()
  async findAll(@CurrentUser() profile: Profile) {
    if (profile.role === 'professional') {
      const pro = await this.professionalsRepo.findByProfileId(profile.id);
      if (!pro) return [];
      return this.repo.findAllByProfessional(pro.id);
    }
    return this.repo.findAllByClient(profile.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const work = await this.repo.findById(id);
    if (!work) throw new NotFoundException('Obra não encontrada');
    return work;
  }

  @Patch(':id/progress')
  async updateProgress(
    @Param('id') id: string,
    @CurrentUser() profile: Profile,
    @Body() body: { progressPct?: number },
  ) {
    const pct = Number(body.progressPct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      throw new BadRequestException('progressPct deve ser entre 0 e 100');
    }
    await this.assertIsWorksProfessional(id, profile);
    return this.repo.updateProgress(id, pct);
  }

  @Patch(':id/start')
  async start(@Param('id') id: string, @CurrentUser() profile: Profile) {
    const work = await this.assertIsWorksProfessional(id, profile);
    if (work.status !== 'scheduled') {
      throw new ConflictException('Apenas obras agendadas podem ser iniciadas');
    }
    return this.repo.updateStatus(id, 'active');
  }

  @Patch(':id/complete')
  async complete(@Param('id') id: string, @CurrentUser() profile: Profile) {
    const work = await this.assertIsWorksProfessional(id, profile);
    if (work.status !== 'active') {
      throw new ConflictException(
        'Apenas obras ativas podem ser marcadas como concluídas',
      );
    }
    return this.repo.updateStatus(id, 'completed');
  }

  private async assertIsWorksProfessional(workId: string, profile: Profile) {
    const work = await this.repo.findById(workId);
    if (!work) throw new NotFoundException('Obra não encontrada');
    if (profile.role !== 'professional') {
      throw new ForbiddenException(
        'Apenas o profissional responsável pode alterar a obra',
      );
    }
    const pro = await this.professionalsRepo.findByProfileId(profile.id);
    if (!pro || pro.id !== work.professional_id) {
      throw new ForbiddenException('Esta obra pertence a outro profissional');
    }
    return work;
  }
}
