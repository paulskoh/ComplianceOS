import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReadinessService } from './readiness.service';

@ApiTags('readiness')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('readiness')
export class ReadinessController {
  constructor(private readonly readinessService: ReadinessService) {}

  @Get('score')
  getScore(@CurrentUser() user: any) {
    return this.readinessService.getScore(user.tenantId);
  }

  @Get('gaps')
  getGapReport(@CurrentUser() user: any) {
    return this.readinessService.getGapReport(user.tenantId);
  }
}
