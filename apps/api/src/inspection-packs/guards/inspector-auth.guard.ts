import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { InspectorAccessService } from '../inspector-access.service';

/**
 * Guard for inspector-only endpoints
 * Validates inspector access token from query parameters or headers
 */
@Injectable()
export class InspectorAuthGuard implements CanActivate {
  constructor(private inspectorAccessService: InspectorAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Get token from query param or Authorization header
    const token =
      request.query.inspectorToken ||
      request.headers['x-inspector-token'] ||
      this.extractTokenFromBearer(request.headers.authorization);

    if (!token) {
      throw new UnauthorizedException(
        'Inspector access token required. Provide via ?inspectorToken=xxx or X-Inspector-Token header',
      );
    }

    try {
      // Verify token and attach inspector access to request
      const access = await this.inspectorAccessService.verifyInspectorAccess(
        token,
      );
      request.inspectorAccess = access;
      return true;
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Invalid inspector token',
      );
    }
  }

  private extractTokenFromBearer(authorization?: string): string | null {
    if (!authorization) return null;

    const parts = authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }

    return null;
  }
}
