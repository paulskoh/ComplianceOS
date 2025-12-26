import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../aws/storage.service';
import { QueueService, JobEnvelope } from '../aws/queue.service';
import { TextractClient, AnalyzeDocumentCommand, FeatureType } from '@aws-sdk/client-textract';

// pdf-parse will be dynamically imported when needed
let pdfParse: any = null;

interface DocExtractionPayload {
  artifactId: string;
  version: number;
  s3Key: string;
  contentType: string;
}

@Injectable()
export class DocumentExtractionWorker {
  private readonly logger = new Logger(DocumentExtractionWorker.name);
  private readonly textractClient: TextractClient;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private queue: QueueService,
  ) {
    this.textractClient = new TextractClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: process.env.AWS_ACCESS_KEY_ID ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      } : undefined,
    });
  }

  async handleDocExtraction(job: JobEnvelope, payload: DocExtractionPayload) {
    const { artifactId, version, s3Key, contentType } = payload;

    this.logger.log(`Extracting text from artifact ${artifactId} v${version}`);

    try {
      let extractedText = '';
      let method: string;
      let confidence = 1.0;

      // Download file from S3
      const stream = await this.storage.getObjectStream(s3Key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      // Extract based on content type
      if (contentType === 'application/pdf') {
        try {
          // Lazy load pdf-parse
          if (!pdfParse) {
            try {
              pdfParse = require('pdf-parse');
            } catch (loadError) {
              this.logger.error(`pdf-parse library not available: ${loadError.message}`);
              // SOFT-LAUNCH FIX: Never return mock data - fail explicitly
              throw new Error(
                'PDF text extraction failed: pdf-parse library not available. ' +
                'Please install pdf-parse or enable Textract OCR for PDF processing. ' +
                'Manual review required.'
              );
            }
          }

          if (pdfParse) {
            const data = await pdfParse(buffer);
            extractedText = data.text;
            method = 'PDF_TEXT';
          }

          // If extracted text is too short, use Textract OCR
          if (extractedText.trim().length < 100 && process.env.TEXTRACT_ENABLED === 'true') {
            const ocrResult = await this.extractWithTextract(buffer);
            extractedText = ocrResult.text;
            confidence = ocrResult.confidence;
            method = 'TEXTRACT_OCR';
          }
        } catch (error) {
          this.logger.warn(`PDF text extraction failed, falling back to Textract: ${error.message}`);
          if (process.env.TEXTRACT_ENABLED === 'true') {
            const ocrResult = await this.extractWithTextract(buffer);
            extractedText = ocrResult.text;
            confidence = ocrResult.confidence;
            method = 'TEXTRACT_OCR';
          } else {
            throw error;
          }
        }
      } else if (contentType.includes('image/')) {
        // Use Textract for images
        if (process.env.TEXTRACT_ENABLED === 'true') {
          const ocrResult = await this.extractWithTextract(buffer);
          extractedText = ocrResult.text;
          confidence = ocrResult.confidence;
          method = 'TEXTRACT_OCR';
        } else {
          throw new Error('Textract not enabled for image processing');
        }
      } else {
        // Plain text or unknown type
        extractedText = buffer.toString('utf-8');
        method = 'PLAIN_TEXT';
      }

      // Detect language
      const language = this.detectLanguage(extractedText);

      // Store extraction result
      await this.prisma.$executeRaw`
        INSERT INTO document_extractions (id, artifact_id, version, extracted_text, method, language, confidence, pages, created_at)
        VALUES (
          gen_random_uuid(),
          ${artifactId}::uuid,
          ${version},
          ${extractedText},
          ${method},
          ${language},
          ${confidence},
          0,
          NOW()
        )
        ON CONFLICT (artifact_id, version) DO UPDATE SET
          extracted_text = ${extractedText},
          method = ${method},
          language = ${language},
          confidence = ${confidence}
      `;

      // Enqueue classification job
      await this.queue.enqueueJob({
        tenantId: job.tenantId,
        type: 'DOC_CLASSIFY',
        payload: {
          artifactId,
          version,
          extractedText: extractedText.substring(0, 10000), // Limit for classification
        },
      });

      this.logger.log(`Text extraction completed for artifact ${artifactId}: ${extractedText.length} chars, method=${method}`);
    } catch (error) {
      this.logger.error(`Text extraction failed for artifact ${artifactId}:`, error.stack);
      throw error;
    }
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
