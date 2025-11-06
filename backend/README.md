# EMS Backend

设备管理系统后端服务

## 技术栈

- NestJS
- TypeScript
- TypeORM
- PostgreSQL
- Redis
- MinIO
- JWT Authentication

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run start:dev

# 访问 API 文档
http://localhost:3000/api/docs
```

### 使用 Docker

```bash
# 在项目根目录运行
docker-compose up -d backend
```

## 环境变量

参考 `.env.example` 创建 `.env` 文件

## 数据库迁移

```bash
# 生成迁移
npm run migration:generate -- -n MigrationName

# 运行迁移
npm run migration:run

# 回滚迁移
npm run migration:revert
```

## 测试

```bash
# 单元测试
npm run test

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:cov
```
