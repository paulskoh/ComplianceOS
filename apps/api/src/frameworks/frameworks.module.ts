import { Module } from '@nestjs/common';
import { FrameworksController } from './frameworks.controller';
import { FrameworksService } from './frameworks.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * SOFT-LAUNCH REQUIREMENT: Framework Transparency
 *
 * Provides read-only access to compliance framework definitions.
 */
@Module({
  imports: [PrismaModule],
  controllers: [FrameworksController],
  providers: [FrameworksService],
  exports: [FrameworksService],
})
export class FrameworksModule {}
