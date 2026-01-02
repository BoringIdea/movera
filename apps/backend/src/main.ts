import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Aptos Attestation Service API')
    .setDescription(
      'A comprehensive API for managing Aptos blockchain attestations and schemas. This service provides endpoints for querying, searching, and managing attestations and their associated schemas on the Aptos network.',
    )
    .setVersion('1.0.0')
    .addTag('Aptos Attestation Service', 'Endpoints for attestation and schema management')
    .addServer('http://localhost:8080', 'Development server')
    .addServer('https://api.example.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
      showRequestHeaders: true,
      tryItOutEnabled: true,
    },
    customSiteTitle: 'Aptos Attestation API Documentation',
  });

  console.log('🚀 Server is running on http://localhost:8080');
  console.log('📚 API Documentation available at http://localhost:8080/api/docs');
  
  await app.listen(8080);
}
bootstrap();
