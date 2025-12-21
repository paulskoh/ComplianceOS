"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshTokenSchema = exports.registerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
});
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 'Password must contain uppercase, lowercase, number and special character'),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    organizationName: zod_1.z.string().min(1),
});
exports.refreshTokenSchema = zod_1.z.object({
    refreshToken: zod_1.z.string(),
});
//# sourceMappingURL=auth.schema.js.map