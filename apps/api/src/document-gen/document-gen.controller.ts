import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DocumentGenService } from './document-gen.service';
import { DocumentTemplateType, GeneratedDocStatus } from '@prisma/client';

class GenerateDocumentDto {
  templateType: DocumentTemplateType;
  customVariables?: Record<string, any>;
  evidenceRequirementId?: string;
}

@ApiTags('document-generation')
@Controller('api/v2/documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentGenController {
  constructor(private readonly docGenService: DocumentGenService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Get available document templates' })
  async getTemplates(@Request() req) {
    return this.docGenService.getAvailableTemplates(req.user.tenantId);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new compliance document' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        templateType: {
          type: 'string',
          enum: Object.values(DocumentTemplateType),
          description: 'Type of document template to use',
        },
        customVariables: {
          type: 'object',
          description: 'Custom variables to override company profile values',
        },
        evidenceRequirementId: {
          type: 'string',
          description: 'Optional evidence requirement to link the document to',
        },
      },
      required: ['templateType'],
    },
  })
  async generateDocument(
    @Request() req,
    @Body() dto: GenerateDocumentDto,
  ) {
    return this.docGenService.generateDocument(
      req.user.tenantId,
      req.user.userId,
      dto,
    );
  }

  @Get('generated')
  @ApiOperation({ summary: 'List generated documents' })
  @ApiQuery({ name: 'status', required: false, enum: GeneratedDocStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listGeneratedDocuments(
    @Request() req,
    @Query('status') status?: GeneratedDocStatus,
    @Query('limit') limit?: string,
  ) {
    return this.docGenService.listGeneratedDocuments(req.user.tenantId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('generated/:id')
  @ApiOperation({ summary: 'Get a generated document by ID' })
  @ApiParam({ name: 'id', description: 'Generated document ID' })
  async getGeneratedDocument(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.docGenService.getGeneratedDocument(req.user.tenantId, id);
  }

  @Post('generated/:id/approve')
  @ApiOperation({ summary: 'Approve a generated document and create artifact' })
  @ApiParam({ name: 'id', description: 'Generated document ID' })
  async approveDocument(
    @Request() req,
    @Param('id') id: string,
  ) {
    return this.docGenService.approveDocument(
      req.user.tenantId,
      id,
      req.user.userId,
    );
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all document template types' })
  getDocumentTypes() {
    return {
      templateTypes: Object.values(DocumentTemplateType).map(type => ({
        value: type,
        label: this.getTemplateTypeLabel(type),
        labelKo: this.getTemplateTypeLabelKo(type),
      })),
    };
  }

  private getTemplateTypeLabel(type: DocumentTemplateType): string {
    const labels: Record<DocumentTemplateType, string> = {
      PRIVACY_POLICY: 'Privacy Policy',
      INTERNAL_MANAGEMENT_PLAN: 'Internal Management Plan',
      PRIVACY_TRAINING_PLAN: 'Privacy Training Plan',
      VENDOR_AGREEMENT: 'Vendor Processing Agreement',
      PRIVACY_IMPACT_ASSESSMENT: 'Privacy Impact Assessment',
      EMPLOYMENT_CONTRACT: 'Employment Contract',
      WORK_RULES: 'Work Rules',
      ACCESS_CONTROL_POLICY: 'Access Control Policy',
      INCIDENT_RESPONSE_PLAN: 'Incident Response Plan',
      DATA_RETENTION_POLICY: 'Data Retention Policy',
      CONSENT_FORM: 'Consent Form',
      THIRD_PARTY_PROVISION: 'Third Party Provision Agreement',
      CUSTOM: 'Custom Document',
    };
    return labels[type] || type;
  }

  private getTemplateTypeLabelKo(type: DocumentTemplateType): string {
    const labels: Record<DocumentTemplateType, string> = {
      PRIVACY_POLICY: '개인정보처리방침',
      INTERNAL_MANAGEMENT_PLAN: '내부관리계획',
      PRIVACY_TRAINING_PLAN: '개인정보보호 교육계획',
      VENDOR_AGREEMENT: '개인정보 처리 위탁계약서',
      PRIVACY_IMPACT_ASSESSMENT: '개인정보 영향평가서',
      EMPLOYMENT_CONTRACT: '근로계약서',
      WORK_RULES: '취업규칙',
      ACCESS_CONTROL_POLICY: '접근권한 관리지침',
      INCIDENT_RESPONSE_PLAN: '침해사고 대응계획',
      DATA_RETENTION_POLICY: '개인정보 파기지침',
      CONSENT_FORM: '개인정보 수집·이용 동의서',
      THIRD_PARTY_PROVISION: '제3자 제공 동의서',
      CUSTOM: '사용자 정의 문서',
    };
    return labels[type] || type;
  }
}
