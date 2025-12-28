import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionService, ExtractionResult } from '../ingestion/ingestion.service';
import { ArtifactStatus } from '@prisma/client';
import OpenAI from 'openai';

export interface AnalysisResult {
  overallStatus: string;
  score: number;
  summaryKo: string;
  isScannedPdf: boolean;
  extractionMethod: string;
  findings: Array<{
    category: string;
    status: string;
    severity: string;
    messageKo: string;
    pageRef?: number; // Page reference for citation
    excerpt?: string; // Text excerpt for citation
  }>;
  citations?: Array<{
    pageNumber: number;
    excerpt: string;
    context: string;
  }>;
}

/**
 * Synchronous document analysis service for local development/demo
 * Bypasses SQS queues and runs analysis directly after upload
 *
 * CEO Demo Features:
 * - PDF/DOCX/XLSX extraction with scanned PDF detection
 * - "판단 불가" status for unparseable documents (no blocking)
 * - Auditor-grade citations with page references
 */
@Injectable()
export class SyncAnalysisService {
  private readonly logger = new Logger(SyncAnalysisService.name);
  private readonly openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private ingestion: IngestionService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Run synchronous analysis on an artifact
   * Called immediately after finalizeUpload when SYNC_ANALYSIS=true
   *
   * CEO Demo Flow:
   * 1. Create AnalysisRun for observability tracking
   * 2. Extract text using IngestionService (PDF/DOCX/XLSX)
   * 3. Detect scanned PDFs → "판단 불가" status (no blocking)
   * 4. Run OpenAI analysis with citation extraction
   * 5. Store results with page references and metrics
   */
  async analyzeArtifact(
    tenantId: string,
    artifactId: string,
    version: number,
    s3Key: string,
    contentType: string,
    retryCount: number = 0,
  ): Promise<AnalysisResult | null> {
    this.logger.log(`Starting sync analysis for artifact ${artifactId} (${contentType})`);
    const startTime = Date.now();

    // Create analysis run for observability
    const runId = await this.createAnalysisRun(tenantId, artifactId, version, retryCount);

    try {
      // Update status to PROCESSING (analyzing)
      await this.prisma.artifact.updateMany({
        where: { id: artifactId, tenantId },
        data: { status: ArtifactStatus.PROCESSING },
      });

      await this.updateAnalysisRunStatus(runId, 'ANALYZING', '분석 중...');

      // Step 1: Extract text using unified IngestionService
      const extraction = await this.ingestion.extractFromS3(s3Key, contentType);

      // Step 2: Handle scanned/unparseable documents gracefully
      if (extraction.isScannedPdf || extraction.status === 'UNPARSEABLE') {
        this.logger.warn(`Scanned or unparseable document detected: ${artifactId}`);

        const result: AnalysisResult = {
          overallStatus: 'UNPARSEABLE',
          score: 0,
          summaryKo: extraction.statusKo,
          isScannedPdf: extraction.isScannedPdf,
          extractionMethod: extraction.method,
          findings: [{
            category: 'EXTRACTION',
            status: 'UNPARSEABLE',
            severity: 'HIGH',
            messageKo: extraction.metadata.warnings.join(' '),
          }],
        };

        await this.storeAnalysis(artifactId, version, result);

        // Set status to FLAGGED (not blocking, but needs manual review)
        await this.prisma.artifact.updateMany({
          where: { id: artifactId, tenantId },
          data: { status: ArtifactStatus.FLAGGED },
        });

        // Track completion
        await this.completeAnalysisRun(runId, 'UNPARSEABLE', '판단 불가 (수동 검토 필요)', Date.now() - startTime);

        return result;
      }

      // Step 3: Check for partial extraction
      if (extraction.status === 'PARTIAL' || extraction.wordCount < 50) {
        this.logger.warn(`Insufficient text extracted from ${artifactId}: ${extraction.wordCount} words`);

        const result: AnalysisResult = {
          overallStatus: 'NEEDS_REVIEW',
          score: 0,
          summaryKo: extraction.statusKo || '문서에서 충분한 텍스트를 추출할 수 없습니다. 수동 검토가 필요합니다.',
          isScannedPdf: false,
          extractionMethod: extraction.method,
          findings: [{
            category: 'EXTRACTION',
            status: 'PARTIAL',
            severity: 'MEDIUM',
            messageKo: `추출된 단어 수: ${extraction.wordCount}. ${extraction.metadata.warnings.join(' ')}`,
          }],
        };

        await this.storeAnalysis(artifactId, version, result);

        await this.prisma.artifact.updateMany({
          where: { id: artifactId, tenantId },
          data: { status: ArtifactStatus.FLAGGED },
        });

        // Track completion
        await this.completeAnalysisRun(runId, 'COMPLETED', '내용 부족', Date.now() - startTime);

        return result;
      }

      // Step 4: Store successful extraction with page info
      await this.storeExtraction(artifactId, version, extraction);

      // Step 5: Get linked evidence requirements
      const requirements = await this.getLinkedRequirements(artifactId);

      // Step 6: Run OpenAI analysis with citation extraction
      const analysis = await this.runOpenAIAnalysis(extraction.text, requirements, extraction.pages);

      // Add extraction metadata to analysis
      analysis.isScannedPdf = false;
      analysis.extractionMethod = extraction.method;

      // Step 7: Store analysis
      await this.storeAnalysis(artifactId, version, analysis);

      // Step 8: Update artifact status
      // VERIFIED = analysis passed, FLAGGED = needs human review
      const finalStatus = analysis.score >= 80 ? ArtifactStatus.VERIFIED : ArtifactStatus.FLAGGED;
      await this.prisma.artifact.updateMany({
        where: { id: artifactId, tenantId },
        data: { status: finalStatus },
      });

      this.logger.log(`Completed sync analysis for ${artifactId}: ${analysis.overallStatus} (${analysis.score}%) via ${extraction.method}`);

      // Track successful completion
      await this.completeAnalysisRun(runId, 'COMPLETED', analysis.summaryKo, Date.now() - startTime);

      return analysis;
    } catch (error) {
      this.logger.error(`Sync analysis failed for ${artifactId}:`, error);

      // Update status to indicate failure - revert to READY so user can retry
      await this.prisma.artifact.updateMany({
        where: { id: artifactId, tenantId },
        data: { status: ArtifactStatus.READY },
      });

      // Track failed analysis run
      await this.failAnalysisRun(runId, error.message, Date.now() - startTime);

      return null;
    }
  }

  /**
   * Retry analysis for an artifact
   * CEO Demo: Allow re-running failed or partial analyses
   */
  async retryAnalysis(
    tenantId: string,
    artifactId: string,
  ): Promise<AnalysisResult | null> {
    // Get artifact details
    const artifact = await this.prisma.artifact.findFirst({
      where: { id: artifactId, tenantId, isDeleted: false },
      include: { binary: true },
    });

    if (!artifact) {
      throw new Error('Artifact not found');
    }

    // Get previous retry count
    const previousRuns = await this.prisma.$queryRaw<Array<{ retry_count: number }>>`
      SELECT retry_count FROM analysis_runs
      WHERE artifact_id = ${artifactId}::uuid
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const retryCount = previousRuns.length > 0 ? previousRuns[0].retry_count + 1 : 1;

    return this.analyzeArtifact(
      tenantId,
      artifactId,
      artifact.version || 1,
      artifact.binary?.s3Key || artifact.s3Key || '',
      artifact.binary?.mimeType || artifact.mimeType || 'application/octet-stream',
      retryCount,
    );
  }

  /**
   * Get analysis status for an artifact
   * CEO Demo: Real-time status updates for frontend
   */
  async getAnalysisStatus(tenantId: string, artifactId: string) {
    const runs = await this.prisma.$queryRaw<
      Array<{
        id: string;
        status: string;
        status_ko: string;
        model: string;
        total_tokens: number;
        latency_ms: number;
        retry_count: number;
        error_message: string;
        created_at: Date;
        completed_at: Date;
      }>
    >`
      SELECT *
      FROM analysis_runs
      WHERE artifact_id = ${artifactId}::uuid
      ORDER BY created_at DESC
      LIMIT 5
    `;

    if (runs.length === 0) {
      return {
        hasAnalysis: false,
        status: 'NOT_STARTED',
        statusKo: '분석 대기',
      };
    }

    const latest = runs[0];
    return {
      hasAnalysis: true,
      status: latest.status,
      statusKo: latest.status_ko || this.getStatusKo(latest.status),
      model: latest.model,
      tokens: latest.total_tokens,
      latencyMs: latest.latency_ms,
      retryCount: latest.retry_count,
      errorMessage: latest.error_message,
      createdAt: latest.created_at,
      completedAt: latest.completed_at,
      history: runs.map((r) => ({
        status: r.status,
        createdAt: r.created_at,
        completedAt: r.completed_at,
      })),
    };
  }

  private getStatusKo(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING: '분석 대기',
      ANALYZING: '분석 중...',
      COMPLETED: '분석 완료',
      FAILED: '분석 실패',
      UNPARSEABLE: '판단 불가 (수동 검토 필요)',
    };
    return statusMap[status] || status;
  }

  // ============================================
  // Analysis Run Tracking Methods
  // ============================================

  private async createAnalysisRun(
    tenantId: string,
    artifactId: string,
    version: number,
    retryCount: number,
  ): Promise<string> {
    const result = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO analysis_runs (tenant_id, artifact_id, version, status, status_ko, retry_count, started_at)
      VALUES (${tenantId}::uuid, ${artifactId}::uuid, ${version}, 'PENDING', '분석 대기', ${retryCount}, NOW())
      RETURNING id
    `;
    return result[0].id;
  }

  private async updateAnalysisRunStatus(runId: string, status: string, statusKo: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE analysis_runs
      SET status = ${status}, status_ko = ${statusKo}
      WHERE id = ${runId}::uuid
    `;
  }

  private async completeAnalysisRun(
    runId: string,
    status: string,
    statusKo: string,
    latencyMs: number,
    model?: string,
    tokens?: number,
  ): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE analysis_runs
      SET status = ${status},
          status_ko = ${statusKo},
          latency_ms = ${latencyMs},
          model = ${model || 'gpt-4o-mini'},
          total_tokens = ${tokens || null},
          completed_at = NOW()
      WHERE id = ${runId}::uuid
    `;
  }

  private async failAnalysisRun(runId: string, errorMessage: string, latencyMs: number): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE analysis_runs
      SET status = 'FAILED',
          status_ko = '분석 실패',
          error_message = ${errorMessage},
          latency_ms = ${latencyMs},
          completed_at = NOW()
      WHERE id = ${runId}::uuid
    `;
  }

  /**
   * Store extraction result with page-level data for citations
   */
  private async storeExtraction(artifactId: string, version: number, extraction: ExtractionResult) {
    // Store main extraction
    await this.prisma.$executeRaw`
      INSERT INTO document_extractions (
        id, artifact_id, version, extracted_text, extraction_method,
        page_count, word_count, confidence, metadata, created_at
      )
      VALUES (
        gen_random_uuid(),
        ${artifactId}::uuid,
        ${version},
        ${extraction.text},
        ${extraction.method},
        ${extraction.pageCount || null},
        ${extraction.wordCount},
        ${extraction.confidence},
        ${JSON.stringify(extraction.metadata)}::jsonb,
        NOW()
      )
      ON CONFLICT (artifact_id, version) DO UPDATE SET
        extracted_text = ${extraction.text},
        extraction_method = ${extraction.method},
        page_count = ${extraction.pageCount || null},
        word_count = ${extraction.wordCount},
        confidence = ${extraction.confidence},
        metadata = ${JSON.stringify(extraction.metadata)}::jsonb,
        updated_at = NOW()
    `;

    // Store page-level chunks for citation support (if available)
    if (extraction.pages && extraction.pages.length > 0) {
      for (const page of extraction.pages) {
        await this.prisma.$executeRaw`
          INSERT INTO document_chunks (
            id, artifact_id, version, page_number, text_content,
            start_offset, end_offset, created_at
          )
          VALUES (
            gen_random_uuid(),
            ${artifactId}::uuid,
            ${version},
            ${page.pageNumber},
            ${page.text},
            ${page.startOffset},
            ${page.endOffset},
            NOW()
          )
          ON CONFLICT (artifact_id, version, page_number) DO UPDATE SET
            text_content = ${page.text},
            start_offset = ${page.startOffset},
            end_offset = ${page.endOffset},
            updated_at = NOW()
        `;
      }
    }
  }

  private async getLinkedRequirements(artifactId: string) {
    const links = await this.prisma.artifactEvidenceRequirement.findMany({
      where: { artifactId },
      include: {
        evidenceRequirement: {
          include: {
            control: true,
          },
        },
      },
    });

    return links.map(l => ({
      id: l.evidenceRequirement.id,
      name: l.evidenceRequirement.name,
      description: l.evidenceRequirement.description,
      acceptanceCriteria: l.evidenceRequirement.acceptanceCriteria,
      controlName: l.evidenceRequirement.control?.name,
    }));
  }

  /**
   * Run OpenAI analysis with auditor-grade citation extraction
   * CEO Demo: Every finding must have a page reference and excerpt
   */
  private async runOpenAIAnalysis(
    text: string,
    requirements: any[],
    pages?: Array<{ pageNumber: number; text: string; startOffset: number; endOffset: number }>,
  ): Promise<AnalysisResult> {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('No OpenAI API key configured, using fallback analysis');
      return this.fallbackAnalysis(text, requirements);
    }

    try {
      const requirementsList = requirements.length > 0
        ? requirements.map(r => `- ${r.name}: ${r.description || ''} (기준: ${r.acceptanceCriteria || '명시된 기준 없음'})`).join('\n')
        : '- 연결된 증빙 요구사항이 없습니다. 일반적인 규정 준수 문서로 분석합니다.';

      // CEO Demo: Auditor-grade prompt with citation requirements
      const prompt = `당신은 한국 기업의 규정 준수 문서를 분석하는 감사 전문가입니다.

## 중요 지침 (Non-negotiable):
1. **모든 판단에 대해 반드시 인용(citation)을 제공하세요**
2. **추측하지 마세요** - 증거가 없으면 "판단 불가"로 표시
3. **정확한 페이지 번호와 발췌문을 포함하세요**

## 증빙 요구사항:
${requirementsList}

## 문서 내용 (${pages?.length || 1}페이지):
${text.substring(0, 10000)}

## 응답 형식 (JSON):
{
  "overallStatus": "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT" | "NEEDS_REVIEW",
  "score": 0-100,
  "summaryKo": "한국어 요약 (2-3문장, 주요 발견사항 포함)",
  "findings": [
    {
      "category": "카테고리명",
      "status": "MET" | "PARTIAL" | "NOT_MET",
      "severity": "LOW" | "MEDIUM" | "HIGH",
      "messageKo": "한국어 설명",
      "pageRef": 1,
      "excerpt": "문서에서 직접 인용한 텍스트 (최대 100자)"
    }
  ],
  "citations": [
    {
      "pageNumber": 1,
      "excerpt": "인용 텍스트",
      "context": "이 인용이 어떤 요구사항을 충족하는지 설명"
    }
  ]
}

## 분석 수행:
1. 각 요구사항에 대해 문서 내 관련 내용을 찾으세요
2. 찾은 내용을 정확히 인용하세요 (페이지 번호 + 발췌문)
3. 증거가 없으면 "NOT_MET"으로 표시하고 messageKo에 "해당 내용 없음"으로 명시
4. 절대 없는 내용을 만들어내지 마세요`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Lower temperature for more deterministic output
        max_tokens: 3000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      const parsed = JSON.parse(content);

      // Ensure required fields exist
      return {
        overallStatus: parsed.overallStatus || 'NEEDS_REVIEW',
        score: parsed.score || 0,
        summaryKo: parsed.summaryKo || '분석을 완료했습니다.',
        isScannedPdf: false,
        extractionMethod: 'AI_ANALYSIS',
        findings: (parsed.findings || []).map((f: any) => ({
          category: f.category || '일반',
          status: f.status || 'NOT_MET',
          severity: f.severity || 'MEDIUM',
          messageKo: f.messageKo || '',
          pageRef: f.pageRef,
          excerpt: f.excerpt,
        })),
        citations: parsed.citations || [],
      };
    } catch (error) {
      this.logger.error('OpenAI analysis failed:', error);
      return this.fallbackAnalysis(text, requirements);
    }
  }

  /**
   * Fallback analysis when OpenAI is unavailable
   * Uses heuristics to provide basic compliance check
   */
  private fallbackAnalysis(text: string, requirements: any[]): AnalysisResult {
    // Simple heuristic-based analysis when OpenAI is unavailable
    const hasContent = text.length > 200;
    const hasDate = /\d{4}[년\-\/]\d{1,2}[월\-\/]\d{1,2}/.test(text);
    const hasSignature = /서명|날인|sign|signature/i.test(text);

    // Try to find date in text for citation
    const dateMatch = text.match(/\d{4}[년\-\/]\d{1,2}[월\-\/]\d{1,2}[일]?/);

    let score = 50;
    if (hasContent) score += 20;
    if (hasDate) score += 15;
    if (hasSignature) score += 15;

    return {
      overallStatus: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'PARTIAL' : 'NEEDS_REVIEW',
      score,
      summaryKo: `문서 분석이 완료되었습니다. ${hasContent ? '충분한 내용이 포함되어 있으며' : '내용이 부족할 수 있으며'}, ${hasDate ? '날짜 정보가 확인되었고' : '날짜 정보가 없으며'}, ${hasSignature ? '서명/날인이 포함되어 있습니다.' : '서명/날인 확인이 필요합니다.'}`,
      isScannedPdf: false,
      extractionMethod: 'HEURISTIC_FALLBACK',
      findings: [
        {
          category: '문서 완성도',
          status: hasContent ? 'MET' : 'PARTIAL',
          severity: hasContent ? 'LOW' : 'MEDIUM',
          messageKo: hasContent ? '문서에 충분한 내용이 포함되어 있습니다.' : '문서 내용이 부족할 수 있습니다.',
          pageRef: 1,
          excerpt: text.substring(0, 50) + '...',
        },
        {
          category: '날짜 정보',
          status: hasDate ? 'MET' : 'NOT_MET',
          severity: hasDate ? 'LOW' : 'HIGH',
          messageKo: hasDate ? '유효한 날짜 정보가 확인되었습니다.' : '문서에 날짜 정보가 없습니다.',
          pageRef: 1,
          excerpt: dateMatch ? dateMatch[0] : undefined,
        },
        {
          category: '서명/날인',
          status: hasSignature ? 'MET' : 'NOT_MET',
          severity: hasSignature ? 'LOW' : 'MEDIUM',
          messageKo: hasSignature ? '서명 또는 날인이 확인되었습니다.' : '서명 또는 날인 확인이 필요합니다.',
        },
      ],
      citations: dateMatch ? [{
        pageNumber: 1,
        excerpt: dateMatch[0],
        context: '문서 날짜 정보',
      }] : [],
    };
  }

  /**
   * Store analysis result with full metadata
   * CEO Demo: Includes citations and extraction method
   */
  private async storeAnalysis(artifactId: string, version: number, analysis: AnalysisResult) {
    const metadata = {
      summaryKo: analysis.summaryKo,
      score: analysis.score,
      isScannedPdf: analysis.isScannedPdf,
      extractionMethod: analysis.extractionMethod,
      citations: analysis.citations || [],
    };

    await this.prisma.$executeRaw`
      INSERT INTO document_analyses (
        id, artifact_id, version, overall_compliance, confidence,
        findings, missing_elements, recommendations, analysis_metadata, created_at
      )
      VALUES (
        gen_random_uuid(),
        ${artifactId}::uuid,
        ${version},
        ${analysis.overallStatus},
        ${analysis.score / 100},
        ${JSON.stringify(analysis.findings)}::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        ${JSON.stringify(metadata)}::jsonb,
        NOW()
      )
      ON CONFLICT (artifact_id, version) DO UPDATE SET
        overall_compliance = ${analysis.overallStatus},
        confidence = ${analysis.score / 100},
        findings = ${JSON.stringify(analysis.findings)}::jsonb,
        analysis_metadata = ${JSON.stringify(metadata)}::jsonb,
        updated_at = NOW()
    `;
  }
}
