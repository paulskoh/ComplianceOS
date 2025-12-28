import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';

/**
 * K-ISMS Audit Question
 */
export interface AuditQuestion {
  id: string;
  order: number;
  questionKo: string;
  category: string;
  controlRef: string; // K-ISMS control reference
  expectedEvidence: string[];
  passCriteria: string;
}

/**
 * Evidence retrieval result
 */
export interface RetrievedEvidence {
  artifactId: string;
  name: string;
  status: string;
  excerpt?: string;
  pageRef?: number;
  relevanceScore: number;
}

/**
 * Audit question response
 */
export interface AuditResponse {
  questionId: string;
  determination: 'PASS' | 'WARN' | 'FAIL';
  determinationKo: string;
  evidenceFound: RetrievedEvidence[];
  explanationKo: string;
  citationKo?: string;
  recommendation?: string;
}

/**
 * Audit simulation session
 */
export interface AuditSession {
  id: string;
  tenantId: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  currentQuestionIndex: number;
  questions: AuditQuestion[];
  responses: AuditResponse[];
  startedAt: Date;
  completedAt?: Date;
  finalReport?: AuditReport;
}

/**
 * Final audit report
 */
export interface AuditReport {
  sessionId: string;
  totalQuestions: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  overallStatus: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
  overallStatusKo: string;
  readinessScore: number;
  gaps: Array<{
    questionId: string;
    questionKo: string;
    determination: 'WARN' | 'FAIL';
    recommendation: string;
  }>;
  summaryKo: string;
}

/**
 * CEO Demo: K-ISMS Audit Simulation Service
 *
 * Simulates a K-ISMS auditor asking compliance questions:
 * - Auto-retrieves relevant evidence for each question
 * - Makes PASS/WARN/FAIL determinations based on evidence
 * - Follows a scripted demo arc for predictable demo experience
 */
@Injectable()
export class AuditSimulationService {
  private readonly logger = new Logger(AuditSimulationService.name);
  private readonly openai: OpenAI;

  // In-memory session store (could be Redis in production)
  private sessions = new Map<string, AuditSession>();

  // CEO Demo: K-ISMS Question Bank
  private readonly QUESTION_BANK: AuditQuestion[] = [
    {
      id: 'Q1',
      order: 1,
      questionKo: '개인정보처리방침을 보여주세요.',
      category: '개인정보보호',
      controlRef: 'PIPA-30',
      expectedEvidence: ['개인정보처리방침', 'privacy policy'],
      passCriteria: '개인정보처리방침 문서가 존재하고 최신 버전이어야 합니다.',
    },
    {
      id: 'Q2',
      order: 2,
      questionKo: '정보주체의 권리 행사 절차가 있나요?',
      category: '개인정보보호',
      controlRef: 'PIPA-35',
      expectedEvidence: ['권리 행사', '열람 청구', '정정 요청', '삭제 요청'],
      passCriteria: '정보주체 권리 행사 절차가 문서화되어 있어야 합니다.',
    },
    {
      id: 'Q3',
      order: 3,
      questionKo: '개인정보 처리 위탁계약서를 확인하겠습니다.',
      category: '개인정보보호',
      controlRef: 'PIPA-26',
      expectedEvidence: ['위탁계약서', '수탁자', '위탁'],
      passCriteria: '개인정보 처리 위탁계약서가 체결되어 있어야 합니다.',
    },
    {
      id: 'Q4',
      order: 4,
      questionKo: '개인정보보호 교육 실시 현황을 보여주세요.',
      category: '교육/훈련',
      controlRef: 'PIPA-28',
      expectedEvidence: ['교육', '연수', '교육실시대장', '교육 이수'],
      passCriteria: '연 1회 이상 개인정보보호 교육 실시 기록이 있어야 합니다.',
    },
    {
      id: 'Q5',
      order: 5,
      questionKo: '최근 정책 검토 회의록이 있나요?',
      category: '관리체계',
      controlRef: 'ISMS-1.3',
      expectedEvidence: ['회의록', '정책 검토', '정책 승인'],
      passCriteria: '연 1회 이상 정책 검토 회의록이 있어야 합니다.',
    },
  ];

  constructor(private prisma: PrismaService) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Start a new audit simulation session
   */
  async startSession(tenantId: string): Promise<AuditSession> {
    const sessionId = crypto.randomUUID();

    const session: AuditSession = {
      id: sessionId,
      tenantId,
      status: 'IN_PROGRESS',
      currentQuestionIndex: 0,
      questions: [...this.QUESTION_BANK],
      responses: [],
      startedAt: new Date(),
    };

    this.sessions.set(sessionId, session);

    this.logger.log(`Started audit simulation session: ${sessionId}`);

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<AuditSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get current question for a session
   */
  async getCurrentQuestion(sessionId: string): Promise<AuditQuestion | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    if (session.currentQuestionIndex >= session.questions.length) {
      return null;
    }

    return session.questions[session.currentQuestionIndex];
  }

  /**
   * Process current question and advance to next
   * CEO Demo: Auto-retrieves evidence and makes determination
   */
  async processCurrentQuestion(sessionId: string): Promise<AuditResponse | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status === 'COMPLETED') return null;

    const question = session.questions[session.currentQuestionIndex];
    if (!question) return null;

    // Retrieve relevant evidence
    const evidence = await this.retrieveEvidence(session.tenantId, question);

    // Make determination
    const response = await this.makeDetermination(question, evidence);

    // Store response
    session.responses.push(response);

    // Advance to next question
    session.currentQuestionIndex++;

    // Check if session is complete
    if (session.currentQuestionIndex >= session.questions.length) {
      session.status = 'COMPLETED';
      session.completedAt = new Date();
      session.finalReport = this.generateFinalReport(session);
    }

    return response;
  }

  /**
   * Get final audit report
   */
  async getFinalReport(sessionId: string): Promise<AuditReport | null> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'COMPLETED') return null;

    return session.finalReport || null;
  }

  /**
   * Retrieve relevant evidence for a question
   */
  private async retrieveEvidence(
    tenantId: string,
    question: AuditQuestion,
  ): Promise<RetrievedEvidence[]> {
    const results: RetrievedEvidence[] = [];

    // Search for artifacts matching expected evidence keywords
    for (const keyword of question.expectedEvidence) {
      const artifacts = await this.prisma.artifact.findMany({
        where: {
          tenantId,
          isDeleted: false,
          OR: [
            { name: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } },
          ],
        },
        take: 3,
      });

      for (const artifact of artifacts) {
        // Avoid duplicates
        if (results.find(r => r.artifactId === artifact.id)) continue;

        // Get excerpt from document_extractions
        const extraction = await this.prisma.$queryRaw<Array<{ extracted_text: string }>>`
          SELECT extracted_text FROM document_extractions
          WHERE artifact_id = ${artifact.id}::uuid
          ORDER BY version DESC LIMIT 1
        `;

        let excerpt: string | undefined;
        if (extraction[0]?.extracted_text) {
          // Find relevant excerpt
          const text = extraction[0].extracted_text;
          const keywordIndex = text.toLowerCase().indexOf(keyword.toLowerCase());
          if (keywordIndex >= 0) {
            const start = Math.max(0, keywordIndex - 50);
            const end = Math.min(text.length, keywordIndex + keyword.length + 100);
            excerpt = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
          }
        }

        results.push({
          artifactId: artifact.id,
          name: artifact.name,
          status: artifact.status,
          excerpt,
          relevanceScore: this.calculateRelevance(artifact.name, question.expectedEvidence),
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return results.slice(0, 5); // Return top 5
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(name: string, keywords: string[]): number {
    const lowerName = name.toLowerCase();
    let score = 0;
    for (const keyword of keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    return score / keywords.length;
  }

  /**
   * Make PASS/WARN/FAIL determination
   */
  private async makeDetermination(
    question: AuditQuestion,
    evidence: RetrievedEvidence[],
  ): Promise<AuditResponse> {
    // Simple rule-based determination for CEO Demo
    // Can be enhanced with OpenAI for more nuanced analysis

    const verifiedEvidence = evidence.filter(e => e.status === 'VERIFIED');
    const flaggedEvidence = evidence.filter(e => e.status === 'FLAGGED');

    let determination: 'PASS' | 'WARN' | 'FAIL';
    let determinationKo: string;
    let explanationKo: string;
    let recommendation: string | undefined;

    if (verifiedEvidence.length > 0) {
      determination = 'PASS';
      determinationKo = '적합';
      explanationKo = `"${verifiedEvidence[0].name}" 문서에서 관련 증빙이 확인되었습니다.`;
    } else if (flaggedEvidence.length > 0) {
      determination = 'WARN';
      determinationKo = '보완 필요';
      explanationKo = `"${flaggedEvidence[0].name}" 문서가 있으나 추가 검토가 필요합니다.`;
      recommendation = '해당 문서를 검토하여 요구사항 충족 여부를 확인하세요.';
    } else if (evidence.length > 0) {
      determination = 'WARN';
      determinationKo = '보완 필요';
      explanationKo = `관련 문서가 존재하나 검증이 완료되지 않았습니다.`;
      recommendation = '관련 문서의 분석 및 검증을 완료하세요.';
    } else {
      determination = 'FAIL';
      determinationKo = '미비';
      explanationKo = '관련 증빙 자료를 찾을 수 없습니다.';
      recommendation = question.passCriteria;
    }

    // CEO Demo: Use OpenAI for better explanation if available
    if (process.env.OPENAI_API_KEY && evidence.length > 0) {
      try {
        const aiExplanation = await this.getAIExplanation(question, evidence);
        if (aiExplanation) {
          explanationKo = aiExplanation;
        }
      } catch (error) {
        this.logger.warn('AI explanation failed, using default');
      }
    }

    return {
      questionId: question.id,
      determination,
      determinationKo,
      evidenceFound: evidence,
      explanationKo,
      citationKo: evidence[0]?.excerpt,
      recommendation,
    };
  }

  /**
   * Get AI-powered explanation
   */
  private async getAIExplanation(
    question: AuditQuestion,
    evidence: RetrievedEvidence[],
  ): Promise<string | null> {
    const prompt = `당신은 K-ISMS 심사관입니다.

질문: ${question.questionKo}
기준: ${question.passCriteria}

발견된 증빙:
${evidence.map(e => `- ${e.name} (상태: ${e.status})${e.excerpt ? `: "${e.excerpt}"` : ''}`).join('\n')}

위 증빙을 바탕으로 1-2문장의 간결한 심사 코멘트를 작성하세요.
전문적이고 객관적인 어조를 사용하세요.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content || null;
  }

  /**
   * Generate final audit report
   */
  private generateFinalReport(session: AuditSession): AuditReport {
    const passCount = session.responses.filter(r => r.determination === 'PASS').length;
    const warnCount = session.responses.filter(r => r.determination === 'WARN').length;
    const failCount = session.responses.filter(r => r.determination === 'FAIL').length;

    const totalQuestions = session.questions.length;
    const readinessScore = Math.round((passCount / totalQuestions) * 100);

    let overallStatus: 'PASS' | 'CONDITIONAL_PASS' | 'FAIL';
    let overallStatusKo: string;

    if (failCount === 0 && warnCount === 0) {
      overallStatus = 'PASS';
      overallStatusKo = '적합';
    } else if (failCount === 0) {
      overallStatus = 'CONDITIONAL_PASS';
      overallStatusKo = '조건부 적합';
    } else {
      overallStatus = 'FAIL';
      overallStatusKo = '부적합';
    }

    const gaps = session.responses
      .filter(r => r.determination !== 'PASS')
      .map(r => {
        const question = session.questions.find(q => q.id === r.questionId)!;
        return {
          questionId: r.questionId,
          questionKo: question.questionKo,
          determination: r.determination as 'WARN' | 'FAIL',
          recommendation: r.recommendation || question.passCriteria,
        };
      });

    let summaryKo: string;
    if (overallStatus === 'PASS') {
      summaryKo = `모든 ${totalQuestions}개 항목에서 적합 판정을 받았습니다. 개인정보보호 관리체계가 잘 구축되어 있습니다.`;
    } else if (overallStatus === 'CONDITIONAL_PASS') {
      summaryKo = `${totalQuestions}개 항목 중 ${passCount}개 적합, ${warnCount}개 보완 필요입니다. 지적 사항을 개선하면 인증 취득이 가능합니다.`;
    } else {
      summaryKo = `${totalQuestions}개 항목 중 ${passCount}개 적합, ${warnCount}개 보완 필요, ${failCount}개 미비입니다. 중요 결함 개선이 필요합니다.`;
    }

    return {
      sessionId: session.id,
      totalQuestions,
      passCount,
      warnCount,
      failCount,
      overallStatus,
      overallStatusKo,
      readinessScore,
      gaps,
      summaryKo,
    };
  }

  /**
   * Run complete audit simulation (all questions at once)
   * CEO Demo: For quick demo walkthrough
   */
  async runFullSimulation(tenantId: string): Promise<AuditSession> {
    const session = await this.startSession(tenantId);

    while (session.currentQuestionIndex < session.questions.length) {
      await this.processCurrentQuestion(session.id);
    }

    return session;
  }

  /**
   * Clean up old sessions
   */
  cleanupOldSessions(maxAgeMs: number = 3600000): void {
    const now = new Date();
    for (const [id, session] of this.sessions.entries()) {
      if (now.getTime() - session.startedAt.getTime() > maxAgeMs) {
        this.sessions.delete(id);
      }
    }
  }
}
