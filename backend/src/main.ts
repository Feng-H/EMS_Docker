import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { Request } from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局前缀
  app.setGlobalPrefix('api');

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS 配置，支持多个本地/内网地址
  app.enableCors({
    origin: (_origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  });

  // 登录请求监控日志
  app.use('/api/auth/login', (req: Request, _res, next) => {
    const username = req.body?.username;
    const origin = req.headers.origin;
    const userAgent = req.headers['user-agent'];
    const forwardedFor = req.headers['x-forwarded-for'];
    const remoteAddr = req.socket.remoteAddress;

    console.log(
      `[LOGIN-MONITOR] method=${req.method} url=${req.originalUrl} username=${username || ''} origin=${origin || ''} ua=${userAgent || ''} x-forwarded-for=${forwardedFor || ''} remote=${remoteAddr || ''}`,
    );

    next();
  });

  // Swagger API 文档
  const config = new DocumentBuilder()
    .setTitle('设备管理系统 API')
    .setDescription('EMS API 文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`应用运行在 http://localhost:${port}`);
  console.log(`API 文档: http://localhost:${port}/api/docs`);
}

bootstrap();
