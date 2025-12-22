import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationSchedulerService } from './evaluation-scheduler.service';
import {
  EvaluateControlDto,
  EvaluateObligationDto,
  CalculateReadinessDto,
  GenerateRisksDto,
  RunEvaluationDto,
} from './dto/evaluate-control.dto';

@Controller('evaluation')
export class EvaluationController {
  constructor(
    private readonly evaluationService: EvaluationService,
    private readonly schedulerService: EvaluationSchedulerService,
  ) {}

  /**
   * Evaluate a single control's status
   * POST /evaluation/control
   */
  @Post('control')
  async evaluateControl(@Body() dto: EvaluateControlDto) {
    return this.evaluationService.evaluateControl(dto.companyId, dto.controlId);
  }

  /**
   * Evaluate an obligation's status
   * POST /evaluation/obligation
   */
  @Post('obligation')
  async evaluateObligation(@Body() dto: EvaluateObligationDto) {
    return this.evaluationService.evaluateObligation(
      dto.companyId,
      dto.obligationId,
    );
  }

  /**
   * Calculate readiness score for a company
   * POST /evaluation/readiness
   */
  @Post('readiness')
  async calculateReadinessScore(@Body() dto: CalculateReadinessDto) {
    return this.evaluationService.calculateReadinessScore(dto.companyId);
  }

  /**
   * Generate risks for a company
   * POST /evaluation/risks
   */
  @Post('risks')
  async generateRisks(@Body() dto: GenerateRisksDto) {
    const risks = await this.evaluationService.generateRisks(dto.companyId);
    await this.evaluationService.persistRisks(dto.companyId, risks);
    return { risks, count: risks.length };
  }

  /**
   * Run full evaluation for a company
   * POST /evaluation/run
   */
  @Post('run')
  async runFullEvaluation(@Body() dto: RunEvaluationDto) {
    return this.evaluationService.runFullEvaluation(dto.companyId);
  }

  /**
   * Get readiness score for a company (convenience GET endpoint)
   * GET /evaluation/:companyId/readiness
   */
  @Get(':companyId/readiness')
  async getReadinessScore(@Param('companyId') companyId: string) {
    return this.evaluationService.calculateReadinessScore(companyId);
  }

  /**
   * Get current risks for a company
   * GET /evaluation/:companyId/risks
   */
  @Get(':companyId/risks')
  async getRisks(@Param('companyId') companyId: string) {
    const risks = await this.evaluationService.generateRisks(companyId);
    return { risks, count: risks.length };
  }

  /**
   * Trigger manual evaluation for a company
   * POST /evaluation/:companyId/trigger
   */
  @Post(':companyId/trigger')
  async triggerEvaluation(@Param('companyId') companyId: string) {
    return this.schedulerService.triggerManualEvaluation(companyId);
  }

  /**
   * Get job execution history
   * GET /evaluation/jobs/history
   */
  @Get('jobs/history')
  async getJobHistory() {
    return this.schedulerService.getJobHistory();
  }
}
