import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import awsConfig from '../config/aws.config';
import { StorageService } from './storage.service';
import { CryptoService } from './crypto.service';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [ConfigModule.forFeature(awsConfig)],
  providers: [StorageService, CryptoService, QueueService],
  exports: [StorageService, CryptoService, QueueService],
})
export class AwsModule {}
