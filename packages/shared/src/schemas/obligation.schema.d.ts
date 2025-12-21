import { z } from 'zod';
export declare enum ObligationDomain {
    LABOR = "LABOR",
    PRIVACY = "PRIVACY",
    FINANCE = "FINANCE",
    CONTRACTS = "CONTRACTS",
    SECURITY = "SECURITY",
    TRAINING = "TRAINING"
}
export declare enum EvidenceFrequency {
    CONTINUOUS = "CONTINUOUS",
    DAILY = "DAILY",
    WEEKLY = "WEEKLY",
    MONTHLY = "MONTHLY",
    QUARTERLY = "QUARTERLY",
    ANNUAL = "ANNUAL",
    ON_CHANGE = "ON_CHANGE"
}
export declare const createObligationSchema: z.ZodObject<{
    templateId: z.ZodOptional<z.ZodString>;
    title: z.ZodString;
    titleKo: z.ZodOptional<z.ZodString>;
    description: z.ZodString;
    domain: z.ZodNativeEnum<typeof ObligationDomain>;
    evidenceFrequency: z.ZodNativeEnum<typeof EvidenceFrequency>;
    ownerId: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean;
    templateId?: string;
    title?: string;
    titleKo?: string;
    description?: string;
    domain?: ObligationDomain;
    evidenceFrequency?: EvidenceFrequency;
    ownerId?: string;
}, {
    isActive?: boolean;
    templateId?: string;
    title?: string;
    titleKo?: string;
    description?: string;
    domain?: ObligationDomain;
    evidenceFrequency?: EvidenceFrequency;
    ownerId?: string;
}>;
export declare const updateObligationSchema: z.ZodObject<{
    templateId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    title: z.ZodOptional<z.ZodString>;
    titleKo: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    domain: z.ZodOptional<z.ZodNativeEnum<typeof ObligationDomain>>;
    evidenceFrequency: z.ZodOptional<z.ZodNativeEnum<typeof EvidenceFrequency>>;
    ownerId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    isActive: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    isActive?: boolean;
    templateId?: string;
    title?: string;
    titleKo?: string;
    description?: string;
    domain?: ObligationDomain;
    evidenceFrequency?: EvidenceFrequency;
    ownerId?: string;
}, {
    isActive?: boolean;
    templateId?: string;
    title?: string;
    titleKo?: string;
    description?: string;
    domain?: ObligationDomain;
    evidenceFrequency?: EvidenceFrequency;
    ownerId?: string;
}>;
export type CreateObligationDto = z.infer<typeof createObligationSchema>;
export type UpdateObligationDto = z.infer<typeof updateObligationSchema>;
