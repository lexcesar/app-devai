import { Module } from '@nestjs/common';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { AvailabilityRepository, VisitsRepository } from './visits.repository';

@Module({
  imports: [ProfessionalsModule],
  controllers: [VisitsController],
  providers: [VisitsService, AvailabilityRepository, VisitsRepository],
})
export class VisitsModule {}
