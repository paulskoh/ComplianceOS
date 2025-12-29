import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../aws/storage.service';
import { QueueService, JobEnvelope } from '../aws/queue.service';
import { IngestionService, ExtractionResult } from '../ingestion/ingestion.service';
import { TextractClient, AnalyzeDocumentCommand, FeatureType } from '@aws-sdk/client-textract';

interface DocExtractionPayload {
  artifactId: string;
  version: number;
  s3Key: string;
  contentType: string;
}

/**
 * Document Extraction Worker
 * CEO Demo: Uses unified IngestionService for PDF/DOCX/XLSX
 * Handles scanned PDFs gracefully with "판단 불가" status
 */
@Injectable()
export class DocumentExtractionWorker {
  private readonly logger = new Logger(DocumentExtractionWorker.name);
  private readonly textractClient: TextractClient;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private queue: QueueService,
    private ingestion: IngestionService,
  ) {
    this.textractClient = new TextractClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: process.env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      } : undefined,
    });
  }

  /**
   * Handle document extraction job
   * CEO Demo: Unified extraction via IngestionService
   */
  async handleDocExtraction(job: JobEnvelope, payload: DocExtractionPayload) {
    const { artifactId, version, s3Key, contentType } = payload;

    this.logger.log(`Extracting text from artifact ${artifactId} v${version} (${contentType})`);

    try {
      // CEO Demo: Use unified IngestionService for all document types
      // This handles PDF, DOCX, XLSX properly and detects scanned documents
      const extraction = await this.ingestion.extractFromS3(s3Key, contentType);

      // Handle scanned/unparseable documents
      if (extraction.isScannedPdf || extraction.status === 'UNPARSEABLE') {
        this.logger.warn(`Scanned or unparseable document: ${artifactId}`);

        // Store extraction with scanned flag
        await this.storeExtraction(artifactId, version, extraction);

        // Update artifact status to FLAGGED (needs manual review)
        await this.prisma.artifact.updateMany({
          where: { id: artifactId },
          data: { status: 'FLAGGED' },
        });

        // Try Textract OCR if enabled
        if (process.env.TEXTRACT_ENABLED === 'true') {
          const stream = await this.storage.getObjectStream(s3Key);
          const chunks: Buffer[] = [];
          for await (const chunk of stream) {
            chunks.push(Buffer.from(chunk));
          }
          const buffer = Buffer.concat(chunks);

          const ocrResult = await this.extractWithTextract(buffer);
          if (ocrResult.text.length > 100) {
            // Store OCR result
            await this.storeExtractionRaw(
              artifactId,
              version,
              ocrResult.text,
              'TEXTRACT_OCR',
              ocrResult.confidence,
            );
          }
        }

        return;
      }

      // Store successful extraction
      await this.storeExtraction(artifactId, version, extraction);

      // Enqueue classification job
      await this.queue.enqueueJob({
        tenantId: job.tenantId,
        type: 'DOC_CLASSIFY',
        payload: {
          artifactId,
          version,
          extractedText: extraction.text.substring(0, 10000),
        },
      });

      this.logger.log(
        `Text extraction completed for ${artifactId}: ${extraction.wordCount} words, method=${extraction.method}`,
      );
    } catch (error) {
      this.logger.error(`Text extraction failed for artifact ${artifactId}:`, error.stack);
      throw error;
    }
  }

  /**
   * Store extraction result using IngestionService format
   */
  private async storeExtraction(
    artifactId: string,
    version: number,
    extraction: ExtractionResult,
  ) {
    const language = this.detectLanguage(extraction.text);

    await this.prisma.$executeRaw`
      INSERT INTO document_extractions (
        id, artifact_id, version, extracted_text, method, language,
        confidence, page_count, word_count, metadata, created_at
      )
      VALUES (
        gen_random_uuid(),
        ${artifactId}::uuid,
        ${version},
        ${extraction.text},
        ${extraction.method},
        ${language},
        ${extraction.confidence},
        ${extraction.pageCount || 0},
        ${extraction.wordCount},
        ${JSON.stringify(extraction.metadata)}::jsonb,
        NOW()
      )
      ON CONFLICT (artifact_id, version) DO UPDATE SET
        extracted_text = ${extraction.text},
        method = ${extraction.method},
        language = ${language},
        confidence = ${extraction.confidence},
        page_count = ${extraction.pageCount || 0},
        word_count = ${extraction.wordCount},
        metadata = ${JSON.stringify(extraction.metadata)}::jsonb,
        updated_at = NOW()
    `;
  }

  /**
   * Store raw extraction result (for OCR fallback)
   */
  private async storeExtractionRaw(
    artifactId: string,
    version: number,
    text: string,
    method: string,
    confidence: number,
  ) {
    const language = this.detectLanguage(text);
    const wordCount = this.countWords(text);

    await this.prisma.$executeRaw`
      INSERT INTO document_extractions (
        id, artifact_id, version, extracted_text, method, language,
        confidence, word_count, created_at
      )
      VALUES (
        gen_random_uuid(),
        ${artifactId}::uuid,
        ${version},
        ${text},
        ${method},
        ${language},
        ${confidence},
        ${wordCount},
        NOW()
      )
      ON CONFLICT (artifact_id, version) DO UPDATE SET
        extracted_text = ${text},
        method = ${method},
        language = ${language},
        confidence = ${confidence},
        word_count = ${wordCount},
        updated_at = NOW()
    `;
  }

  private countWords(text: string): number {
    if (!text) return 0;
    const koreanWords = (text.match(/[가-힣]+/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return koreanWords + englishWords;
  }

  private async extractWithTextract(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    const command = new AnalyzeDocumentCommand({
      Document: { Bytes: buffer },
      FeatureTypes: [FeatureType.TABLES, FeatureType.FORMS],
    });

    const response = await this.textractClient.send(command);

    const lines: string[] = [];
    let totalConfidence = 0;
    let blockCount = 0;

    for (const block of response.Blocks || []) {
      if (block.BlockType === 'LINE' && block.Text) {
        lines.push(block.Text);
        if (block.Confidence) {
          totalConfidence += block.Confidence;
          blockCount++;
        }
      }
    }

    const text = lines.join('\n');
    const confidence = blockCount > 0 ? totalConfidence / blockCount / 100 : 0.8;

    return { text, confidence };
  }

  private detectLanguage(text: string): string {
    const koreanPattern = /[\uAC00-\uD7A3]/;
    const englishPattern = /[a-zA-Z]/;

    const hasKorean = koreanPattern.test(text);
    const hasEnglish = englishPattern.test(text);

    if (hasKorean && hasEnglish) return 'mixed';
    if (hasKorean) return 'ko';
    if (hasEnglish) return 'en';
    return 'unknown';
  }
}
