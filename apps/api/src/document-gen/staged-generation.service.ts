import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentGenService } from './document-gen.service';
import { SyncAnalysisService } from '../artifacts/sync-analysis.service';
import { DocumentTemplateType } from '@prisma/client';

/**
 * Generation Step for CEO Demo UX
 */
export interface GenerationStep {
  step: number;
  name: string;
  nameKo: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface StagedGenerationProgress {
  id: string;
  templateType: DocumentTemplateType;
  tenantId: string;
  currentStep: number;
  totalSteps: number;
  overallProgress: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  steps: GenerationStep[];
  result?: {
    documentId: string;
    artifactId?: string;
    docxUrl?: string;
    beforeScore?: number;
    afterScore?: number;
    scoreImprovement?: number;
  };
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * CEO Demo: Staged Document Generation with Progress Tracking
 *
 * 5 Steps for visible progress:
 * 1. 회사 정보 분석 (Company Profile Analysis)
 * 2. 법적 요건 매핑 (Legal Requirement Mapping)
 * 3. 문서 내용 생성 (Content Generation)
 * 4. DOCX 파일 생성 (DOCX File Creation)
 * 5. 분석 및 점수 계산 (Analysis & Score Calculation)
 */
@Injectable()
export class StagedGenerationService {
  private readonly logger = new Logger(StagedGenerationService.name);

  // In-memory store for generation progress (could be Redis in production)
  private progressStore = new Map<string, StagedGenerationProgress>();

  constructor(
    private prisma: PrismaService,
    private documentGenService: DocumentGenService,
    private syncAnalysisService: SyncAnalysisService,
  ) {}

  /**
   * Start staged document generation
   * CEO Demo: Returns immediately with progress ID for polling
   */
  async startGeneration(
    tenantId: string,
    userId: string,
    templateType: DocumentTemplateType,
    evidenceRequirementId?: string,
  ): Promise<{ progressId: string; status: string }> {
    const progressId = crypto.randomUUID();

    // Initialize progress tracking
    const progress: StagedGenerationProgress = {
      id: progressId,
      templateType,
      tenantId,
      currentStep: 0,
      totalSteps: 5,
      overallProgress: 0,
      status: 'PENDING',
      steps: [
        { step: 1, name: 'Company Profile Analysis', nameKo: '회사 정보 분석', status: 'pending', progress: 0 },
        { step: 2, name: 'Legal Requirement Mapping', nameKo: '법적 요건 매핑', status: 'pending', progress: 0 },
        { step: 3, name: 'Content Generation', nameKo: '문서 내용 생성', status: 'pending', progress: 0 },
        { step: 4, name: 'DOCX File Creation', nameKo: 'DOCX 파일 생성', status: 'pending', progress: 0 },
        { step: 5, name: 'Analysis & Score', nameKo: '분석 및 점수 계산', status: 'pending', progress: 0 },
      ],
      startedAt: new Date(),
    };

    this.progressStore.set(progressId, progress);

    // Start async generation process
    this.executeGeneration(progressId, tenantId, userId, templateType, evidenceRequirementId);

    return {
      progressId,
      status: 'STARTED',
    };
  }

  /**
   * Get generation progress
   */
  async getProgress(progressId: string): Promise<StagedGenerationProgress | null> {
    return this.progressStore.get(progressId) || null;
  }

  /**
   * Execute the staged generation process
   */
  private async executeGeneration(
    progressId: string,
    tenantId: string,
    userId: string,
    templateType: DocumentTemplateType,
    evidenceRequirementId?: string,
  ): Promise<void> {
    const progress = this.progressStore.get(progressId);
    if (!progress) return;

    try {
      progress.status = 'IN_PROGRESS';

      // Get before score if evidence requirement is linked
      let beforeScore: number | undefined;
      if (evidenceRequirementId) {
        beforeScore = await this.getRequirementScore(tenantId, evidenceRequirementId);
      }

      // Step 1: Company Profile Analysis
      await this.updateStep(progressId, 1, 'in_progress');
      const companyProfile = await this.prisma.companyProfile.findUnique({
        where: { tenantId },
        include: { tenant: true },
      });

      if (!companyProfile) {
        throw new BadRequestException('회사 프로필이 필요합니다.');
      }
      await this.updateStep(progressId, 1, 'completed');

      // Step 2: Legal Requirement Mapping
      await this.updateStep(progressId, 2, 'in_progress');
      // Simulate legal mapping work (already handled in template config)
      await this.delay(500);
      await this.updateStep(progressId, 2, 'completed');

      // Step 3: Content Generation (main OpenAI call)
      await this.updateStep(progressId, 3, 'in_progress');
      const result = await this.documentGenService.generateDocument(
        tenantId,
        userId,
        {
          templateType,
          evidenceRequirementId,
        },
      );
      await this.updateStep(progressId, 3, 'completed');

      // Step 4: DOCX File Creation (already done in generateDocument)
      await this.updateStep(progressId, 4, 'in_progress');
      await this.delay(200);
      await this.updateStep(progressId, 4, 'completed');

      // Step 5: Analysis & Score Calculation
      await this.updateStep(progressId, 5, 'in_progress');

      let artifactId: string | undefined;
      let afterScore: number | undefined;

      // Auto-approve and analyze if there's an evidence requirement
      if (evidenceRequirementId) {
        const approvalResult = await this.documentGenService.approveDocument(
          tenantId,
          result.id,
          userId,
        );
        artifactId = approvalResult.artifactId;

        // Trigger analysis on the new artifact
        const artifact = await this.prisma.artifact.findFirst({
          where: { id: artifactId, tenantId },
          include: { binary: true },
        });

        if (artifact) {
          try {
            await this.syncAnalysisService.analyzeArtifact(
              tenantId,
              artifactId,
              artifact.version || 1,
              artifact.binary?.s3Key || artifact.s3Key || '',
              artifact.binary?.mimeType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            );
          } catch (err) {
            this.logger.warn(`Analysis failed for generated artifact ${artifactId}: ${err.message}`);
          }
        }

        // Get after score
        afterScore = await this.getRequirementScore(tenantId, evidenceRequirementId);
      }

      await this.updateStep(progressId, 5, 'completed');

      // Mark overall completion
      progress.status = 'COMPLETED';
      progress.completedAt = new Date();
      progress.result = {
        documentId: result.id,
        artifactId,
        docxUrl: result.docxDownloadUrl,
        beforeScore,
        afterScore,
        scoreImprovement: beforeScore !== undefined && afterScore !== undefined
          ? afterScore - beforeScore
          : undefined,
      };

      this.logger.log(`Staged generation completed: ${progressId}`);

    } catch (error) {
      this.logger.error(`Staged generation failed: ${progressId}`, error);
      progress.status = 'FAILED';
      progress.error = error.message;
      progress.completedAt = new Date();

      // Mark current step as failed
      const currentStep = progress.steps.find(s => s.status === 'in_progress');
      if (currentStep) {
        currentStep.status = 'failed';
        currentStep.error = error.message;
      }
    }
  }

  /**
   * Update step progress
   */
  private async updateStep(
    progressId: string,
    stepNumber: number,
    status: 'in_progress' | 'completed' | 'failed',
  ): Promise<void> {
    const progress = this.progressStore.get(progressId);
    if (!progress) return;

    const step = progress.steps.find(s => s.step === stepNumber);
    if (!step) return;

    step.status = status;

    if (status === 'in_progress') {
      step.startedAt = new Date();
      step.progress = 0;
      progress.currentStep = stepNumber;
    } else if (status === 'completed') {
      step.completedAt = new Date();
      step.progress = 100;
    }

    // Calculate overall progress
    const completedSteps = progress.steps.filter(s => s.status === 'completed').length;
    progress.overallProgress = Math.round((completedSteps / progress.totalSteps) * 100);
  }

  /**
   * Get current score for an evidence requirement
   */
  private async getRequirementScore(tenantId: string, evidenceRequirementId: string): Promise<number> {
    const requirement = await this.prisma.controlEvidenceRequirement.findFirst({
      where: { id: evidenceRequirementId },
      include: {
        artifactLinks: {
          include: {
            artifact: true,
          },
        },
      },
    });

    if (!requirement) return 0;

    // Count artifacts and their statuses to calculate score
    const artifacts = requirement.artifactLinks.map(a => a.artifact);
    if (artifacts.length === 0) return 0;

    const verifiedCount = artifacts.filter(a => a.status === 'VERIFIED').length;
    return Math.round((verifiedCount / artifacts.length) * 100);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up old progress entries (call periodically)
   */
  cleanupOldProgress(maxAgeMs: number = 3600000): void {
    const now = new Date();
    for (const [id, progress] of this.progressStore.entries()) {
      if (now.getTime() - progress.startedAt.getTime() > maxAgeMs) {
        this.progressStore.delete(id);
      }
    }
  }
}
