#!/usr/bin/env tsx
/**
 * Content Pack Validation Script
 *
 * Validates compliance content pack YAML files for:
 * - Schema validity
 * - Referential integrity
 * - Code uniqueness
 * - Required fields
 *
 * Usage: tsx scripts/validate.ts packs/pipa-v1-kr.yaml
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Types matching the content pack structure
interface ContentPack {
  metadata: {
    code: string;
    version: string;
    name: string;
    domain: string;
    jurisdiction: string;
    language: string;
    effectiveDate: string;
    maintainer: string;
  };
  obligations: Obligation[];
  controls: Control[];
  evidenceRequirements: EvidenceRequirement[];
}

interface Obligation {
  code: string;
  name: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  references: Array<{
    law: string;
    article: string;
    url?: string;
  }>;
  applicableIf: string;
}

interface Control {
  code: string;
  name: string;
  description: string;
  obligationCodes: string[];
  implementationGuidance: string;
}

interface EvidenceRequirement {
  code: string;
  controlCode: string;
  name: string;
  description: string;
  acceptanceCriteria: string[];
  freshnessWindowDays: number;
  required: boolean;
  automationHint?: string;
}

interface ValidationError {
  type: 'ERROR' | 'WARNING';
  message: string;
  location?: string;
}

class ContentValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  validate(filePath: string): boolean {
    console.log(`🔍 Validating: ${filePath}\n`);

    // 1. Load and parse YAML
    let content: ContentPack;
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      content = yaml.parse(fileContent);
    } catch (error) {
      this.addError(`Failed to parse YAML: ${error.message}`);
      return false;
    }

    // 2. Validate metadata
    this.validateMetadata(content.metadata);

    // 3. Validate obligations
    this.validateObligations(content.obligations);

    // 4. Validate controls
    this.validateControls(content.controls, content.obligations);

    // 5. Validate evidence requirements
    this.validateEvidenceRequirements(
      content.evidenceRequirements,
      content.controls,
    );

    // 6. Print results
    this.printResults();

    return this.errors.length === 0;
  }

  private validateMetadata(metadata: any) {
    const required = [
      'code',
      'version',
      'name',
      'domain',
      'jurisdiction',
      'language',
      'effectiveDate',
      'maintainer',
    ];

    for (const field of required) {
      if (!metadata[field]) {
        this.addError(`Missing required metadata field: ${field}`);
      }
    }

    // Validate domain enum
    const validDomains = ['PRIVACY', 'SECURITY', 'FINANCIAL', 'INDUSTRY'];
    if (metadata.domain && !validDomains.includes(metadata.domain)) {
      this.addError(
        `Invalid domain: ${metadata.domain}. Must be one of: ${validDomains.join(', ')}`,
      );
    }

    // Validate version format
    if (metadata.version && !/^\d+\.\d+\.\d+$/.test(metadata.version)) {
      this.addWarning(
        `Version format should be semver (e.g., 1.0.0): ${metadata.version}`,
      );
    }
  }

  private validateObligations(obligations: Obligation[]) {
    if (!obligations || obligations.length === 0) {
      this.addError('No obligations defined');
      return;
    }

    const codes = new Set<string>();
    const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    for (const [index, obligation] of obligations.entries()) {
      const location = `obligations[${index}]`;

      // Required fields
      if (!obligation.code) {
        this.addError(`Missing code`, location);
        continue;
      }

      // Duplicate codes
      if (codes.has(obligation.code)) {
        this.addError(`Duplicate obligation code: ${obligation.code}`, location);
      }
      codes.add(obligation.code);

      // Validate fields
      if (!obligation.name) {
        this.addError(`Missing name for ${obligation.code}`, location);
      }
      if (!obligation.description) {
        this.addError(`Missing description for ${obligation.code}`, location);
      }
      if (!obligation.severity) {
        this.addError(`Missing severity for ${obligation.code}`, location);
      } else if (!validSeverities.includes(obligation.severity)) {
        this.addError(
          `Invalid severity for ${obligation.code}: ${obligation.severity}`,
          location,
        );
      }

      // Validate references
      if (!obligation.references || obligation.references.length === 0) {
        this.addWarning(`No legal references for ${obligation.code}`, location);
      } else {
        for (const ref of obligation.references) {
          // References can be law (with article) or standard (with optional article)
          const hasLaw = ref.law && ref.article;
          const hasStandard = ref.standard;

          if (!hasLaw && !hasStandard) {
            this.addError(
              `Incomplete reference for ${obligation.code}: needs either (law + article) or (standard)`,
              location,
            );
          }
        }
      }
    }

    console.log(`✓ Validated ${obligations.length} obligations`);
  }

  private validateControls(controls: Control[], obligations: Obligation[]) {
    if (!controls || controls.length === 0) {
      this.addError('No controls defined');
      return;
    }

    const codes = new Set<string>();
    const obligationCodes = new Set(obligations.map((o) => o.code));

    for (const [index, control] of controls.entries()) {
      const location = `controls[${index}]`;

      // Required fields
      if (!control.code) {
        this.addError(`Missing code`, location);
        continue;
      }

      // Duplicate codes
      if (codes.has(control.code)) {
        this.addError(`Duplicate control code: ${control.code}`, location);
      }
      codes.add(control.code);

      // Validate fields
      if (!control.name) {
        this.addError(`Missing name for ${control.code}`, location);
      }
      if (!control.description) {
        this.addError(`Missing description for ${control.code}`, location);
      }
      if (!control.implementationGuidance) {
        this.addWarning(
          `Missing implementation guidance for ${control.code}`,
          location,
        );
      }

      // Validate obligation references
      if (!control.obligationCodes || control.obligationCodes.length === 0) {
        this.addError(
          `Control ${control.code} has no obligation mappings`,
          location,
        );
      } else {
        for (const obligationCode of control.obligationCodes) {
          if (!obligationCodes.has(obligationCode)) {
            this.addError(
              `Control ${control.code} references non-existent obligation: ${obligationCode}`,
              location,
            );
          }
        }
      }
    }

    console.log(`✓ Validated ${controls.length} controls`);
  }

  private validateEvidenceRequirements(
    evidenceReqs: EvidenceRequirement[],
    controls: Control[],
  ) {
    if (!evidenceReqs || evidenceReqs.length === 0) {
      this.addError('No evidence requirements defined');
      return;
    }

    const codes = new Set<string>();
    const controlCodes = new Set(controls.map((c) => c.code));

    for (const [index, evidenceReq] of evidenceReqs.entries()) {
      const location = `evidenceRequirements[${index}]`;

      // Required fields
      if (!evidenceReq.code) {
        this.addError(`Missing code`, location);
        continue;
      }

      // Duplicate codes
      if (codes.has(evidenceReq.code)) {
        this.addError(
          `Duplicate evidence requirement code: ${evidenceReq.code}`,
          location,
        );
      }
      codes.add(evidenceReq.code);

      // Validate fields
      if (!evidenceReq.name) {
        this.addError(`Missing name for ${evidenceReq.code}`, location);
      }
      if (!evidenceReq.description) {
        this.addError(`Missing description for ${evidenceReq.code}`, location);
      }

      // Validate control reference
      if (!evidenceReq.controlCode) {
        this.addError(
          `Evidence requirement ${evidenceReq.code} has no control mapping`,
          location,
        );
      } else if (!controlCodes.has(evidenceReq.controlCode)) {
        this.addError(
          `Evidence requirement ${evidenceReq.code} references non-existent control: ${evidenceReq.controlCode}`,
          location,
        );
      }

      // Validate acceptance criteria
      if (
        !evidenceReq.acceptanceCriteria ||
        evidenceReq.acceptanceCriteria.length === 0
      ) {
        this.addWarning(
          `No acceptance criteria for ${evidenceReq.code}`,
          location,
        );
      }

      // Validate freshness window
      if (evidenceReq.freshnessWindowDays === undefined) {
        this.addError(
          `Missing freshnessWindowDays for ${evidenceReq.code}`,
          location,
        );
      } else if (
        evidenceReq.freshnessWindowDays < 1 ||
        evidenceReq.freshnessWindowDays > 3650
      ) {
        this.addWarning(
          `Unusual freshness window for ${evidenceReq.code}: ${evidenceReq.freshnessWindowDays} days`,
          location,
        );
      }

      // Validate required flag
      if (evidenceReq.required === undefined) {
        this.addWarning(
          `Missing 'required' flag for ${evidenceReq.code}`,
          location,
        );
      }
    }

    console.log(`✓ Validated ${evidenceReqs.length} evidence requirements`);
  }

  private addError(message: string, location?: string) {
    this.errors.push({
      type: 'ERROR',
      message,
      location,
    });
  }

  private addWarning(message: string, location?: string) {
    this.warnings.push({
      type: 'WARNING',
      message,
      location,
    });
  }

  private printResults() {
    console.log('\n' + '='.repeat(60));

    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:\n');
      for (const error of this.errors) {
        const loc = error.location ? ` [${error.location}]` : '';
        console.log(`  • ${error.message}${loc}`);
      }
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:\n');
      for (const warning of this.warnings) {
        const loc = warning.location ? ` [${warning.location}]` : '';
        console.log(`  • ${warning.message}${loc}`);
      }
    }

    console.log('\n' + '='.repeat(60));

    if (this.errors.length === 0) {
      console.log('\n✅ Validation PASSED\n');
    } else {
      console.log(
        `\n❌ Validation FAILED: ${this.errors.length} error(s), ${this.warnings.length} warning(s)\n`,
      );
    }
  }
}

// Main execution
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: tsx scripts/validate.ts <yaml-file>');
    console.error('Example: tsx scripts/validate.ts packs/pipa-v1-kr.yaml');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const validator = new ContentValidator();
  const success = validator.validate(filePath);

  process.exit(success ? 0 : 1);
}

main();
