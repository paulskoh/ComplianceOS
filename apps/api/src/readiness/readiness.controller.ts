import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReadinessService } from './readiness.service';
import { SimulationService } from './simulation.service';

@ApiTags('readiness')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('readiness')
export class ReadinessController {
  constructor(
    private readonly readinessService: ReadinessService,
    private readonly simulationService: SimulationService,
  ) {}

  @Get('score')
  getScore(@CurrentUser() user: any) {
    return this.readinessService.getScore(user.tenantId);
  }

  @Get('score-v2')
  @ApiOperation({ summary: 'Get weighted readiness score with top risks' })
  getWeightedScore(@CurrentUser() user: any) {
    return this.readinessService.calculateWeightedScore(user.tenantId);
  }

  @Get('gaps')
  getGapReport(@CurrentUser() user: any) {
    return this.readinessService.getGapReport(user.tenantId);
  }

  @Get('simulate/presets')
  @ApiOperation({ summary: 'Get available inspection simulation presets' })
  getSimulationPresets() {
    return this.simulationService.getPresets();
  }

  @Post('simulate')
  @ApiOperation({ summary: 'Run inspection simulation' })
  runSimulation(
    @CurrentUser() user: any,
    @Body() dto: { preset: string; startDate: string; endDate: string },
  ) {
    return this.simulationService.runSimulation(
      user.tenantId,
      user.userId,
      dto.preset,
      new Date(dto.startDate),
      new Date(dto.endDate),
    );
  }

  @Post('simulate/draft-pack')
  @ApiOperation({ summary: 'Generate draft inspection pack from simulation' })
  generateDraftPack(@CurrentUser() user: any, @Body() simulationResult: any) {
    return this.simulationService.generateDraftPack(
      user.tenantId,
      user.userId,
      simulationResult,
    );
  }
}
