import { Module } from '@nestjs/common';
import { WorkflowsController } from './workflows.controller';
// import { WorkflowExecutionService } from './workflow-execution.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [WorkflowsController],
  providers: [], // WorkflowExecutionService disabled - schema uses WorkflowInstance
  exports: [],
})
export class WorkflowsModule {}
