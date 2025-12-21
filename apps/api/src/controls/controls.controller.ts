import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateControlDto, UpdateControlDto } from '@complianceos/shared';
import { ControlsService } from './controls.service';

@ApiTags('controls')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('controls')
export class ControlsController {
  constructor(private readonly controlsService: ControlsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateControlDto) {
    return this.controlsService.create(user.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.controlsService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.controlsService.findOne(user.tenantId, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateControlDto,
  ) {
    return this.controlsService.update(user.tenantId, id, dto);
  }
}
