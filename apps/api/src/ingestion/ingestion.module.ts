import { Module, Global } from '@nestjs/common';
import { IngestionService } from './ingestion.service';

/**
 * Ingestion Module
 * Handles document text extraction for PDF, DOCX, XLSX
 * Detects scanned/image-based PDFs and returns "판단 불가" status
 */
@Global()
@Module({
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
