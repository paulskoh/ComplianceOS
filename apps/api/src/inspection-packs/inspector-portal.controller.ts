import {
  Controller,
  Get,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InspectorPortalService } from './inspector-portal.service';

/**
 * Inspector Portal Controller
 * Provides token-based access to inspection packs for external auditors
 * NO AUTHENTICATION REQUIRED - uses time-limited share tokens
 */
@ApiTags('inspector-portal')
@Controller('inspector/packs')
export class InspectorPortalController {
  constructor(private readonly portalService: InspectorPortalService) {}

  @Get(':packId')
  @ApiOperation({
    summary: 'Access inspection pack with share token (no auth required)',
  })
  @ApiQuery({ name: 'token', required: true, description: 'Time-limited share token' })
  async getPackDetails(
    @Param('packId') packId: string,
    @Query('token') token: string,
  ) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    return this.portalService.getPackDetails(packId, token);
  }

  @Get(':packId/manifest')
  @ApiOperation({
    summary: 'Download signed manifest JSON',
  })
  @ApiQuery({ name: 'token', required: true })
  async getManifest(
    @Param('packId') packId: string,
    @Query('token') token: string,
  ) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    return this.portalService.getManifest(packId, token);
  }

  @Get(':packId/proof')
  @ApiOperation({
    summary: 'Download verification proof (signature + public key)',
  })
  @ApiQuery({ name: 'token', required: true })
  async getProof(
    @Param('packId') packId: string,
    @Query('token') token: string,
  ) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    return this.portalService.getProof(packId, token);
  }

  @Get(':packId/artifacts/:artifactId/download-url')
  @ApiOperation({
    summary: 'Get presigned download URL for artifact',
  })
  @ApiQuery({ name: 'token', required: true })
  async getArtifactDownloadUrl(
    @Param('packId') packId: string,
    @Param('artifactId') artifactId: string,
    @Query('token') token: string,
  ) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    return this.portalService.getArtifactDownloadUrl(packId, artifactId, token);
  }

  @Get(':packId/verify')
  @ApiOperation({
    summary: 'Verify pack integrity (manifest signature + artifact hashes)',
  })
  @ApiQuery({ name: 'token', required: true })
  async verifyPackIntegrity(
    @Param('packId') packId: string,
    @Query('token') token: string,
  ) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }

    return this.portalService.verifyPackIntegrity(packId, token);
  }
}
