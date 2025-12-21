import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { Cron, CronExpression } from '@nestjs/schedule';

interface ApprovalRequest {
  workflowExecutionId: string;
  stepId: string;
  approverId: string;
  decision: 'APPROVED' | 'REJECTED';
  comments?: string;
}

@Injectable()
export class WorkflowExecutionService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  /**
   * Start a workflow execution
   */
  async startWorkflow(
    tenantId: string,
    userId: string,
    workflowId: string,
    context: Record<string, any>,
  ) {
    const workflow = await this.prisma.workflowDefinition.findFirst({
      where: { id: workflowId, tenantId },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    // Create execution
    const execution = await this.prisma.workflowExecution.create({
      data: {
        tenantId,
        workflowId,
        status: 'RUNNING',
        currentStep: 0,
        context,
        startedById: userId,
      },
    });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'WORKFLOW_STARTED',
      resourceType: 'WorkflowExecution',
      resourceId: execution.id,
      metadata: { workflowId, context },
    });

    // Execute first step
    await this.executeNextStep(execution.id, tenantId, userId);

    return execution;
  }

  /**
   * Execute next step in workflow
   */
  private async executeNextStep(
    executionId: string,
    tenantId: string,
    userId: string,
  ) {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: { id: executionId, tenantId },
      include: { workflow: true },
    });

    if (!execution || execution.status !== 'RUNNING') {
      return;
    }

    const steps = (execution.workflow.steps as any[]) || [];
    const currentStepIndex = execution.currentStep;

    if (currentStepIndex >= steps.length) {
      // Workflow complete
      await this.completeWorkflow(executionId, tenantId, userId);
      return;
    }

    const step = steps[currentStepIndex];

    // Execute step based on type
    switch (step.type) {
      case 'APPROVAL':
        await this.executeApprovalStep(execution, step, tenantId);
        break;
      case 'NOTIFICATION':
        await this.executeNotificationStep(execution, step, tenantId);
        break;
      case 'TASK_CREATION':
        await this.executeTaskCreationStep(execution, step, tenantId, userId);
        break;
      case 'CONDITION':
        await this.executeConditionStep(execution, step, tenantId, userId);
        break;
      default:
        // Move to next step
        await this.moveToNextStep(executionId, tenantId, userId);
    }
  }

  /**
   * Execute approval step
   */
  private async executeApprovalStep(
    execution: any,
    step: any,
    tenantId: string,
  ) {
    // Create approval task
    await this.prisma.task.create({
      data: {
        tenantId,
        title: `[승인 필요] ${step.name}`,
        description: step.description || `${execution.workflow.name} 워크플로우 승인 필요`,
        type: 'APPROVAL',
        status: 'PENDING',
        priority: step.priority || 'MEDIUM',
        dueDate: new Date(Date.now() + (step.timeoutHours || 48) * 60 * 60 * 1000),
        assigneeId: step.approverId,
        metadata: {
          workflowExecutionId: execution.id,
          stepId: step.id,
          requiresApproval: true,
        },
      },
    });

    // Update execution status
    await this.prisma.workflowExecution.update({
      where: { id: execution.id },
      data: { status: 'WAITING_APPROVAL' },
    });
  }

  /**
   * Execute notification step
   */
  private async executeNotificationStep(
    execution: any,
    step: any,
    tenantId: string,
  ) {
    // Create notification task
    await this.prisma.task.create({
      data: {
        tenantId,
        title: `[알림] ${step.name}`,
        description: step.message || step.description,
        type: 'NOTIFICATION',
        status: 'COMPLETED',
        priority: 'LOW',
        assigneeId: step.recipientId,
      },
    });

    // Move to next step immediately
    await this.moveToNextStep(execution.id, tenantId, execution.startedById);
  }

  /**
   * Execute task creation step
   */
  private async executeTaskCreationStep(
    execution: any,
    step: any,
    tenantId: string,
    userId: string,
  ) {
    // Create task
    await this.prisma.task.create({
      data: {
        tenantId,
        title: step.taskTitle || step.name,
        description: step.taskDescription || step.description,
        type: step.taskType || 'ACTION',
        status: 'PENDING',
        priority: step.priority || 'MEDIUM',
        dueDate: step.dueDate
          ? new Date(step.dueDate)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assigneeId: step.assigneeId,
        metadata: {
          workflowExecutionId: execution.id,
          stepId: step.id,
        },
      },
    });

    // Move to next step
    await this.moveToNextStep(execution.id, tenantId, userId);
  }

  /**
   * Execute conditional step
   */
  private async executeConditionStep(
    execution: any,
    step: any,
    tenantId: string,
    userId: string,
  ) {
    const context = execution.context as Record<string, any>;

    // Evaluate condition
    const conditionMet = this.evaluateCondition(step.condition, context);

    if (conditionMet) {
      // Execute "then" branch
      if (step.thenStepId) {
        const thenStepIndex = (execution.workflow.steps as any[]).findIndex(
          (s) => s.id === step.thenStepId,
        );
        if (thenStepIndex !== -1) {
          await this.prisma.workflowExecution.update({
            where: { id: execution.id },
            data: { currentStep: thenStepIndex },
          });
          await this.executeNextStep(execution.id, tenantId, userId);
          return;
        }
      }
    } else {
      // Execute "else" branch
      if (step.elseStepId) {
        const elseStepIndex = (execution.workflow.steps as any[]).findIndex(
          (s) => s.id === step.elseStepId,
        );
        if (elseStepIndex !== -1) {
          await this.prisma.workflowExecution.update({
            where: { id: execution.id },
            data: { currentStep: elseStepIndex },
          });
          await this.executeNextStep(execution.id, tenantId, userId);
          return;
        }
      }
    }

    // Default: move to next step
    await this.moveToNextStep(execution.id, tenantId, userId);
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(
    condition: any,
    context: Record<string, any>,
  ): boolean {
    if (!condition) return true;

    const { field, operator, value } = condition;
    const contextValue = context[field];

    switch (operator) {
      case 'EQUALS':
        return contextValue === value;
      case 'NOT_EQUALS':
        return contextValue !== value;
      case 'GREATER_THAN':
        return contextValue > value;
      case 'LESS_THAN':
        return contextValue < value;
      case 'CONTAINS':
        return String(contextValue).includes(value);
      case 'EXISTS':
        return contextValue !== undefined && contextValue !== null;
      default:
        return true;
    }
  }

  /**
   * Process approval decision
   */
  async processApproval(
    tenantId: string,
    userId: string,
    request: ApprovalRequest,
  ) {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: { id: request.workflowExecutionId, tenantId },
    });

    if (!execution || execution.status !== 'WAITING_APPROVAL') {
      throw new Error('Invalid workflow execution');
    }

    // Update task
    await this.prisma.task.updateMany({
      where: {
        tenantId,
        metadata: {
          path: ['workflowExecutionId'],
          equals: execution.id,
        },
        type: 'APPROVAL',
        status: 'PENDING',
      },
      data: {
        status: request.decision === 'APPROVED' ? 'COMPLETED' : 'REJECTED',
        completedAt: new Date(),
      },
    });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType:
        request.decision === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
      resourceType: 'WorkflowExecution',
      resourceId: execution.id,
      metadata: {
        stepId: request.stepId,
        comments: request.comments,
      },
    });

    if (request.decision === 'REJECTED') {
      // Reject workflow
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'REJECTED',
          completedAt: new Date(),
        },
      });
      return { status: 'REJECTED' };
    }

    // Continue workflow
    await this.prisma.workflowExecution.update({
      where: { id: execution.id },
      data: { status: 'RUNNING' },
    });

    await this.moveToNextStep(execution.id, tenantId, userId);

    return { status: 'APPROVED', continuing: true };
  }

  /**
   * Move to next step
   */
  private async moveToNextStep(
    executionId: string,
    tenantId: string,
    userId: string,
  ) {
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: { currentStep: { increment: 1 } },
    });

    await this.executeNextStep(executionId, tenantId, userId);
  }

  /**
   * Complete workflow
   */
  private async completeWorkflow(
    executionId: string,
    tenantId: string,
    userId: string,
  ) {
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'WORKFLOW_COMPLETED',
      resourceType: 'WorkflowExecution',
      resourceId: executionId,
    });
  }

  /**
   * Cancel workflow
   */
  async cancelWorkflow(tenantId: string, userId: string, executionId: string) {
    await this.prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    await this.auditLog.log({
      tenantId,
      userId,
      eventType: 'WORKFLOW_CANCELLED',
      resourceType: 'WorkflowExecution',
      resourceId: executionId,
    });
  }

  /**
   * Check for SLA violations (runs every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkSLAViolations() {
    const executions = await this.prisma.workflowExecution.findMany({
      where: {
        status: 'WAITING_APPROVAL',
        createdAt: { lt: new Date(Date.now() - 48 * 60 * 60 * 1000) }, // 48 hours
      },
      include: { workflow: true },
    });

    for (const execution of executions) {
      // Escalate or auto-reject
      await this.prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SLA_VIOLATED',
          metadata: {
            ...((execution.metadata as any) || {}),
            slaViolated: true,
            violatedAt: new Date(),
          },
        },
      });

      // Create escalation task
      await this.prisma.task.create({
        data: {
          tenantId: execution.tenantId,
          title: `[SLA 위반] ${execution.workflow.name} 승인 지연`,
          description: `워크플로우 "${execution.workflow.name}"이(가) 48시간 이상 승인 대기 중입니다.`,
          type: 'ESCALATION',
          status: 'PENDING',
          priority: 'CRITICAL',
          metadata: {
            workflowExecutionId: execution.id,
            slaViolation: true,
          },
        },
      });
    }
  }

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(tenantId: string, executionId: string) {
    const execution = await this.prisma.workflowExecution.findFirst({
      where: { id: executionId, tenantId },
      include: {
        workflow: true,
        startedBy: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    const steps = (execution.workflow.steps as any[]) || [];
    const currentStepIndex = execution.currentStep;

    return {
      ...execution,
      totalSteps: steps.length,
      completedSteps: currentStepIndex,
      currentStepName: steps[currentStepIndex]?.name,
      progress: Math.round((currentStepIndex / steps.length) * 100),
    };
  }
}
