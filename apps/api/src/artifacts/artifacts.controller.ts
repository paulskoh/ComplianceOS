import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Ip,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateArtifactDto, LinkArtifactDto } from '@complianceos/shared';
import { ArtifactsService } from './artifacts.service';
import { ArtifactsV2Service } from './artifacts-v2.service';
import {
  ArtifactCreateIntentDto,
  ArtifactFinalizeDto,
} from './dto/upload-intent.dto';

@ApiTags('artifacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('artifacts')
export class ArtifactsController {
  constructor(
    private readonly artifactsService: ArtifactsService,
    private readonly artifactsV2Service: ArtifactsV2Service,
  ) {}

  @Post('upload-intent')
  @ApiOperation({ summary: 'Create upload intent and get presigned URL (two-phase upload)' })
  uploadIntent(@CurrentUser() user: any, @Body() dto: ArtifactCreateIntentDto) {
    return this.artifactsV2Service.createUploadIntent(user.userId, {
      ...dto,
      tenantId: user.tenantId, // Derive from auth context
    });
  }

  @Post('finalize-upload')
  @ApiOperation({ summary: 'Finalize upload after client completes S3 PUT' })
  finalizeUpload(@CurrentUser() user: any, @Body() dto: ArtifactFinalizeDto) {
    return this.artifactsV2Service.finalizeUpload(user.userId, {
      ...dto,
      tenantId: user.tenantId, // Derive from auth context
    });
  }

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

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve artifact (makes it immutable)' })
  approveArtifact(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Ip() ipAddress?: string,
  ) {
    return this.artifactsService.approveArtifact(
      user.tenantId,
      user.userId,
      id,
      ipAddress,
    );
  }

  @Get(':id/chain-of-custody')
  @ApiOperation({ summary: 'Get artifact with full chain of custody' })
  getChainOfCustody(@CurrentUser() user: any, @Param('id') id: string) {
    return this.artifactsService.findOneWithChainOfCustody(user.tenantId, id);
  }

  @Get(':id/download-url-tracked')
  @ApiOperation({ summary: 'Get download URL with audit logging' })
  getDownloadUrlTracked(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.artifactsService.getDownloadUrlWithTracking(
      user.tenantId,
      user.userId,
      id,
      ipAddress,
      userAgent,
    );
  }

  @Patch(':id/metadata')
  @ApiOperation({ summary: 'Update artifact metadata (whitelisted fields only)' })
  updateMetadata(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updates: any,
  ) {
    return this.artifactsService.updateMetadata(
      user.tenantId,
      user.userId,
      id,
      updates,
    );
  }

  @Get(':id/immutability-status')
  @ApiOperation({ summary: 'Get immutability and approval status' })
  getImmutabilityStatus(@CurrentUser() user: any, @Param('id') id: string) {
    return this.artifactsService.getImmutabilityStatus(user.tenantId, id);
  }
}
