/**
 * Demo Fact Extractor
 * CEO Demo: Deterministic regex-based fact extraction
 * Bypasses OpenAI for reproducible demo results
 */

import { ExtractedFact, FactType } from './contradiction-detection.service';

/**
 * Demo mode configuration
 */
export const isDemoMode = (): boolean => {
  return process.env.DEMO_MODE === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
};

/**
 * Deterministic fact extraction using regex patterns
 * CEO Demo: Consistent results across multiple runs
 */
export function extractFactsDeterministic(
  artifactId: string,
  name: string,
  text: string,
): ExtractedFact[] {
  const facts: ExtractedFact[] = [];

  // ============================================
  // 보관기간 (RETENTION_PERIOD) Patterns
  // ============================================
  const retentionPatterns = [
    // "보관기간: 3년" style
    {
      regex: /(?:보관\s*기간|보존\s*기간|보유\s*기간)[:\s는]*(\d+)\s*년/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: `${match[1]}년`,
        excerpt: match[0],
      }),
    },
    // "3년간 보관" style
    {
      regex: /(\d+)\s*년\s*(?:간\s*)?(?:보관|보존|보유)/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: `${match[1]}년`,
        excerpt: match[0],
      }),
    },
    // "계약 종료 후 1년" style
    {
      regex: /계약\s*종료\s*후\s*(\d+)\s*년/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: `계약종료 후 ${match[1]}년`,
        excerpt: match[0],
      }),
    },
    // "5년 이상" or "최소 5년"
    {
      regex: /(?:최소|이상)\s*(\d+)\s*년/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: `${match[1]}년 이상`,
        excerpt: match[0],
      }),
    },
  ];

  for (const pattern of retentionPatterns) {
    const matches = [...text.matchAll(pattern.regex)];
    for (const match of matches) {
      const extracted = pattern.extractor(match);
      // Find the location in text for page estimation
      const location = findLocationLabel(text, match.index || 0);

      facts.push({
        factType: 'RETENTION_PERIOD',
        value: extracted.value,
        excerpt: extracted.excerpt,
        confidence: 0.9,
        pageRef: location.pageRef,
      });
      break; // Only take first match for determinism
    }
    if (facts.some(f => f.factType === 'RETENTION_PERIOD')) break;
  }

  // ============================================
  // 교육주기 (TRAINING_FREQUENCY) Patterns
  // ============================================
  const trainingPatterns = [
    // "연 1회" or "년 1회"
    {
      regex: /(?:연|년)\s*(\d+)\s*회/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: `연 ${match[1]}회`,
        excerpt: match[0],
      }),
    },
    // "반기별" or "반기 1회"
    {
      regex: /반기\s*(?:별|마다|\d*\s*회)?/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: '반기별',
        excerpt: match[0],
      }),
    },
    // "분기별" or "분기 1회"
    {
      regex: /분기\s*(?:별|마다|\d*\s*회)?/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: '분기별',
        excerpt: match[0],
      }),
    },
    // "월 1회" or "매월"
    {
      regex: /(?:월\s*\d+\s*회|매월)/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: '매월',
        excerpt: match[0],
      }),
    },
    // Context around "교육" to find frequency
    {
      regex: /(정기|정보보호|개인정보)?(?:\s*)교육.{0,20}(연\s*\d+회|반기|분기|매월)/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: match[2] || '연 1회',
        excerpt: match[0],
      }),
    },
  ];

  for (const pattern of trainingPatterns) {
    const matches = [...text.matchAll(pattern.regex)];
    for (const match of matches) {
      const extracted = pattern.extractor(match);
      const location = findLocationLabel(text, match.index || 0);

      facts.push({
        factType: 'TRAINING_FREQUENCY',
        value: extracted.value,
        excerpt: extracted.excerpt,
        confidence: 0.85,
        pageRef: location.pageRef,
      });
      break;
    }
    if (facts.some(f => f.factType === 'TRAINING_FREQUENCY')) break;
  }

  // ============================================
  // 파기방법 (DELETION_METHOD) Patterns
  // ============================================
  const deletionPatterns = [
    // "즉시 삭제" or "즉시 파기"
    {
      regex: /즉시\s*(?:삭제|파기)/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: '즉시 삭제',
        excerpt: match[0],
      }),
    },
    // "30일 이내" or "N일 내"
    {
      regex: /(\d+)\s*일\s*(?:이내|내에|내)/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: `${match[1]}일 이내`,
        excerpt: match[0],
      }),
    },
    // "복구 불가능" deletion
    {
      regex: /복구\s*불가(?:능)?(?:\s*삭제)?/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: '복구 불가능 삭제',
        excerpt: match[0],
      }),
    },
    // "유예기간" or "유예 후"
    {
      regex: /(\d+)\s*일?\s*유예/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: `${match[1]}일 유예`,
        excerpt: match[0],
      }),
    },
    // Context around "파기"
    {
      regex: /파기.{0,20}(즉시|(?:\d+)\s*일|복구\s*불가)/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: match[1].includes('즉시') ? '즉시' : match[1],
        excerpt: match[0],
      }),
    },
  ];

  for (const pattern of deletionPatterns) {
    const matches = [...text.matchAll(pattern.regex)];
    for (const match of matches) {
      const extracted = pattern.extractor(match);
      const location = findLocationLabel(text, match.index || 0);

      facts.push({
        factType: 'DELETION_METHOD',
        value: extracted.value,
        excerpt: extracted.excerpt,
        confidence: 0.85,
        pageRef: location.pageRef,
      });
      break;
    }
    if (facts.some(f => f.factType === 'DELETION_METHOD')) break;
  }

  // ============================================
  // 동의요건 (CONSENT_REQUIREMENT) Patterns
  // ============================================
  const consentPatterns = [
    {
      regex: /(?:명시적|서면)\s*동의/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: match[0].trim(),
        excerpt: match[0],
      }),
    },
    {
      regex: /동의\s*(?:획득|취득|받)/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: '동의 획득',
        excerpt: match[0],
      }),
    },
    {
      regex: /opt.?(?:in|out)/gi,
      extractor: (match: RegExpMatchArray) => ({
        value: match[0].toUpperCase(),
        excerpt: match[0],
      }),
    },
  ];

  for (const pattern of consentPatterns) {
    const matches = [...text.matchAll(pattern.regex)];
    for (const match of matches) {
      const extracted = pattern.extractor(match);
      const location = findLocationLabel(text, match.index || 0);

      facts.push({
        factType: 'CONSENT_REQUIREMENT',
        value: extracted.value,
        excerpt: extracted.excerpt,
        confidence: 0.7,
        pageRef: location.pageRef,
      });
      break;
    }
    if (facts.some(f => f.factType === 'CONSENT_REQUIREMENT')) break;
  }

  return facts;
}

/**
 * Find location label based on text position
 * Estimates page number from character position
 */
function findLocationLabel(
  text: string,
  position: number,
): { pageRef: number; locationLabel: string } {
  // Estimate page based on ~3000 characters per page
  const CHARS_PER_PAGE = 3000;
  const pageRef = Math.floor(position / CHARS_PER_PAGE) + 1;

  // Try to find section name near position
  const contextStart = Math.max(0, position - 200);
  const contextEnd = Math.min(text.length, position + 100);
  const context = text.slice(contextStart, contextEnd);

  // Look for section headers
  const sectionMatch = context.match(/(?:제?\d+[조항]|[가-힣]+\s*정책|[가-힣]+\s*규정)/);
  const locationLabel = sectionMatch ? sectionMatch[0] : `p.${pageRef}`;

  return { pageRef, locationLabel };
}

/**
 * Compare two values for contradiction (normalized)
 */
export function valuesContradict(
  factType: FactType,
  valueA: string,
  valueB: string,
): boolean {
  const normalizedA = normalizeValue(factType, valueA);
  const normalizedB = normalizeValue(factType, valueB);

  return normalizedA !== normalizedB;
}

/**
 * Normalize values for comparison
 */
function normalizeValue(factType: FactType, value: string): string {
  const v = value.toLowerCase().replace(/\s+/g, '');

  switch (factType) {
    case 'RETENTION_PERIOD':
      // Extract numeric years
      const yearsMatch = value.match(/(\d+)/);
      return yearsMatch ? `${yearsMatch[1]}년` : v;

    case 'TRAINING_FREQUENCY':
      if (/반기/.test(value)) return '반기';
      if (/분기/.test(value)) return '분기';
      if (/매월|월/.test(value)) return '매월';
      const timesMatch = value.match(/(\d+)\s*회/);
      return timesMatch ? `연${timesMatch[1]}회` : v;

    case 'DELETION_METHOD':
      if (/즉시/.test(value)) return '즉시';
      const daysMatch = value.match(/(\d+)\s*일/);
      return daysMatch ? `${daysMatch[1]}일` : v;

    default:
      return v;
  }
}

/**
 * Demo seed contradictions for testing
 * Returns hardcoded contradictions when DEMO_SEED_CONTRADICTIONS=true
 */
export function getDemoSeedContradictions(): Array<{
  id: string;
  factType: FactType;
  factTypeKo: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  docA: { name: string; value: string; excerpt: string; pageRef: number };
  docB: { name: string; value: string; excerpt: string; pageRef: number };
  descriptionKo: string;
  resolutionKo: string;
}> {
  if (process.env.DEMO_SEED_CONTRADICTIONS !== 'true') {
    return [];
  }

  return [
    {
      id: 'demo-contradiction-1',
      factType: 'RETENTION_PERIOD',
      factTypeKo: '보관기간',
      severity: 'HIGH',
      docA: {
        name: '개인정보처리방침_v2.3',
        value: '3년',
        excerpt: '개인정보는 수집일로부터 3년간 보관합니다.',
        pageRef: 2,
      },
      docB: {
        name: '위탁계약서_클라우드서비스',
        value: '5년',
        excerpt: '수탁자는 위탁 업무 수행 중 처리하는 개인정보를 5년간 보관하여야 한다.',
        pageRef: 4,
      },
      descriptionKo: '보관기간이 일치하지 않습니다: "3년" vs "5년"',
      resolutionKo: '개인정보보호법 제21조에 따라 보관기간을 통일하고, 모든 관련 문서를 수정해야 합니다. 법적 요건 중 더 긴 기간을 적용하는 것이 일반적입니다.',
    },
    {
      id: 'demo-contradiction-2',
      factType: 'TRAINING_FREQUENCY',
      factTypeKo: '교육주기',
      severity: 'MEDIUM',
      docA: {
        name: '내부관리계획_2024',
        value: '반기별',
        excerpt: '정보보호 교육은 반기별로 실시한다.',
        pageRef: 5,
      },
      docB: {
        name: '교육실시대장_2024',
        value: '연 1회',
        excerpt: '2024년 정보보호 교육 실시: 연 1회 (3월)',
        pageRef: 1,
      },
      descriptionKo: '교육 주기가 일치하지 않습니다: "반기별" vs "연 1회"',
      resolutionKo: '내부관리계획과 교육실시대장의 교육 주기를 통일하세요. 개인정보보호법 시행령 제30조에 따라 연 1회 이상 교육을 실시해야 합니다.',
    },
    {
      id: 'demo-contradiction-3',
      factType: 'DELETION_METHOD',
      factTypeKo: '파기방법',
      severity: 'HIGH',
      docA: {
        name: '개인정보처리방침_v2.3',
        value: '즉시 삭제',
        excerpt: '보유기간 경과 시 즉시 삭제합니다.',
        pageRef: 3,
      },
      docB: {
        name: '내부관리계획_2024',
        value: '30일 유예',
        excerpt: '파기 전 30일간의 유예기간을 두어 복구 요청에 대응한다.',
        pageRef: 7,
      },
      descriptionKo: '파기 방법/시점이 일치하지 않습니다: "즉시 삭제" vs "30일 유예"',
      resolutionKo: '개인정보 파기 시점과 방법을 명확히 통일하세요. 정보주체의 권리 보호를 위해 더 엄격한 기준을 적용하는 것이 권장됩니다.',
    },
  ];
}
