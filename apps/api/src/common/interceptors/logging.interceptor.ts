import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { StructuredLogger } from '../services/structured-logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: StructuredLogger) {
    this.logger.setContext('HTTP');
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, requestId, user } = request;
    const startTime = Date.now();

    this.logger.log(`Incoming request`, {
      requestId,
      method,
      url,
      userId: user?.id,
      tenantId: user?.tenantId,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;

          this.logger.log(`Request completed`, {
            requestId,
            method,
            url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            userId: user?.id,
            tenantId: user?.tenantId,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          this.logger.error(`Request failed`, error.stack, {
            requestId,
            method,
            url,
            error: error.message,
            duration: `${duration}ms`,
            userId: user?.id,
            tenantId: user?.tenantId,
          });
        },
      }),
    );
  }
}
