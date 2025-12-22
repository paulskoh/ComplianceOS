import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InspectionService } from './inspection.service';

@ApiTags('inspection')
@Controller('inspection')
export class InspectionController {
  constructor(private readonly inspectionService: InspectionService) {}

  /**
   * Get inspection pack with secure time-limited access (no auth required)
   */
  @Get('pack/:token')
  @ApiOperation({ summary: 'Access inspection pack via time-limited token' })
  async getPackByToken(@Param('token') token: string, @Req() req: any) {
    return this.inspectionService.getPackByToken(token, req.ip, req.headers['user-agent']);
  }

  /**
   * Generate time-limited share link for auditors (requires auth)
   */
  @Post('pack/:id/share-link')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate time-limited share link for auditors' })
  async createShareLink(
    @CurrentUser() user: any,
    @Param('id') packId: string,
    @Body() dto: { expiresInDays: number },
  ) {
    return this.inspectionService.createShareLink(
      user.tenantId,
      user.userId,
      packId,
      dto.expiresInDays,
    );
  }
}
