#!/bin/bash

# LocalStack initialization script
# This script runs when LocalStack is ready to accept requests
# It sets up all necessary AWS resources for local development

set -e

echo "Initializing LocalStack resources..."

# AWS CLI configuration
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=ap-northeast-2
export AWS_ENDPOINT_URL=http://localhost:4566

# Wait for LocalStack to be ready
echo "Waiting for LocalStack to be ready..."
sleep 5

# ==================== S3 Buckets ====================
echo "Creating S3 buckets..."

# Artifacts bucket (for evidence documents)
aws --endpoint-url=$AWS_ENDPOINT_URL s3 mb s3://complianceos-artifacts-local || true
aws --endpoint-url=$AWS_ENDPOINT_URL s3api put-bucket-versioning \
  --bucket complianceos-artifacts-local \
  --versioning-configuration Status=Enabled

# Inspection packs bucket
aws --endpoint-url=$AWS_ENDPOINT_URL s3 mb s3://complianceos-packs-local || true

# Enable CORS for artifacts bucket
aws --endpoint-url=$AWS_ENDPOINT_URL s3api put-bucket-cors \
  --bucket complianceos-artifacts-local \
  --cors-configuration '{
    "CORSRules": [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedHeaders": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
      }
    ]
  }'

echo "S3 buckets created successfully"

# ==================== KMS Keys ====================
echo "Creating KMS keys..."

# Create KMS key for pack signing
KMS_KEY_OUTPUT=$(aws --endpoint-url=$AWS_ENDPOINT_URL kms create-key \
  --description "ComplianceOS Pack Signing Key (Local)" \
  --key-usage SIGN_VERIFY \
  --key-spec RSA_2048 \
  --origin AWS_KMS)

KMS_KEY_ID=$(echo $KMS_KEY_OUTPUT | jq -r '.KeyMetadata.KeyId')
echo "Created KMS key: $KMS_KEY_ID"

# Create alias for the key
aws --endpoint-url=$AWS_ENDPOINT_URL kms create-alias \
  --alias-name alias/complianceos-pack-signing-local \
  --target-key-id $KMS_KEY_ID || true

# Create KMS key for data encryption
KMS_ENCRYPT_KEY_OUTPUT=$(aws --endpoint-url=$AWS_ENDPOINT_URL kms create-key \
  --description "ComplianceOS Data Encryption Key (Local)" \
  --key-usage ENCRYPT_DECRYPT \
  --origin AWS_KMS)

KMS_ENCRYPT_KEY_ID=$(echo $KMS_ENCRYPT_KEY_OUTPUT | jq -r '.KeyMetadata.KeyId')
echo "Created encryption key: $KMS_ENCRYPT_KEY_ID"

# Create alias for encryption key
aws --endpoint-url=$AWS_ENDPOINT_URL kms create-alias \
  --alias-name alias/complianceos-data-encryption-local \
  --target-key-id $KMS_ENCRYPT_KEY_ID || true

echo "KMS keys created successfully"

# ==================== Secrets Manager ====================
echo "Creating Secrets Manager secrets..."

# Database credentials
aws --endpoint-url=$AWS_ENDPOINT_URL secretsmanager create-secret \
  --name complianceos/database \
  --secret-string '{
    "host": "postgres",
    "port": "5432",
    "database": "complianceos_dev",
    "username": "complianceos",
    "password": "dev_password"
  }' || true

# JWT secret
aws --endpoint-url=$AWS_ENDPOINT_URL secretsmanager create-secret \
  --name complianceos/jwt-secret \
  --secret-string "local-dev-jwt-secret-key-do-not-use-in-production" || true

echo "Secrets created successfully"

# ==================== Output Configuration ====================
echo ""
echo "=========================================="
echo "LocalStack Initialization Complete!"
echo "=========================================="
echo ""
echo "S3 Buckets:"
echo "  - complianceos-artifacts-local (versioning enabled)"
echo "  - complianceos-packs-local"
echo ""
echo "KMS Keys:"
echo "  - Signing Key: alias/complianceos-pack-signing-local ($KMS_KEY_ID)"
echo "  - Encryption Key: alias/complianceos-data-encryption-local ($KMS_ENCRYPT_KEY_ID)"
echo ""
echo "Secrets Manager:"
echo "  - complianceos/database"
echo "  - complianceos/jwt-secret"
echo ""
echo "LocalStack Endpoint: http://localhost:4566"
echo ""
echo "Environment variables for your application:"
echo "  AWS_ENDPOINT_URL=http://localhost:4566"
echo "  AWS_ACCESS_KEY_ID=test"
echo "  AWS_SECRET_ACCESS_KEY=test"
echo "  AWS_DEFAULT_REGION=ap-northeast-2"
echo "  S3_ARTIFACTS_BUCKET=complianceos-artifacts-local"
echo "  S3_PACKS_BUCKET=complianceos-packs-local"
echo "  KMS_SIGNING_KEY_ALIAS=alias/complianceos-pack-signing-local"
echo "  KMS_ENCRYPTION_KEY_ALIAS=alias/complianceos-data-encryption-local"
echo "=========================================="
