import { Module } from '@nestjs/common';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsRepository } from './professionals.repository';

@Module({
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService, ProfessionalsRepository],
  exports: [ProfessionalsRepository],
})
export class ProfessionalsModule {}
