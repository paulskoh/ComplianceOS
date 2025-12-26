import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
    this.logger.log('JwtStrategy initialized');
  }

  async validate(payload: any) {
    this.logger.log(`Validating JWT payload for user: ${payload.sub}`);

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!user) {
      this.logger.warn(`User not found: ${payload.sub}`);
      throw new UnauthorizedException();
    }

    if (!user.isActive) {
      this.logger.warn(`User is inactive: ${payload.sub}`);
      throw new UnauthorizedException();
    }

    if (!user.tenant.isActive) {
      this.logger.warn(`Tenant is inactive: ${user.tenantId}`);
      throw new UnauthorizedException();
    }

    this.logger.log(`JWT validation successful for user: ${user.email}`);

    return {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };
  }
}
