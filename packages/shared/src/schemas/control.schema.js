"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvidenceRequirementSchema = exports.updateControlSchema = exports.createControlSchema = exports.AutomationLevel = exports.ControlType = void 0;
const zod_1 = require("zod");
var ControlType;
(function (ControlType) {
    ControlType["PREVENTIVE"] = "PREVENTIVE";
    ControlType["DETECTIVE"] = "DETECTIVE";
    ControlType["CORRECTIVE"] = "CORRECTIVE";
})(ControlType || (exports.ControlType = ControlType = {}));
var AutomationLevel;
(function (AutomationLevel) {
    AutomationLevel["MANUAL"] = "MANUAL";
    AutomationLevel["SEMI_AUTOMATED"] = "SEMI_AUTOMATED";
    AutomationLevel["FULLY_AUTOMATED"] = "FULLY_AUTOMATED";
})(AutomationLevel || (exports.AutomationLevel = AutomationLevel = {}));
exports.createControlSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    type: zod_1.z.nativeEnum(ControlType),
    automationLevel: zod_1.z.nativeEnum(AutomationLevel),
    ownerId: zod_1.z.string().uuid().optional(),
    obligationIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
});
exports.updateControlSchema = exports.createControlSchema.partial();
exports.createEvidenceRequirementSchema = zod_1.z.object({
    controlId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string(),
    freshnessWindowDays: zod_1.z.number().int().positive(),
    required: zod_1.z.boolean().default(true),
});
//# sourceMappingURL=control.schema.js.map