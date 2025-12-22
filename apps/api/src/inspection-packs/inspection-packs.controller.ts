import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateInspectionPackDto } from '@complianceos/shared';
import { InspectionPacksService } from './inspection-packs.service';
import { PackManifestService } from './pack-manifest.service';

@ApiTags('inspection-packs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inspection-packs')
export class InspectionPacksController {
  constructor(
    private readonly packsService: InspectionPacksService,
    private readonly manifestService: PackManifestService,
  ) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateInspectionPackDto) {
    return this.packsService.create(user.tenantId, user.userId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.packsService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.packsService.findOne(user.tenantId, id);
  }

  @Post(':id/share-link')
  createShareLink(@CurrentUser() user: any, @Param('id') id: string) {
    return this.packsService.createShareLink(user.tenantId, id);
  }

  @Get(':id/download-urls')
  getDownloadUrls(@CurrentUser() user: any, @Param('id') id: string) {
    return this.packsService.getDownloadUrls(user.tenantId, id);
  }

  @Get(':id/manifest')
  async getManifest(@Param('id') id: string) {
    return this.manifestService.generateManifest(id, 'DRAFT');
  }

  @Post(':id/finalize')
  async finalizePack(@CurrentUser() user: any, @Param('id') id: string) {
    return this.manifestService.finalizePack(id, user.userId);
  }

  @Post(':id/verify')
  async verifyPack(@Param('id') id: string, @Body() manifest: any) {
    return this.manifestService.verifyManifest(manifest);
  }

  @Post(':id/revoke')
  async revokePack(@Param('id') id: string, @Body() body: { reason: string }) {
    await this.manifestService.revokePack(id, body.reason);
    return { success: true };
  }
}
