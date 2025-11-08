/**
 * Script to extract OpenAPI schema from NestJS Swagger
 * 
 * This script starts the NestJS application and extracts the OpenAPI
 * schema document that can be used for API documentation and tooling.
 * 
 * Usage: ts-node scripts/extract-openapi-schema.ts
 */

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { AppModule } from '../apps/api/src/app.module';

async function extractOpenApiSchema() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error'], // Reduce noise
  });

  const config = new DocumentBuilder()
    .setTitle('Property Management API')
    .setDescription('API documentation for the multi‑tenant property management backend.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Write to file
  const outputPath = './openapi-schema.json';
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ OpenAPI schema exported to: ${outputPath}`);
  console.log(`📊 Endpoints documented: ${Object.keys(document.paths || {}).length}`);
  
  await app.close();
}

extractOpenApiSchema()
  .then(() => {
    console.log('✅ Schema extraction complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Schema extraction failed:', error);
    process.exit(1);
  });
