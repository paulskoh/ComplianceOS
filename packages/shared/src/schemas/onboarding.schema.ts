import { z } from 'zod';

export const CompanyProfileSchema = z.object({
  companyName: z.string().min(1),
  industry: z.enum([
    'TECHNOLOGY',
    'FINANCE',
    'HEALTHCARE',
    'RETAIL',
    'MANUFACTURING',
    'EDUCATION',
    'OTHER',
  ]),
  employeeCount: z.number().int().positive(),
  hasRemoteWork: z.boolean(),
  hasOvertimeWork: z.boolean(),
  hasContractors: z.boolean(),
  hasVendors: z.boolean(),
  dataTypes: z.array(
    z.enum([
      'EMPLOYEE_DATA',
      'CUSTOMER_DATA',
      'RESIDENT_NUMBERS',
      'HEALTH_DATA',
      'FINANCIAL_DATA',
      'BIOMETRIC_DATA',
      'LOCATION_DATA',
      'PAYMENT_DATA',
    ]),
  ),
  hasInternationalTransfer: z.boolean(),
  annualRevenue: z.enum(['UNDER_1B', 'ONE_B_TO_10B', 'TEN_B_TO_100B', 'OVER_100B']).optional(),
});

export type CompanyProfileDto = z.infer<typeof CompanyProfileSchema>;

export const OnboardingResponseSchema = z.object({
  activatedObligations: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      titleKo: z.string(),
      domain: z.enum(['LABOR', 'PRIVACY', 'FINANCE', 'SECURITY', 'OTHER']),
      reason: z.string(),
    }),
  ),
  controlsCreated: z.number(),
  recommendedIntegrations: z.array(z.string()),
  nextSteps: z.array(z.string()),
});

export type OnboardingResponseDto = z.infer<typeof OnboardingResponseSchema>;
