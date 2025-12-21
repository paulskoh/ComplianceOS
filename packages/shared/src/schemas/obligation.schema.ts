import { z } from 'zod';

export enum ObligationDomain {
  LABOR = 'LABOR',
  PRIVACY = 'PRIVACY',
  FINANCE = 'FINANCE',
  CONTRACTS = 'CONTRACTS',
  SECURITY = 'SECURITY',
  TRAINING = 'TRAINING',
}

export enum EvidenceFrequency {
  CONTINUOUS = 'CONTINUOUS',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
  ON_CHANGE = 'ON_CHANGE',
}

export const createObligationSchema = z.object({
  templateId: z.string().uuid().optional(),
  title: z.string().min(1),
  titleKo: z.string().min(1).optional(),
  description: z.string(),
  domain: z.nativeEnum(ObligationDomain),
  evidenceFrequency: z.nativeEnum(EvidenceFrequency),
  ownerId: z.string().uuid().optional(),
  isActive: z.boolean().default(true),
});

export const updateObligationSchema = createObligationSchema.partial();

export type CreateObligationDto = z.infer<typeof createObligationSchema>;
export type UpdateObligationDto = z.infer<typeof updateObligationSchema>;
