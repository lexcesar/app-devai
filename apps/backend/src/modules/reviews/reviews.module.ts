import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsRepository } from './reviews.repository';
import { WorksModule } from '../works/works.module';
import { ProfessionalsModule } from '../professionals/professionals.module';

@Module({
  imports: [WorksModule, ProfessionalsModule],
  controllers: [ReviewsController],
  providers: [ReviewsRepository],
})
export class ReviewsModule {}
