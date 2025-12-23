import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from '@aws-sdk/client-sqs';
import { randomUUID } from 'crypto';
import awsConfig from '../config/aws.config';

export type JobType =
  | 'DOC_EXTRACT'
  | 'DOC_CLASSIFY'
  | 'DOC_ANALYZE'
  | 'READINESS_RECOMPUTE'
  | 'EXPIRATION_CHECK'
  | 'PACK_BUILD';

export interface JobEnvelope {
  jobId: string;
  tenantId: string;
  type: JobType;
  payload: any;
  createdAt: string;
  attempt: number;
}

export interface JobHandler<T = any> {
  (job: JobEnvelope, payload: T): Promise<void>;
}

@Injectable()
export class QueueService {
  private readonly sqsClient: SQSClient;
  private readonly logger = new Logger(QueueService.name);
  private readonly queueUrls: Record<JobType, string>;

  constructor(
    @Inject(awsConfig.KEY)
    private config: ConfigType<typeof awsConfig>,
  ) {
    this.sqsClient = new SQSClient({
      region: this.config.region,
      endpoint: process.env.SQS_ENDPOINT, // For localstack
      credentials: this.config.credentials,
    });

    this.queueUrls = {
      DOC_EXTRACT: this.config.sqs.docExtractQueue,
      DOC_CLASSIFY: this.config.sqs.docClassifyQueue,
      DOC_ANALYZE: this.config.sqs.docAnalyzeQueue,
      READINESS_RECOMPUTE: this.config.sqs.readinessRecomputeQueue,
      EXPIRATION_CHECK: this.config.sqs.expirationCheckQueue,
      PACK_BUILD: this.config.sqs.packBuildQueue,
    };
  }

  /**
   * Enqueue a job to SQS
   * CRITICAL: API returns immediately after enqueueing
   */
  async enqueueJob(envelope: Omit<JobEnvelope, 'jobId' | 'createdAt' | 'attempt'>): Promise<string> {
    const jobId = randomUUID();
    const job: JobEnvelope = {
      ...envelope,
      jobId,
      createdAt: new Date().toISOString(),
      attempt: 0,
    };

    const queueUrl = this.queueUrls[job.type];
    if (!queueUrl) {
      throw new Error(`Queue URL not configured for job type: ${job.type}`);
    }

    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(job),
      MessageAttributes: {
        jobType: {
          DataType: 'String',
          StringValue: job.type,
        },
        tenantId: {
          DataType: 'String',
          StringValue: job.tenantId,
        },
      },
    });

    await this.sqsClient.send(command);

    this.logger.log(`Enqueued job ${jobId} (type: ${job.type}, tenant: ${job.tenantId})`);

    return jobId;
  }

  /**
   * Poll queue for messages
   * Used by worker process
   */
  async pollQueue(jobType: JobType, maxMessages = 1, waitTimeSeconds = 20): Promise<Message[]> {
    const queueUrl = this.queueUrls[jobType];
    if (!queueUrl) {
      throw new Error(`Queue URL not configured for job type: ${jobType}`);
    }

    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: waitTimeSeconds,
      MessageAttributeNames: ['All'],
    });

    const response = await this.sqsClient.send(command);
    return response.Messages || [];
  }

  /**
   * Delete message from queue after successful processing
   */
  async deleteMessage(jobType: JobType, receiptHandle: string): Promise<void> {
    const queueUrl = this.queueUrls[jobType];
    if (!queueUrl) {
      throw new Error(`Queue URL not configured for job type: ${jobType}`);
    }

    const command = new DeleteMessageCommand({
      QueueUrl: queueUrl,
      ReceiptHandle: receiptHandle,
    });

    await this.sqsClient.send(command);
  }

  /**
   * Process a single message with handler
   */
  async processMessage<T = any>(
    message: Message,
    jobType: JobType,
    handler: JobHandler<T>,
  ): Promise<void> {
    if (!message.Body) {
      this.logger.warn('Received message with empty body');
      return;
    }

    try {
      const job: JobEnvelope = JSON.parse(message.Body);

      this.logger.log(
        `Processing job ${job.jobId} (type: ${job.type}, attempt: ${job.attempt})`,
      );

      await handler(job, job.payload as T);

      // Delete message on success
      if (message.ReceiptHandle) {
        await this.deleteMessage(jobType, message.ReceiptHandle);
        this.logger.log(`Job ${job.jobId} completed successfully`);
      }
    } catch (error) {
      this.logger.error(`Job processing failed: ${error.message}`, error.stack);
      // Message will become visible again for retry or go to DLQ
      throw error;
    }
  }

  /**
   * Start polling loop for a specific job type
   * Used in worker mode
   */
  async startPolling<T = any>(
    jobType: JobType,
    handler: JobHandler<T>,
    signal?: AbortSignal,
  ): Promise<void> {
    this.logger.log(`Starting polling for ${jobType} queue`);

    while (!signal?.aborted) {
      try {
        const messages = await this.pollQueue(jobType, 1, 20);

        for (const message of messages) {
          await this.processMessage(message, jobType, handler);
        }
      } catch (error) {
        this.logger.error(`Polling error: ${error.message}`, error.stack);
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    this.logger.log(`Stopped polling for ${jobType} queue`);
  }
}
