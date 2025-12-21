import { z } from 'zod';
export declare enum UserRole {
    SUPER_ADMIN = "SUPER_ADMIN",
    ORG_ADMIN = "ORG_ADMIN",
    COMPLIANCE_MANAGER = "COMPLIANCE_MANAGER",
    HR_MANAGER = "HR_MANAGER",
    SECURITY_MANAGER = "SECURITY_MANAGER",
    AUDITOR = "AUDITOR",
    CONTRIBUTOR = "CONTRIBUTOR"
}
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    role: z.ZodNativeEnum<typeof UserRole>;
    password: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
}, {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
}>;
export declare const updateUserSchema: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodNativeEnum<typeof UserRole>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    isActive?: boolean;
}, {
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    isActive?: boolean;
}>;
export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
