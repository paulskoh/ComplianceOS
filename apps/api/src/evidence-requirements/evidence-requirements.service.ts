import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapToLatestAnalysisDTO,
  mapToLatestRunDTO,
  LatestAnalysisDTO,
  LatestRunDTO,
} from '../analysis/analysis.mapper';

@Injectable()
export class EvidenceRequirementsService {
  private readonly logger = new Logger(EvidenceRequirementsService.name);

  constructor(private prisma: PrismaService) {}

  async getOverview(tenantId: string) {
    // Get all obligations with their controls and evidence requirements
    const obligations = await this.prisma.obligation.findMany({
      where: { tenantId, isActive: true },
      include: {
        controls: {
          include: {
            control: {
              include: {
                evidenceRequirements: true,
              },
            },
          },
        },
      },
      orderBy: { severity: 'desc' },
    });

    // Transform to frontend-friendly format
    const result = await Promise.all(obligations.map(async (obligation) => {
      const evidenceRequirements = await Promise.all(
        obligation.controls.flatMap((oc) =>
          oc.control.evidenceRequirements.map(async (er: any) => {
            // Get latest artifact for this evidence requirement
            const latestArtifact = await this.prisma.artifact.findFirst({
              where: {
                tenantId,
                evidenceRequirementId: er.id,
              },
              orderBy: { uploadedAt: 'desc' },
              include: {
                binary: true,
              },
            });

            // Determine status
            let status = 'MISSING';
            if (latestArtifact) {
              if (latestArtifact.isApproved) {
                status = 'VERIFIED';
              } else if (latestArtifact.status === 'READY') {
                status = 'UPLOADED';
              }
            }

            return {
              id: er.id,
              titleKo: er.name,
              descriptionKo: er.description || '',
              status,
              obligationId: obligation.id,
              obligationTitleKo: obligation.titleKo,
              obligationSeverity: obligation.severity,
              controlId: oc.control.id,
              controlName: oc.control.name,
              latestArtifact: latestArtifact
                ? {
                    artifactId: latestArtifact.id,
                    version: latestArtifact.version,
                    filename: latestArtifact.fileName,
                    uploadedAt: latestArtifact.uploadedAt,
                  }
                : null,
              latestAnalysis: null,
              updatedAt: er.updatedAt,
            };
          }),
        ),
      );

      return {
        obligation: {
          id: obligation.id,
          titleKo: obligation.titleKo,
          severity: obligation.severity,
        },
        evidenceRequirements,
      };
    }));

    return { obligations: result };
  }

  async getDetail(tenantId: string, evidenceRequirementId: string) {
    // Use ControlEvidenceRequirement model (same as overview)
    const evidenceRequirement = await this.prisma.controlEvidenceRequirement.findFirst({
      where: {
        id: evidenceRequirementId,
      },
      include: {
        control: {
          include: {
            obligations: {
              include: {
                obligation: true,
              },
            },
          },
        },
      },
    });

    if (!evidenceRequirement) {
      throw new Error('Evidence requirement not found');
    }

    // Verify tenant access through control
    if (evidenceRequirement.control.tenantId !== tenantId) {
      throw new Error('Evidence requirement not found');
    }

    // Get all artifacts linked to this evidence requirement (direct link on artifact)
    const artifacts = await this.prisma.artifact.findMany({
      where: {
        tenantId,
        evidenceRequirementId: evidenceRequirementId,
      },
      include: {
        binary: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const latestArtifact = artifacts[0];

    let status = 'MISSING';
    if (latestArtifact) {
      if (latestArtifact.isApproved) {
        status = 'VERIFIED';
      } else if (latestArtifact.status === 'READY') {
        status = 'UPLOADED';
      }
    }

    // Get obligation info
    const obligation = evidenceRequirement.control.obligations[0]?.obligation;

    // Fetch latest analysis and run for each artifact
    const artifactsWithAnalysis = await Promise.all(
      artifacts.map(async (artifact) => {
        const { latestAnalysis, latestRun } = await this.getArtifactAnalysis(
          artifact.id,
          artifact.version,
          artifact.fileName || 'Unknown',
        );

        return {
          artifactId: artifact.id,
          version: artifact.version,
          filename: artifact.fileName,
          uploadedAt: artifact.uploadedAt,
          status: artifact.status,
          isApproved: artifact.isApproved,
          analysis: latestAnalysis,
          latestRun,
        };
      }),
    );

    // Get latest analysis across all artifacts
    const latestArtifactWithAnalysis = artifactsWithAnalysis.find(a => a.analysis);

    return {
      id: evidenceRequirement.id,
      titleKo: evidenceRequirement.name,
      descriptionKo: evidenceRequirement.description || '',
      status,
      obligationId: obligation?.id,
      obligationTitleKo: obligation?.titleKo,
      controlId: evidenceRequirement.control.id,
      controlName: evidenceRequirement.control.name,
      artifacts: artifactsWithAnalysis,
      latestAnalysis: latestArtifactWithAnalysis?.analysis || null,
    };
  }

  /**
   * Get latest analysis and run for an artifact
   * CEO Demo: Critical for showing score + citations
   */
  private async getArtifactAnalysis(
    artifactId: string,
    version: number,
    fileName: string,
  ): Promise<{ latestAnalysis: LatestAnalysisDTO | null; latestRun: LatestRunDTO | null }> {
    try {
      // Get latest document analysis
      const analysisResult = await this.prisma.documentAnalysis.findFirst({
        where: { artifactId },
        orderBy: { createdAt: 'desc' },
      });

      // Get latest analysis run
      const runResult = await this.prisma.analysisRun.findFirst({
        where: { artifactId },
        orderBy: { createdAt: 'desc' },
      });

      // Check if document is scanned/unparseable
      const extractionResult = await this.prisma.documentExtraction.findFirst({
        where: { artifactId },
        orderBy: { createdAt: 'desc' },
      });

      const isScanned = extractionResult?.method === 'SCANNED_DETECTED';

      // Map to normalized DTOs
      const latestAnalysis = analysisResult
        ? mapToLatestAnalysisDTO(
            {
              id: analysisResult.id,
              artifactId: analysisResult.artifactId,
              version: analysisResult.version,
              overallCompliance: analysisResult.overallCompliance,
              confidence: analysisResult.confidence,
              findings: analysisResult.findings as any,
              missingElements: analysisResult.missingElements as any,
              recommendations: analysisResult.recommendations as any,
              analysisMetadata: analysisResult.analysisMetadata as any,
              createdAt: analysisResult.createdAt,
              updatedAt: analysisResult.updatedAt,
            },
            fileName,
            artifactId,
            isScanned,
          )
        : isScanned
          ? mapToLatestAnalysisDTO(null, fileName, artifactId, true)
          : null;

      const latestRun = runResult
        ? mapToLatestRunDTO({
            id: runResult.id,
            tenantId: runResult.tenantId,
            artifactId: runResult.artifactId,
            version: runResult.version,
            status: runResult.status,
            statusKo: runResult.statusKo || undefined,
            model: runResult.model || undefined,
            promptTokens: runResult.promptTokens || undefined,
            outputTokens: runResult.outputTokens || undefined,
            totalTokens: runResult.totalTokens || undefined,
            latencyMs: runResult.latencyMs || undefined,
            errorMessage: runResult.errorMessage || undefined,
            retryCount: runResult.retryCount,
            metadata: runResult.metadata,
            startedAt: runResult.startedAt || undefined,
            completedAt: runResult.completedAt || undefined,
            createdAt: runResult.createdAt,
          })
        : null;

      return { latestAnalysis, latestRun };
    } catch (error) {
      this.logger.error(`Failed to get analysis for artifact ${artifactId}:`, error);
      return { latestAnalysis: null, latestRun: null };
    }
  }

  async getStatus(tenantId: string, evidenceRequirementId: string) {
    // Quick status check for polling - use ControlEvidenceRequirement model
    const evidenceRequirement = await this.prisma.controlEvidenceRequirement.findFirst({
      where: {
        id: evidenceRequirementId,
      },
      include: {
        control: true,
      },
    });

    if (!evidenceRequirement || evidenceRequirement.control.tenantId !== tenantId) {
      return { status: 'MISSING', hasAnalysis: false };
    }

    // Get latest artifact linked to this evidence requirement (direct link on artifact)
    const latestArtifact = await this.prisma.artifact.findFirst({
      where: {
        tenantId,
        evidenceRequirementId: evidenceRequirementId,
      },
      orderBy: { createdAt: 'desc' },
    });

    let status = 'MISSING';
    if (latestArtifact) {
      if (latestArtifact.isApproved) {
        status = 'VERIFIED';
      } else if (latestArtifact.status === 'READY') {
        status = 'UPLOADED';
      }
    }

    return {
      status,
      hasAnalysis: latestArtifact?.isApproved || false,
      analysisReady: latestArtifact?.isApproved || false,
    };
  }
}
