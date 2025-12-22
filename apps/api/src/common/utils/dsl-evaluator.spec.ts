import {
  evaluateApplicabilityRule,
  evaluateApplicabilityRules,
  validateApplicabilityRule,
} from './dsl-evaluator';
import {
  ApplicabilityRule,
  CompanyProfile,
} from '../types/company-profile.types';

describe('DSL Evaluator', () => {
  describe('evaluateApplicabilityRule', () => {
    it('should return true when rule is null or undefined', () => {
      const profile: CompanyProfile = { headcount_band: '10-29' };

      expect(evaluateApplicabilityRule(null, profile)).toBe(true);
      expect(evaluateApplicabilityRule(undefined, profile)).toBe(true);
    });

    describe('"in" conditions', () => {
      it('should match when field value is in the array', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'headcount_band',
              in: ['1-9', '10-29', '30-99'],
            },
          ],
        };

        const profile: CompanyProfile = { headcount_band: '10-29' };
        expect(evaluateApplicabilityRule(rule, profile)).toBe(true);
      });

      it('should not match when field value is not in the array', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'headcount_band',
              in: ['100-299', '300+'],
            },
          ],
        };

        const profile: CompanyProfile = { headcount_band: '10-29' };
        expect(evaluateApplicabilityRule(rule, profile)).toBe(false);
      });

      it('should handle nested field paths', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'data_types.customer_pii',
              eq: true,
            },
          ],
        };

        const profile: CompanyProfile = {
          data_types: { customer_pii: true },
        };
        expect(evaluateApplicabilityRule(rule, profile)).toBe(true);
      });
    });

    describe('"eq" conditions', () => {
      it('should match when field value equals boolean', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'uses_vendors_for_data',
              eq: true,
            },
          ],
        };

        const profile: CompanyProfile = { uses_vendors_for_data: true };
        expect(evaluateApplicabilityRule(rule, profile)).toBe(true);
      });

      it('should match when field value equals string', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'work_style',
              eq: 'hybrid',
            },
          ],
        };

        const profile: CompanyProfile = { work_style: 'hybrid' };
        expect(evaluateApplicabilityRule(rule, profile)).toBe(true);
      });

      it('should not match when field value does not equal', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'uses_vendors_for_data',
              eq: true,
            },
          ],
        };

        const profile: CompanyProfile = { uses_vendors_for_data: false };
        expect(evaluateApplicabilityRule(rule, profile)).toBe(false);
      });
    });

    describe('"all" logic (AND)', () => {
      it('should match when all conditions are true', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'headcount_band',
              in: ['10-29', '30-99'],
            },
            {
              field: 'uses_vendors_for_data',
              eq: true,
            },
          ],
        };

        const profile: CompanyProfile = {
          headcount_band: '10-29',
          uses_vendors_for_data: true,
        };
        expect(evaluateApplicabilityRule(rule, profile)).toBe(true);
      });

      it('should not match when any condition is false', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'headcount_band',
              in: ['10-29', '30-99'],
            },
            {
              field: 'uses_vendors_for_data',
              eq: true,
            },
          ],
        };

        const profile: CompanyProfile = {
          headcount_band: '10-29',
          uses_vendors_for_data: false, // This makes the rule fail
        };
        expect(evaluateApplicabilityRule(rule, profile)).toBe(false);
      });
    });

    describe('"any" logic (OR)', () => {
      it('should match when at least one condition is true', () => {
        const rule: ApplicabilityRule = {
          any: [
            {
              field: 'data_types.customer_pii',
              eq: true,
            },
            {
              field: 'data_types.employee_pii',
              eq: true,
            },
          ],
        };

        const profile: CompanyProfile = {
          data_types: {
            customer_pii: true,
            employee_pii: false,
          },
        };
        expect(evaluateApplicabilityRule(rule, profile)).toBe(true);
      });

      it('should not match when all conditions are false', () => {
        const rule: ApplicabilityRule = {
          any: [
            {
              field: 'data_types.customer_pii',
              eq: true,
            },
            {
              field: 'data_types.employee_pii',
              eq: true,
            },
          ],
        };

        const profile: CompanyProfile = {
          data_types: {
            customer_pii: false,
            employee_pii: false,
          },
        };
        expect(evaluateApplicabilityRule(rule, profile)).toBe(false);
      });
    });

    describe('combined "all" and "any" logic', () => {
      it('should match when both all and any conditions are satisfied', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'headcount_band',
              in: ['10-29', '30-99', '100-299', '300+'],
            },
          ],
          any: [
            {
              field: 'data_types.customer_pii',
              eq: true,
            },
            {
              field: 'data_types.employee_pii',
              eq: true,
            },
          ],
        };

        const profile: CompanyProfile = {
          headcount_band: '10-29',
          data_types: {
            customer_pii: true,
          },
        };
        expect(evaluateApplicabilityRule(rule, profile)).toBe(true);
      });

      it('should not match when all conditions pass but any conditions fail', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'headcount_band',
              in: ['10-29', '30-99'],
            },
          ],
          any: [
            {
              field: 'data_types.customer_pii',
              eq: true,
            },
            {
              field: 'data_types.employee_pii',
              eq: true,
            },
          ],
        };

        const profile: CompanyProfile = {
          headcount_band: '10-29',
          data_types: {
            customer_pii: false,
            employee_pii: false,
          },
        };
        expect(evaluateApplicabilityRule(rule, profile)).toBe(false);
      });
    });

    describe('missing or undefined fields', () => {
      it('should return false when field is missing', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'headcount_band',
              in: ['10-29'],
            },
          ],
        };

        const profile: CompanyProfile = {}; // No headcount_band
        expect(evaluateApplicabilityRule(rule, profile)).toBe(false);
      });

      it('should return false when nested field is missing', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'data_types.customer_pii',
              eq: true,
            },
          ],
        };

        const profile: CompanyProfile = {}; // No data_types
        expect(evaluateApplicabilityRule(rule, profile)).toBe(false);
      });
    });

    describe('real-world examples from YAML', () => {
      it('should evaluate OB_LSA_WORKING_TIME_RECORDS applicability', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'headcount_band',
              in: ['1-9', '10-29', '30-99', '100-299', '300+'],
            },
          ],
        };

        // Applies to all company sizes
        expect(
          evaluateApplicabilityRule(rule, { headcount_band: '1-9' }),
        ).toBe(true);
        expect(
          evaluateApplicabilityRule(rule, { headcount_band: '300+' }),
        ).toBe(true);
      });

      it('should evaluate OB_PIPA_PRIVACY_POLICY applicability', () => {
        const rule: ApplicabilityRule = {
          any: [
            {
              field: 'data_types.customer_pii',
              eq: true,
            },
            {
              field: 'data_types.employee_pii',
              eq: true,
            },
          ],
        };

        // Applies if processing any PII
        expect(
          evaluateApplicabilityRule(rule, {
            data_types: { customer_pii: true },
          }),
        ).toBe(true);

        expect(
          evaluateApplicabilityRule(rule, {
            data_types: { employee_pii: true },
          }),
        ).toBe(true);

        // Does not apply if not processing PII
        expect(
          evaluateApplicabilityRule(rule, {
            data_types: { customer_pii: false, employee_pii: false },
          }),
        ).toBe(false);
      });

      it('should evaluate OB_PIPA_VENDOR_MGMT applicability', () => {
        const rule: ApplicabilityRule = {
          all: [
            {
              field: 'uses_vendors_for_data',
              eq: true,
            },
          ],
          any: [
            {
              field: 'data_types.customer_pii',
              eq: true,
            },
            {
              field: 'data_types.employee_pii',
              eq: true,
            },
          ],
        };

        // Applies if uses vendors AND processes PII
        expect(
          evaluateApplicabilityRule(rule, {
            uses_vendors_for_data: true,
            data_types: { customer_pii: true },
          }),
        ).toBe(true);

        // Does not apply if uses vendors but no PII
        expect(
          evaluateApplicabilityRule(rule, {
            uses_vendors_for_data: true,
            data_types: { customer_pii: false, employee_pii: false },
          }),
        ).toBe(false);

        // Does not apply if processes PII but no vendors
        expect(
          evaluateApplicabilityRule(rule, {
            uses_vendors_for_data: false,
            data_types: { customer_pii: true },
          }),
        ).toBe(false);
      });
    });
  });

  describe('evaluateApplicabilityRules', () => {
    it('should return applicable obligation codes', () => {
      const rules: Record<string, ApplicabilityRule | null> = {
        OB_1: {
          all: [{ field: 'headcount_band', in: ['10-29', '30-99'] }],
        },
        OB_2: {
          all: [{ field: 'headcount_band', in: ['100-299', '300+'] }],
        },
        OB_3: null, // Applies to all
      };

      const profile: CompanyProfile = { headcount_band: '10-29' };
      const applicable = evaluateApplicabilityRules(rules, profile);

      expect(applicable).toContain('OB_1');
      expect(applicable).not.toContain('OB_2');
      expect(applicable).toContain('OB_3');
    });

    it('should handle evaluation errors gracefully', () => {
      const rules: Record<string, ApplicabilityRule | null> = {
        OB_GOOD: {
          all: [{ field: 'headcount_band', in: ['10-29'] }],
        },
        OB_BAD: {
          all: [{ field: 'invalid_field', in: null as any }], // Invalid rule
        },
      };

      const profile: CompanyProfile = { headcount_band: '10-29' };

      // Should not throw, should skip bad rule
      expect(() => evaluateApplicabilityRules(rules, profile)).not.toThrow();

      const applicable = evaluateApplicabilityRules(rules, profile);
      expect(applicable).toContain('OB_GOOD');
      // OB_BAD should be skipped due to error
    });
  });

  describe('validateApplicabilityRule', () => {
    it('should not throw for valid rules', () => {
      const rule: ApplicabilityRule = {
        all: [{ field: 'headcount_band', in: ['10-29'] }],
      };

      expect(() => validateApplicabilityRule(rule)).not.toThrow();
    });

    it('should throw when rule has neither all nor any', () => {
      const rule: ApplicabilityRule = {} as any;

      expect(() => validateApplicabilityRule(rule)).toThrow(
        "Applicability rule must have either 'all' or 'any' property",
      );
    });

    it('should throw when condition has neither in nor eq', () => {
      const rule: ApplicabilityRule = {
        all: [{ field: 'headcount_band' } as any],
      };

      expect(() => validateApplicabilityRule(rule)).toThrow();
    });

    it('should throw when condition has both in and eq', () => {
      const rule: ApplicabilityRule = {
        all: [{ field: 'headcount_band', in: ['10-29'], eq: true } as any],
      };

      expect(() => validateApplicabilityRule(rule)).toThrow();
    });

    it('should throw when in is not an array', () => {
      const rule: ApplicabilityRule = {
        all: [{ field: 'headcount_band', in: '10-29' as any }],
      };

      expect(() => validateApplicabilityRule(rule)).toThrow();
    });
  });
});
