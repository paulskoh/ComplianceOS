import { IsNotEmpty, IsString } from 'class-validator';

export class EvaluateControlDto {
  @IsNotEmpty()
  @IsString()
  companyId: string;

  @IsNotEmpty()
  @IsString()
  controlId: string;
}

export class EvaluateObligationDto {
  @IsNotEmpty()
  @IsString()
  companyId: string;

  @IsNotEmpty()
  @IsString()
  obligationId: string;
}

export class CalculateReadinessDto {
  @IsNotEmpty()
  @IsString()
  companyId: string;
}

export class GenerateRisksDto {
  @IsNotEmpty()
  @IsString()
  companyId: string;
}

export class RunEvaluationDto {
  @IsNotEmpty()
  @IsString()
  companyId: string;
}
