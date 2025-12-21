import { z } from 'zod';
import { ObligationDomain } from './obligation.schema';
export declare const createInspectionPackSchema: z.ZodObject<{
    name: z.ZodString;
    domain: z.ZodNativeEnum<typeof ObligationDomain>;
    startDate: z.ZodString;
    endDate: z.ZodString;
    obligationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    inspectorProfile: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    domain?: ObligationDomain;
    obligationIds?: string[];
    startDate?: string;
    endDate?: string;
    inspectorProfile?: string;
}, {
    name?: string;
    domain?: ObligationDomain;
    obligationIds?: string[];
    startDate?: string;
    endDate?: string;
    inspectorProfile?: string;
}>;
export declare const createPackShareLinkSchema: z.ZodObject<{
    packId: z.ZodString;
    expiresInHours: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    packId?: string;
    expiresInHours?: number;
}, {
    packId?: string;
    expiresInHours?: number;
}>;
export type CreateInspectionPackDto = z.infer<typeof createInspectionPackSchema>;
export type CreatePackShareLinkDto = z.infer<typeof createPackShareLinkSchema>;
