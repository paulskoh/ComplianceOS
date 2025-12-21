import { Module } from '@nestjs/common';
import { ObligationsService } from './obligations.service';
import { ObligationsController } from './obligations.controller';

@Module({
  providers: [ObligationsService],
  controllers: [ObligationsController],
  exports: [ObligationsService],
})
export class ObligationsModule {}
