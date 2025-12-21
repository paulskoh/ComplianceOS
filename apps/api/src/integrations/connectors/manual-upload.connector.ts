import { Injectable } from '@nestjs/common';

@Injectable()
export class ManualUploadConnector {
  async run(config: any) {
    // Manual upload doesn't have automated collection
    return { artifactsCollected: 0 };
  }
}
