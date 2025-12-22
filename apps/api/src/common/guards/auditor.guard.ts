import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * AuditorGuard enforces read-only access for users with AUDITOR role.
 * AUDITOR users can only perform GET requests, not POST/PUT/DELETE/PATCH.
 */
@Injectable()
export class AuditorGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true; // Let JwtAuthGuard handle authentication
    }

    // Check if user has AUDITOR role
    if (user.role === 'AUDITOR') {
      const method = request.method;

      // AUDITOR can only perform GET requests
      if (method !== 'GET') {
        throw new ForbiddenException(
          'Auditors have read-only access. Cannot perform write operations.',
        );
      }
    }

    return true;
  }
}
