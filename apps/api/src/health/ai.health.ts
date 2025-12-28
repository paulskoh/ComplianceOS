import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

/**
 * CEO Demo: AI Health Indicator
 *
 * Checks:
 * 1. OpenAI API connectivity
 * 2. Analysis run statistics
 * 3. Token usage tracking
 */
@Injectable()
export class AIHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(AIHealthIndicator.name);
  private readonly openai: OpenAI;

  constructor(private prisma: PrismaService) {
    super();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Check OpenAI API connectivity
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const startTime = Date.now();

    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      // Simple API call to verify connectivity
      const response = await this.openai.models.list();
      const latencyMs = Date.now() - startTime;

      // Get recent analysis run stats
      const stats = await this.getAnalysisStats();

      return this.getStatus(key, true, {
        status: 'connected',
        latencyMs,
        modelsAvailable: response.data.length,
        ...stats,
      });
    } catch (error) {
      this.logger.error('AI health check failed:', error);
      throw new HealthCheckError('AI service check failed', {
        [key]: {
          status: 'error',
          message: error.message,
          latencyMs: Date.now() - startTime,
        },
      });
    }
  }

  /**
   * Get analysis run statistics (last 24 hours)
   */
  async getAnalysisStats(): Promise<{
    totalRuns24h: number;
    successRate: number;
    avgLatencyMs: number;
    totalTokens24h: number;
    failedRuns24h: number;
  }> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const stats = await this.prisma.$queryRaw<
        Array<{
          total_runs: string;
          completed_runs: string;
          failed_runs: string;
          avg_latency: number;
          total_tokens: string;
        }>
      >`
        SELECT
          COUNT(*) as total_runs,
          COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_runs,
          COUNT(*) FILTER (WHERE status = 'FAILED') as failed_runs,
          AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL) as avg_latency,
          SUM(total_tokens) FILTER (WHERE total_tokens IS NOT NULL) as total_tokens
        FROM analysis_runs
        WHERE created_at > ${oneDayAgo}
      `;

      if (!stats[0]) {
        return {
          totalRuns24h: 0,
          successRate: 100,
          avgLatencyMs: 0,
          totalTokens24h: 0,
          failedRuns24h: 0,
        };
      }

      const totalRuns = parseInt(stats[0].total_runs) || 0;
      const completedRuns = parseInt(stats[0].completed_runs) || 0;
      const failedRuns = parseInt(stats[0].failed_runs) || 0;

      return {
        totalRuns24h: totalRuns,
        successRate: totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 100,
        avgLatencyMs: Math.round(stats[0].avg_latency) || 0,
        totalTokens24h: parseInt(stats[0].total_tokens) || 0,
        failedRuns24h: failedRuns,
      };
    } catch (error) {
      this.logger.warn('Failed to get analysis stats:', error);
      return {
        totalRuns24h: 0,
        successRate: 100,
        avgLatencyMs: 0,
        totalTokens24h: 0,
        failedRuns24h: 0,
      };
    }
  }

  /**
   * Get detailed analysis metrics for observability
   */
  async getDetailedMetrics(): Promise<{
    last24Hours: {
      totalRuns: number;
      successRate: number;
      avgLatencyMs: number;
      totalTokens: number;
      byStatus: { status: string; count: number }[];
    };
    last7Days: {
      totalRuns: number;
      successRate: number;
      avgLatencyMs: number;
      totalTokens: number;
      dailyBreakdown: { date: string; runs: number; failures: number }[];
    };
    recentFailures: {
      id: string;
      artifactId: string;
      errorMessage: string;
      createdAt: Date;
    }[];
  }> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 24-hour stats by status
    const stats24h = await this.prisma.$queryRaw<
      Array<{
        status: string;
        count: string;
      }>
    >`
      SELECT status, COUNT(*) as count
      FROM analysis_runs
      WHERE created_at > ${oneDayAgo}
      GROUP BY status
    `;

    // 7-day daily breakdown
    const dailyStats = await this.prisma.$queryRaw<
      Array<{
        date: string;
        runs: string;
        failures: string;
      }>
    >`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as runs,
        COUNT(*) FILTER (WHERE status = 'FAILED') as failures
      FROM analysis_runs
      WHERE created_at > ${sevenDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Recent failures
    const recentFailures = await this.prisma.$queryRaw<
      Array<{
        id: string;
        artifact_id: string;
        error_message: string;
        created_at: Date;
      }>
    >`
      SELECT id, artifact_id, error_message, created_at
      FROM analysis_runs
      WHERE status = 'FAILED' AND created_at > ${sevenDaysAgo}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Calculate aggregates
    const stats24hAggregated = await this.getAnalysisStats();
    const stats7d = await this.prisma.$queryRaw<
      Array<{
        total_runs: string;
        completed_runs: string;
        avg_latency: number;
        total_tokens: string;
      }>
    >`
      SELECT
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_runs,
        AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL) as avg_latency,
        SUM(total_tokens) FILTER (WHERE total_tokens IS NOT NULL) as total_tokens
      FROM analysis_runs
      WHERE created_at > ${sevenDaysAgo}
    `;

    const total7d = parseInt(stats7d[0]?.total_runs) || 0;
    const completed7d = parseInt(stats7d[0]?.completed_runs) || 0;

    return {
      last24Hours: {
        totalRuns: stats24hAggregated.totalRuns24h,
        successRate: stats24hAggregated.successRate,
        avgLatencyMs: stats24hAggregated.avgLatencyMs,
        totalTokens: stats24hAggregated.totalTokens24h,
        byStatus: stats24h.map(s => ({
          status: s.status,
          count: parseInt(s.count),
        })),
      },
      last7Days: {
        totalRuns: total7d,
        successRate: total7d > 0 ? Math.round((completed7d / total7d) * 100) : 100,
        avgLatencyMs: Math.round(stats7d[0]?.avg_latency) || 0,
        totalTokens: parseInt(stats7d[0]?.total_tokens) || 0,
        dailyBreakdown: dailyStats.map(d => ({
          date: d.date,
          runs: parseInt(d.runs),
          failures: parseInt(d.failures),
        })),
      },
      recentFailures: recentFailures.map(f => ({
        id: f.id,
        artifactId: f.artifact_id,
        errorMessage: f.error_message,
        createdAt: f.created_at,
      })),
    };
  }
}
