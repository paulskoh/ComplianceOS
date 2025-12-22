import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ApplicabilityService } from './applicability.service';
import { EvaluateApplicabilityDto } from './dto/evaluate-applicability.dto';

@ApiTags('applicability')
@Controller('applicability')
export class ApplicabilityController {
  constructor(private readonly applicabilityService: ApplicabilityService) {}

  @Post('evaluate')
  @ApiOperation({
    summary: '회사 프로필에 대한 적용 가능한 의무사항 평가',
    description:
      '회사 프로필(규모, 업종, 근무형태, 데이터 유형 등)을 기반으로 적용되는 의무사항을 평가합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '적용 가능한 의무사항 목록',
  })
  async evaluateApplicability(@Body() dto: EvaluateApplicabilityDto) {
    return this.applicabilityService.evaluateApplicability(dto);
  }

  @Post('evaluate/by-domain')
  @ApiOperation({
    summary: '도메인별 적용 가능한 의무사항 평가',
    description: '적용 가능한 의무사항을 도메인(LABOR, PRIVACY 등)별로 그룹화하여 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '도메인별 적용 가능한 의무사항',
  })
  async evaluateByDomain(@Body() dto: EvaluateApplicabilityDto) {
    return this.applicabilityService.getApplicableObligationsByDomain(dto);
  }

  @Post('evaluate/controls')
  @ApiOperation({
    summary: '적용 가능한 컨트롤 및 증빙요건 평가',
    description: '적용 가능한 의무사항에 대한 컨트롤과 증빙요건을 함께 반환합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '적용 가능한 컨트롤 목록',
  })
  async evaluateControls(@Body() dto: EvaluateApplicabilityDto) {
    return this.applicabilityService.getApplicableControls(dto);
  }

  @Post('check/:obligationCode')
  @ApiOperation({
    summary: '특정 의무사항의 적용 가능 여부 확인',
    description: '특정 의무사항이 주어진 회사 프로필에 적용되는지 확인합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '적용 가능 여부',
    schema: {
      type: 'object',
      properties: {
        obligationCode: { type: 'string' },
        isApplicable: { type: 'boolean' },
      },
    },
  })
  async checkObligation(
    @Param('obligationCode') obligationCode: string,
    @Body() dto: EvaluateApplicabilityDto,
  ) {
    const isApplicable = await this.applicabilityService.isObligationApplicable(
      obligationCode,
      dto,
    );
    return {
      obligationCode,
      isApplicable,
    };
  }
}
