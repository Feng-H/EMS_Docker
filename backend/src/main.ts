import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Request } from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './modules/users/users.service';
import { Role } from './modules/users/entities/role.entity';
import { User } from './modules/users/entities/user.entity';
import * as bcrypt from 'bcrypt';

async function ensureDefaultAdmin(app: INestApplication) {
  try {
    const usersService = app.get(UsersService);
    const configService = app.get(ConfigService);
    const roleRepository = app.get<Repository<Role>>(getRepositoryToken(Role));
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));

    const username = configService.get<string>('DEFAULT_ADMIN_USERNAME', 'admin');
    const password = configService.get<string>('DEFAULT_ADMIN_PASSWORD', 'admin123');
    const name = configService.get<string>('DEFAULT_ADMIN_NAME', '系统管理员');
    const employeeNo = configService.get<string>('DEFAULT_ADMIN_EMPLOYEE_NO', 'ADMIN001');
    const roleName = configService.get<string>('DEFAULT_ADMIN_ROLE', 'admin');
    const forceReset = configService.get<string>('DEFAULT_ADMIN_FORCE_RESET', 'false').toLowerCase() === 'true';

    const exists = await usersService.findByUsername(username);
    if (exists) {
      if (forceReset) {
        const role = await roleRepository.findOne({ where: { name: roleName } });
        if (role) {
          exists.role = role;
          exists.roleId = role.id;
        }
        exists.name = name;
        exists.employeeNo = employeeNo;
        exists.isActive = true;
        exists.passwordHash = await bcrypt.hash(password, 10);
        await userRepository.save(exists);
        console.log(`[bootstrap] 默认管理员账号已重置：${username}/${password}`);
      }
      return;
    }

    const role = await roleRepository.findOne({ where: { name: roleName } });
    if (!role) {
      console.warn(`[bootstrap] 未找到名为 ${roleName} 的角色，默认管理员未创建`);
      return;
    }

    const user = await usersService.create({
      username,
      password,
      name,
      employeeNo,
      roleId: role.id,
      isActive: true,
    });

    console.log(`[bootstrap] 已自动创建默认管理员账号：${username}/${password}`);
  } catch (error) {
    console.error('[bootstrap] 创建默认管理员账号失败:', error);
  }
}

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

  await ensureDefaultAdmin(app);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`应用运行在 http://localhost:${port}`);
  console.log(`API 文档: http://localhost:${port}/api/docs`);
}

bootstrap();
