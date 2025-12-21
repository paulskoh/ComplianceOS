"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = exports.UserRole = void 0;
const zod_1 = require("zod");
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "SUPER_ADMIN";
    UserRole["ORG_ADMIN"] = "ORG_ADMIN";
    UserRole["COMPLIANCE_MANAGER"] = "COMPLIANCE_MANAGER";
    UserRole["HR_MANAGER"] = "HR_MANAGER";
    UserRole["SECURITY_MANAGER"] = "SECURITY_MANAGER";
    UserRole["AUDITOR"] = "AUDITOR";
    UserRole["CONTRIBUTOR"] = "CONTRIBUTOR";
})(UserRole || (exports.UserRole = UserRole = {}));
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    role: zod_1.z.nativeEnum(UserRole),
    password: zod_1.z.string().min(8).optional(),
});
exports.updateUserSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    role: zod_1.z.nativeEnum(UserRole).optional(),
    isActive: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=user.schema.js.map