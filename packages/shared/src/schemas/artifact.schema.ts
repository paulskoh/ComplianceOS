import { z } from 'zod';

export enum ArtifactType {
  LOG = 'LOG',
  REPORT = 'REPORT',
  POLICY = 'POLICY',
  APPROVAL = 'APPROVAL',
  SIGNED_DOCUMENT = 'SIGNED_DOCUMENT',
  EXPORT = 'EXPORT',
  SCREENSHOT = 'SCREENSHOT',
  OTHER = 'OTHER',
}

export enum AccessClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  PII = 'PII',
}

export const createArtifactSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.nativeEnum(ArtifactType),
  source: z.string().min(1),
  accessClassification: z.nativeEnum(AccessClassification),
  retentionDays: z.number().int().positive().optional(),
  metadata: z.record(z.any()).optional(),
  controlIds: z.array(z.string().uuid()).default([]),
  obligationIds: z.array(z.string().uuid()).default([]),
});

export const updateArtifactSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  accessClassification: z.nativeEnum(AccessClassification).optional(),
  metadata: z.record(z.any()).optional(),
});

export const linkArtifactSchema = z.object({
  controlIds: z.array(z.string().uuid()).optional(),
  obligationIds: z.array(z.string().uuid()).optional(),
});

export type CreateArtifactDto = z.infer<typeof createArtifactSchema>;
export type UpdateArtifactDto = z.infer<typeof updateArtifactSchema>;
export type LinkArtifactDto = z.infer<typeof linkArtifactSchema>;
