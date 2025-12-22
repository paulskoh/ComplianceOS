import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { EvaluationSchedulerService } from './evaluation-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EvaluationController],
  providers: [EvaluationService, EvaluationSchedulerService],
  exports: [EvaluationService, EvaluationSchedulerService],
})
export class EvaluationModule {}
