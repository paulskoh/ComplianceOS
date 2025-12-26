import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FrameworksService } from './frameworks.service';

/**
 * SOFT-LAUNCH REQUIREMENT: Framework Transparency
 *
 * Users must be able to view what they're being evaluated against.
 * This controller exposes compliance framework definitions in read-only mode.
 */
@ApiTags('frameworks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('frameworks')
export class FrameworksController {
  constructor(private readonly frameworksService: FrameworksService) {}

  /**
   * Get all available compliance frameworks
   */
  @Get()
  @ApiOperation({ summary: 'List all compliance frameworks' })
  async listFrameworks() {
    return this.frameworksService.listFrameworks();
  }

  /**
   * Get framework details with domains and controls
   */
  @Get(':code')
  @ApiOperation({ summary: 'Get framework details by code' })
  async getFramework(@Param('code') code: string) {
    return this.frameworksService.getFramework(code);
  }

  /**
   * Get all obligations for a specific domain
   */
  @Get(':code/domains/:domain')
  @ApiOperation({ summary: 'Get obligations by domain' })
  async getObligationsByDomain(
    @Param('code') code: string,
    @Param('domain') domain: string,
  ) {
    return this.frameworksService.getObligationsByDomain(code, domain);
  }

  /**
   * Get control requirements for an obligation
   */
  @Get('obligations/:obligationCode/controls')
  @ApiOperation({ summary: 'Get controls for an obligation' })
  async getControlsForObligation(@Param('obligationCode') obligationCode: string) {
    return this.frameworksService.getControlsForObligation(obligationCode);
  }

  /**
   * Get evidence requirements for a control
   */
  @Get('controls/:controlCode/evidence-requirements')
  @ApiOperation({ summary: 'Get evidence requirements for a control' })
  async getEvidenceRequirements(@Param('controlCode') controlCode: string) {
    return this.frameworksService.getEvidenceRequirements(controlCode);
  }

  /**
   * Search across frameworks
   */
  @Get('search')
  @ApiOperation({ summary: 'Search frameworks, obligations, and controls' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  async search(@Query('q') query: string) {
    return this.frameworksService.search(query);
  }
}
