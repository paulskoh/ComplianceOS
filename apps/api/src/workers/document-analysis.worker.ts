import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService, JobEnvelope } from '../aws/queue.service';
import OpenAI from 'openai';

interface DocAnalysisPayload {
  artifactId: string;
  version: number;
  docType: string;
  evidenceRequirementIds: string[];
}

/**
 * SOFT-LAUNCH COMPLIANT: Evidence citation with file traceability
 */
interface EvidenceCitation {
  file_id: string;
  file_name: string;
  excerpt: string;
  location?: string; // e.g., "page 3, paragraph 2" or "section 4.1"
}

/**
 * SOFT-LAUNCH COMPLIANT: Finding with full traceability
 */
interface FindingWithTraceability {
  evidenceRequirementId: string;
  requirementText: string;
  status: 'MET' | 'PARTIALLY_MET' | 'NOT_MET' | 'NOT_APPLICABLE' | 'INSUFFICIENT_EVIDENCE';
  evidence_citations: EvidenceCitation[];
  reasoning: string;
  confidence: number;
  uncertainty_note?: string; // Explicit statement of uncertainty when applicable
}

/**
 * SOFT-LAUNCH COMPLIANT: Analysis result with traceability
 */
interface ComplianceAnalysisResult {
  overallCompliance: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'UNCLEAR' | 'INSUFFICIENT_EVIDENCE';
  confidence: number;
  findings: FindingWithTraceability[];
  missingElements: string[];
  recommendations: string[];
  analysisMetadata: {
    model: string;
    tokensUsed: number;
    analysisTimestamp: string;
    sourceArtifact: {
      id: string;
      name: string;
      version: number;
    };
    uncertaintyStatement?: string;
  };
}

/**
 * SOFT-LAUNCH: Analysis status types for explicit failure handling
 */
type AnalysisStatus =
  | 'COMPLETE'
  | 'INSUFFICIENT_EVIDENCE'
  | 'MANUAL_REVIEW_REQUIRED'
  | 'ANALYSIS_FAILED';

@Injectable()
export class DocumentAnalysisWorker {
  private readonly logger = new Logger(DocumentAnalysisWorker.name);
  private readonly openai: OpenAI;

  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
  ) {
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async handleDocAnalysis(job: JobEnvelope, payload: DocAnalysisPayload) {
    const { artifactId, version, docType, evidenceRequirementIds } = payload;

    this.logger.log(
      `Analyzing document for artifact ${artifactId} v${version} against ${evidenceRequirementIds.length} requirements`,
    );

    try {
      // Fetch artifact metadata for traceability
      const artifact = await this.prisma.artifact.findUnique({
        where: { id: artifactId },
        select: { id: true, name: true },
      });

      if (!artifact) {
        await this.storeFailedAnalysis(artifactId, version, 'ANALYSIS_FAILED',
          'Artifact not found. Cannot proceed with analysis.');
        throw new Error(`Artifact ${artifactId} not found`);
      }

      // Fetch extracted text
      const extraction = await this.prisma.$queryRaw<Array<{ extracted_text: string }>>`
        SELECT extracted_text
        FROM document_extractions
        WHERE artifact_id = ${artifactId}::uuid AND version = ${version}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!extraction || extraction.length === 0) {
        // SOFT-LAUNCH: Explicit failure - no extracted text
        await this.storeFailedAnalysis(artifactId, version, 'INSUFFICIENT_EVIDENCE',
          'No text could be extracted from this document. Manual review required.');
        this.logger.warn(`No extracted text for artifact ${artifactId} - marking for manual review`);
        return;
      }

      const extractedText = extraction[0].extracted_text;

      // SOFT-LAUNCH: Check if extracted text is too short for meaningful analysis
      if (extractedText.trim().length < 50) {
        await this.storeFailedAnalysis(artifactId, version, 'INSUFFICIENT_EVIDENCE',
          'Extracted text is too short for compliance analysis. The document may be a scan without OCR, or contain primarily images.');
        this.logger.warn(`Extracted text too short for artifact ${artifactId}`);
        return;
      }

      // Fetch evidence requirements
      const requirements = await this.prisma.controlEvidenceRequirement.findMany({
        where: { id: { in: evidenceRequirementIds } },
        select: {
          id: true,
          name: true,
          description: true,
          acceptanceCriteria: true,
          control: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
        },
      });

      if (requirements.length === 0) {
        await this.storeFailedAnalysis(artifactId, version, 'MANUAL_REVIEW_REQUIRED',
          'No evidence requirements linked to this artifact. Please link to specific requirements before analysis.');
        return;
      }

      // Analyze with OpenAI - pass artifact info for traceability
      const analysis = await this.analyzeWithLLM(
        extractedText,
        docType,
        requirements,
        { id: artifact.id, name: artifact.name, version }
      );

      // Store analysis result
      await this.prisma.$executeRaw`
        INSERT INTO document_analyses (
          id,
          artifact_id,
          version,
          overall_compliance,
          confidence,
          findings,
          missing_elements,
          recommendations,
          analysis_metadata,
          created_at
        )
        VALUES (
          gen_random_uuid(),
          ${artifactId}::uuid,
          ${version},
          ${analysis.overallCompliance},
          ${analysis.confidence},
          ${JSON.stringify(analysis.findings)}::jsonb,
          ${JSON.stringify(analysis.missingElements)}::jsonb,
          ${JSON.stringify(analysis.recommendations)}::jsonb,
          ${JSON.stringify(analysis.analysisMetadata)}::jsonb,
          NOW()
        )
        ON CONFLICT (artifact_id, version) DO UPDATE SET
          overall_compliance = ${analysis.overallCompliance},
          confidence = ${analysis.confidence},
          findings = ${JSON.stringify(analysis.findings)}::jsonb,
          missing_elements = ${JSON.stringify(analysis.missingElements)}::jsonb,
          recommendations = ${JSON.stringify(analysis.recommendations)}::jsonb,
          analysis_metadata = ${JSON.stringify(analysis.analysisMetadata)}::jsonb,
          updated_at = NOW()
      `;

      // SOFT-LAUNCH: Only auto-approve with high confidence AND no insufficient evidence findings
      const hasInsufficientEvidence = analysis.findings.some(
        f => f.status === 'INSUFFICIENT_EVIDENCE' || f.uncertainty_note
      );

      if (analysis.overallCompliance === 'COMPLIANT' &&
          analysis.confidence >= 0.8 &&
          !hasInsufficientEvidence) {
        await this.prisma.artifact.updateMany({
          where: { id: artifactId },
          data: {
            isApproved: true,
            approvedAt: new Date(),
          },
        });
        this.logger.log(`Auto-approved artifact ${artifactId} based on COMPLIANT analysis with high confidence`);
      } else if (analysis.overallCompliance === 'UNCLEAR' || hasInsufficientEvidence) {
        // SOFT-LAUNCH: Flag for manual review when uncertain
        this.logger.log(`Artifact ${artifactId} flagged for manual review: ${analysis.analysisMetadata.uncertaintyStatement || 'Low confidence or insufficient evidence'}`);
      }

      // Enqueue readiness recompute if compliance status changed
      if (analysis.overallCompliance === 'COMPLIANT' || analysis.overallCompliance === 'PARTIAL') {
        await this.queue.enqueueJob({
          tenantId: job.tenantId,
          type: 'READINESS_RECOMPUTE',
          payload: {
            artifactId,
            evidenceRequirementIds,
            trigger: 'DOCUMENT_ANALYSIS_COMPLETED',
          },
        });
      }

      this.logger.log(
        `Analysis completed: ${analysis.overallCompliance} (confidence: ${analysis.confidence})`,
      );
    } catch (error) {
      this.logger.error(`Analysis failed for artifact ${artifactId}:`, error.stack);
      // SOFT-LAUNCH: Store failed analysis with explicit error message
      await this.storeFailedAnalysis(artifactId, version, 'ANALYSIS_FAILED',
        `Analysis failed: ${error.message}. Please retry or request manual review.`);
      throw error;
    }
  }

  /**
   * SOFT-LAUNCH: Store explicit failure states for transparency
   */
  private async storeFailedAnalysis(
    artifactId: string,
    version: number,
    status: AnalysisStatus,
    message: string
  ) {
    const failedResult = {
      overallCompliance: status === 'INSUFFICIENT_EVIDENCE' ? 'INSUFFICIENT_EVIDENCE' : 'UNCLEAR',
      confidence: 0,
      findings: [],
      missingElements: [message],
      recommendations: ['Manual review required to determine compliance status'],
      analysisMetadata: {
        model: 'N/A',
        tokensUsed: 0,
        analysisTimestamp: new Date().toISOString(),
        sourceArtifact: { id: artifactId, name: 'Unknown', version },
        uncertaintyStatement: message,
      },
    };

    try {
      await this.prisma.$executeRaw`
        INSERT INTO document_analyses (
          id,
          artifact_id,
          version,
          overall_compliance,
          confidence,
          findings,
          missing_elements,
          recommendations,
          analysis_metadata,
          created_at
        )
        VALUES (
          gen_random_uuid(),
          ${artifactId}::uuid,
          ${version},
          ${failedResult.overallCompliance},
          ${failedResult.confidence},
          ${JSON.stringify(failedResult.findings)}::jsonb,
          ${JSON.stringify(failedResult.missingElements)}::jsonb,
          ${JSON.stringify(failedResult.recommendations)}::jsonb,
          ${JSON.stringify(failedResult.analysisMetadata)}::jsonb,
          NOW()
        )
        ON CONFLICT (artifact_id, version) DO UPDATE SET
          overall_compliance = ${failedResult.overallCompliance},
          confidence = ${failedResult.confidence},
          findings = ${JSON.stringify(failedResult.findings)}::jsonb,
          missing_elements = ${JSON.stringify(failedResult.missingElements)}::jsonb,
          recommendations = ${JSON.stringify(failedResult.recommendations)}::jsonb,
          analysis_metadata = ${JSON.stringify(failedResult.analysisMetadata)}::jsonb,
          updated_at = NOW()
      `;
    } catch (err) {
      this.logger.error(`Failed to store failed analysis state: ${err.message}`);
    }
  }

  /**
   * SOFT-LAUNCH COMPLIANT: Analyze document with OpenAI using structured output with full traceability
   */
  private async analyzeWithLLM(
    extractedText: string,
    docType: string,
    requirements: Array<{
      id: string;
      name: string;
      description: string;
      acceptanceCriteria: string[];
      control: { id: string; name: string; description: string | null };
    }>,
    sourceArtifact: { id: string; name: string; version: number },
  ): Promise<ComplianceAnalysisResult> {
    // SOFT-LAUNCH: Enhanced system prompt requiring evidence citations and explicit uncertainty
    const systemPrompt = `You are a compliance expert analyzing documents for Korean privacy and data protection regulations (PIPA, ISMS-P).

CRITICAL REQUIREMENTS FOR YOUR ANALYSIS:

1. TRACEABILITY: For EVERY determination, you MUST:
   - Quote SPECIFIC text excerpts from the document
   - Include the approximate location (e.g., "near the beginning", "in section about consent")
   - If no relevant text exists, explicitly state this

2. EXPLICIT UNCERTAINTY: You MUST acknowledge when:
   - Evidence is insufficient (use status "INSUFFICIENT_EVIDENCE")
   - You are uncertain about interpretation (add "uncertainty_note")
   - The document doesn't clearly address a requirement

3. NEVER HALLUCINATE: If you cannot find evidence for a requirement:
   - Do NOT fabricate quotes
   - Do NOT assume compliance
   - DO use "INSUFFICIENT_EVIDENCE" or "NOT_MET" status
   - DO explain what evidence would be needed

4. CONFIDENCE SCORING:
   - 0.9-1.0: Clear, explicit evidence found
   - 0.7-0.89: Good evidence but some interpretation needed
   - 0.5-0.69: Partial evidence, significant uncertainty
   - Below 0.5: Insufficient evidence, use INSUFFICIENT_EVIDENCE status

Respond ONLY with valid JSON in the following format:
{
  "overallCompliance": "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT" | "UNCLEAR" | "INSUFFICIENT_EVIDENCE",
  "confidence": 0.0 to 1.0,
  "findings": [
    {
      "evidenceRequirementId": "requirement ID",
      "requirementText": "the requirement text",
      "status": "MET" | "PARTIALLY_MET" | "NOT_MET" | "NOT_APPLICABLE" | "INSUFFICIENT_EVIDENCE",
      "evidence_citations": [
        {
          "excerpt": "exact quote from document",
          "location": "where in document this was found"
        }
      ],
      "reasoning": "explanation of your determination with reference to cited evidence",
      "confidence": 0.0 to 1.0,
      "uncertainty_note": "optional - explain any uncertainty or limitations"
    }
  ],
  "missingElements": ["list of missing compliance elements with specific descriptions"],
  "recommendations": ["actionable recommendations to improve compliance"],
  "uncertaintyStatement": "optional - overall statement about analysis limitations"
}`;

    const userPrompt = `SOURCE DOCUMENT INFORMATION:
- Document ID: ${sourceArtifact.id}
- Document Name: ${sourceArtifact.name}
- Version: ${sourceArtifact.version}
- Document Type: ${docType}

DOCUMENT CONTENT:
${extractedText.substring(0, 12000)}${extractedText.length > 12000 ? '\n... (document truncated for analysis)' : ''}

EVIDENCE REQUIREMENTS TO VALIDATE:
${requirements.map((req, idx) => `
${idx + 1}. REQUIREMENT:
   - Requirement ID: ${req.id}
   - Control: ${req.control.name}
   - Requirement Name: ${req.name}
   - Description: ${req.description}
   ${req.acceptanceCriteria?.length > 0 ? `- Acceptance Criteria: ${req.acceptanceCriteria.join('; ')}` : '- Acceptance Criteria: Not specified'}
`).join('\n')}

INSTRUCTIONS:
Analyze the document above. For each requirement:
1. Search for relevant text in the document
2. Quote specific excerpts as evidence
3. Determine compliance status based ONLY on what you can cite
4. Be explicit about any uncertainty or missing information
5. Never assume compliance without evidence`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.0, // Deterministic for compliance
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract JSON from response
    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error('No response content from OpenAI');
    }

    let rawAnalysis: any;
    try {
      rawAnalysis = JSON.parse(messageContent);
    } catch {
      const jsonMatch = messageContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        rawAnalysis = JSON.parse(jsonMatch[1]);
      } else {
        const objectMatch = messageContent.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          rawAnalysis = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Could not extract JSON from OpenAI response');
        }
      }
    }

    // SOFT-LAUNCH: Transform response to include full traceability
    const analysisJson: ComplianceAnalysisResult = {
      overallCompliance: rawAnalysis.overallCompliance || 'UNCLEAR',
      confidence: rawAnalysis.confidence || 0,
      findings: (rawAnalysis.findings || []).map((f: any) => ({
        evidenceRequirementId: f.evidenceRequirementId,
        requirementText: f.requirementText || '',
        status: f.status || 'INSUFFICIENT_EVIDENCE',
        evidence_citations: (f.evidence_citations || []).map((c: any) => ({
          file_id: sourceArtifact.id,
          file_name: sourceArtifact.name,
          excerpt: c.excerpt || f.evidence || '',
          location: c.location || 'Location not specified',
        })),
        reasoning: f.reasoning || '',
        confidence: f.confidence || 0,
        uncertainty_note: f.uncertainty_note,
      })),
      missingElements: rawAnalysis.missingElements || [],
      recommendations: rawAnalysis.recommendations || [],
      analysisMetadata: {
        model: response.model,
        tokensUsed: (response.usage?.prompt_tokens || 0) + (response.usage?.completion_tokens || 0),
        analysisTimestamp: new Date().toISOString(),
        sourceArtifact,
        uncertaintyStatement: rawAnalysis.uncertaintyStatement,
      },
    };

    // SOFT-LAUNCH: Validate that findings have proper evidence citations
    for (const finding of analysisJson.findings) {
      if (finding.status === 'MET' && finding.evidence_citations.length === 0) {
        // Downgrade to PARTIAL if claiming MET without evidence
        finding.status = 'PARTIALLY_MET';
        finding.uncertainty_note = (finding.uncertainty_note || '') +
          ' (Downgraded: No specific evidence citation provided for MET status)';
        finding.confidence = Math.min(finding.confidence, 0.6);
      }
    }

    return analysisJson;
  }
}
