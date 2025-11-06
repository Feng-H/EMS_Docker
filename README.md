# 设备管理系统 (EMS)

## 项目概述

设备管理系统是一套完整的设备生命周期管理解决方案，支持设备台账管理、保养管理、维修管理、备件管理和人员管理。系统同时提供桌面端（管理后台）和移动端（执行端）两个版本。

## 技术栈

- **前端**: Vue 3 + Composition API + Vue Router + Pinia
  - 桌面端: Element Plus
  - 移动端: Ionic Vue + Capacitor
- **后端**: NestJS + TypeScript
- **数据库**: PostgreSQL
- **缓存**: Redis
- **文件存储**: MinIO
- **容器化**: Docker + Docker Compose
- **API 文档**: OpenAPI/Swagger

## 快速开始

### 使用 Docker 启动（推荐）

```bash
# 1. 复制环境变量文件
cp .env.example .env

# 2. 启动所有服务
docker-compose up -d

# 3. 访问应用
# 前端: http://localhost:5173
# 后端 API: http://localhost:3000/api/docs
```

详细文档请参考 [部署文档](./DEPLOYMENT.md)

## 项目状态

✅ 项目基础架构已完成
✅ 认证系统已实现
✅ 数据库设计已完成
✅ 基础模块框架已搭建

详细功能开发进度请查看各模块文档。
