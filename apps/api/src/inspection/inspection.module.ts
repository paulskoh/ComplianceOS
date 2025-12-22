import { Module } from '@nestjs/common';
import { InspectionService } from './inspection.service';
import { InspectionController } from './inspection.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [InspectionService],
  controllers: [InspectionController],
  exports: [InspectionService],
})
export class InspectionModule {}
