import { z } from 'zod';

export enum RiskSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RiskStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  MITIGATED = 'MITIGATED',
  ACCEPTED = 'ACCEPTED',
}

export const createRiskItemSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  severity: z.nativeEnum(RiskSeverity),
  obligationId: z.string().uuid().optional(),
  controlId: z.string().uuid().optional(),
  ownerId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export const updateRiskItemSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  severity: z.nativeEnum(RiskSeverity).optional(),
  status: z.nativeEnum(RiskStatus).optional(),
  ownerId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
});

export type CreateRiskItemDto = z.infer<typeof createRiskItemSchema>;
export type UpdateRiskItemDto = z.infer<typeof updateRiskItemSchema>;
