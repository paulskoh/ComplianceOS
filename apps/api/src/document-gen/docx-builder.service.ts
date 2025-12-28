import { Injectable, Logger } from '@nestjs/common';
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Packer,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
} from 'docx';

interface DocumentSection {
  title: string;
  content: string;
}

interface DocumentMetadata {
  companyName: string;
  generatedDate: string;
  documentType: string;
  version?: string;
}

/**
 * Korean DOCX Document Builder
 * Generates professional Korean compliance documents in DOCX format
 */
@Injectable()
export class DocxBuilderService {
  private readonly logger = new Logger(DocxBuilderService.name);

  /**
   * Build a Korean compliance document in DOCX format
   */
  async buildKoreanDocument(
    title: string,
    sections: DocumentSection[],
    metadata: DocumentMetadata,
  ): Promise<Buffer> {
    this.logger.log(`Building DOCX document: ${title}`);

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: 'Malgun Gothic', // 맑은 고딕 - standard Korean font
              size: 22, // 11pt
            },
            paragraph: {
              spacing: {
                line: 360, // 1.5 line spacing
                before: 120,
                after: 120,
              },
            },
          },
          heading1: {
            run: {
              font: 'Malgun Gothic',
              size: 32, // 16pt
              bold: true,
              color: '000000',
            },
            paragraph: {
              spacing: {
                before: 240,
                after: 120,
              },
            },
          },
          heading2: {
            run: {
              font: 'Malgun Gothic',
              size: 28, // 14pt
              bold: true,
              color: '333333',
            },
            paragraph: {
              spacing: {
                before: 200,
                after: 100,
              },
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440, // 1 inch
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: AlignmentType.RIGHT,
                  children: [
                    new TextRun({
                      text: metadata.companyName,
                      font: 'Malgun Gothic',
                      size: 18,
                      color: '666666',
                    }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      children: [PageNumber.CURRENT],
                      font: 'Malgun Gothic',
                      size: 18,
                    }),
                    new TextRun({
                      text: ' / ',
                      font: 'Malgun Gothic',
                      size: 18,
                    }),
                    new TextRun({
                      children: [PageNumber.TOTAL_PAGES],
                      font: 'Malgun Gothic',
                      size: 18,
                    }),
                  ],
                }),
              ],
            }),
          },
          children: [
            // Title
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
              children: [
                new TextRun({
                  text: title,
                  font: 'Malgun Gothic',
                  size: 40, // 20pt
                  bold: true,
                }),
              ],
            }),

            // Company name
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [
                new TextRun({
                  text: metadata.companyName,
                  font: 'Malgun Gothic',
                  size: 28,
                }),
              ],
            }),

            // Date and version
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
              children: [
                new TextRun({
                  text: `작성일: ${metadata.generatedDate}`,
                  font: 'Malgun Gothic',
                  size: 22,
                  color: '666666',
                }),
                ...(metadata.version
                  ? [
                      new TextRun({
                        text: ` | 버전: ${metadata.version}`,
                        font: 'Malgun Gothic',
                        size: 22,
                        color: '666666',
                      }),
                    ]
                  : []),
              ],
            }),

            // Horizontal line
            new Paragraph({
              border: {
                bottom: {
                  color: '000000',
                  space: 1,
                  size: 6,
                  style: BorderStyle.SINGLE,
                },
              },
              spacing: { after: 400 },
            }),

            // Document type label
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 },
              children: [
                new TextRun({
                  text: metadata.documentType,
                  font: 'Malgun Gothic',
                  size: 36,
                  bold: true,
                  color: '1a56db', // Professional blue
                }),
              ],
            }),

            // Table of contents placeholder
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [
                new TextRun({
                  text: '목차',
                  font: 'Malgun Gothic',
                  bold: true,
                }),
              ],
            }),

            // TOC entries
            ...sections.map((section, index) =>
              new Paragraph({
                spacing: { before: 60, after: 60 },
                indent: { left: 720 },
                children: [
                  new TextRun({
                    text: `${index + 1}. ${section.title}`,
                    font: 'Malgun Gothic',
                    size: 22,
                  }),
                ],
              }),
            ),

            // Page break before content
            new Paragraph({
              children: [new PageBreak()],
            }),

            // Sections
            ...sections.flatMap((section, index) =>
              this.buildSection(section, index + 1),
            ),

            // Footer section
            new Paragraph({
              spacing: { before: 800 },
              border: {
                top: {
                  color: '000000',
                  space: 1,
                  size: 6,
                  style: BorderStyle.SINGLE,
                },
              },
            }),

            // Document end
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 400 },
              children: [
                new TextRun({
                  text: '- 끝 -',
                  font: 'Malgun Gothic',
                  size: 22,
                  color: '666666',
                }),
              ],
            }),

            // Generated by notice
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 200 },
              children: [
                new TextRun({
                  text: 'ComplianceOS에서 자동 생성됨',
                  font: 'Malgun Gothic',
                  size: 16,
                  color: '999999',
                  italics: true,
                }),
              ],
            }),
          ],
        },
      ],
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);
    this.logger.log(`DOCX document generated: ${buffer.length} bytes`);

    return buffer;
  }

  /**
   * Build a section with proper Korean formatting
   */
  private buildSection(section: DocumentSection, sectionNumber: number): Paragraph[] {
    const paragraphs: Paragraph[] = [];

    // Section heading
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
        children: [
          new TextRun({
            text: `제${this.toKoreanNumeral(sectionNumber)}조 ${section.title}`,
            font: 'Malgun Gothic',
            bold: true,
            size: 28,
          }),
        ],
      }),
    );

    // Parse content and create paragraphs
    const contentParagraphs = this.parseContent(section.content);
    paragraphs.push(...contentParagraphs);

    return paragraphs;
  }

  /**
   * Parse markdown-like content into paragraphs
   */
  private parseContent(content: string): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const lines = content.split('\n');

    let listCounter = 0;
    let inList = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        // Empty line - add spacing
        continue;
      }

      // Numbered list item
      if (/^\d+\./.test(trimmedLine)) {
        inList = true;
        listCounter++;
        const text = trimmedLine.replace(/^\d+\.\s*/, '');
        paragraphs.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            indent: { left: 360 },
            children: [
              new TextRun({
                text: `${listCounter}. ${text}`,
                font: 'Malgun Gothic',
                size: 22,
              }),
            ],
          }),
        );
        continue;
      }

      // Bullet point
      if (/^[-•*]/.test(trimmedLine)) {
        const text = trimmedLine.replace(/^[-•*]\s*/, '');
        paragraphs.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            indent: { left: 720 },
            children: [
              new TextRun({
                text: `• ${text}`,
                font: 'Malgun Gothic',
                size: 22,
              }),
            ],
          }),
        );
        continue;
      }

      // Sub-heading (##)
      if (/^##\s/.test(trimmedLine)) {
        inList = false;
        listCounter = 0;
        const text = trimmedLine.replace(/^##\s*/, '');
        paragraphs.push(
          new Paragraph({
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({
                text,
                font: 'Malgun Gothic',
                size: 24,
                bold: true,
              }),
            ],
          }),
        );
        continue;
      }

      // Regular paragraph
      if (inList) {
        inList = false;
        listCounter = 0;
      }

      // Handle bold text (**text**)
      const segments = this.parseBoldText(trimmedLine);

      paragraphs.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          children: segments,
        }),
      );
    }

    return paragraphs;
  }

  /**
   * Parse bold text markers and return TextRun segments
   */
  private parseBoldText(text: string): TextRun[] {
    const segments: TextRun[] = [];
    const parts = text.split(/(\*\*[^*]+\*\*)/);

    for (const part of parts) {
      if (part.startsWith('**') && part.endsWith('**')) {
        segments.push(
          new TextRun({
            text: part.slice(2, -2),
            font: 'Malgun Gothic',
            size: 22,
            bold: true,
          }),
        );
      } else if (part) {
        segments.push(
          new TextRun({
            text: part,
            font: 'Malgun Gothic',
            size: 22,
          }),
        );
      }
    }

    return segments;
  }

  /**
   * Convert number to Korean numeral for formal documents
   */
  private toKoreanNumeral(num: number): string {
    const numerals = ['일', '이', '삼', '사', '오', '육', '칠', '팔', '구', '십', '십일', '십이'];
    return numerals[num - 1] || num.toString();
  }

  /**
   * Build a simple table for the document
   */
  buildTable(headers: string[], rows: string[][]): Table {
    return new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        // Header row
        new TableRow({
          children: headers.map(
            header =>
              new TableCell({
                shading: { fill: 'E0E0E0' },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: header,
                        font: 'Malgun Gothic',
                        size: 20,
                        bold: true,
                      }),
                    ],
                  }),
                ],
              }),
          ),
        }),
        // Data rows
        ...rows.map(
          row =>
            new TableRow({
              children: row.map(
                cell =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: cell,
                            font: 'Malgun Gothic',
                            size: 20,
                          }),
                        ],
                      }),
                    ],
                  }),
              ),
            }),
        ),
      ],
    });
  }
}
