"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPackShareLinkSchema = exports.createInspectionPackSchema = void 0;
const zod_1 = require("zod");
const obligation_schema_1 = require("./obligation.schema");
exports.createInspectionPackSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    domain: zod_1.z.nativeEnum(obligation_schema_1.ObligationDomain),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime(),
    obligationIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    inspectorProfile: zod_1.z.string().optional(),
});
exports.createPackShareLinkSchema = zod_1.z.object({
    packId: zod_1.z.string().uuid(),
    expiresInHours: zod_1.z.number().int().positive().default(72),
});
//# sourceMappingURL=inspection-pack.schema.js.map