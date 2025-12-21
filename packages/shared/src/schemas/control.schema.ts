import { z } from 'zod';

export enum ControlType {
  PREVENTIVE = 'PREVENTIVE',
  DETECTIVE = 'DETECTIVE',
  CORRECTIVE = 'CORRECTIVE',
}

export enum AutomationLevel {
  MANUAL = 'MANUAL',
  SEMI_AUTOMATED = 'SEMI_AUTOMATED',
  FULLY_AUTOMATED = 'FULLY_AUTOMATED',
}

export const createControlSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  type: z.nativeEnum(ControlType),
  automationLevel: z.nativeEnum(AutomationLevel),
  ownerId: z.string().uuid().optional(),
  obligationIds: z.array(z.string().uuid()).default([]),
});

export const updateControlSchema = createControlSchema.partial();

export const createEvidenceRequirementSchema = z.object({
  controlId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string(),
  freshnessWindowDays: z.number().int().positive(),
  required: z.boolean().default(true),
});

export type CreateControlDto = z.infer<typeof createControlSchema>;
export type UpdateControlDto = z.infer<typeof updateControlSchema>;
export type CreateEvidenceRequirementDto = z.infer<typeof createEvidenceRequirementSchema>;
