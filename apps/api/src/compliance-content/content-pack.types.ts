/**
 * Type definitions for compliance content packs
 */

export interface ContentPackMetadata {
  code: string;
  name: string;
  domain: 'PRIVACY' | 'SECURITY' | 'FINANCIAL' | 'INDUSTRY';
  jurisdiction: string;
  language: string;
  effectiveDate: string;
  maintainer: string;
  version: string;
  lastUpdated?: string;
  description?: string;
  targetAudience?: string;
}

export interface ObligationReference {
  law?: string;
  article?: string;
  standard?: string;
  url?: string;
}

export interface Obligation {
  code: string;
  name: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  references: ObligationReference[];
  whyApplicable?: string;
  applicableIf?: string;
}

export interface Control {
  code: string;
  name: string;
  description: string;
  obligationCodes: string[];
  implementationGuidance: string;
}

export interface EvidenceRequirement {
  code: string;
  controlCode: string;
  name: string;
  description: string;
  acceptanceCriteria: string[];
  freshnessWindowDays: number;
  required: boolean;
  automationHint?: string;
}

export interface ContentPack {
  metadata: ContentPackMetadata;
  obligations: Obligation[];
  controls: Control[];
  evidenceRequirements: EvidenceRequirement[];
}
