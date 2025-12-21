import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateInspectionPackDto } from '@complianceos/shared';
import { InspectionPacksService } from './inspection-packs.service';

@ApiTags('inspection-packs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inspection-packs')
export class InspectionPacksController {
  constructor(private readonly packsService: InspectionPacksService) {}

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
}
