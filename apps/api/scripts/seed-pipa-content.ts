#!/usr/bin/env tsx
/**
 * Seed PIPA v1 Content Pack Templates
 *
 * This script loads the PIPA v1 content pack and seeds the database with template records.
 * These templates can then be instantiated for specific tenants via the onboarding flow.
 *
 * Usage:
 *   tsx scripts/seed-pipa-content.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ContentLoaderService } from '../src/compliance-content/content-loader.service';

async function bootstrap() {
  console.log('🌱 Starting PIPA v1 content pack seeding...\n');

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    // Get ContentLoaderService
    const contentLoader = app.get(ContentLoaderService);

    // Load PIPA v1 content pack from YAML
    console.log('📦 Loading PIPA v1 content pack from YAML...');
    const contentPack = await contentLoader.loadPIPAv1();

    // Seed templates
    console.log('\n📥 Seeding content pack templates to database...');
    await contentLoader.seedContentPackTemplates(contentPack);

    console.log('\n✅ PIPA v1 content pack seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Pack Code: ${contentPack.metadata.code}`);
    console.log(`   - Version: ${contentPack.metadata.version}`);
    console.log(`   - Obligations: ${contentPack.obligations.length}`);
    console.log(`   - Controls: ${contentPack.controls.length}`);
    console.log(`   - Evidence Requirements: ${contentPack.evidenceRequirements.length}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Apply content pack to a tenant via onboarding flow');
    console.log('   2. Or use ContentLoaderService.applyContentPackToTenant(tenantId, "pipa-v1-kr")');
    console.log('');
  } catch (error) {
    console.error('\n❌ Error seeding content pack:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
