import { Injectable, Logger } from '@nestjs/common';
import { StorageService } from '../aws/storage.service';

// Lazy load parsers to avoid startup issues
let pdfParse: any = null;
let mammoth: any = null;
let XLSX: any = null;

/**
 * Extraction result with structured metadata
 */
export interface ExtractionResult {
  success: boolean;
  text: string;
  status: 'EXTRACTED' | 'PARTIAL' | 'UNPARSEABLE' | 'ERROR';
  statusKo: string;
  method: 'PDF_TEXT' | 'DOCX_TEXT' | 'XLSX_TABLE' | 'TEXT_PLAIN' | 'SCANNED_DETECTED' | 'UNSUPPORTED';
  confidence: number; // 0-1
  pageCount?: number;
  wordCount: number;
  isScannedPdf: boolean;
  metadata: {
    contentType: string;
    extractedAt: string;
    warnings: string[];
  };
  // For citations
  pages?: Array<{
    pageNumber: number;
    text: string;
    startOffset: number;
    endOffset: number;
  }>;
}

/**
 * Unified Document Ingestion Service
 * Handles PDF, DOCX, XLSX with scanned PDF detection
 * Returns "판단 불가" status when extraction fails
 */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(private storage: StorageService) {}

  /**
   * Extract text from a document stored in S3
   */
  async extractFromS3(s3Key: string, contentType: string): Promise<ExtractionResult> {
    this.logger.log(`Extracting from S3: ${s3Key} (${contentType})`);

    try {
      const stream = await this.storage.getObjectStream(s3Key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      return this.extractFromBuffer(buffer, contentType);
    } catch (error) {
      this.logger.error(`S3 extraction failed for ${s3Key}:`, error);
      return this.createErrorResult(contentType, `S3 읽기 실패: ${error.message}`);
    }
  }

  /**
   * Extract text from a buffer based on content type
   */
  async extractFromBuffer(buffer: Buffer, contentType: string): Promise<ExtractionResult> {
    const normalizedType = contentType.toLowerCase();

    // Route to appropriate extractor
    if (normalizedType === 'application/pdf') {
      return this.extractPdf(buffer);
    }

    if (
      normalizedType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      normalizedType === 'application/msword'
    ) {
      return this.extractDocx(buffer);
    }

    if (
      normalizedType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      normalizedType === 'application/vnd.ms-excel'
    ) {
      return this.extractXlsx(buffer);
    }

    if (normalizedType.startsWith('text/')) {
      return this.extractPlainText(buffer, contentType);
    }

    // Image types - likely scanned document
    if (normalizedType.startsWith('image/')) {
      return this.createScannedResult(contentType, '이미지 파일 - OCR 필요');
    }

    // HWP - Korean Hangul Word Processor
    if (normalizedType === 'application/x-hwp' || normalizedType === 'application/haansofthwp') {
      return this.createUnsupportedResult(contentType, 'HWP 파일 형식은 현재 지원되지 않습니다. PDF로 변환하여 업로드해 주세요.');
    }

    return this.createUnsupportedResult(contentType, `지원되지 않는 파일 형식: ${contentType}`);
  }

  /**
   * Extract text from PDF
   * Detects scanned PDFs (image-only) and returns appropriate status
   */
  private async extractPdf(buffer: Buffer): Promise<ExtractionResult> {
    try {
      if (!pdfParse) {
        pdfParse = require('pdf-parse');
      }

      const data = await pdfParse(buffer, {
        // Don't render pages to images
        max: 0,
      });

      const text = data.text || '';
      const pageCount = data.numpages || 1;
      const wordCount = this.countWords(text);

      // Scanned PDF detection heuristics:
      // 1. Very low text-to-page ratio
      // 2. Text is mostly whitespace
      // 3. No Korean/English characters detected
      const avgWordsPerPage = wordCount / pageCount;
      const hasReadableContent = /[가-힣a-zA-Z0-9]{3,}/.test(text);
      const isLikelyScanned = avgWordsPerPage < 10 || !hasReadableContent;

      if (isLikelyScanned) {
        this.logger.warn(`Detected scanned PDF: ${wordCount} words in ${pageCount} pages`);
        return {
          success: false,
          text: '',
          status: 'UNPARSEABLE',
          statusKo: '판단 불가 (수동 검토 필요)',
          method: 'SCANNED_DETECTED',
          confidence: 0,
          pageCount,
          wordCount: 0,
          isScannedPdf: true,
          metadata: {
            contentType: 'application/pdf',
            extractedAt: new Date().toISOString(),
            warnings: [
              '스캔된 PDF로 감지되었습니다.',
              '텍스트 추출이 불가능합니다.',
              'OCR 분석이 필요합니다.',
            ],
          },
        };
      }

      // Parse into pages for citation support
      const pages = this.splitIntoPages(text, pageCount);

      return {
        success: true,
        text,
        status: 'EXTRACTED',
        statusKo: '추출 완료',
        method: 'PDF_TEXT',
        confidence: this.calculateConfidence(text, pageCount),
        pageCount,
        wordCount,
        isScannedPdf: false,
        metadata: {
          contentType: 'application/pdf',
          extractedAt: new Date().toISOString(),
          warnings: [],
        },
        pages,
      };
    } catch (error) {
      this.logger.error('PDF extraction failed:', error);
      return this.createErrorResult('application/pdf', `PDF 추출 실패: ${error.message}`);
    }
  }

  /**
   * Extract text from DOCX using mammoth
   */
  private async extractDocx(buffer: Buffer): Promise<ExtractionResult> {
    try {
      if (!mammoth) {
        mammoth = require('mammoth');
      }

      const result = await mammoth.extractRawText({ buffer });
      const text = result.value || '';
      const wordCount = this.countWords(text);

      if (wordCount < 10) {
        return {
          success: false,
          text,
          status: 'PARTIAL',
          statusKo: '내용 부족',
          method: 'DOCX_TEXT',
          confidence: 0.3,
          wordCount,
          isScannedPdf: false,
          metadata: {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            extractedAt: new Date().toISOString(),
            warnings: ['문서에 충분한 텍스트가 없습니다.'],
          },
        };
      }

      return {
        success: true,
        text,
        status: 'EXTRACTED',
        statusKo: '추출 완료',
        method: 'DOCX_TEXT',
        confidence: 0.95,
        wordCount,
        isScannedPdf: false,
        metadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          extractedAt: new Date().toISOString(),
          warnings: result.messages?.map((m: any) => m.message) || [],
        },
      };
    } catch (error) {
      this.logger.error('DOCX extraction failed:', error);
      return this.createErrorResult(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        `DOCX 추출 실패: ${error.message}`,
      );
    }
  }

  /**
   * Extract text from XLSX
   * Converts spreadsheet cells to searchable text
   */
  private async extractXlsx(buffer: Buffer): Promise<ExtractionResult> {
    try {
      if (!XLSX) {
        XLSX = require('xlsx');
      }

      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const texts: string[] = [];
      const warnings: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        // Convert sheet to array of arrays
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        texts.push(`[시트: ${sheetName}]`);

        for (const row of data) {
          if (row && row.length > 0) {
            const rowText = row
              .filter((cell) => cell !== null && cell !== undefined)
              .map((cell) => String(cell).trim())
              .filter((cell) => cell.length > 0)
              .join(' | ');
            if (rowText) {
              texts.push(rowText);
            }
          }
        }
        texts.push(''); // Blank line between sheets
      }

      const text = texts.join('\n');
      const wordCount = this.countWords(text);

      if (wordCount < 5) {
        return {
          success: false,
          text,
          status: 'PARTIAL',
          statusKo: '내용 부족',
          method: 'XLSX_TABLE',
          confidence: 0.3,
          wordCount,
          isScannedPdf: false,
          metadata: {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            extractedAt: new Date().toISOString(),
            warnings: ['스프레드시트에 충분한 데이터가 없습니다.'],
          },
        };
      }

      return {
        success: true,
        text,
        status: 'EXTRACTED',
        statusKo: '추출 완료',
        method: 'XLSX_TABLE',
        confidence: 0.9,
        wordCount,
        isScannedPdf: false,
        metadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          extractedAt: new Date().toISOString(),
          warnings,
        },
      };
    } catch (error) {
      this.logger.error('XLSX extraction failed:', error);
      return this.createErrorResult(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        `XLSX 추출 실패: ${error.message}`,
      );
    }
  }

  /**
   * Extract plain text files
   */
  private extractPlainText(buffer: Buffer, contentType: string): ExtractionResult {
    try {
      const text = buffer.toString('utf-8');
      const wordCount = this.countWords(text);

      return {
        success: true,
        text,
        status: 'EXTRACTED',
        statusKo: '추출 완료',
        method: 'TEXT_PLAIN',
        confidence: 1.0,
        wordCount,
        isScannedPdf: false,
        metadata: {
          contentType,
          extractedAt: new Date().toISOString(),
          warnings: [],
        },
      };
    } catch (error) {
      return this.createErrorResult(contentType, `텍스트 추출 실패: ${error.message}`);
    }
  }

  /**
   * Create result for scanned/image documents
   */
  private createScannedResult(contentType: string, message: string): ExtractionResult {
    return {
      success: false,
      text: '',
      status: 'UNPARSEABLE',
      statusKo: '판단 불가 (수동 검토 필요)',
      method: 'SCANNED_DETECTED',
      confidence: 0,
      wordCount: 0,
      isScannedPdf: true,
      metadata: {
        contentType,
        extractedAt: new Date().toISOString(),
        warnings: [message, 'OCR 분석이 필요합니다.'],
      },
    };
  }

  /**
   * Create result for unsupported formats
   */
  private createUnsupportedResult(contentType: string, message: string): ExtractionResult {
    return {
      success: false,
      text: '',
      status: 'UNPARSEABLE',
      statusKo: '지원되지 않는 형식',
      method: 'UNSUPPORTED',
      confidence: 0,
      wordCount: 0,
      isScannedPdf: false,
      metadata: {
        contentType,
        extractedAt: new Date().toISOString(),
        warnings: [message],
      },
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(contentType: string, errorMessage: string): ExtractionResult {
    return {
      success: false,
      text: '',
      status: 'ERROR',
      statusKo: '추출 오류',
      method: 'UNSUPPORTED',
      confidence: 0,
      wordCount: 0,
      isScannedPdf: false,
      metadata: {
        contentType,
        extractedAt: new Date().toISOString(),
        warnings: [errorMessage],
      },
    };
  }

  /**
   * Count words in text (handles Korean)
   */
  private countWords(text: string): number {
    if (!text) return 0;
    // Count Korean words (syllable blocks) and English words
    const koreanWords = (text.match(/[가-힣]+/g) || []).length;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return koreanWords + englishWords;
  }

  /**
   * Calculate extraction confidence based on content
   */
  private calculateConfidence(text: string, pageCount: number): number {
    const wordCount = this.countWords(text);
    const avgWordsPerPage = wordCount / pageCount;

    // High confidence if reasonable word density
    if (avgWordsPerPage > 100) return 0.95;
    if (avgWordsPerPage > 50) return 0.85;
    if (avgWordsPerPage > 20) return 0.7;
    return 0.5;
  }

  /**
   * Split extracted text into page-like chunks for citations
   * Note: This is approximate for PDFs without explicit page markers
   */
  private splitIntoPages(
    text: string,
    estimatedPageCount: number,
  ): Array<{ pageNumber: number; text: string; startOffset: number; endOffset: number }> {
    const pages: Array<{ pageNumber: number; text: string; startOffset: number; endOffset: number }> = [];

    // Try to detect page breaks (form feed or explicit markers)
    const pageBreakRegex = /\f|[\n\r]{3,}(?=[A-Z가-힣])/g;
    const parts = text.split(pageBreakRegex);

    if (parts.length >= estimatedPageCount * 0.8) {
      // Use detected breaks
      let offset = 0;
      parts.forEach((part, index) => {
        pages.push({
          pageNumber: index + 1,
          text: part.trim(),
          startOffset: offset,
          endOffset: offset + part.length,
        });
        offset += part.length + 1;
      });
    } else {
      // Estimate by character count
      const charsPerPage = Math.ceil(text.length / estimatedPageCount);
      for (let i = 0; i < estimatedPageCount; i++) {
        const start = i * charsPerPage;
        const end = Math.min((i + 1) * charsPerPage, text.length);
        pages.push({
          pageNumber: i + 1,
          text: text.slice(start, end),
          startOffset: start,
          endOffset: end,
        });
      }
    }

    return pages;
  }

  /**
   * Check if a file is likely a scanned document based on content type and initial inspection
   */
  isLikelyScanned(contentType: string): boolean {
    const lowerType = contentType.toLowerCase();
    return (
      lowerType.startsWith('image/') ||
      lowerType === 'application/x-hwp' ||
      lowerType === 'application/haansofthwp'
    );
  }
}
