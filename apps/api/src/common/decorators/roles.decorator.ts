import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@complianceos/shared';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
