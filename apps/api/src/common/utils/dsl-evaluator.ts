/**
 * DSL Evaluator for Applicability Rules
 *
 * Evaluates applicability rules using deterministic JSON logic.
 * Supports:
 * - `all` (AND logic)
 * - `any` (OR logic)
 * - `field` with `in` (array membership)
 * - `field` with `eq` (equality check)
 */

import {
  ApplicabilityRule,
  CompanyProfile,
  FieldCondition,
  getFieldValue,
} from '../types/company-profile.types';

/**
 * Evaluate a single field condition against a company profile
 */
function evaluateFieldCondition(
  condition: FieldCondition,
  profile: CompanyProfile,
): boolean {
  const fieldValue = getFieldValue(profile, condition.field);

  // If field value is undefined or null, condition fails
  if (fieldValue === undefined || fieldValue === null) {
    return false;
  }

  // Evaluate 'in' condition (array membership)
  if (condition.in !== undefined) {
    if (!Array.isArray(condition.in)) {
      throw new Error(`'in' condition must be an array for field ${condition.field}`);
    }
    return condition.in.includes(fieldValue);
  }

  // Evaluate 'eq' condition (equality)
  if (condition.eq !== undefined) {
    return fieldValue === condition.eq;
  }

  // No valid condition found
  throw new Error(
    `Field condition must have either 'in' or 'eq' property for field ${condition.field}`,
  );
}

/**
 * Evaluate an applicability rule against a company profile
 *
 * @param rule - The applicability rule to evaluate
 * @param profile - The company profile to check against
 * @returns true if the rule matches the profile, false otherwise
 */
export function evaluateApplicabilityRule(
  rule: ApplicabilityRule | null | undefined,
  profile: CompanyProfile,
): boolean {
  // If no rule is specified, the obligation applies to all companies
  if (!rule) {
    return true;
  }

  // Evaluate 'all' conditions (AND logic)
  if (rule.all !== undefined) {
    if (!Array.isArray(rule.all)) {
      throw new Error("'all' property must be an array");
    }

    // All conditions must be true
    const allMatch = rule.all.every((condition) =>
      evaluateFieldCondition(condition, profile),
    );

    // If there are also 'any' conditions, both must be satisfied
    if (rule.any !== undefined) {
      if (!Array.isArray(rule.any)) {
        throw new Error("'any' property must be an array");
      }
      const anyMatch = rule.any.some((condition) =>
        evaluateFieldCondition(condition, profile),
      );
      return allMatch && anyMatch;
    }

    return allMatch;
  }

  // Evaluate 'any' conditions (OR logic)
  if (rule.any !== undefined) {
    if (!Array.isArray(rule.any)) {
      throw new Error("'any' property must be an array");
    }

    // At least one condition must be true
    return rule.any.some((condition) => evaluateFieldCondition(condition, profile));
  }

  // Empty rule applies to all
  return true;
}

/**
 * Batch evaluate multiple applicability rules
 *
 * @param rules - Map of obligation codes to applicability rules
 * @param profile - The company profile to check against
 * @returns Array of obligation codes that apply to the profile
 */
export function evaluateApplicabilityRules(
  rules: Record<string, ApplicabilityRule | null>,
  profile: CompanyProfile,
): string[] {
  const applicableObligations: string[] = [];

  for (const [obligationCode, rule] of Object.entries(rules)) {
    try {
      if (evaluateApplicabilityRule(rule, profile)) {
        applicableObligations.push(obligationCode);
      }
    } catch (error) {
      // Log error but continue processing other rules
      console.error(
        `Error evaluating applicability rule for ${obligationCode}:`,
        error,
      );
    }
  }

  return applicableObligations;
}

/**
 * Validate that an applicability rule is well-formed
 *
 * @param rule - The applicability rule to validate
 * @throws Error if the rule is invalid
 */
export function validateApplicabilityRule(rule: ApplicabilityRule): void {
  if (!rule) {
    return;
  }

  // Check that at least one of 'all' or 'any' is present
  if (!rule.all && !rule.any) {
    throw new Error("Applicability rule must have either 'all' or 'any' property");
  }

  // Validate 'all' conditions
  if (rule.all !== undefined) {
    if (!Array.isArray(rule.all)) {
      throw new Error("'all' property must be an array");
    }

    for (const condition of rule.all) {
      validateFieldCondition(condition);
    }
  }

  // Validate 'any' conditions
  if (rule.any !== undefined) {
    if (!Array.isArray(rule.any)) {
      throw new Error("'any' property must be an array");
    }

    for (const condition of rule.any) {
      validateFieldCondition(condition);
    }
  }
}

/**
 * Validate a single field condition
 */
function validateFieldCondition(condition: FieldCondition): void {
  if (!condition.field) {
    throw new Error('Field condition must have a "field" property');
  }

  // Check that exactly one of 'in' or 'eq' is present
  const hasIn = condition.in !== undefined;
  const hasEq = condition.eq !== undefined;

  if (!hasIn && !hasEq) {
    throw new Error(
      `Field condition for ${condition.field} must have either 'in' or 'eq' property`,
    );
  }

  if (hasIn && hasEq) {
    throw new Error(
      `Field condition for ${condition.field} cannot have both 'in' and 'eq' properties`,
    );
  }

  // Validate 'in' is an array
  if (hasIn && !Array.isArray(condition.in)) {
    throw new Error(`'in' property for ${condition.field} must be an array`);
  }
}
