import { Module } from '@nestjs/common';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WorksModule } from '../works/works.module';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';
import { AvailabilityRepository, VisitsRepository } from './visits.repository';

@Module({
  imports: [ProfessionalsModule, NotificationsModule, WorksModule],
  controllers: [VisitsController],
  providers: [VisitsService, AvailabilityRepository, VisitsRepository],
})
export class VisitsModule {}
