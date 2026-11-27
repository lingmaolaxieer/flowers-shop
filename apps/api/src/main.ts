import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';

async function bootstrap(): Promise<void> {
  validateEnv();
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const prefix = config.get<string>('app.apiPrefix') ?? 'api/v1';
  app.setGlobalPrefix(prefix);

  // whitelist + forbidNonWhitelisted：客户端多传 tenant_id 等字段直接拒绝，加固租户隔离
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({ origin: true, credentials: true });

  const port = config.get<number>('app.port') ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`API 已启动: http://localhost:${port}/${prefix}`);
}

void bootstrap();
