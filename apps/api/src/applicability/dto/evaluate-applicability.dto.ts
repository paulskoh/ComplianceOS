import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum HeadcountBandEnum {
  BAND_1_9 = '1-9',
  BAND_10_29 = '10-29',
  BAND_30_99 = '30-99',
  BAND_100_299 = '100-299',
  BAND_300_PLUS = '300+',
}

export enum WorkStyleEnum {
  OFFICE = 'office',
  REMOTE = 'remote',
  HYBRID = 'hybrid',
}

export class DataTypesDto {
  @ApiPropertyOptional({ description: '고객 개인정보 처리 여부' })
  @IsBoolean()
  @IsOptional()
  customer_pii?: boolean;

  @ApiPropertyOptional({ description: '직원 개인정보 처리 여부' })
  @IsBoolean()
  @IsOptional()
  employee_pii?: boolean;

  @ApiPropertyOptional({ description: '주민등록번호 처리 여부' })
  @IsBoolean()
  @IsOptional()
  resident_id?: boolean;

  @ApiPropertyOptional({ description: '건강 데이터 처리 여부' })
  @IsBoolean()
  @IsOptional()
  health_data?: boolean;

  @ApiPropertyOptional({ description: '결제 데이터 처리 여부' })
  @IsBoolean()
  @IsOptional()
  payment_data?: boolean;
}

export class EvaluateApplicabilityDto {
  @ApiPropertyOptional({
    description: '회사 규모 (인원수 구간)',
    enum: HeadcountBandEnum,
    example: '10-29',
  })
  @IsEnum(HeadcountBandEnum)
  @IsOptional()
  headcount_band?: HeadcountBandEnum;

  @ApiPropertyOptional({
    description: '업종',
    example: 'IT_SOFTWARE',
  })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({
    description: '근무 형태',
    enum: WorkStyleEnum,
    example: 'hybrid',
  })
  @IsEnum(WorkStyleEnum)
  @IsOptional()
  work_style?: WorkStyleEnum;

  @ApiPropertyOptional({
    description: '처리하는 데이터 유형',
    type: DataTypesDto,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => DataTypesDto)
  @IsOptional()
  data_types?: DataTypesDto;

  @ApiPropertyOptional({
    description: '개인정보 처리 위탁 사용 여부',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  uses_vendors_for_data?: boolean;
}
