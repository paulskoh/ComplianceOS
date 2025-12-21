import { Module } from '@nestjs/common';
import { TrainingController } from './training.controller';

@Module({
  controllers: [TrainingController],
})
export class TrainingModule {}
