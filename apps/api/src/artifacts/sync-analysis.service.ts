import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../aws/storage.service';
import { ArtifactStatus } from '@prisma/client';
import OpenAI from 'openai';

// Lazy load pdf-parse
let pdfParse: any = null;

interface AnalysisResult {
  overallStatus: string;
  score: number;
  summaryKo: string;
  findings: Array<{
    category: string;
    status: string;
    severity: string;
    messageKo: string;
  }>;
}

/**
 * Synchronous document analysis service for local development/demo
 * Bypasses SQS queues and runs analysis directly after upload
 */
@Injectable()
export class SyncAnalysisService {
  private readonly logger = new Logger(SyncAnalysisService.name);
  private readonly openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Run synchronous analysis on an artifact
   * Called immediately after finalizeUpload when SYNC_ANALYSIS=true
   */
  async analyzeArtifact(
    tenantId: string,
    artifactId: string,
    version: number,
    s3Key: string,
    contentType: string,
  ): Promise<AnalysisResult | null> {
    this.logger.log(`Starting sync analysis for artifact ${artifactId}`);

    try {
      // Update status to PROCESSING (analyzing)
      await this.prisma.artifact.updateMany({
        where: { id: artifactId, tenantId },
        data: { status: ArtifactStatus.PROCESSING },
      });

      // Step 1: Extract text from document
      const extractedText = await this.extractText(s3Key, contentType);

      if (!extractedText || extractedText.trim().length < 50) {
        this.logger.warn(`Insufficient text extracted from ${artifactId}`);
        await this.storeAnalysis(artifactId, version, {
          overallStatus: 'NEEDS_REVIEW',
          score: 0,
          summaryKo: '문서에서 충분한 텍스트를 추출할 수 없습니다. 수동 검토가 필요합니다.',
          findings: [{
            category: 'EXTRACTION',
            status: 'FAILED',
            severity: 'HIGH',
            messageKo: '텍스트 추출 실패 - OCR이 필요하거나 이미지 기반 문서입니다.',
          }],
        });
        return null;
      }

      // Store extraction
      await this.storeExtraction(artifactId, version, extractedText);

      // Step 2: Get linked evidence requirements
      const requirements = await this.getLinkedRequirements(artifactId);

      // Step 3: Run OpenAI analysis
      const analysis = await this.runOpenAIAnalysis(extractedText, requirements);

      // Step 4: Store analysis
      await this.storeAnalysis(artifactId, version, analysis);

      // Step 5: Update artifact status
      // VERIFIED = analysis passed, FLAGGED = needs human review
      const finalStatus = analysis.score >= 80 ? ArtifactStatus.VERIFIED : ArtifactStatus.FLAGGED;
      await this.prisma.artifact.updateMany({
        where: { id: artifactId, tenantId },
        data: { status: finalStatus },
      });

      this.logger.log(`Completed sync analysis for ${artifactId}: ${analysis.overallStatus} (${analysis.score}%)`);

      return analysis;
    } catch (error) {
      this.logger.error(`Sync analysis failed for ${artifactId}:`, error);

      // Update status to indicate failure - revert to READY so user can retry
      await this.prisma.artifact.updateMany({
        where: { id: artifactId, tenantId },
        data: { status: ArtifactStatus.READY },
      });

      return null;
    }
  }

  private async extractText(s3Key: string, contentType: string): Promise<string> {
    try {
      const stream = await this.storage.getObjectStream(s3Key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      if (contentType === 'application/pdf') {
        if (!pdfParse) {
          try {
            pdfParse = require('pdf-parse');
          } catch (e) {
            this.logger.warn('pdf-parse not available, using fallback');
            return '';
          }
        }
        const data = await pdfParse(buffer);
        return data.text || '';
      }

      if (contentType.startsWith('text/')) {
        return buffer.toString('utf-8');
      }

      // For other types (docx, xlsx, images), return empty
      // In production, use proper parsers
      this.logger.warn(`Unsupported content type for extraction: ${contentType}`);
      return '';
    } catch (error) {
      this.logger.error('Text extraction failed:', error);
      return '';
    }
  }

  private async storeExtraction(artifactId: string, version: number, text: string) {
    await this.prisma.$executeRaw`
      INSERT INTO document_extractions (id, artifact_id, version, extracted_text, extraction_method, created_at)
      VALUES (gen_random_uuid(), ${artifactId}::uuid, ${version}, ${text}, 'PDF_TEXT', NOW())
      ON CONFLICT (artifact_id, version) DO UPDATE SET
        extracted_text = ${text},
        updated_at = NOW()
    `;
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

  private async runOpenAIAnalysis(text: string, requirements: any[]): Promise<AnalysisResult> {
    if (!process.env.OPENAI_API_KEY) {
      this.logger.warn('No OpenAI API key configured, using fallback analysis');
      return this.fallbackAnalysis(text, requirements);
    }

    try {
      const requirementsList = requirements.length > 0
        ? requirements.map(r => `- ${r.name}: ${r.description || ''} (기준: ${r.acceptanceCriteria || '명시된 기준 없음'})`).join('\n')
        : '- 연결된 증빙 요구사항이 없습니다. 일반적인 규정 준수 문서로 분석합니다.';

      const prompt = `당신은 한국 기업의 규정 준수 문서를 분석하는 전문가입니다.

다음 문서를 분석하고 규정 준수 상태를 평가하세요.

## 증빙 요구사항:
${requirementsList}

## 문서 내용:
${text.substring(0, 8000)}

## 분석 지침:
1. 문서가 위 요구사항을 충족하는지 평가
2. 누락된 요소나 개선이 필요한 부분 식별
3. 한국어로 결과 제공

다음 JSON 형식으로 응답하세요:
{
  "overallStatus": "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT" | "NEEDS_REVIEW",
  "score": 0-100,
  "summaryKo": "한국어 요약 (2-3문장)",
  "findings": [
    {
      "category": "카테고리",
      "status": "MET" | "PARTIAL" | "NOT_MET",
      "severity": "LOW" | "MEDIUM" | "HIGH",
      "messageKo": "한국어 설명"
    }
  ]
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from OpenAI');
      }

      return JSON.parse(content) as AnalysisResult;
    } catch (error) {
      this.logger.error('OpenAI analysis failed:', error);
      return this.fallbackAnalysis(text, requirements);
    }
  }

  private fallbackAnalysis(text: string, requirements: any[]): AnalysisResult {
    // Simple heuristic-based analysis when OpenAI is unavailable
    const hasContent = text.length > 200;
    const hasDate = /\d{4}[년\-\/]\d{1,2}[월\-\/]\d{1,2}/.test(text);
    const hasSignature = /서명|날인|sign|signature/i.test(text);

    let score = 50;
    if (hasContent) score += 20;
    if (hasDate) score += 15;
    if (hasSignature) score += 15;

    return {
      overallStatus: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'PARTIAL' : 'NEEDS_REVIEW',
      score,
      summaryKo: `문서 분석이 완료되었습니다. ${hasContent ? '충분한 내용이 포함되어 있으며' : '내용이 부족할 수 있으며'}, ${hasDate ? '날짜 정보가 확인되었고' : '날짜 정보가 없으며'}, ${hasSignature ? '서명/날인이 포함되어 있습니다.' : '서명/날인 확인이 필요합니다.'}`,
      findings: [
        {
          category: '문서 완성도',
          status: hasContent ? 'MET' : 'PARTIAL',
          severity: hasContent ? 'LOW' : 'MEDIUM',
          messageKo: hasContent ? '문서에 충분한 내용이 포함되어 있습니다.' : '문서 내용이 부족할 수 있습니다.',
        },
        {
          category: '날짜 정보',
          status: hasDate ? 'MET' : 'NOT_MET',
          severity: hasDate ? 'LOW' : 'HIGH',
          messageKo: hasDate ? '유효한 날짜 정보가 확인되었습니다.' : '문서에 날짜 정보가 없습니다.',
        },
        {
          category: '서명/날인',
          status: hasSignature ? 'MET' : 'NOT_MET',
          severity: hasSignature ? 'LOW' : 'MEDIUM',
          messageKo: hasSignature ? '서명 또는 날인이 확인되었습니다.' : '서명 또는 날인 확인이 필요합니다.',
        },
      ],
    };
  }

  private async storeAnalysis(artifactId: string, version: number, analysis: AnalysisResult) {
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
        ${JSON.stringify({ summaryKo: analysis.summaryKo, score: analysis.score })}::jsonb,
        NOW()
      )
      ON CONFLICT (artifact_id, version) DO UPDATE SET
        overall_compliance = ${analysis.overallStatus},
        confidence = ${analysis.score / 100},
        findings = ${JSON.stringify(analysis.findings)}::jsonb,
        analysis_metadata = ${JSON.stringify({ summaryKo: analysis.summaryKo, score: analysis.score })}::jsonb,
        updated_at = NOW()
    `;
  }
}
