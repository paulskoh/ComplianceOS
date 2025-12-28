import { Module } from '@nestjs/common';
import { DocumentGenController } from './document-gen.controller';
import { DocumentGenService } from './document-gen.service';
import { DocxBuilderService } from './docx-builder.service';
import { StagedGenerationService } from './staged-generation.service';
import { ArtifactsModule } from '../artifacts/artifacts.module';

@Module({
  imports: [ArtifactsModule],
  controllers: [DocumentGenController],
  providers: [DocumentGenService, DocxBuilderService, StagedGenerationService],
  exports: [DocumentGenService, DocxBuilderService, StagedGenerationService],
})
export class DocumentGenModule {}
