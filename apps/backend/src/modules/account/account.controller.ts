import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ClerkAuthGuard } from '../../core/guards/clerk-auth.guard';
import { CurrentAccount } from '../../core/decorators/current-account.decorator';
import { DatabaseService } from '../../database/database.service';
import {
  ActivateProfessionalSchema,
  UpdateProfileSchema,
  computeCompleteness,
  deriveVisibilityStatus,
} from '@obrafacil/shared';
import type { AccountContext, UserRole } from '@obrafacil/shared';

@ApiTags('account')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('v1/account')
export class AccountController {
  constructor(private readonly db: DatabaseService) {}

  /** Returns the authenticated user's profile + active roles + current actingAs. */
  @Get('me')
  @ApiOperation({ summary: 'Perfil + papéis ativos da conta autenticada' })
  getMe(@CurrentAccount() account: AccountContext) {
    return account;
  }

  /**
   * Activates the professional role for the authenticated account.
   * Creates the professionals record (if not exists) and upserts account_roles.
   * After activation, the user can send X-Acting-As: professional to operate
   * in professional context without creating a new account.
   */
  @Post('roles/professional/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativar papel de profissional na conta' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['specialty'],
      properties: {
        specialty: {
          type: 'string',
          example: 'Eletricista',
          minLength: 2,
          maxLength: 100,
        },
        bio: {
          type: 'string',
          example: '10 anos de experiência',
          maxLength: 500,
        },
        city: { type: 'string', example: 'São Paulo', maxLength: 100 },
      },
    },
  })
  async activateProfessionalRole(
    @CurrentAccount() account: AccountContext,
    @Body() body: unknown,
  ) {
    const input = ActivateProfessionalSchema.parse(body);

    const profileId = account.profile.id;

    // Check if professional record already exists
    const { rows: existingPro } = await this.db.query<{ id: string }>(
      `SELECT id FROM professionals WHERE profile_id = $1`,
      [profileId],
    );

    let professionalId: string;

    if (existingPro.length) {
      professionalId = existingPro[0].id;
    } else {
      const { rows: newPro } = await this.db.query<{ id: string }>(
        `INSERT INTO professionals (profile_id, specialty, bio)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [profileId, input.specialty, input.bio ?? null],
      );
      professionalId = newPro[0].id;
    }

    // Upsert account_roles entry for professional role
    await this.db.query(
      `INSERT INTO account_roles (profile_id, role, is_active, is_primary)
       VALUES ($1, 'professional', true, false)
       ON CONFLICT (profile_id, role) DO UPDATE SET is_active = true`,
      [profileId],
    );

    // Also update the professionals record if it exists but bio/specialty changed
    await this.db.query(
      `UPDATE professionals SET specialty = $2, bio = COALESCE($3, bio),
          city = COALESCE($4, city)
       WHERE id = $1`,
      [professionalId, input.specialty, input.bio ?? null, input.city ?? null],
    );

    // Recompute visibility_status
    const { rows: proRow } = await this.db.query<{
      bio: string | null;
      full_name: string;
    }>(
      `SELECT p.bio, pr.full_name
         FROM professionals p
         INNER JOIN profiles pr ON pr.id = p.profile_id
        WHERE p.id = $1`,
      [professionalId],
    );
    const completeness = computeCompleteness({
      specialty: input.specialty,
      bio: proRow[0]?.bio ?? null,
      full_name: proRow[0]?.full_name ?? null,
    });
    const visibilityStatus = deriveVisibilityStatus(completeness);

    await this.db.query(
      `UPDATE professionals SET visibility_status = $2${visibilityStatus === 'active' ? ', published_at = now()' : ''}
       WHERE id = $1`,
      [professionalId, visibilityStatus],
    );

    // Auto-switch the profile's active role to 'professional' so the frontend
    // immediately reflects the correct type without requiring a manual switch.
    await this.db.query(
      `UPDATE profiles SET role = 'professional', updated_at = now() WHERE id = $1`,
      [profileId],
    );

    const { rows: roles } = await this.db.query<{ role: UserRole }>(
      `SELECT role FROM account_roles WHERE profile_id = $1 AND is_active = true`,
      [profileId],
    );

    return {
      professionalId,
      roles: roles.map((r) => r.role),
      visibility_status: visibilityStatus,
      is_complete: completeness.complete,
      missing_fields: completeness.missing,
      message:
        visibilityStatus === 'active'
          ? 'Perfil profissional ativado com sucesso'
          : 'Perfil salvo como rascunho. Complete os dados para aparecer na listagem.',
    };
  }

  /**
   * Deactivates a role from the account.
   * Cannot deactivate the primary role.
   */
  @Post('roles/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Desativar um papel da conta' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['role'],
      properties: {
        role: {
          type: 'string',
          enum: ['client', 'professional', 'store'],
          example: 'professional',
        },
      },
    },
  })
  async deactivateRole(
    @CurrentAccount() account: AccountContext,
    @Body() body: unknown,
  ) {
    const input = z
      .object({ role: z.enum(['client', 'professional', 'store']) })
      .parse(body);

    const profileId = account.profile.id;

    const { rows } = await this.db.query<{ is_primary: boolean }>(
      `SELECT is_primary FROM account_roles WHERE profile_id = $1 AND role = $2`,
      [profileId, input.role],
    );

    if (!rows.length) {
      throw new ConflictException('Papel não encontrado nesta conta');
    }

    if (rows[0].is_primary) {
      throw new ConflictException('Não é possível desativar o papel primário');
    }

    await this.db.query(
      `UPDATE account_roles SET is_active = false WHERE profile_id = $1 AND role = $2`,
      [profileId, input.role],
    );

    // When deactivating the professional role, also hide from public listings
    if (input.role === 'professional') {
      await this.db.query(
        `UPDATE professionals SET visibility_status = 'inactive' WHERE profile_id = $1`,
        [profileId],
      );
    }

    const { rows: updated } = await this.db.query<{ role: UserRole }>(
      `SELECT role FROM account_roles WHERE profile_id = $1 AND is_active = true`,
      [profileId],
    );

    // If profiles.role matches the deactivated role, reset it to the primary
    // active role (or 'client' as safe default) so the bypass guard and
    // actingAs fallback are consistent after deactivation.
    const fallbackRole: UserRole =
      (updated.find((r) => r.role === 'client')?.role) ??
      (updated[0]?.role) ??
      'client';
    await this.db.query(
      `UPDATE profiles SET role = $1, updated_at = now()
         WHERE id = $2 AND role = $3`,
      [fallbackRole, profileId, input.role],
    );

    return { roles: updated.map((r) => r.role) };
  }

  /**
   * Persists the preferred acting-as role for the account.
   * Updates profiles.role and sets the cookie value on the client side.
   */
  @Patch('acting-as')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Persistir papel ativo da conta' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['role'],
      properties: {
        role: { type: 'string', enum: ['client', 'professional', 'store'] },
      },
    },
  })
  async setActingAs(
    @CurrentAccount() account: AccountContext,
    @Body() body: unknown,
  ) {
    const input = z
      .object({ role: z.enum(['client', 'professional', 'store']) })
      .parse(body);

    if (!account.roles.includes(input.role)) {
      throw new BadRequestException('Papel não disponível para esta conta');
    }

    await this.db.query(
      `UPDATE profiles SET role = $1, updated_at = now() WHERE id = $2`,
      [input.role, account.profile.id],
    );

    return { actingAs: input.role };
  }

  /**
   * Updates editable profile data for the authenticated account.
   * If the user has a professional profile, recomputes visibility_status
   * because full_name is part of the completeness check.
   */
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atualizar dados básicos do perfil do usuário' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        full_name: { type: 'string', example: 'João da Silva', maxLength: 100 },
        phone: { type: 'string', example: '(11) 99999-9999', maxLength: 20 },
        avatar_id: {
          type: 'string',
          nullable: true,
          example: 'professional-electrician-01',
          description: 'ID do avatar preset selecionado na galeria',
        },
      },
    },
  })
  async updateProfile(
    @CurrentAccount() account: AccountContext,
    @Body() body: unknown,
  ) {
    const input = UpdateProfileSchema.parse(body);
    const profileId = account.profile.id;

    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.full_name !== undefined) {
      // Reject placeholder names
      const trimmed = input.full_name.trim();
      if (!trimmed) throw new BadRequestException('Nome não pode ser vazio');
      setClauses.push(`full_name = $${idx++}`);
      values.push(trimmed);
    }

    if (input.phone !== undefined) {
      setClauses.push(`phone = $${idx++}`);
      values.push(input.phone.trim() || null);
    }

    if (input.avatar_id !== undefined) {
      setClauses.push(`avatar_id = $${idx++}`);
      values.push(input.avatar_id);
    }

    if (!setClauses.length) {
      throw new BadRequestException('Nenhum campo para atualizar');
    }

    setClauses.push(`updated_at = now()`);
    values.push(profileId);

    const { rows } = await this.db.query<{
      id: string;
      full_name: string;
      phone: string | null;
      avatar_url: string | null;
      avatar_id: string | null;
    }>(
      `UPDATE profiles SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING id, full_name, phone, avatar_url, avatar_id`,
      values,
    );

    // If the user has a professional profile, recompute visibility because
    // full_name is part of the completeness check.
    if (
      input.full_name !== undefined &&
      account.roles.includes('professional')
    ) {
      const { rows: proRows } = await this.db.query<{
        id: string;
        specialty: string;
        bio: string | null;
      }>(`SELECT id, specialty, bio FROM professionals WHERE profile_id = $1`, [
        profileId,
      ]);
      if (proRows.length) {
        const pro = proRows[0];
        const completeness = computeCompleteness({
          specialty: pro.specialty,
          bio: pro.bio,
          full_name: input.full_name.trim(),
        });
        const visibilityStatus = deriveVisibilityStatus(completeness);
        await this.db.query(
          `UPDATE professionals
              SET visibility_status = $2${visibilityStatus === 'active' ? ', published_at = COALESCE(published_at, now())' : ''}
            WHERE id = $1`,
          [pro.id, visibilityStatus],
        );
      }
    }

    return rows[0];
  }
}
