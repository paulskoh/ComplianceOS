import { z } from 'zod';
import { ObligationDomain } from './obligation.schema';

export const createInspectionPackSchema = z.object({
  name: z.string().min(1),
  domain: z.nativeEnum(ObligationDomain),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  obligationIds: z.array(z.string().uuid()).optional(),
  inspectorProfile: z.string().optional(),
});

export const createPackShareLinkSchema = z.object({
  packId: z.string().uuid(),
  expiresInHours: z.number().int().positive().default(72),
});

export type CreateInspectionPackDto = z.infer<typeof createInspectionPackSchema>;
export type CreatePackShareLinkDto = z.infer<typeof createPackShareLinkSchema>;
