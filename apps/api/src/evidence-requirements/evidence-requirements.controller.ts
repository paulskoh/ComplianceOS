import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { EvidenceRequirementsService } from './evidence-requirements.service';

@ApiTags('evidence-requirements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('evidence-requirements')
export class EvidenceRequirementsController {
  constructor(
    private readonly evidenceRequirementsService: EvidenceRequirementsService,
  ) {}

  @Get('overview')
  async getOverview(@CurrentUser() user: any) {
    return this.evidenceRequirementsService.getOverview(user.tenantId);
  }

  @Get(':id')
  async getOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.evidenceRequirementsService.getDetail(user.tenantId, id);
  }

  @Get(':id/poll-status')
  async pollStatus(@CurrentUser() user: any, @Param('id') id: string) {
    return this.evidenceRequirementsService.getStatus(user.tenantId, id);
  }
}
