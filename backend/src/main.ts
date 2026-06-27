import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT ?? 3001;
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';

  app.use(helmet());
  app.use(cookieParser());

  app.enableCors({
    origin: frontendUrl.split(',').map((s) => s.trim()),
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (process.env.NODE_ENV !== 'production') {
    const swagger = new DocumentBuilder()
      .setTitle('Prima Data Portal API')
      .setVersion('4.0.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));
  }

  await app.listen(port);
  Logger.log(`🚀 Backend running at http://localhost:${port}/api/v1`, 'Bootstrap');
  if (process.env.NODE_ENV !== 'production') {
    Logger.log(`📘 API docs at http://localhost:${port}/api/docs`, 'Bootstrap');
  }
}

bootstrap();
