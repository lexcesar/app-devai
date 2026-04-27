import { Module } from '@nestjs/common';
import { WorksController } from './works.controller';
import { WorksRepository } from './works.repository';
import { ProfessionalsModule } from '../professionals/professionals.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [ProfessionalsModule, NotificationsModule],
  controllers: [WorksController],
  providers: [WorksRepository],
  exports: [WorksRepository],
})
export class WorksModule {}
