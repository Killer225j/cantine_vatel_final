import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiErrorResponseDto, ApiPaginatedResponseDto } from './common/dto/api-response.dto';
import { attachErrorEnvelope } from './common/swagger/attach-error-envelope';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { globalValidationPipe } from './common/pipes/validation.pipe';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService<AppConfig, true>);
  const port = configService.get('port', { infer: true });
  const corsOrigins = configService.get('cors', { infer: true }).origins;

  app.setGlobalPrefix('api/v1');

  // Le back-office (navigateur) a besoin du CORS. L'appli mobile n'est pas concernée.
  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.useGlobalPipes(globalValidationPipe);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new TransformInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Cantine Vatel API')
    .setDescription(
      'API de la cantine : comptes, menus, réservations par créneau, portefeuille et tableau de bord.',
    )
    .setVersion('0.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Jeton obtenu par POST /auth/login',
      },
      'access-token',
    )
    .addTag('Auth', 'Inscription, connexion, jetons et compte')
    .addTag('Navigation', 'Menu de navigation du back-office selon le rôle')
    .addTag('Health', 'Sonde de santé (sert aussi à réveiller Render)')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    extraModels: [ApiErrorResponseDto, ApiPaginatedResponseDto],
  });
  attachErrorEnvelope(document);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
    },
    customSiteTitle: 'Cantine Vatel API',
  });

  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`\nCantine Vatel API : http://localhost:${port}/api/v1`);
  console.log(`Swagger           : http://localhost:${port}/api/docs\n`);
}

bootstrap();
