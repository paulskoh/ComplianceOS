import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService, JobEnvelope } from '../aws/queue.service';
import Anthropic from '@anthropic-ai/sdk';

interface DocAnalysisPayload {
  artifactId: string;
  version: number;
  docType: string;
  evidenceRequirementIds: string[];
}

interface ComplianceAnalysisResult {
  overallCompliance: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'UNCLEAR';
  confidence: number;
  findings: Array<{
    evidenceRequirementId: string;
    requirementText: string;
    status: 'MET' | 'PARTIALLY_MET' | 'NOT_MET' | 'NOT_APPLICABLE';
    evidence: string;
    reasoning: string;
    confidence: number;
  }>;
  missingElements: string[];
  recommendations: string[];
  analysisMetadata: {
    model: string;
    tokensUsed: number;
    analysisTimestamp: string;
  };
}

@Injectable()
export class DocumentAnalysisWorker {
  private readonly logger = new Logger(DocumentAnalysisWorker.name);
  private readonly anthropic: Anthropic;

  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
  ) {
    // Initialize Anthropic client
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async handleDocAnalysis(job: JobEnvelope, payload: DocAnalysisPayload) {
    const { artifactId, version, docType, evidenceRequirementIds } = payload;

    this.logger.log(
      `Analyzing document for artifact ${artifactId} v${version} against ${evidenceRequirementIds.length} requirements`,
    );

    try {
      // Fetch extracted text
      const extraction = await this.prisma.$queryRaw<Array<{ extracted_text: string }>>`
        SELECT extracted_text
        FROM document_extractions
        WHERE artifact_id = ${artifactId}::uuid AND version = ${version}
        ORDER BY created_at DESC
        LIMIT 1
      `;

      if (!extraction || extraction.length === 0) {
        throw new Error(`No extracted text found for artifact ${artifactId}`);
      }

      const extractedText = extraction[0].extracted_text;

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

      // Analyze with Claude
      const analysis = await this.analyzeWithLLM(extractedText, docType, requirements);

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
      throw error;
    }
  }

  /**
   * Analyze document with Claude using structured output
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
  ): Promise<ComplianceAnalysisResult> {
    const systemPrompt = `You are a compliance expert analyzing documents for Korean privacy and data protection regulations (PIPA, ISMS-P).

Your task is to analyze the provided document and determine if it meets the specified evidence requirements.

For each requirement, you must:
1. Determine if the requirement is MET, PARTIALLY_MET, NOT_MET, or NOT_APPLICABLE
2. Extract specific evidence from the document that supports your determination
3. Provide clear reasoning for your assessment
4. Assign a confidence score (0.0 to 1.0)

Be thorough but concise. Quote specific sections from the document when possible.`;

    const userPrompt = `Document Type: ${docType}

Document Content:
${extractedText.substring(0, 10000)} ${extractedText.length > 10000 ? '... (truncated)' : ''}

Evidence Requirements to Validate:
${requirements.map((req, idx) => `
${idx + 1}. Control: ${req.control.name}
   Requirement ID: ${req.id}
   Requirement Name: ${req.name}
   Description: ${req.description}
   ${req.acceptanceCriteria?.length > 0 ? `Acceptance Criteria: ${req.acceptanceCriteria.join(', ')}` : ''}
`).join('\n')}

Please analyze this document and provide a structured compliance assessment.

Respond in the following JSON format:
{
  "overallCompliance": "COMPLIANT" | "PARTIAL" | "NON_COMPLIANT" | "UNCLEAR",
  "confidence": 0.0 to 1.0,
  "findings": [
    {
      "evidenceRequirementId": "requirement ID",
      "requirementText": "the requirement text",
      "status": "MET" | "PARTIALLY_MET" | "NOT_MET" | "NOT_APPLICABLE",
      "evidence": "specific quote or reference from document",
      "reasoning": "explanation of your determination",
      "confidence": 0.0 to 1.0
    }
  ],
  "missingElements": ["list of missing compliance elements"],
  "recommendations": ["list of recommendations to improve compliance"]
}`;

    const response = await this.anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.0, // Deterministic for compliance
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract JSON from response
    const textContent = response.content[0];
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let analysisJson: ComplianceAnalysisResult;
    try {
      // Try to parse the entire response as JSON
      analysisJson = JSON.parse(textContent.text);
    } catch {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = textContent.text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        analysisJson = JSON.parse(jsonMatch[1]);
      } else {
        // Last resort: try to find JSON object in text
        const objectMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (objectMatch) {
          analysisJson = JSON.parse(objectMatch[0]);
        } else {
          throw new Error('Could not extract JSON from Claude response');
        }
      }
    }

    // Add metadata
    analysisJson.analysisMetadata = {
      model: response.model,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
      analysisTimestamp: new Date().toISOString(),
    };

    return analysisJson;
  }
}
