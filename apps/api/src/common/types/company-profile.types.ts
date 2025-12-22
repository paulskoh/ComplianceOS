/**
 * Company profile types for applicability evaluation
 */

export type HeadcountBand = '1-9' | '10-29' | '30-99' | '100-299' | '300+';

export type WorkStyle = 'office' | 'remote' | 'hybrid';

export interface DataTypes {
  customer_pii?: boolean;
  employee_pii?: boolean;
  resident_id?: boolean;
  health_data?: boolean;
  payment_data?: boolean;
}

export interface CompanyProfile {
  headcount_band?: HeadcountBand;
  industry?: string;
  work_style?: WorkStyle;
  data_types?: DataTypes;
  uses_vendors_for_data?: boolean;
}

/**
 * Applicability Rule DSL Types
 */

export interface FieldCondition {
  field: string;
  in?: string[];
  eq?: boolean | string;
}

export interface ApplicabilityRule {
  all?: FieldCondition[];
  any?: FieldCondition[];
}

/**
 * Helper to get nested field value from company profile
 */
export function getFieldValue(profile: CompanyProfile, fieldPath: string): any {
  const parts = fieldPath.split('.');
  let value: any = profile;

  for (const part of parts) {
    if (value === undefined || value === null) {
      return undefined;
    }
    value = value[part];
  }

  return value;
}
