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

  @Post('apply-pipa')
  async applyPIPAContentPack(@CurrentUser() user: any) {
    return this.onboarding.applyPIPAContentPack(user.tenantId);
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: any) {
    return this.onboarding.getCompanyProfile(user.tenantId);
  }

  @Get('questions')
  async getOnboardingQuestions() {
    return this.onboarding.getOnboardingQuestions();
  }

  @Post('refresh-templates')
  async refreshTemplates(@CurrentUser() user: any) {
    // Re-run template instantiation for existing company profile
    const profile = await this.onboarding.getCompanyProfile(user.tenantId);
    if (!profile) {
      return { error: 'Company profile not found. Please complete onboarding first.' };
    }

    // Convert DB profile back to DTO format
    const profileDto: CompanyProfileDto = {
      companyName: profile.tenant?.name || '',
      industry: profile.industry as any,
      employeeCount: profile.employeeCount || 0,
      hasRemoteWork: profile.hasRemoteWork || false,
      hasOvertimeWork: profile.hasOvertimeWork || false,
      hasContractors: profile.hasContractors || false,
      hasVendors: profile.hasVendors || false,
      dataTypes: (profile.dataTypes || []) as any[],
      hasInternationalTransfer: profile.hasInternationalTransfer || false,
    };

    return this.onboarding.completeOnboarding(
      user.tenantId,
      user.id,
      profileDto,
    );
  }
}
