"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateObligationSchema = exports.createObligationSchema = exports.EvidenceFrequency = exports.ObligationDomain = void 0;
const zod_1 = require("zod");
var ObligationDomain;
(function (ObligationDomain) {
    ObligationDomain["LABOR"] = "LABOR";
    ObligationDomain["PRIVACY"] = "PRIVACY";
    ObligationDomain["FINANCE"] = "FINANCE";
    ObligationDomain["CONTRACTS"] = "CONTRACTS";
    ObligationDomain["SECURITY"] = "SECURITY";
    ObligationDomain["TRAINING"] = "TRAINING";
})(ObligationDomain || (exports.ObligationDomain = ObligationDomain = {}));
var EvidenceFrequency;
(function (EvidenceFrequency) {
    EvidenceFrequency["CONTINUOUS"] = "CONTINUOUS";
    EvidenceFrequency["DAILY"] = "DAILY";
    EvidenceFrequency["WEEKLY"] = "WEEKLY";
    EvidenceFrequency["MONTHLY"] = "MONTHLY";
    EvidenceFrequency["QUARTERLY"] = "QUARTERLY";
    EvidenceFrequency["ANNUAL"] = "ANNUAL";
    EvidenceFrequency["ON_CHANGE"] = "ON_CHANGE";
})(EvidenceFrequency || (exports.EvidenceFrequency = EvidenceFrequency = {}));
exports.createObligationSchema = zod_1.z.object({
    templateId: zod_1.z.string().uuid().optional(),
    title: zod_1.z.string().min(1),
    titleKo: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string(),
    domain: zod_1.z.nativeEnum(ObligationDomain),
    evidenceFrequency: zod_1.z.nativeEnum(EvidenceFrequency),
    ownerId: zod_1.z.string().uuid().optional(),
    isActive: zod_1.z.boolean().default(true),
});
exports.updateObligationSchema = exports.createObligationSchema.partial();
//# sourceMappingURL=obligation.schema.js.map