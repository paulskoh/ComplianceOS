import { Module } from '@nestjs/common';
import { CitationsService } from './citations.service';
import { CitationsController } from './citations.controller';

/**
 * Citations Module
 * Provides auditor-grade citation API for compliance analysis
 *
 * CEO Demo Features:
 * - Page-level citations with exact excerpts
 * - Cross-reference between findings and source text
 * - Search within documents
 */
@Module({
  controllers: [CitationsController],
  providers: [CitationsService],
  exports: [CitationsService],
})
export class CitationsModule {}
