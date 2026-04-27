import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfessionalsRepository } from './professionals.repository';
import { SearchProfessionalsSchema } from '@obrafacil/shared';
import type {
  ProfessionalWithProfile,
  SearchProfessionalsInput,
} from '@obrafacil/shared';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly repo: ProfessionalsRepository) {}

  async search(
    rawInput: unknown,
    excludeProfileId?: string,
  ): Promise<{ professionals: ProfessionalWithProfile[]; total: number }> {
    const input: SearchProfessionalsInput =
      SearchProfessionalsSchema.parse(rawInput);
    const professionals = await this.repo.search({
      query: input.q,
      service: input.service,
      city: input.city,
      limit: input.limit,
      offset: input.offset,
      excludeProfileId,
    });
    return { professionals, total: professionals.length };
  }

  async findById(id: string): Promise<ProfessionalWithProfile> {
    const professional = await this.repo.findById(id);
    if (!professional)
      throw new NotFoundException('Profissional não encontrado');
    return professional;
  }
}
