import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
    this.logger.log('JwtAuthGuard initialized');
  }

  canActivate(context: ExecutionContext) {
    this.logger.log('JwtAuthGuard.canActivate called');

    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      this.logger.log('Route is public, skipping auth');
      return true;
    }

    this.logger.log('Calling super.canActivate (Passport JWT)');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    this.logger.log('handleRequest called');
    this.logger.log(`Error: ${err}, User: ${JSON.stringify(user)}, Info: ${JSON.stringify(info)}`);
    return super.handleRequest(err, user, info, context);
  }
}
