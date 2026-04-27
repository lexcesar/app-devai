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
import { CurrentAccount } from '../../core/decorators/current-account.decorator';
import { VisitsService } from './visits.service';
import { ProfessionalsRepository } from '../professionals/professionals.repository';
import type { AccountContext } from '@obrafacil/shared';

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
  async getMyAvailability(@CurrentAccount() account: AccountContext) {
    if (account.actingAs !== 'professional') {
      throw new ForbiddenException(
        'Apenas profissionais podem gerenciar disponibilidade',
      );
    }
    const pro = await this.professionalsRepo.findByProfileId(
      account.profile.id,
    );
    if (!pro)
      throw new ForbiddenException('Perfil profissional não encontrado');
    return this.service.getMyAvailability(pro.id);
  }

  /** Replace all availability slots */
  @Put('availability')
  async setAvailability(
    @CurrentAccount() account: AccountContext,
    @Body() body: unknown,
  ) {
    if (account.actingAs !== 'professional') {
      throw new ForbiddenException(
        'Apenas profissionais podem gerenciar disponibilidade',
      );
    }
    const pro = await this.professionalsRepo.findByProfileId(
      account.profile.id,
    );
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
  findAll(@CurrentAccount() account: AccountContext) {
    return this.service.findAll(account.profile.id, account.actingAs);
  }

  @Get('visits/:id')
  findOne(@Param('id') id: string, @CurrentAccount() account: AccountContext) {
    return this.service.findById(id, account.profile);
  }

  @Post('visits')
  book(@CurrentAccount() account: AccountContext, @Body() body: unknown) {
    if (!account.roles.includes('client')) {
      throw new ForbiddenException('Apenas clientes podem agendar visitas');
    }
    return this.service.book(account.profile, body);
  }

  @Patch('visits/:id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentAccount() account: AccountContext,
    @Body() body: { reason?: string },
  ) {
    return this.service.cancel(id, account.profile, body?.reason);
  }

  @Patch('visits/:id/complete')
  complete(@Param('id') id: string, @CurrentAccount() account: AccountContext) {
    return this.service.complete(id, account.actingAs);
  }

  @Patch('visits/:id/accept')
  accept(@Param('id') id: string, @CurrentAccount() account: AccountContext) {
    if (account.actingAs !== 'professional') {
      throw new ForbiddenException(
        'Apenas profissionais podem aceitar visitas',
      );
    }
    return this.service.accept(id, account.profile);
  }

  @Patch('visits/:id/reject')
  reject(
    @Param('id') id: string,
    @CurrentAccount() account: AccountContext,
    @Body() body: { reason?: string },
  ) {
    if (account.actingAs !== 'professional') {
      throw new ForbiddenException(
        'Apenas profissionais podem recusar visitas',
      );
    }
    return this.service.reject(id, account.profile, body?.reason);
  }
}
