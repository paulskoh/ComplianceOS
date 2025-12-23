import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService, JobEnvelope } from '../aws/queue.service';

interface DocClassifyPayload {
  artifactId: string;
  version: number;
  extractedText: string;
}

type DocType =
  | 'PRIVACY_POLICY'
  | 'PROCESSING_RECORD'
  | 'DPA_OUTSOURCING'
  | 'SECURITY_POLICY'
  | 'EMPLOYEE_HANDBOOK'
  | 'TRAINING_RECORD'
  | 'ACCESS_LOG'
  | 'INCIDENT_REPORT'
  | 'VENDOR_LIST'
  | 'OTHER';

interface ClassificationResult {
  docType: DocType;
  confidence: number;
  rationale: string;
}

@Injectable()
export class DocumentClassificationWorker {
  private readonly logger = new Logger(DocumentClassificationWorker.name);

  constructor(
    private prisma: PrismaService,
    private queue: QueueService,
  ) {}

  async handleDocClassification(job: JobEnvelope, payload: DocClassifyPayload) {
    const { artifactId, version, extractedText } = payload;

    this.logger.log(`Classifying document for artifact ${artifactId} v${version}`);

    try {
      // Rules-based classification
      const result = this.classifyWithRules(extractedText);

      // Store classification result
      await this.prisma.$executeRaw`
        INSERT INTO document_classifications (id, artifact_id, version, doc_type, confidence, rationale, created_at)
        VALUES (
          gen_random_uuid(),
          ${artifactId}::uuid,
          ${version},
          ${result.docType},
          ${result.confidence},
          ${result.rationale},
          NOW()
        )
        ON CONFLICT (artifact_id, version) DO UPDATE SET
          doc_type = ${result.docType},
          confidence = ${result.confidence},
          rationale = ${result.rationale}
      `;

      // If confident enough and linked to evidence requirements, enqueue analysis
      if (result.confidence >= 0.7) {
        const artifact = await this.prisma.artifact.findUnique({
          where: { id: artifactId },
          include: { evidenceRequirements: true },
        });

        if (artifact?.evidenceRequirements && artifact.evidenceRequirements.length > 0) {
          await this.queue.enqueueJob({
            tenantId: job.tenantId,
            type: 'DOC_ANALYZE',
            payload: {
              artifactId,
              version,
              docType: result.docType,
              evidenceRequirementIds: artifact.evidenceRequirements.map(er => er.evidenceRequirementId),
            },
          });
        }
      }

      this.logger.log(`Classification completed: ${result.docType} (confidence: ${result.confidence})`);
    } catch (error) {
      this.logger.error(`Classification failed for artifact ${artifactId}:`, error.stack);
      throw error;
    }
  }

  private classifyWithRules(text: string): ClassificationResult {
    const lowerText = text.toLowerCase();

    // Privacy Policy detection
    if (
      (lowerText.includes('개인정보') && lowerText.includes('처리방침')) ||
      (lowerText.includes('privacy') && lowerText.includes('policy'))
    ) {
      return {
        docType: 'PRIVACY_POLICY',
        confidence: 0.9,
        rationale: 'Contains "개인정보 처리방침" or "privacy policy"',
      };
    }

    // Processing Record (처리목록)
    if (
      (lowerText.includes('개인정보') && lowerText.includes('처리') && lowerText.includes('목록')) ||
      lowerText.includes('processing record')
    ) {
      return {
        docType: 'PROCESSING_RECORD',
        confidence: 0.85,
        rationale: 'Contains processing record keywords',
      };
    }

    // DPA / Outsourcing Contract
    if (
      (lowerText.includes('위탁') || lowerText.includes('수탁')) &&
      (lowerText.includes('계약') || lowerText.includes('contract'))
    ) {
      return {
        docType: 'DPA_OUTSOURCING',
        confidence: 0.8,
        rationale: 'Contains outsourcing/contract keywords',
      };
    }

    // Security Policy
    if (
      (lowerText.includes('보안') && lowerText.includes('정책')) ||
      (lowerText.includes('security') && lowerText.includes('policy'))
    ) {
      return {
        docType: 'SECURITY_POLICY',
        confidence: 0.85,
        rationale: 'Contains security policy keywords',
      };
    }

    // Training Record
    if (
      (lowerText.includes('교육') && lowerText.includes('이수')) ||
      (lowerText.includes('training') && lowerText.includes('completion'))
    ) {
      return {
        docType: 'TRAINING_RECORD',
        confidence: 0.8,
        rationale: 'Contains training completion keywords',
      };
    }

    // Access Log
    if (
      (lowerText.includes('접근') && lowerText.includes('로그')) ||
      lowerText.includes('access log')
    ) {
      return {
        docType: 'ACCESS_LOG',
        confidence: 0.9,
        rationale: 'Contains access log keywords',
      };
    }

    // Incident Report
    if (
      (lowerText.includes('침해') && lowerText.includes('사고')) ||
      (lowerText.includes('incident') && lowerText.includes('report'))
    ) {
      return {
        docType: 'INCIDENT_REPORT',
        confidence: 0.85,
        rationale: 'Contains incident report keywords',
      };
    }

    // Vendor List
    if (
      (lowerText.includes('협력') && lowerText.includes('업체')) ||
      lowerText.includes('vendor list')
    ) {
      return {
        docType: 'VENDOR_LIST',
        confidence: 0.75,
        rationale: 'Contains vendor list keywords',
      };
    }

    // Default: OTHER
    return {
      docType: 'OTHER',
      confidence: 0.5,
      rationale: 'No specific document type detected',
    };
  }
}
