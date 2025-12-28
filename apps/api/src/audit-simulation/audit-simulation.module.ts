import { Module } from '@nestjs/common';
import { AuditSimulationController } from './audit-simulation.controller';
import { AuditSimulationService } from './audit-simulation.service';

@Module({
  controllers: [AuditSimulationController],
  providers: [AuditSimulationService],
  exports: [AuditSimulationService],
})
export class AuditSimulationModule {}
