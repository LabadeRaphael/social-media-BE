/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );
  console.log(process.env.PORT);
   app.enableCors({
    origin: "http://localhost:3000", // ✅ your Next.js frontend
    credentials: true,              // ✅ allow cookies
  });
  await app.listen(process.env.PORT ?? 3000);
  
}
bootstrap();
