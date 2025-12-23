import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  KMSClient,
  SignCommand,
  GetPublicKeyCommand,
  MessageType,
  SigningAlgorithmSpec,
} from '@aws-sdk/client-kms';
import { createHash } from 'crypto';
import awsConfig from '../config/aws.config';

export interface KmsSignRequest {
  keyId: string;
  messageBase64: string;
  signingAlgorithm: 'RSASSA_PSS_SHA_256' | 'ECDSA_SHA_256';
}

export interface KmsSignResponse {
  signatureBase64: string;
  keyId: string;
  signingAlgorithm: string;
}

@Injectable()
export class CryptoService {
  private readonly kmsClient: KMSClient;
  private readonly defaultKeyId: string;
  private readonly defaultSigningAlgorithm: SigningAlgorithmSpec;

  constructor(
    @Inject(awsConfig.KEY)
    private config: ConfigType<typeof awsConfig>,
  ) {
    this.kmsClient = new KMSClient({
      region: this.config.region,
      endpoint: process.env.KMS_ENDPOINT, // For localstack
      credentials: this.config.credentials,
    });
    this.defaultKeyId = this.config.kms.keyId;
    this.defaultSigningAlgorithm = this.config.kms.signingAlgorithm as SigningAlgorithmSpec;
  }

  /**
   * Sign a message using AWS KMS
   * CRITICAL: This ensures we never manage private keys in the application
   */
  async signMessageKms(request: KmsSignRequest): Promise<KmsSignResponse> {
    const messageBuffer = Buffer.from(request.messageBase64, 'base64');

    const command = new SignCommand({
      KeyId: request.keyId,
      Message: messageBuffer,
      MessageType: MessageType.RAW,
      SigningAlgorithm: request.signingAlgorithm as SigningAlgorithmSpec,
    });

    const response = await this.kmsClient.send(command);

    if (!response.Signature) {
      throw new Error('KMS signature missing in response');
    }

    return {
      signatureBase64: Buffer.from(response.Signature).toString('base64'),
      keyId: response.KeyId || request.keyId,
      signingAlgorithm: request.signingAlgorithm,
    };
  }

  /**
   * Get public key from KMS for verification
   */
  async getPublicKeyKms(keyId?: string): Promise<string> {
    const command = new GetPublicKeyCommand({
      KeyId: keyId || this.defaultKeyId,
    });

    const response = await this.kmsClient.send(command);

    if (!response.PublicKey) {
      throw new Error('Public key missing in KMS response');
    }

    // Convert to PEM format
    const publicKeyBuffer = Buffer.from(response.PublicKey);
    const publicKeyBase64 = publicKeyBuffer.toString('base64');

    // Wrap in PEM format
    const pem = [
      '-----BEGIN PUBLIC KEY-----',
      publicKeyBase64.match(/.{1,64}/g)?.join('\n'),
      '-----END PUBLIC KEY-----',
    ].join('\n');

    return pem;
  }

  /**
   * Compute SHA-256 hash of data
   */
  computeSha256(data: Buffer | string): string {
    return createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Sign manifest with default KMS key
   * Used for inspection pack manifests
   */
  async signManifest(manifestJson: string): Promise<KmsSignResponse> {
    // Compute SHA-256 of canonical JSON
    const messageHash = this.computeSha256(manifestJson);
    const messageBase64 = Buffer.from(messageHash, 'hex').toString('base64');

    return this.signMessageKms({
      keyId: this.defaultKeyId,
      messageBase64,
      signingAlgorithm: this.defaultSigningAlgorithm as 'RSASSA_PSS_SHA_256' | 'ECDSA_SHA_256',
    });
  }
}
