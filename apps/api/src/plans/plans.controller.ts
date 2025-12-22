import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PlansService } from './plans.service';

@ApiTags('plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get('usage')
  @ApiOperation({ summary: 'Get current plan usage and limits' })
  getPlanUsage(@CurrentUser() user: any) {
    return this.plansService.getPlanUsage(user.tenantId);
  }
}
