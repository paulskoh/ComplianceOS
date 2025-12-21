import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('training')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('training')
export class TrainingController {
  @Get()
  findAll() {
    return { data: [] };
  }
}
