import { Module } from '@nestjs/common';
import { WorkerHostService } from './worker-host.service';
import { DocumentExtractionWorker } from './document-extraction.worker';
import { DocumentClassificationWorker } from './document-classification.worker';

@Module({
  providers: [
    WorkerHostService,
    DocumentExtractionWorker,
    DocumentClassificationWorker,
  ],
  exports: [WorkerHostService],
})
export class WorkersModule {}
