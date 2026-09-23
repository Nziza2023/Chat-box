import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers (protects against a range of common web attacks)
  app.use(helmet({ crossOriginResourcePolicy: false }));

  // Lets us read the httpOnly refresh-token cookie on incoming requests
  app.use(cookieParser());

  // Allows our Next.js frontend (different port) to call this API and send cookies
  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // Runs every incoming request body through our DTO validation rules
  // (the @IsEmail, @MinLength etc. decorators we wrote in the dto files).
  // whitelist: true strips any extra fields the client sends that we didn't ask for.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.setGlobalPrefix('api'); // every REST route becomes /api/... (e.g. /api/auth/login)

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
