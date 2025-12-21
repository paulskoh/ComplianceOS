"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRiskItemSchema = exports.createRiskItemSchema = exports.RiskStatus = exports.RiskSeverity = void 0;
const zod_1 = require("zod");
var RiskSeverity;
(function (RiskSeverity) {
    RiskSeverity["LOW"] = "LOW";
    RiskSeverity["MEDIUM"] = "MEDIUM";
    RiskSeverity["HIGH"] = "HIGH";
    RiskSeverity["CRITICAL"] = "CRITICAL";
})(RiskSeverity || (exports.RiskSeverity = RiskSeverity = {}));
var RiskStatus;
(function (RiskStatus) {
    RiskStatus["OPEN"] = "OPEN";
    RiskStatus["IN_REVIEW"] = "IN_REVIEW";
    RiskStatus["MITIGATED"] = "MITIGATED";
    RiskStatus["ACCEPTED"] = "ACCEPTED";
})(RiskStatus || (exports.RiskStatus = RiskStatus = {}));
exports.createRiskItemSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    severity: zod_1.z.nativeEnum(RiskSeverity),
    obligationId: zod_1.z.string().uuid().optional(),
    controlId: zod_1.z.string().uuid().optional(),
    ownerId: zod_1.z.string().uuid().optional(),
    dueDate: zod_1.z.string().datetime().optional(),
});
exports.updateRiskItemSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    severity: zod_1.z.nativeEnum(RiskSeverity).optional(),
    status: zod_1.z.nativeEnum(RiskStatus).optional(),
    ownerId: zod_1.z.string().uuid().optional(),
    dueDate: zod_1.z.string().datetime().optional(),
});
//# sourceMappingURL=risk.schema.js.map