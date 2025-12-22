import { Module } from '@nestjs/common';
import { ReadinessService } from './readiness.service';
import { ReadinessController } from './readiness.controller';
import { SimulationService } from './simulation.service';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [AuditLogModule],
  providers: [ReadinessService, SimulationService],
  controllers: [ReadinessController],
  exports: [ReadinessService, SimulationService],
})
export class ReadinessModule {}
