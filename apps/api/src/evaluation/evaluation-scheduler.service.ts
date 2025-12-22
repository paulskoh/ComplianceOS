import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluationService } from './evaluation.service';

@Injectable()
export class EvaluationSchedulerService {
  private readonly logger = new Logger(EvaluationSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluationService: EvaluationService,
  ) {}

  /**
   * Run nightly evaluation for all active companies
   * Runs every day at 2:00 AM KST
   */
  @Cron('0 2 * * *', {
    name: 'nightly-evaluation',
    timeZone: 'Asia/Seoul',
  })
  async runNightlyEvaluation() {
    this.logger.log('Starting nightly evaluation job');
    const startTime = Date.now();

    try {
      // Get all active companies (you may need to adjust this query based on your schema)
      const companies = await this.prisma.company.findMany({
        where: {
          // Add conditions for active companies if needed
        },
        select: {
          id: true,
          name: true,
        },
      });

      this.logger.log(`Found ${companies.length} companies to evaluate`);

      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ companyId: string; error: string }> = [];

      // Evaluate each company
      for (const company of companies) {
        try {
          this.logger.log(`Evaluating company ${company.id} (${company.name})`);

          const result = await this.evaluationService.runFullEvaluation(
            company.id,
          );

          this.logger.log(
            `Company ${company.id} evaluation complete: ` +
              `Score ${result.readinessScore.overall}%, ` +
              `${result.risks.length} risks detected`,
          );

          successCount++;
        } catch (error) {
          errorCount++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Error evaluating company ${company.id}:`,
            errorMessage,
          );
          errors.push({
            companyId: company.id,
            error: errorMessage,
          });
        }
      }

      const duration = Date.now() - startTime;

      this.logger.log(
        `Nightly evaluation job complete: ` +
          `${successCount} successful, ${errorCount} errors, ` +
          `${duration}ms total`,
      );

      // Log job summary
      await this.logJobSummary({
        jobType: 'NIGHTLY_EVALUATION',
        startTime: new Date(startTime),
        endTime: new Date(),
        duration,
        companiesProcessed: companies.length,
        successCount,
        errorCount,
        errors,
      });
    } catch (error) {
      this.logger.error('Nightly evaluation job failed:', error);
      throw error;
    }
  }

  /**
   * Run weekly deep evaluation with additional checks
   * Runs every Sunday at 3:00 AM KST
   */
  @Cron('0 3 * * 0', {
    name: 'weekly-deep-evaluation',
    timeZone: 'Asia/Seoul',
  })
  async runWeeklyDeepEvaluation() {
    this.logger.log('Starting weekly deep evaluation job');

    try {
      const companies = await this.prisma.company.findMany({
        select: { id: true, name: true },
      });

      for (const company of companies) {
        // Run full evaluation
        await this.evaluationService.runFullEvaluation(company.id);

        // Additional weekly checks could go here:
        // - Check for expired evidence that hasn't been replaced
        // - Identify controls that haven't been reviewed in 90 days
        // - Generate weekly compliance report
      }

      this.logger.log('Weekly deep evaluation job complete');
    } catch (error) {
      this.logger.error('Weekly deep evaluation job failed:', error);
    }
  }

  /**
   * Trigger evaluation for a specific company manually
   */
  async triggerManualEvaluation(companyId: string) {
    this.logger.log(`Triggering manual evaluation for company ${companyId}`);

    try {
      const result = await this.evaluationService.runFullEvaluation(companyId);

      await this.logJobSummary({
        jobType: 'MANUAL_EVALUATION',
        startTime: new Date(Date.now() - result.duration),
        endTime: new Date(),
        duration: result.duration,
        companiesProcessed: 1,
        successCount: 1,
        errorCount: 0,
        errors: [],
      });

      return result;
    } catch (error) {
      this.logger.error(
        `Manual evaluation failed for company ${companyId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Log job execution summary for monitoring and debugging
   */
  private async logJobSummary(summary: {
    jobType: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    companiesProcessed: number;
    successCount: number;
    errorCount: number;
    errors: Array<{ companyId: string; error: string }>;
  }) {
    try {
      // You could store this in a JobLog table if you have one
      // For now, just log it
      this.logger.log(
        `Job Summary: ${JSON.stringify({
          ...summary,
          errors: summary.errors.length, // Don't log full error details
        })}`,
      );

      // If there were errors, log them separately for analysis
      if (summary.errors.length > 0) {
        this.logger.warn(
          `Errors during ${summary.jobType}:`,
          JSON.stringify(summary.errors, null, 2),
        );
      }
    } catch (error) {
      this.logger.error('Failed to log job summary:', error);
    }
  }

  /**
   * Get job execution history (if you want to expose this via API)
   */
  async getJobHistory(limit = 10) {
    // This would query a JobLog table if you have one
    // For now, return empty array
    return [];
  }
}
