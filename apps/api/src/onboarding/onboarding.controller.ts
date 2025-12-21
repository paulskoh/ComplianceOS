import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CompanyProfileDto } from '@complianceos/shared';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private onboarding: OnboardingService) {}

  @Post('complete')
  async completeOnboarding(
    @CurrentUser() user: any,
    @Body() profileDto: CompanyProfileDto,
  ) {
    return this.onboarding.completeOnboarding(
      user.tenantId,
      user.id,
      profileDto,
    );
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return this.onboarding.getCompanyProfile(user.tenantId);
  }
}
