import { Module } from '@nestjs/common';
import { WorksController } from './works.controller';
import { WorksRepository } from './works.repository';
import { ProfessionalsModule } from '../professionals/professionals.module';

@Module({
  imports: [ProfessionalsModule],
  controllers: [WorksController],
  providers: [WorksRepository],
})
export class WorksModule {}
