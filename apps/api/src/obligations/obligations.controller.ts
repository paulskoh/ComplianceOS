import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateObligationDto, UpdateObligationDto } from '@complianceos/shared';
import { ObligationsService } from './obligations.service';

@ApiTags('obligations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('obligations')
export class ObligationsController {
  constructor(private readonly obligationsService: ObligationsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateObligationDto) {
    return this.obligationsService.create(user.tenantId, dto);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.obligationsService.findAll(user.tenantId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.obligationsService.findOne(user.tenantId, id);
  }

  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateObligationDto,
  ) {
    return this.obligationsService.update(user.tenantId, id, dto);
  }
}
