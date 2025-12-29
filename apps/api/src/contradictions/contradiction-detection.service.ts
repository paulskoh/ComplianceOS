import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import {
  isDemoMode,
  extractFactsDeterministic,
  getDemoSeedContradictions,
} from './demo-fact-extractor';

/**
 * Extracted fact from a document
 */
export interface ExtractedFact {
  factType: FactType;
  value: string;
  pageRef?: number;
  excerpt: string;
  confidence: number;
}

/**
 * Types of facts we extract for contradiction detection
 */
export type FactType =
  | 'RETENTION_PERIOD'      // 보관기간
  | 'TRAINING_FREQUENCY'    // 교육주기
  | 'DELETION_METHOD'       // 파기방법
  | 'CONSENT_REQUIREMENT'   // 동의 요건
  | 'THIRD_PARTY_PROVISION' // 제3자 제공
  | 'SECURITY_MEASURE';     // 안전조치

/**
 * Contradiction between two documents
 */
export interface Contradiction {
  id: string;
  factType: FactType;
  factTypeKo: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  docA: {
    artifactId: string;
    name: string;
    value: string;
    excerpt: string;
    pageRef?: number;
  };
  docB: {
    artifactId: string;
    name: string;
    value: string;
    excerpt: string;
    pageRef?: number;
  };
  descriptionKo: string;
  resolutionKo: string;
}

/**
 * CEO Demo: Contradiction Detection Service
 *
 * Detects inconsistencies between compliance documents:
 * - 보관기간: 3년 vs 5년 (개인정보처리방침 vs 위탁계약서)
 * - 교육주기: 반기 vs 연1회 (내부관리계획 vs 교육실시대장)
 * - 파기방법: 즉시삭제 vs 30일 유예 (개인정보처리방침 vs 내부관리계획)
 */
@Injectable()
export class ContradictionDetectionService {
  private readonly logger = new Logger(ContradictionDetectionService.name);
  private readonly openai: OpenAI;

  // Fact type labels in Korean
  private readonly FACT_TYPE_KO: Record<FactType, string> = {
    RETENTION_PERIOD: '보관기간',
    TRAINING_FREQUENCY: '교육주기',
    DELETION_METHOD: '파기방법',
    CONSENT_REQUIREMENT: '동의 요건',
    THIRD_PARTY_PROVISION: '제3자 제공',
    SECURITY_MEASURE: '안전조치',
  };

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Detect contradictions between multiple artifacts
   * CEO Demo: Main entry point
   */
  async detectContradictions(
    tenantId: string,
    artifactIds: string[],
  ): Promise<Contradiction[]> {
    this.logger.log(`Detecting contradictions for ${artifactIds.length} artifacts`);

    // Get all artifacts with their extracted text
    const artifacts = await Promise.all(
      artifactIds.map(id => this.getArtifactWithText(tenantId, id)),
    );

    // Filter out artifacts without text
    const validArtifacts = artifacts.filter(a => a.text && a.text.length > 50);

    if (validArtifacts.length < 2) {
      return [];
    }

    // Extract facts from each document
    const factsPerDocument = await Promise.all(
      validArtifacts.map(a => this.extractFacts(a.id, a.name, a.text)),
    );

    // Compare facts across documents
    const contradictions: Contradiction[] = [];

    for (let i = 0; i < validArtifacts.length; i++) {
      for (let j = i + 1; j < validArtifacts.length; j++) {
        const docAFacts = factsPerDocument[i];
        const docBFacts = factsPerDocument[j];

        const detected = this.compareDocumentFacts(
          validArtifacts[i],
          docAFacts,
          validArtifacts[j],
          docBFacts,
        );

        contradictions.push(...detected);
      }
    }

    this.logger.log(`Detected ${contradictions.length} contradictions`);
    return contradictions;
  }

  /**
   * Detect contradictions for all artifacts linked to an evidence requirement
   */
  async detectContradictionsForRequirement(
    tenantId: string,
    evidenceRequirementId: string,
  ): Promise<Contradiction[]> {
    const links = await this.prisma.artifactEvidenceRequirement.findMany({
      where: { evidenceRequirementId },
      include: { artifact: true },
    });

    const artifactIds = links.map(l => l.artifactId);
    return this.detectContradictions(tenantId, artifactIds);
  }

  /**
   * Get artifact with extracted text
   */
  private async getArtifactWithText(
    tenantId: string,
    artifactId: string,
  ): Promise<{ id: string; name: string; text: string }> {
    const artifact = await this.prisma.artifact.findFirst({
      where: { id: artifactId, tenantId, isDeleted: false },
    });

    if (!artifact) {
      return { id: artifactId, name: 'Unknown', text: '' };
    }

    // Get extracted text from document_extractions table
    const extraction = await this.prisma.$queryRaw<Array<{ extracted_text: string }>>`
      SELECT extracted_text FROM document_extractions
      WHERE artifact_id = ${artifactId}::uuid
      ORDER BY version DESC LIMIT 1
    `;

    return {
      id: artifactId,
      name: artifact.name,
      text: extraction[0]?.extracted_text || '',
    };
  }

  /**
   * Extract facts from document text
   * CEO Demo: Uses deterministic regex extraction in DEMO_MODE
   */
  private async extractFacts(
    artifactId: string,
    name: string,
    text: string,
  ): Promise<ExtractedFact[]> {
    // CEO Demo: Use deterministic extraction in demo mode
    if (isDemoMode()) {
      this.logger.log(`DEMO_MODE: Using deterministic fact extraction for ${name}`);
      return extractFactsDeterministic(artifactId, name, text);
    }

    if (!process.env.OPENAI_API_KEY) {
      return this.heuristicFactExtraction(text);
    }

    try {
      const prompt = `한국어 규정 준수 문서에서 다음 사실(facts)을 추출하세요:

1. 보관기간 (RETENTION_PERIOD): 개인정보 보관 기간 (예: 3년, 5년, 계약 종료 후 1년)
2. 교육주기 (TRAINING_FREQUENCY): 정보보호 교육 주기 (예: 연1회, 반기, 분기)
3. 파기방법 (DELETION_METHOD): 개인정보 파기 방법/시점 (예: 즉시 삭제, 30일 이내, 복구불가 삭제)
4. 동의요건 (CONSENT_REQUIREMENT): 동의 획득 방법/요건
5. 제3자제공 (THIRD_PARTY_PROVISION): 제3자 제공 조건
6. 안전조치 (SECURITY_MEASURE): 기술적/관리적 보호조치

문서 내용:
${text.substring(0, 6000)}

JSON 형식으로 응답:
{
  "facts": [
    {
      "factType": "RETENTION_PERIOD",
      "value": "3년",
      "excerpt": "개인정보는 수집일로부터 3년간 보관합니다",
      "confidence": 0.95
    }
  ]
}

주의사항:
- 명시적으로 언급된 내용만 추출
- 추측하지 마세요
- excerpt는 원문 그대로 인용
- 해당 사실이 없으면 빈 배열 반환`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return [];

      const parsed = JSON.parse(content);
      return (parsed.facts || []).map((f: any) => ({
        factType: f.factType as FactType,
        value: f.value,
        pageRef: f.pageRef,
        excerpt: f.excerpt,
        confidence: f.confidence || 0.8,
      }));
    } catch (error) {
      this.logger.error(`Fact extraction failed for ${artifactId}:`, error);
      return this.heuristicFactExtraction(text);
    }
  }

  /**
   * Heuristic-based fact extraction fallback
   */
  private heuristicFactExtraction(text: string): ExtractedFact[] {
    const facts: ExtractedFact[] = [];

    // Retention period patterns
    const retentionPatterns = [
      /(?:보관\s*기간|보존\s*기간|보유\s*기간)[:\s]*(\d+)\s*년/gi,
      /(\d+)\s*년\s*(?:간\s*)?보관/gi,
      /계약\s*종료\s*후\s*(\d+)\s*년/gi,
    ];

    for (const pattern of retentionPatterns) {
      const match = text.match(pattern);
      if (match) {
        const yearMatch = match[0].match(/(\d+)/);
        if (yearMatch) {
          facts.push({
            factType: 'RETENTION_PERIOD',
            value: `${yearMatch[1]}년`,
            excerpt: match[0],
            confidence: 0.7,
          });
          break;
        }
      }
    }

    // Training frequency patterns
    const trainingPatterns = [
      /(?:교육|연수)[^.]*(?:연\s*)?(\d+)\s*회/gi,
      /(?:반기|분기|연간|월간)[^.]*교육/gi,
    ];

    for (const pattern of trainingPatterns) {
      const match = text.match(pattern);
      if (match) {
        let value = '연1회';
        if (/반기/.test(match[0])) value = '반기';
        else if (/분기/.test(match[0])) value = '분기';
        else if (/월간/.test(match[0])) value = '월1회';

        facts.push({
          factType: 'TRAINING_FREQUENCY',
          value,
          excerpt: match[0],
          confidence: 0.6,
        });
        break;
      }
    }

    // Deletion method patterns
    const deletionPatterns = [
      /(?:파기|삭제)[^.]*(?:즉시|(\d+)\s*일\s*(?:이내|내에)?|복구\s*불가)/gi,
    ];

    for (const pattern of deletionPatterns) {
      const match = text.match(pattern);
      if (match) {
        let value = '즉시 삭제';
        const daysMatch = match[0].match(/(\d+)\s*일/);
        if (daysMatch) {
          value = `${daysMatch[1]}일 이내`;
        }

        facts.push({
          factType: 'DELETION_METHOD',
          value,
          excerpt: match[0],
          confidence: 0.6,
        });
        break;
      }
    }

    return facts;
  }

  /**
   * Compare facts between two documents and find contradictions
   */
  private compareDocumentFacts(
    docA: { id: string; name: string },
    factsA: ExtractedFact[],
    docB: { id: string; name: string },
    factsB: ExtractedFact[],
  ): Contradiction[] {
    const contradictions: Contradiction[] = [];

    for (const factA of factsA) {
      const matchingFact = factsB.find(f => f.factType === factA.factType);
      if (!matchingFact) continue;

      // Check if values contradict
      const contradiction = this.checkContradiction(factA, matchingFact);
      if (contradiction) {
        contradictions.push({
          id: crypto.randomUUID(),
          factType: factA.factType,
          factTypeKo: this.FACT_TYPE_KO[factA.factType],
          severity: contradiction.severity,
          docA: {
            artifactId: docA.id,
            name: docA.name,
            value: factA.value,
            excerpt: factA.excerpt,
            pageRef: factA.pageRef,
          },
          docB: {
            artifactId: docB.id,
            name: docB.name,
            value: matchingFact.value,
            excerpt: matchingFact.excerpt,
            pageRef: matchingFact.pageRef,
          },
          descriptionKo: contradiction.descriptionKo,
          resolutionKo: contradiction.resolutionKo,
        });
      }
    }

    return contradictions;
  }

  /**
   * Check if two facts contradict and determine severity
   */
  private checkContradiction(
    factA: ExtractedFact,
    factB: ExtractedFact,
  ): { severity: 'HIGH' | 'MEDIUM' | 'LOW'; descriptionKo: string; resolutionKo: string } | null {
    // Normalize values for comparison
    const valueA = this.normalizeValue(factA.factType, factA.value);
    const valueB = this.normalizeValue(factB.factType, factB.value);

    if (valueA === valueB) return null;

    // Generate description and resolution based on fact type
    switch (factA.factType) {
      case 'RETENTION_PERIOD':
        return {
          severity: 'HIGH',
          descriptionKo: `보관기간이 일치하지 않습니다: "${factA.value}" vs "${factB.value}"`,
          resolutionKo: '개인정보보호법 제21조에 따라 보관기간을 통일하고, 모든 관련 문서를 수정해야 합니다. 법적 요건 중 더 긴 기간을 적용하는 것이 일반적입니다.',
        };

      case 'TRAINING_FREQUENCY':
        return {
          severity: 'MEDIUM',
          descriptionKo: `교육 주기가 일치하지 않습니다: "${factA.value}" vs "${factB.value}"`,
          resolutionKo: '내부관리계획과 교육실시대장의 교육 주기를 통일하세요. 개인정보보호법 시행령 제30조에 따라 연 1회 이상 교육을 실시해야 합니다.',
        };

      case 'DELETION_METHOD':
        return {
          severity: 'HIGH',
          descriptionKo: `파기 방법/시점이 일치하지 않습니다: "${factA.value}" vs "${factB.value}"`,
          resolutionKo: '개인정보 파기 시점과 방법을 명확히 통일하세요. 정보주체의 권리 보호를 위해 더 엄격한 기준을 적용하는 것이 권장됩니다.',
        };

      case 'CONSENT_REQUIREMENT':
        return {
          severity: 'HIGH',
          descriptionKo: `동의 요건이 일치하지 않습니다: "${factA.value}" vs "${factB.value}"`,
          resolutionKo: '동의 획득 방법과 요건을 모든 문서에서 일관되게 명시하세요.',
        };

      case 'THIRD_PARTY_PROVISION':
        return {
          severity: 'MEDIUM',
          descriptionKo: `제3자 제공 조건이 일치하지 않습니다: "${factA.value}" vs "${factB.value}"`,
          resolutionKo: '제3자 제공 범위와 조건을 명확히 정의하고 관련 문서를 업데이트하세요.',
        };

      case 'SECURITY_MEASURE':
        return {
          severity: 'LOW',
          descriptionKo: `안전조치 기준이 일치하지 않습니다: "${factA.value}" vs "${factB.value}"`,
          resolutionKo: '기술적/관리적 보호조치 기준을 통일하세요.',
        };

      default:
        return null;
    }
  }

  /**
   * Normalize values for comparison
   */
  private normalizeValue(factType: FactType, value: string): string {
    const normalized = value.toLowerCase().replace(/\s+/g, '');

    switch (factType) {
      case 'RETENTION_PERIOD':
        // Extract numeric years
        const yearsMatch = value.match(/(\d+)/);
        return yearsMatch ? `${yearsMatch[1]}년` : normalized;

      case 'TRAINING_FREQUENCY':
        if (/반기/.test(value)) return '반기';
        if (/분기/.test(value)) return '분기';
        if (/월/.test(value)) return '월1회';
        const timesMatch = value.match(/(\d+)\s*회/);
        return timesMatch ? `연${timesMatch[1]}회` : normalized;

      case 'DELETION_METHOD':
        if (/즉시/.test(value)) return '즉시';
        const daysMatch = value.match(/(\d+)\s*일/);
        return daysMatch ? `${daysMatch[1]}일` : normalized;

      default:
        return normalized;
    }
  }

  /**
   * Get all detected contradictions for a tenant
   * CEO Demo: Returns seeded contradictions in demo mode for consistent demo
   */
  async getContradictionsForTenant(tenantId: string): Promise<Contradiction[]> {
    // CEO Demo: Return seeded contradictions for predictable demo
    const demoContradictions = getDemoSeedContradictions();
    if (demoContradictions.length > 0) {
      this.logger.log('DEMO_MODE: Returning seeded contradictions');
      return demoContradictions.map(c => ({
        ...c,
        docA: { ...c.docA, artifactId: 'demo-artifact-1' },
        docB: { ...c.docB, artifactId: 'demo-artifact-2' },
      }));
    }

    // Get all artifacts for this tenant
    const artifacts = await this.prisma.artifact.findMany({
      where: { tenantId, isDeleted: false, status: { in: ['VERIFIED', 'FLAGGED'] } },
      select: { id: true },
      take: 50,
    });

    if (artifacts.length < 2) return [];

    return this.detectContradictions(
      tenantId,
      artifacts.map(a => a.id),
    );
  }
}
