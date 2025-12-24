import { Module } from '@nestjs/common';
import { EvidenceRequirementsController } from './evidence-requirements.controller';
import { EvidenceRequirementsService } from './evidence-requirements.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EvidenceRequirementsController],
  providers: [EvidenceRequirementsService],
  exports: [EvidenceRequirementsService],
})
export class EvidenceRequirementsModule {}
