import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateRiskItemDto, UpdateRiskItemDto } from '@complianceos/shared';
import { RisksService } from './risks.service';

@ApiTags('risks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('risks')
export class RisksController {
  constructor(private readonly risksService: RisksService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateRiskItemDto) {
    return this.risksService.create(user.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.risksService.findAll(user.tenantId);
  }

  @Put(':id')
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateRiskItemDto) {
    return this.risksService.update(user.tenantId, id, dto);
  }
}
