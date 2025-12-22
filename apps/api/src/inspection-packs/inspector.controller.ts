import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InspectorAccessService } from './inspector-access.service';
import { InspectorAuthGuard } from './guards/inspector-auth.guard';
import { PackManifestService } from './pack-manifest.service';

/**
 * Public inspector portal endpoints
 * These are accessible with inspector tokens (not regular auth)
 */
@ApiTags('inspector-portal')
@Controller('inspector')
export class InspectorController {
  constructor(
    private readonly inspectorAccessService: InspectorAccessService,
    private readonly manifestService: PackManifestService,
  ) {}

  /**
   * Verify inspector token and get basic info
   * GET /inspector/verify?token=xxx
   */
  @Get('verify')
  async verifyToken(@Query('token') token: string) {
    const access = await this.inspectorAccessService.verifyInspectorAccess(
      token,
    );

    return {
      valid: true,
      inspector: {
        name: access.inspectorName,
        organization: access.inspectorOrganization,
      },
      expiresAt: access.expiresAt,
      permissions: access.permissions,
    };
  }

  /**
   * Get pack details (read-only)
   * GET /inspector/pack?token=xxx
   */
  @Get('pack')
  @UseGuards(InspectorAuthGuard)
  async getPack(@Request() req: any) {
    const access = req.inspectorAccess;
    return this.inspectorAccessService.getPackByInspectorToken(access.token);
  }

  /**
   * Get pack manifest (read-only)
   * GET /inspector/pack/manifest?token=xxx
   */
  @Get('pack/manifest')
  @UseGuards(InspectorAuthGuard)
  async getManifest(@Request() req: any) {
    const access = req.inspectorAccess;

    if (!access.permissions.canViewManifest) {
      throw new Error('Permission denied: cannot view manifest');
    }

    return this.manifestService.generateManifest(access.packId, 'FINAL');
  }

  /**
   * Get activity log for current inspector session
   * GET /inspector/activity?token=xxx
   */
  @Get('activity')
  @UseGuards(InspectorAuthGuard)
  async getActivity(@Request() req: any) {
    const access = req.inspectorAccess;
    return this.inspectorAccessService.getInspectorActivityLog(access.id);
  }
}

/**
 * Company-side endpoints for managing inspector access
 * These require regular authentication
 */
@ApiTags('inspector-access-management')
@ApiBearerAuth()
@Controller('inspection-packs/:packId/inspector-access')
export class InspectorAccessController {
  constructor(private readonly inspectorAccessService: InspectorAccessService) {}

  /**
   * Grant inspector access to a pack
   * POST /inspection-packs/:packId/inspector-access
   */
  @Post()
  async grantAccess(
    @Param('packId') packId: string,
    @Body()
    body: {
      inspectorEmail: string;
      inspectorName: string;
      inspectorOrganization: string;
      expiresInHours?: number;
      permissions?: any;
    },
  ) {
    return this.inspectorAccessService.grantInspectorAccess(
      packId,
      body.inspectorEmail,
      body.inspectorName,
      body.inspectorOrganization,
      body.expiresInHours,
      body.permissions,
    );
  }

  /**
   * List all inspector accesses for a pack
   * GET /inspection-packs/:packId/inspector-access
   */
  @Get()
  async listAccesses(@Param('packId') packId: string) {
    return this.inspectorAccessService.listInspectorAccesses(packId);
  }

  /**
   * Revoke inspector access
   * POST /inspection-packs/:packId/inspector-access/:accessId/revoke
   */
  @Post(':accessId/revoke')
  async revokeAccess(
    @Param('accessId') accessId: string,
    @Body() body: { reason: string },
  ) {
    await this.inspectorAccessService.revokeInspectorAccess(
      accessId,
      body.reason,
    );
    return { success: true };
  }

  /**
   * Extend inspector access
   * POST /inspection-packs/:packId/inspector-access/:accessId/extend
   */
  @Post(':accessId/extend')
  async extendAccess(
    @Param('accessId') accessId: string,
    @Body() body: { additionalHours: number },
  ) {
    return this.inspectorAccessService.extendInspectorAccess(
      accessId,
      body.additionalHours,
    );
  }

  /**
   * Get activity log for an inspector access
   * GET /inspection-packs/:packId/inspector-access/:accessId/activity
   */
  @Get(':accessId/activity')
  async getActivityLog(@Param('accessId') accessId: string) {
    return this.inspectorAccessService.getInspectorActivityLog(accessId);
  }
}
