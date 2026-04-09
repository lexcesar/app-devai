import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ClerkAuthGuard } from '../../core/guards/clerk-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { VisitsService } from './visits.service';
import { ProfessionalsRepository } from '../professionals/professionals.repository';
import type { Profile } from '@obrafacil/shared';

@ApiTags('visits')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('v1')
export class VisitsController {
  constructor(
    private readonly service: VisitsService,
    private readonly professionalsRepo: ProfessionalsRepository,
  ) {}

  // ── Availability ──────────────────────────────────────────────────────────

  /** Professional's own availability config */
  @Get('availability')
  async getMyAvailability(@CurrentUser() profile: Profile) {
    if (profile.role !== 'professional') {
      throw new ForbiddenException(
        'Apenas profissionais podem gerenciar disponibilidade',
      );
    }
    const pro = await this.professionalsRepo.findByProfileId(profile.id);
    if (!pro)
      throw new ForbiddenException('Perfil profissional não encontrado');
    return this.service.getMyAvailability(pro.id);
  }

  /** Replace all availability slots */
  @Put('availability')
  async setAvailability(
    @CurrentUser() profile: Profile,
    @Body() body: unknown,
  ) {
    if (profile.role !== 'professional') {
      throw new ForbiddenException(
        'Apenas profissionais podem gerenciar disponibilidade',
      );
    }
    const pro = await this.professionalsRepo.findByProfileId(profile.id);
    if (!pro)
      throw new ForbiddenException('Perfil profissional não encontrado');
    return this.service.setAvailability(pro.id, body);
  }

  /** Available time slots for a professional (for clients to see) */
  @Get('professionals/:id/availability')
  getAvailableSlots(@Param('id') id: string) {
    return this.service.getAvailableSlots(id);
  }

  // ── Visits ────────────────────────────────────────────────────────────────

  @Get('visits')
  findAll(@CurrentUser() profile: Profile) {
    return this.service.findAll(profile);
  }

  @Get('visits/:id')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post('visits')
  book(@CurrentUser() profile: Profile, @Body() body: unknown) {
    if (profile.role !== 'client') {
      throw new ForbiddenException('Apenas clientes podem agendar visitas');
    }
    return this.service.book(profile.id, body);
  }

  @Patch('visits/:id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() profile: Profile) {
    return this.service.cancel(id, profile);
  }

  @Patch('visits/:id/complete')
  complete(@Param('id') id: string, @CurrentUser() profile: Profile) {
    return this.service.complete(id, profile);
  }
}
