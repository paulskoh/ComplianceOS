import { registerAs } from '@nestjs/config';

export interface AwsConfig {
  region: string;
  s3: {
    bucket: string;
    endpoint?: string;
    forcePathStyle: boolean;
  };
  kms: {
    keyId: string;
    signingAlgorithm: 'RSASSA_PSS_SHA_256' | 'ECDSA_SHA_256';
  };
  sqs: {
    docExtractQueue: string;
    docClassifyQueue: string;
    docAnalyzeQueue: string;
    readinessRecomputeQueue: string;
    expirationCheckQueue: string;
    packBuildQueue: string;
  };
  textract: {
    enabled: boolean;
  };
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export default registerAs('aws', (): AwsConfig => ({
  region: process.env.AWS_REGION || 'us-east-1',
  s3: {
    bucket: process.env.S3_BUCKET || 'complianceos-artifacts',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: !!process.env.S3_ENDPOINT, // Required for MinIO/localstack
  },
  kms: {
    keyId: process.env.KMS_KEY_ID || '',
    signingAlgorithm: (process.env.KMS_SIGNING_ALGORITHM as any) || 'RSASSA_PSS_SHA_256',
  },
  sqs: {
    docExtractQueue: process.env.SQS_DOC_EXTRACT_QUEUE || '',
    docClassifyQueue: process.env.SQS_DOC_CLASSIFY_QUEUE || '',
    docAnalyzeQueue: process.env.SQS_DOC_ANALYZE_QUEUE || '',
    readinessRecomputeQueue: process.env.SQS_READINESS_RECOMPUTE_QUEUE || '',
    expirationCheckQueue: process.env.SQS_EXPIRATION_CHECK_QUEUE || '',
    packBuildQueue: process.env.SQS_PACK_BUILD_QUEUE || '',
  },
  textract: {
    enabled: process.env.TEXTRACT_ENABLED === 'true',
  },
  credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined,
}));
