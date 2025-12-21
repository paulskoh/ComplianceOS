import { Module } from '@nestjs/common';
import { InspectionPacksService } from './inspection-packs.service';
import { InspectionPacksController } from './inspection-packs.controller';
import { PackGeneratorService } from './pack-generator.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [InspectionPacksService, PackGeneratorService],
  controllers: [InspectionPacksController],
})
export class InspectionPacksModule {}
