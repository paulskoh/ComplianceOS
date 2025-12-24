import { Module } from '@nestjs/common';
import { ContentLoaderService } from './content-loader.service';

@Module({
  providers: [ContentLoaderService],
  exports: [ContentLoaderService],
})
export class ContentLoaderModule {}
