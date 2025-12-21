import { z } from 'zod';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ORG_ADMIN = 'ORG_ADMIN',
  COMPLIANCE_MANAGER = 'COMPLIANCE_MANAGER',
  HR_MANAGER = 'HR_MANAGER',
  SECURITY_MANAGER = 'SECURITY_MANAGER',
  AUDITOR = 'AUDITOR',
  CONTRIBUTOR = 'CONTRIBUTOR',
}

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.nativeEnum(UserRole),
  password: z.string().min(8).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
