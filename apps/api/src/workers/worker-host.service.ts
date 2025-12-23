import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { QueueService, JobType, JobEnvelope } from '../aws/queue.service';
import { DocumentExtractionWorker } from './document-extraction.worker';
import { DocumentClassificationWorker } from './document-classification.worker';
import { DocumentAnalysisWorker } from './document-analysis.worker';

/**
 * Worker Host Service
 * Runs in WORKER_MODE=true to poll SQS queues and process jobs
 *
 * Usage:
 *   Start API in worker mode: WORKER_MODE=true npm run start
 *   Or run separate worker process
 */
@Injectable()
export class WorkerHostService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerHostService.name);
  private abortController: AbortController;
  private readonly workerMode: boolean;

  constructor(
    private queue: QueueService,
    private docExtractWorker: DocumentExtractionWorker,
    private docClassifyWorker: DocumentClassificationWorker,
    private docAnalyzeWorker: DocumentAnalysisWorker,
  ) {
    this.workerMode = process.env.WORKER_MODE === 'true';
    this.abortController = new AbortController();
  }

  async onModuleInit() {
    if (!this.workerMode) {
      this.logger.log('Worker mode disabled (WORKER_MODE != true)');
      return;
    }

    this.logger.log('🔧 Worker mode enabled - starting job processors');

    // Start polling for each job type
    const jobTypes: JobType[] = [
      'DOC_EXTRACT',
      'DOC_CLASSIFY',
      'DOC_ANALYZE',
      // Add more as needed: 'READINESS_RECOMPUTE', 'EXPIRATION_CHECK', etc.
    ];

    for (const jobType of jobTypes) {
      this.startWorker(jobType);
    }
  }

  async onModuleDestroy() {
    if (this.workerMode) {
      this.logger.log('Shutting down workers...');
      this.abortController.abort();
    }
  }

  private startWorker(jobType: JobType) {
    this.logger.log(`Starting worker for ${jobType} queue`);

    // Run polling in background
    this.queue
      .startPolling(
        jobType,
        async (job, payload) => {
          await this.handleJob(job, payload);
        },
        this.abortController.signal,
      )
      .catch((error) => {
        this.logger.error(`Worker crashed for ${jobType}:`, error.stack);
      });
  }

  private async handleJob(job: JobEnvelope, payload: any) {
    switch (job.type) {
      case 'DOC_EXTRACT':
        await this.docExtractWorker.handleDocExtraction(job, payload);
        break;

      case 'DOC_CLASSIFY':
        await this.docClassifyWorker.handleDocClassification(job, payload);
        break;

      case 'DOC_ANALYZE':
        await this.docAnalyzeWorker.handleDocAnalysis(job, payload);
        break;

      // case 'READINESS_RECOMPUTE':
      //   await this.readinessWorker.handleReadinessRecompute(job, payload);
      //   break;

      // case 'PACK_BUILD':
      //   await this.packBuildWorker.handlePackBuild(job, payload);
      //   break;

      default:
        this.logger.warn(`Unknown job type: ${job.type}`);
    }
  }
}
