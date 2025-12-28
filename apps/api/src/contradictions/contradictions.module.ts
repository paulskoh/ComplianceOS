import { Module } from '@nestjs/common';
import { ContradictionsController } from './contradictions.controller';
import { ContradictionDetectionService } from './contradiction-detection.service';

@Module({
  controllers: [ContradictionsController],
  providers: [ContradictionDetectionService],
  exports: [ContradictionDetectionService],
})
export class ContradictionsModule {}
