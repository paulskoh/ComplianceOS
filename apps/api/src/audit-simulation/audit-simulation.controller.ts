import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuditSimulationService } from './audit-simulation.service';

@ApiTags('audit-simulation')
@Controller('api/v2/audit-simulation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AuditSimulationController {
  constructor(private readonly auditService: AuditSimulationService) {}

  @Post('start')
  @ApiOperation({
    summary: 'Start new audit simulation session (CEO Demo)',
    description: 'Begins a K-ISMS audit simulation with a question bank',
  })
  async startSession(@CurrentUser() user: any) {
    const session = await this.auditService.startSession(user.tenantId);

    return {
      sessionId: session.id,
      status: session.status,
      totalQuestions: session.questions.length,
      currentQuestion: session.questions[0],
      message: '심사 시뮬레이션을 시작합니다.',
    };
  }

  @Get('session/:sessionId')
  @ApiOperation({
    summary: 'Get audit session status',
    description: 'Returns current session state with all responses so far',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID from start' })
  async getSession(@Param('sessionId') sessionId: string) {
    const session = await this.auditService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    return {
      sessionId: session.id,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      totalQuestions: session.questions.length,
      responsesCount: session.responses.length,
      responses: session.responses,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
    };
  }

  @Get('session/:sessionId/current-question')
  @ApiOperation({
    summary: 'Get current question',
    description: 'Returns the current question in the simulation',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async getCurrentQuestion(@Param('sessionId') sessionId: string) {
    const question = await this.auditService.getCurrentQuestion(sessionId);
    if (!question) {
      return {
        completed: true,
        message: '모든 질문이 완료되었습니다.',
      };
    }

    return {
      completed: false,
      question,
    };
  }

  @Post('session/:sessionId/next')
  @ApiOperation({
    summary: 'Process current question and advance (CEO Demo)',
    description: 'Auto-retrieves evidence, makes determination, and moves to next question',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async processNext(@Param('sessionId') sessionId: string) {
    const session = await this.auditService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('세션을 찾을 수 없습니다.');
    }

    if (session.status === 'COMPLETED') {
      return {
        completed: true,
        message: '심사가 이미 완료되었습니다.',
        finalReport: session.finalReport,
      };
    }

    const currentQuestion = session.questions[session.currentQuestionIndex];
    const response = await this.auditService.processCurrentQuestion(sessionId);

    if (!response) {
      throw new NotFoundException('질문 처리 중 오류가 발생했습니다.');
    }

    // Get next question (or null if completed)
    const nextQuestion = await this.auditService.getCurrentQuestion(sessionId);
    const updatedSession = await this.auditService.getSession(sessionId);

    return {
      processedQuestion: currentQuestion,
      response,
      nextQuestion,
      sessionStatus: updatedSession?.status,
      progress: {
        current: session.currentQuestionIndex + 1,
        total: session.questions.length,
      },
      isCompleted: updatedSession?.status === 'COMPLETED',
      finalReport: updatedSession?.status === 'COMPLETED' ? updatedSession.finalReport : undefined,
    };
  }

  @Get('session/:sessionId/report')
  @ApiOperation({
    summary: 'Get final audit report',
    description: 'Returns comprehensive report after simulation completes',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  async getFinalReport(@Param('sessionId') sessionId: string) {
    const report = await this.auditService.getFinalReport(sessionId);
    if (!report) {
      const session = await this.auditService.getSession(sessionId);
      if (!session) {
        throw new NotFoundException('세션을 찾을 수 없습니다.');
      }
      return {
        error: '심사가 아직 완료되지 않았습니다.',
        progress: {
          current: session.currentQuestionIndex,
          total: session.questions.length,
        },
      };
    }

    return report;
  }

  @Post('run-full')
  @ApiOperation({
    summary: 'Run complete audit simulation (CEO Demo quick mode)',
    description: 'Runs all questions at once and returns final report',
  })
  async runFullSimulation(@CurrentUser() user: any) {
    const session = await this.auditService.runFullSimulation(user.tenantId);

    return {
      sessionId: session.id,
      status: session.status,
      responses: session.responses.map(r => ({
        questionId: r.questionId,
        determination: r.determination,
        determinationKo: r.determinationKo,
        explanationKo: r.explanationKo,
        evidenceCount: r.evidenceFound.length,
      })),
      finalReport: session.finalReport,
    };
  }

  @Get('questions')
  @ApiOperation({
    summary: 'Get all available audit questions',
    description: 'Returns the K-ISMS question bank',
  })
  async getQuestionBank() {
    return {
      totalQuestions: 5,
      questions: [
        {
          id: 'Q1',
          order: 1,
          questionKo: '개인정보처리방침을 보여주세요.',
          category: '개인정보보호',
          controlRef: 'PIPA-30',
        },
        {
          id: 'Q2',
          order: 2,
          questionKo: '정보주체의 권리 행사 절차가 있나요?',
          category: '개인정보보호',
          controlRef: 'PIPA-35',
        },
        {
          id: 'Q3',
          order: 3,
          questionKo: '개인정보 처리 위탁계약서를 확인하겠습니다.',
          category: '개인정보보호',
          controlRef: 'PIPA-26',
        },
        {
          id: 'Q4',
          order: 4,
          questionKo: '개인정보보호 교육 실시 현황을 보여주세요.',
          category: '교육/훈련',
          controlRef: 'PIPA-28',
        },
        {
          id: 'Q5',
          order: 5,
          questionKo: '최근 정책 검토 회의록이 있나요?',
          category: '관리체계',
          controlRef: 'ISMS-1.3',
        },
      ],
      demoExpectedOutcomes: [
        { id: 'Q1', expected: 'PASS', reason: '개인정보처리방침 문서 존재' },
        { id: 'Q2', expected: 'PASS', reason: '권리 행사 절차 섹션 확인' },
        { id: 'Q3', expected: 'PASS', reason: '위탁계약서 문서 존재' },
        { id: 'Q4', expected: 'WARN', reason: '교육 기록 일부 확인' },
        { id: 'Q5', expected: 'FAIL', reason: '정책 검토 회의록 미비' },
      ],
    };
  }
}
