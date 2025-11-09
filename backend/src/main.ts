import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Request } from 'express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UsersService } from './modules/users/users.service';
import { Role } from './modules/users/entities/role.entity';
import { User } from './modules/users/entities/user.entity';
import * as bcrypt from 'bcrypt';

async function ensureDatabaseSchema(app: INestApplication) {
  const dataSource = app.get(DataSource);
  const queries = [
    // 保养计划相关
    `ALTER TABLE maintenance_plans DROP COLUMN IF EXISTS device_id`,
    `ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS title VARCHAR(200)`,
    `ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS description TEXT`,
    `ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(20)`,
    `ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS frequency_value INTEGER`,
    `ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS next_due_at TIMESTAMP`,
    `ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS assigned_group_id INTEGER`,
    `ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS assigned_to INTEGER`,
    `ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true`,
    `ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS created_by INTEGER`,
    `CREATE TABLE IF NOT EXISTS maintenance_items (
      id SERIAL PRIMARY KEY,
      plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE CASCADE,
      name VARCHAR(200) NOT NULL,
      item_type VARCHAR(20) NOT NULL,
      qualitative_options JSONB,
      quantitative_settings JSONB,
      sort_order INTEGER DEFAULT 0,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_maintenance_items_plan ON maintenance_items(plan_id)`,
    `CREATE TABLE IF NOT EXISTS maintenance_plan_devices (
      plan_id INTEGER REFERENCES maintenance_plans(id) ON DELETE CASCADE,
      device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (plan_id, device_id)
    )`,
    `DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenance_items' AND column_name = 'qualitative_options'
      ) THEN
        ALTER TABLE maintenance_items RENAME COLUMN qualitative_options TO "qualitativeOptions";
      END IF;
    END $$`,
    `DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenance_items' AND column_name = 'quantitative_settings'
      ) THEN
        ALTER TABLE maintenance_items RENAME COLUMN quantitative_settings TO "quantitativeSettings";
      END IF;
    END $$`,
    `ALTER TABLE maintenance_items ADD COLUMN IF NOT EXISTS "qualitativeOptions" JSONB`,
    `ALTER TABLE maintenance_items ADD COLUMN IF NOT EXISTS "quantitativeSettings" JSONB`,

    // 保养任务相关
    `ALTER TABLE maintenance_tasks ADD COLUMN IF NOT EXISTS has_abnormal BOOLEAN DEFAULT false`,
    `ALTER TABLE maintenance_tasks ADD COLUMN IF NOT EXISTS abnormal_work_order_id INTEGER`,
    `ALTER TABLE maintenance_tasks ADD COLUMN IF NOT EXISTS review_notes TEXT`,
    `ALTER TABLE maintenance_tasks ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP`,
    `ALTER TABLE maintenance_tasks ADD COLUMN IF NOT EXISTS reviewed_by INTEGER`,
    `DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'maintenance_tasks' AND column_name = 'attachments' AND data_type = 'ARRAY'
      ) THEN
        ALTER TABLE maintenance_tasks ALTER COLUMN attachments DROP DEFAULT;
        ALTER TABLE maintenance_tasks ALTER COLUMN attachments TYPE TEXT USING array_to_string(attachments, ',');
      END IF;
    END $$`,
    `ALTER TABLE maintenance_tasks ADD COLUMN IF NOT EXISTS attachments TEXT DEFAULT ''`,
    `ALTER TABLE maintenance_tasks ALTER COLUMN attachments SET DEFAULT ''`,
    `ALTER TABLE maintenance_tasks ALTER COLUMN attachments TYPE TEXT USING COALESCE(attachments, '')`,

    // 工单相关
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS reporter_id INTEGER`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS device_id INTEGER`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS title VARCHAR(200)`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS description TEXT`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal'`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'created'`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS assigned_to INTEGER`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS started_at TIMESTAMP`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS response_time INTEGER`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS repair_time INTEGER`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}'`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS fault_category VARCHAR(100)`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS fault_cause TEXT`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS solution TEXT`,
    `DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'work_orders' AND column_name = 'attachments' AND data_type = 'ARRAY'
      ) THEN
        ALTER TABLE work_orders ALTER COLUMN attachments DROP DEFAULT;
        ALTER TABLE work_orders ALTER COLUMN attachments TYPE TEXT USING array_to_string(attachments, ',');
      END IF;
    END $$`,
    `ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS attachments TEXT DEFAULT ''`,
    `ALTER TABLE work_orders ALTER COLUMN attachments SET DEFAULT ''`,
    `ALTER TABLE work_orders ALTER COLUMN attachments TYPE TEXT USING COALESCE(attachments, '')`,

    // 备件相关
    `ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS brand VARCHAR(100)`,
    `ALTER TABLE spare_parts ALTER COLUMN unit SET DEFAULT 'pc'`,
  ];

  for (const query of queries) {
    try {
      await dataSource.query(query);
    } catch (error) {
      console.error('[bootstrap] 数据库结构同步失败:', query, error.message || error);
    }
  }
}

async function ensureDefaultAdmin(app: INestApplication) {
  try {
    console.log('[bootstrap] 正在检查默认管理员账号配置...');
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
    let role = await roleRepository.findOne({ where: { name: roleName } });

    if (exists) {
      if (forceReset) {
        if (!role) {
          console.warn(`[bootstrap] 未找到名为 ${roleName} 的角色，正在自动创建默认角色...`);
          role = roleRepository.create({
            name: roleName,
            description: '系统管理员',
            permissions: { all: true },
          });
          role = await roleRepository.save(role);
          console.log(`[bootstrap] 已创建默认角色：${roleName}`);
        }
        exists.role = role;
        exists.roleId = role?.id;
        exists.name = name;
        exists.employeeNo = employeeNo;
        exists.isActive = true;
        exists.passwordHash = await bcrypt.hash(password, 10);
        await userRepository.save(exists);
        console.log(`[bootstrap] 默认管理员账号已重置：${username}/${password}`);
      }
      return;
    }

    if (!role) {
      console.warn(`[bootstrap] 未找到名为 ${roleName} 的角色，正在自动创建默认角色...`);
      role = roleRepository.create({
        name: roleName,
        description: '系统管理员',
        permissions: { all: true },
      });
      role = await roleRepository.save(role);
      console.log(`[bootstrap] 已创建默认角色：${roleName}`);
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

  await app.init();
  await ensureDatabaseSchema(app);
  await ensureDefaultAdmin(app);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`应用运行在 http://localhost:${port}`);
  console.log(`API 文档: http://localhost:${port}/api/docs`);
}

bootstrap();
