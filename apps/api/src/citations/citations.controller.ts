import { Controller, Get, Param, Query, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CitationsService } from './citations.service';

/**
 * Citations Controller
 * API endpoints for auditor-grade citation retrieval
 *
 * CEO Demo Features:
 * - GET /citations/:artifactId - Full analysis with citations
 * - GET /citations/:artifactId/pages - Page-level text chunks
 * - GET /citations/:artifactId/search - Search within document
 */
@Controller('citations')
@UseGuards(JwtAuthGuard)
export class CitationsController {
  constructor(private citations: CitationsService) {}

  /**
   * Get analysis with full citations for an artifact
   * Returns findings with page references for highlighting
   */
  @Get(':artifactId')
  async getAnalysisWithCitations(
    @Param('artifactId') artifactId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    const result = await this.citations.getAnalysisWithCitations(tenantId, artifactId);

    if (!result) {
      throw new NotFoundException('분석 결과를 찾을 수 없습니다.');
    }

    return result;
  }

  /**
   * Get document pages/chunks for an artifact
   * Used by frontend to render page-by-page view with highlighting
   */
  @Get(':artifactId/pages')
  async getDocumentPages(
    @Param('artifactId') artifactId: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    const pages = await this.citations.getDocumentChunks(tenantId, artifactId);

    return {
      artifactId,
      pageCount: pages.length,
      pages,
    };
  }

  /**
   * Get specific citation by finding index
   * Used for "jump to citation" feature
   */
  @Get(':artifactId/findings/:findingIndex/citation')
  async getCitationForFinding(
    @Param('artifactId') artifactId: string,
    @Param('findingIndex') findingIndex: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;
    const index = parseInt(findingIndex, 10);

    const citation = await this.citations.getCitationForFinding(tenantId, artifactId, index);

    if (!citation) {
      throw new NotFoundException('인용을 찾을 수 없습니다.');
    }

    return citation;
  }

  /**
   * Search for text within document
   * Returns matching citations with context
   */
  @Get(':artifactId/search')
  async searchInDocument(
    @Param('artifactId') artifactId: string,
    @Query('q') query: string,
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId;

    if (!query || query.trim().length < 2) {
      return { results: [], message: '검색어는 2자 이상이어야 합니다.' };
    }

    const results = await this.citations.searchInDocument(tenantId, artifactId, query.trim());

    return {
      query,
      resultCount: results.length,
      results,
    };
  }
}
