import { Module } from '@nestjs/common';
import { ApplicabilityController } from './applicability.controller';
import { ApplicabilityService } from './applicability.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApplicabilityController],
  providers: [ApplicabilityService],
  exports: [ApplicabilityService],
})
export class ApplicabilityModule {}
