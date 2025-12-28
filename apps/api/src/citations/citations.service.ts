import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Citation with page-level reference
 * CEO Demo: Every finding must have auditor-grade citations
 */
export interface Citation {
  id: string;
  artifactId: string;
  artifactName: string;
  pageNumber: number;
  excerpt: string;
  context: string;
  startOffset: number;
  endOffset: number;
}

/**
 * Analysis findings with citations
 */
export interface FindingWithCitations {
  category: string;
  status: string;
  severity: string;
  messageKo: string;
  pageRef?: number;
  excerpt?: string;
  citations: Citation[];
}

/**
 * Document analysis with full citation support
 */
export interface AnalysisWithCitations {
  artifactId: string;
  artifactName: string;
  overallStatus: string;
  score: number;
  summaryKo: string;
  isScannedPdf: boolean;
  extractionMethod: string;
  findings: FindingWithCitations[];
  allCitations: Citation[];
  analyzedAt: Date;
}

/**
 * Citation Service
 * Provides auditor-grade citation retrieval for compliance analysis
 *
 * CEO Demo Features:
 * - Page-level citations with exact excerpts
 * - Cross-reference between findings and source text
 * - Support for highlighting in frontend
 */
@Injectable()
export class CitationsService {
  private readonly logger = new Logger(CitationsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get analysis with full citations for an artifact
   * Returns findings with page references and excerpt highlighting
   */
  async getAnalysisWithCitations(
    tenantId: string,
    artifactId: string,
  ): Promise<AnalysisWithCitations | null> {
    // Get artifact details
    const artifact = await this.prisma.artifact.findFirst({
      where: { id: artifactId, tenantId, isDeleted: false },
      select: {
        id: true,
        name: true,
        version: true,
      },
    });

    if (!artifact) {
      return null;
    }

    // Get analysis
    const analyses = await this.prisma.$queryRaw<
      Array<{
        id: string;
        artifact_id: string;
        version: number;
        overall_compliance: string;
        confidence: number;
        findings: any;
        analysis_metadata: any;
        created_at: Date;
      }>
    >`
      SELECT *
      FROM document_analyses
      WHERE artifact_id = ${artifactId}::uuid
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (analyses.length === 0) {
      return null;
    }

    const analysis = analyses[0];
    const metadata = analysis.analysis_metadata || {};
    const findings = (analysis.findings || []) as Array<{
      category: string;
      status: string;
      severity: string;
      messageKo: string;
      pageRef?: number;
      excerpt?: string;
    }>;

    // Get document chunks for citation support
    const chunks = await this.prisma.$queryRaw<
      Array<{
        id: string;
        artifact_id: string;
        page_number: number;
        text_content: string;
        start_offset: number;
        end_offset: number;
      }>
    >`
      SELECT *
      FROM document_chunks
      WHERE artifact_id = ${artifactId}::uuid
      ORDER BY page_number ASC
    `;

    // Build citations from chunks and findings
    const allCitations: Citation[] = [];
    const findingsWithCitations: FindingWithCitations[] = [];

    for (const finding of findings) {
      const citationsForFinding: Citation[] = [];

      // If finding has a page reference, try to match with chunk
      if (finding.pageRef) {
        const chunk = chunks.find((c) => c.page_number === finding.pageRef);
        if (chunk) {
          const citation: Citation = {
            id: `${chunk.id}-${finding.pageRef}`,
            artifactId: artifact.id,
            artifactName: artifact.name,
            pageNumber: chunk.page_number,
            excerpt: finding.excerpt || chunk.text_content.substring(0, 200),
            context: finding.messageKo,
            startOffset: chunk.start_offset,
            endOffset: chunk.end_offset,
          };
          citationsForFinding.push(citation);
          allCitations.push(citation);
        }
      }

      findingsWithCitations.push({
        ...finding,
        citations: citationsForFinding,
      });
    }

    // Add any explicit citations from analysis metadata
    if (metadata.citations && Array.isArray(metadata.citations)) {
      for (const c of metadata.citations) {
        const citation: Citation = {
          id: `metadata-${allCitations.length}`,
          artifactId: artifact.id,
          artifactName: artifact.name,
          pageNumber: c.pageNumber || 1,
          excerpt: c.excerpt || '',
          context: c.context || '',
          startOffset: 0,
          endOffset: 0,
        };
        allCitations.push(citation);
      }
    }

    return {
      artifactId: artifact.id,
      artifactName: artifact.name,
      overallStatus: analysis.overall_compliance,
      score: Math.round(analysis.confidence * 100),
      summaryKo: metadata.summaryKo || '',
      isScannedPdf: metadata.isScannedPdf || false,
      extractionMethod: metadata.extractionMethod || 'UNKNOWN',
      findings: findingsWithCitations,
      allCitations,
      analyzedAt: analysis.created_at,
    };
  }

  /**
   * Get document chunks (pages) for an artifact
   * Used by frontend to render page-by-page view
   */
  async getDocumentChunks(
    tenantId: string,
    artifactId: string,
  ): Promise<
    Array<{
      pageNumber: number;
      text: string;
      startOffset: number;
      endOffset: number;
    }>
  > {
    // Verify artifact belongs to tenant
    const artifact = await this.prisma.artifact.findFirst({
      where: { id: artifactId, tenantId, isDeleted: false },
      select: { id: true },
    });

    if (!artifact) {
      return [];
    }

    const chunks = await this.prisma.$queryRaw<
      Array<{
        page_number: number;
        text_content: string;
        start_offset: number;
        end_offset: number;
      }>
    >`
      SELECT page_number, text_content, start_offset, end_offset
      FROM document_chunks
      WHERE artifact_id = ${artifactId}::uuid
      ORDER BY page_number ASC
    `;

    return chunks.map((c) => ({
      pageNumber: c.page_number,
      text: c.text_content,
      startOffset: c.start_offset,
      endOffset: c.end_offset,
    }));
  }

  /**
   * Get specific citation by finding ID and artifact
   * Used for "jump to citation" feature
   */
  async getCitationForFinding(
    tenantId: string,
    artifactId: string,
    findingIndex: number,
  ): Promise<Citation | null> {
    const analysis = await this.getAnalysisWithCitations(tenantId, artifactId);
    if (!analysis) {
      return null;
    }

    const finding = analysis.findings[findingIndex];
    if (!finding || finding.citations.length === 0) {
      return null;
    }

    return finding.citations[0];
  }

  /**
   * Search for text within document chunks
   * Returns matching citations with context
   */
  async searchInDocument(
    tenantId: string,
    artifactId: string,
    searchText: string,
  ): Promise<Citation[]> {
    const chunks = await this.getDocumentChunks(tenantId, artifactId);
    const searchLower = searchText.toLowerCase();
    const results: Citation[] = [];

    for (const chunk of chunks) {
      const textLower = chunk.text.toLowerCase();
      const index = textLower.indexOf(searchLower);

      if (index !== -1) {
        // Extract context around match
        const start = Math.max(0, index - 50);
        const end = Math.min(chunk.text.length, index + searchText.length + 50);
        const excerpt = chunk.text.substring(start, end);

        results.push({
          id: `search-${chunk.pageNumber}-${index}`,
          artifactId,
          artifactName: '',
          pageNumber: chunk.pageNumber,
          excerpt,
          context: `페이지 ${chunk.pageNumber}에서 "${searchText}" 발견`,
          startOffset: chunk.startOffset + index,
          endOffset: chunk.startOffset + index + searchText.length,
        });
      }
    }

    return results;
  }
}
