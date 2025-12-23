import { IsString, IsNumber, IsUUID, IsOptional, IsObject, Min } from 'class-validator';

export class ArtifactCreateIntentDto {
  @IsUUID()
  tenantId: string;

  @IsString()
  filename: string;

  @IsString()
  contentType: string;

  @IsNumber()
  @Min(1)
  sizeBytes: number;

  @IsOptional()
  @IsUUID()
  evidenceRequirementId?: string;

  @IsOptional()
  @IsUUID()
  controlId?: string;

  @IsOptional()
  @IsUUID()
  obligationId?: string;

  @IsOptional()
  @IsObject()
  tags?: Record<string, string>;
}

export class ArtifactCreateIntentResponseDto {
  artifactId: string;
  version: number;
  upload: {
    method: 'PUT';
    url: string;
    headers: Record<string, string>;
    expiresAt: Date;
  };
}

export class ArtifactFinalizeDto {
  @IsUUID()
  tenantId: string;

  @IsUUID()
  artifactId: string;

  @IsNumber()
  @Min(1)
  version: number;

  @IsString()
  etag: string;
}
