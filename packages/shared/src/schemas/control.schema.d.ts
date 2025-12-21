import { z } from 'zod';
export declare enum ControlType {
    PREVENTIVE = "PREVENTIVE",
    DETECTIVE = "DETECTIVE",
    CORRECTIVE = "CORRECTIVE"
}
export declare enum AutomationLevel {
    MANUAL = "MANUAL",
    SEMI_AUTOMATED = "SEMI_AUTOMATED",
    FULLY_AUTOMATED = "FULLY_AUTOMATED"
}
export declare const createControlSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    type: z.ZodNativeEnum<typeof ControlType>;
    automationLevel: z.ZodNativeEnum<typeof AutomationLevel>;
    ownerId: z.ZodOptional<z.ZodString>;
    obligationIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    type?: ControlType;
    description?: string;
    ownerId?: string;
    automationLevel?: AutomationLevel;
    obligationIds?: string[];
}, {
    name?: string;
    type?: ControlType;
    description?: string;
    ownerId?: string;
    automationLevel?: AutomationLevel;
    obligationIds?: string[];
}>;
export declare const updateControlSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodNativeEnum<typeof ControlType>>;
    automationLevel: z.ZodOptional<z.ZodNativeEnum<typeof AutomationLevel>>;
    ownerId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    obligationIds: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    type?: ControlType;
    description?: string;
    ownerId?: string;
    automationLevel?: AutomationLevel;
    obligationIds?: string[];
}, {
    name?: string;
    type?: ControlType;
    description?: string;
    ownerId?: string;
    automationLevel?: AutomationLevel;
    obligationIds?: string[];
}>;
export declare const createEvidenceRequirementSchema: z.ZodObject<{
    controlId: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    freshnessWindowDays: z.ZodNumber;
    required: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    description?: string;
    controlId?: string;
    freshnessWindowDays?: number;
    required?: boolean;
}, {
    name?: string;
    description?: string;
    controlId?: string;
    freshnessWindowDays?: number;
    required?: boolean;
}>;
export type CreateControlDto = z.infer<typeof createControlSchema>;
export type UpdateControlDto = z.infer<typeof updateControlSchema>;
export type CreateEvidenceRequirementDto = z.infer<typeof createEvidenceRequirementSchema>;
