"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkArtifactSchema = exports.updateArtifactSchema = exports.createArtifactSchema = exports.AccessClassification = exports.ArtifactType = void 0;
const zod_1 = require("zod");
var ArtifactType;
(function (ArtifactType) {
    ArtifactType["LOG"] = "LOG";
    ArtifactType["REPORT"] = "REPORT";
    ArtifactType["POLICY"] = "POLICY";
    ArtifactType["APPROVAL"] = "APPROVAL";
    ArtifactType["SIGNED_DOCUMENT"] = "SIGNED_DOCUMENT";
    ArtifactType["EXPORT"] = "EXPORT";
    ArtifactType["SCREENSHOT"] = "SCREENSHOT";
    ArtifactType["OTHER"] = "OTHER";
})(ArtifactType || (exports.ArtifactType = ArtifactType = {}));
var AccessClassification;
(function (AccessClassification) {
    AccessClassification["PUBLIC"] = "PUBLIC";
    AccessClassification["INTERNAL"] = "INTERNAL";
    AccessClassification["CONFIDENTIAL"] = "CONFIDENTIAL";
    AccessClassification["PII"] = "PII";
})(AccessClassification || (exports.AccessClassification = AccessClassification = {}));
exports.createArtifactSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    type: zod_1.z.nativeEnum(ArtifactType),
    source: zod_1.z.string().min(1),
    accessClassification: zod_1.z.nativeEnum(AccessClassification),
    retentionDays: zod_1.z.number().int().positive().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
    controlIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    obligationIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
});
exports.updateArtifactSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    accessClassification: zod_1.z.nativeEnum(AccessClassification).optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.linkArtifactSchema = zod_1.z.object({
    controlIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    obligationIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
//# sourceMappingURL=artifact.schema.js.map