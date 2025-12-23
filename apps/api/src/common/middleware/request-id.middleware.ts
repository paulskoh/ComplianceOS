import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

// Extend Express Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate or use existing request ID
    const requestId = req.headers['x-request-id'] as string || randomBytes(16).toString('hex');

    // Attach to request object
    req.requestId = requestId;

    // Add to response headers for client-side tracking
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
