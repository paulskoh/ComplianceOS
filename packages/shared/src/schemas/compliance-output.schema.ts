import { z } from 'zod';

/**
 * SOFT-LAUNCH REQUIRED OUTPUT SCHEMAS
 *
 * These schemas enforce the required output formats for compliance analysis.
 * All AI outputs must conform to these schemas for traceability and auditability.
 */

// ============================================
// Control Coverage Output Schema
// ============================================

export enum CoverageStatus {
  COVERED = 'COVERED',
  PARTIAL = 'PARTIAL',
  MISSING = 'MISSING',
}

export const evidenceCitationSchema = z.object({
  file_id: z.string().describe('Unique identifier of the evidence file'),
  excerpt: z.string().describe('Specific quote or reference from the evidence'),
});

export const controlCoverageOutputSchema = z.object({
  control_id: z.string().describe('Unique control identifier'),
  control_description: z.string().describe('Human-readable description of the control'),
  coverage_status: z.nativeEnum(CoverageStatus).describe('COVERED | PARTIAL | MISSING'),
  evidence_used: z.array(evidenceCitationSchema).describe('Evidence files that support this determination'),
  reasoning: z.string().describe('Explanation of why this conclusion was reached'),
});

// ============================================
// Gap / Finding Output Schema
// ============================================

export enum GapSeverity {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export const gapFindingOutputSchema = z.object({
  gap_id: z.string().describe('Unique identifier for this gap'),
  severity: z.nativeEnum(GapSeverity).describe('HIGH | MEDIUM | LOW'),
  description: z.string().describe('Description of the compliance gap'),
  missing_or_weak_evidence: z.boolean().describe('Whether evidence is missing or insufficient'),
  recommended_action: z.string().describe('Specific action to remediate this gap'),
});

// ============================================
// Explicit Failure / Uncertainty Schemas
// ============================================

export enum AnalysisStatus {
  COMPLETE = 'COMPLETE',
  INSUFFICIENT_EVIDENCE = 'INSUFFICIENT_EVIDENCE',
  MANUAL_REVIEW_REQUIRED = 'MANUAL_REVIEW_REQUIRED',
  CONTROL_NOT_ENFORCEABLE = 'CONTROL_NOT_ENFORCEABLE',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
}

export const analysisStatusOutputSchema = z.object({
  status: z.nativeEnum(AnalysisStatus),
  message: z.string().describe('Human-readable explanation of the status'),
  confidence: z.number().min(0).max(1).optional().describe('Confidence level 0-1 if applicable'),
  suggested_next_steps: z.array(z.string()).optional().describe('Actions to resolve this status'),
});

// ============================================
// Full Compliance Analysis Result Schema
// ============================================

export const complianceAnalysisResultSchema = z.object({
  analysis_id: z.string().uuid(),
  timestamp: z.string().datetime(),
  status: analysisStatusOutputSchema,
  control_coverages: z.array(controlCoverageOutputSchema).optional(),
  gaps: z.array(gapFindingOutputSchema).optional(),
  overall_compliance_score: z.number().min(0).max(100).optional(),
  metadata: z.object({
    model_used: z.string().optional(),
    tokens_consumed: z.number().optional(),
    processing_time_ms: z.number().optional(),
  }).optional(),
});

// Type exports
export type EvidenceCitation = z.infer<typeof evidenceCitationSchema>;
export type ControlCoverageOutput = z.infer<typeof controlCoverageOutputSchema>;
export type GapFindingOutput = z.infer<typeof gapFindingOutputSchema>;
export type AnalysisStatusOutput = z.infer<typeof analysisStatusOutputSchema>;
export type ComplianceAnalysisResult = z.infer<typeof complianceAnalysisResultSchema>;

// ============================================
// Validation helpers
// ============================================

/**
 * Validate a control coverage output and return errors if any
 */
export function validateControlCoverage(data: unknown): { valid: boolean; errors?: string[] } {
  const result = controlCoverageOutputSchema.safeParse(data);
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Validate a gap/finding output and return errors if any
 */
export function validateGapFinding(data: unknown): { valid: boolean; errors?: string[] } {
  const result = gapFindingOutputSchema.safeParse(data);
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
  };
}

/**
 * Create an "insufficient evidence" status response
 */
export function createInsufficientEvidenceStatus(details: string): AnalysisStatusOutput {
  return {
    status: AnalysisStatus.INSUFFICIENT_EVIDENCE,
    message: `Insufficient evidence to determine compliance: ${details}`,
    suggested_next_steps: [
      'Upload additional evidence documents',
      'Ensure uploaded documents contain relevant content',
      'Contact compliance team for manual review if needed',
    ],
  };
}

/**
 * Create a "manual review required" status response
 */
export function createManualReviewStatus(reason: string): AnalysisStatusOutput {
  return {
    status: AnalysisStatus.MANUAL_REVIEW_REQUIRED,
    message: `Manual review required: ${reason}`,
    suggested_next_steps: [
      'A compliance officer should review this control',
      'Document any manual assessment in the system',
    ],
  };
}

/**
 * Create a "control not enforceable" status response
 */
export function createControlNotEnforceableStatus(controlId: string, reason: string): AnalysisStatusOutput {
  return {
    status: AnalysisStatus.CONTROL_NOT_ENFORCEABLE,
    message: `Control ${controlId} is defined but not enforceable: ${reason}`,
    suggested_next_steps: [
      'Review control definition and requirements',
      'Determine if control should be updated or disabled',
    ],
  };
}
