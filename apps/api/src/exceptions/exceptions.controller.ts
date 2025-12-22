import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ExceptionsService } from './exceptions.service';
import { ExceptionStatus } from '@prisma/client';

@ApiTags('exceptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exceptions')
export class ExceptionsController {
  constructor(private exceptionsService: ExceptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new exception request' })
  async create(@Req() req: any, @Body() dto: any) {
    return this.exceptionsService.create(req.user.tenantId, req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all exception requests' })
  async findAll(@Req() req: any, @Query('status') status?: ExceptionStatus) {
    return this.exceptionsService.findAll(req.user.tenantId, status);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get exception statistics' })
  async getStats(@Req() req: any) {
    return this.exceptionsService.getStats(req.user.tenantId);
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get pending exception requests requiring approval' })
  async getPendingApprovals(@Req() req: any) {
    return this.exceptionsService.getPendingApprovals(req.user.tenantId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active (approved and not expired) exceptions' })
  async getActiveExceptions(@Req() req: any) {
    return this.exceptionsService.getActiveExceptions(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single exception request' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.exceptionsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve an exception request' })
  async approve(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.exceptionsService.approve(req.user.tenantId, id, {
      approvedBy: req.user.sub,
      comments: dto.comments,
    });
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject an exception request' })
  async reject(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.exceptionsService.reject(req.user.tenantId, id, {
      rejectedBy: req.user.sub,
      reason: dto.reason,
    });
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Revoke an approved exception' })
  async revoke(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.exceptionsService.revoke(
      req.user.tenantId,
      id,
      req.user.sub,
      dto.reason,
    );
  }
}
