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
                evidenceRequirements: {
                  include: {
                    artifactLinks: {
                      include: {
                        artifact: {
                          include: {
                            binary: true,
                          },
                        },
                      },
                      orderBy: {
                        artifact: { uploadedAt: 'desc' },
                      },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { severity: 'desc' },
    });

    // Transform to frontend-friendly format
    const result = obligations.map((obligation) => {
      const evidenceRequirements = obligation.controls.flatMap(
        (oc) =>
          oc.control.evidenceRequirements.map((er: any) => {
            const latestArtifactLink = er.artifactLinks[0];
            const latestArtifact = latestArtifactLink?.artifact;

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
                    filename: latestArtifact.filename,
                    uploadedAt: latestArtifact.uploadedAt,
                  }
                : null,
              latestAnalysis: null,
              updatedAt: er.updatedAt,
            };
          }),
      );

      return {
        obligation: {
          id: obligation.id,
          titleKo: obligation.titleKo,
          severity: obligation.severity,
        },
        evidenceRequirements,
      };
    });

    return { obligations: result };
  }

  async getDetail(tenantId: string, evidenceRequirementId: string) {
    const evidenceRequirement = await this.prisma.evidenceRequirement.findFirst(
      {
        where: {
          id: evidenceRequirementId,
          companyId: tenantId,
        },
        include: {
          artifactLinks: {
            include: {
              artifact: {
                include: {
                  binary: true,
                },
              },
            },
            orderBy: {
              artifact: { uploadedAt: 'desc' },
            },
          },
        },
      },
    );

    if (!evidenceRequirement) {
      throw new Error('Evidence requirement not found');
    }

    const latestArtifactLink = evidenceRequirement.artifactLinks[0];
    const latestArtifact = latestArtifactLink?.artifact;

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
      artifacts: evidenceRequirement.artifactLinks.map((link) => ({
        artifactId: link.artifact.id,
        version: link.artifact.version,
        filename: link.artifact.filename,
        uploadedAt: link.artifact.uploadedAt,
        status: link.artifact.status,
        analysis: null,
      })),
      latestAnalysis: null,
    };
  }

  async getStatus(tenantId: string, evidenceRequirementId: string) {
    // Quick status check for polling
    const evidenceRequirement = await this.prisma.evidenceRequirement.findFirst(
      {
        where: {
          id: evidenceRequirementId,
          companyId: tenantId,
        },
        include: {
          artifactLinks: {
            include: {
              artifact: true,
            },
            orderBy: {
              artifact: { uploadedAt: 'desc' },
            },
            take: 1,
          },
        },
      },
    );

    if (!evidenceRequirement) {
      return { status: 'MISSING', hasAnalysis: false };
    }

    const latestArtifactLink = evidenceRequirement.artifactLinks[0];
    const latestArtifact = latestArtifactLink?.artifact;

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
