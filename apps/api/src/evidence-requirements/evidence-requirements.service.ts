import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EvidenceRequirementsService {
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
    const evidenceRequirement = await this.prisma.evidenceRequirement.findFirst({
      where: {
        id: evidenceRequirementId,
        companyId: tenantId,
      },
    });

    if (!evidenceRequirement) {
      throw new Error('Evidence requirement not found');
    }

    // Get all artifacts for this evidence requirement
    const artifacts = await this.prisma.artifact.findMany({
      where: {
        tenantId,
        evidenceRequirementId: evidenceRequirementId,
      },
      include: {
        binary: true,
      },
      orderBy: { uploadedAt: 'desc' },
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

    return {
      id: evidenceRequirement.id,
      titleKo: evidenceRequirement.name,
      descriptionKo: evidenceRequirement.description || '',
      status,
      artifacts: artifacts.map((artifact) => ({
        artifactId: artifact.id,
        version: artifact.version,
        filename: artifact.fileName,
        uploadedAt: artifact.uploadedAt,
        status: artifact.status,
        analysis: null,
      })),
      latestAnalysis: null,
    };
  }

  async getStatus(tenantId: string, evidenceRequirementId: string) {
    // Quick status check for polling
    const evidenceRequirement = await this.prisma.evidenceRequirement.findFirst({
      where: {
        id: evidenceRequirementId,
        companyId: tenantId,
      },
    });

    if (!evidenceRequirement) {
      return { status: 'MISSING', hasAnalysis: false };
    }

    // Get latest artifact for this evidence requirement
    const latestArtifact = await this.prisma.artifact.findFirst({
      where: {
        tenantId,
        evidenceRequirementId: evidenceRequirementId,
      },
      orderBy: { uploadedAt: 'desc' },
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
