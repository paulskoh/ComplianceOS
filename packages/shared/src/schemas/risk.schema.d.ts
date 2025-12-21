import { z } from 'zod';
export declare enum RiskSeverity {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export declare enum RiskStatus {
    OPEN = "OPEN",
    IN_REVIEW = "IN_REVIEW",
    MITIGATED = "MITIGATED",
    ACCEPTED = "ACCEPTED"
}
export declare const createRiskItemSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    severity: z.ZodNativeEnum<typeof RiskSeverity>;
    obligationId: z.ZodOptional<z.ZodString>;
    controlId: z.ZodOptional<z.ZodString>;
    ownerId: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    title?: string;
    description?: string;
    ownerId?: string;
    controlId?: string;
    severity?: RiskSeverity;
    obligationId?: string;
    dueDate?: string;
}, {
    title?: string;
    description?: string;
    ownerId?: string;
    controlId?: string;
    severity?: RiskSeverity;
    obligationId?: string;
    dueDate?: string;
}>;
export declare const updateRiskItemSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    severity: z.ZodOptional<z.ZodNativeEnum<typeof RiskSeverity>>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof RiskStatus>>;
    ownerId: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: RiskStatus;
    title?: string;
    description?: string;
    ownerId?: string;
    severity?: RiskSeverity;
    dueDate?: string;
}, {
    status?: RiskStatus;
    title?: string;
    description?: string;
    ownerId?: string;
    severity?: RiskSeverity;
    dueDate?: string;
}>;
export type CreateRiskItemDto = z.infer<typeof createRiskItemSchema>;
export type UpdateRiskItemDto = z.infer<typeof updateRiskItemSchema>;
