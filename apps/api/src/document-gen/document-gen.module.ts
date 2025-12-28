import { Module } from '@nestjs/common';
import { DocumentGenController } from './document-gen.controller';
import { DocumentGenService } from './document-gen.service';
import { DocxBuilderService } from './docx-builder.service';

@Module({
  controllers: [DocumentGenController],
  providers: [DocumentGenService, DocxBuilderService],
  exports: [DocumentGenService, DocxBuilderService],
})
export class DocumentGenModule {}
