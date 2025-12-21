import { z } from 'zod';
export declare enum ArtifactType {
    LOG = "LOG",
    REPORT = "REPORT",
    POLICY = "POLICY",
    APPROVAL = "APPROVAL",
    SIGNED_DOCUMENT = "SIGNED_DOCUMENT",
    EXPORT = "EXPORT",
    SCREENSHOT = "SCREENSHOT",
    OTHER = "OTHER"
}
export declare enum AccessClassification {
    PUBLIC = "PUBLIC",
    INTERNAL = "INTERNAL",
    CONFIDENTIAL = "CONFIDENTIAL",
    PII = "PII"
}
export declare const createArtifactSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    type: z.ZodNativeEnum<typeof ArtifactType>;
    source: z.ZodString;
    accessClassification: z.ZodNativeEnum<typeof AccessClassification>;
    retentionDays: z.ZodOptional<z.ZodNumber>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    controlIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    obligationIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    metadata?: Record<string, any>;
    name?: string;
    type?: ArtifactType;
    description?: string;
    obligationIds?: string[];
    source?: string;
    accessClassification?: AccessClassification;
    retentionDays?: number;
    controlIds?: string[];
}, {
    metadata?: Record<string, any>;
    name?: string;
    type?: ArtifactType;
    description?: string;
    obligationIds?: string[];
    source?: string;
    accessClassification?: AccessClassification;
    retentionDays?: number;
    controlIds?: string[];
}>;
export declare const updateArtifactSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    accessClassification: z.ZodOptional<z.ZodNativeEnum<typeof AccessClassification>>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    metadata?: Record<string, any>;
    name?: string;
    description?: string;
    accessClassification?: AccessClassification;
}, {
    metadata?: Record<string, any>;
    name?: string;
    description?: string;
    accessClassification?: AccessClassification;
}>;
export declare const linkArtifactSchema: z.ZodObject<{
    controlIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    obligationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    obligationIds?: string[];
    controlIds?: string[];
}, {
    obligationIds?: string[];
    controlIds?: string[];
}>;
export type CreateArtifactDto = z.infer<typeof createArtifactSchema>;
export type UpdateArtifactDto = z.infer<typeof updateArtifactSchema>;
export type LinkArtifactDto = z.infer<typeof linkArtifactSchema>;
