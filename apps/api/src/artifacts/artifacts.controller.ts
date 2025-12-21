import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateArtifactDto, LinkArtifactDto } from '@complianceos/shared';
import { ArtifactsService } from './artifacts.service';

@ApiTags('artifacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('artifacts')
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateArtifactDto,
  ) {
    return this.artifactsService.uploadFile(user.tenantId, user.userId, file, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.artifactsService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.artifactsService.findOne(user.tenantId, id);
  }

  @Get(':id/download-url')
  getDownloadUrl(@CurrentUser() user: any, @Param('id') id: string) {
    return this.artifactsService.getDownloadUrl(user.tenantId, id);
  }

  @Put(':id/link')
  linkToResources(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: LinkArtifactDto,
  ) {
    return this.artifactsService.linkToResources(
      user.tenantId,
      user.userId,
      id,
      dto,
    );
  }

  @Delete(':id')
  softDelete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.artifactsService.softDelete(user.tenantId, user.userId, id);
  }
}
