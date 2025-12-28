import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ContradictionDetectionService } from './contradiction-detection.service';

@ApiTags('contradictions')
@Controller('api/v2/contradictions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContradictionsController {
  constructor(private readonly contradictionService: ContradictionDetectionService) {}

  @Post('detect')
  @ApiOperation({
    summary: 'Detect contradictions between documents (CEO Demo)',
    description: 'Analyzes multiple documents for conflicting facts like retention periods, training frequency, etc.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        artifactIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of artifact IDs to compare',
        },
      },
      required: ['artifactIds'],
    },
  })
  async detectContradictions(
    @CurrentUser() user: any,
    @Body() body: { artifactIds: string[] },
  ) {
    const contradictions = await this.contradictionService.detectContradictions(
      user.tenantId,
      body.artifactIds,
    );

    return {
      total: contradictions.length,
      bySeverity: {
        high: contradictions.filter(c => c.severity === 'HIGH').length,
        medium: contradictions.filter(c => c.severity === 'MEDIUM').length,
        low: contradictions.filter(c => c.severity === 'LOW').length,
      },
      contradictions,
    };
  }

  @Get('requirement/:requirementId')
  @ApiOperation({
    summary: 'Detect contradictions for evidence requirement',
    description: 'Analyzes all artifacts linked to an evidence requirement for contradictions',
  })
  @ApiParam({ name: 'requirementId', description: 'Evidence requirement ID' })
  async detectForRequirement(
    @CurrentUser() user: any,
    @Param('requirementId') requirementId: string,
  ) {
    const contradictions = await this.contradictionService.detectContradictionsForRequirement(
      user.tenantId,
      requirementId,
    );

    return {
      evidenceRequirementId: requirementId,
      total: contradictions.length,
      bySeverity: {
        high: contradictions.filter(c => c.severity === 'HIGH').length,
        medium: contradictions.filter(c => c.severity === 'MEDIUM').length,
        low: contradictions.filter(c => c.severity === 'LOW').length,
      },
      contradictions,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all contradictions for tenant',
    description: 'Scans all verified/flagged artifacts for contradictions',
  })
  async getAllContradictions(@CurrentUser() user: any) {
    const contradictions = await this.contradictionService.getContradictionsForTenant(
      user.tenantId,
    );

    return {
      total: contradictions.length,
      bySeverity: {
        high: contradictions.filter(c => c.severity === 'HIGH').length,
        medium: contradictions.filter(c => c.severity === 'MEDIUM').length,
        low: contradictions.filter(c => c.severity === 'LOW').length,
      },
      contradictions,
    };
  }

  @Get('types')
  @ApiOperation({
    summary: 'Get contradiction fact types',
    description: 'Returns the types of facts we check for contradictions',
  })
  getContradictionTypes() {
    return {
      factTypes: [
        { type: 'RETENTION_PERIOD', nameKo: '보관기간', description: '개인정보 보관 기간' },
        { type: 'TRAINING_FREQUENCY', nameKo: '교육주기', description: '정보보호 교육 주기' },
        { type: 'DELETION_METHOD', nameKo: '파기방법', description: '개인정보 파기 방법/시점' },
        { type: 'CONSENT_REQUIREMENT', nameKo: '동의요건', description: '동의 획득 방법' },
        { type: 'THIRD_PARTY_PROVISION', nameKo: '제3자제공', description: '제3자 제공 조건' },
        { type: 'SECURITY_MEASURE', nameKo: '안전조치', description: '기술적/관리적 보호조치' },
      ],
      severityLevels: [
        { level: 'HIGH', nameKo: '심각', description: '즉시 해결 필요' },
        { level: 'MEDIUM', nameKo: '중간', description: '조속한 해결 권장' },
        { level: 'LOW', nameKo: '낮음', description: '점검 필요' },
      ],
    };
  }
}
