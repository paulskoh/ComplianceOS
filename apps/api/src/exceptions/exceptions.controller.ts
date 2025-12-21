import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('exceptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exceptions')
export class ExceptionsController {
  @Get()
  findAll() {
    return { data: [] };
  }
}
