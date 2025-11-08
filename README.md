# 设备管理系统 (EMS)

## 系统功能

- **设备台账**：设备入库、导入导出、资产编号与厂房信息管理。
- **保养管理**：保养计划、周期调度、任务执行与异常工单联动。
- **维修管理**：报修、派工、执行、验收、备件领用与旧件台账。
- **备件管理**：库存预警、品牌与单位约束、旧件记录。
- **人员管理**：角色权限控制、批量导入、密码管理。
- **多端体验**：桌面端用于管理分析，移动端支持保养/维修执行与报修。

## 架构简介

- **前端**：Vue 3、Pinia、Vue Router，桌面端采用 Element Plus，移动端自适配触屏交互。
- **后端**：NestJS + TypeScript，TypeORM 访问 PostgreSQL，集成 Redis、MinIO 与 Swagger。
- **部署**：Docker Compose 编排前后端、数据库、缓存与对象存储，支持定时任务与 RBAC。

## 部署方式

```bash
git clone https://github.com/Feng-H/EMS_Docker.git
cd EMS_Docker
docker compose -f docker-compose.prod.yml up -d
# 浏览器访问 http://<服务器IP或域名>:7080
# 后端 API 转发到 /api（无需手动指定 localhost）
```

更多环境变量说明可参考仓库中的示例配置文件。部署时务必覆盖 `docker-compose.prod.yml` 中的 `JWT_SECRET`（可通过环境变量或修改 Compose 文件）以保证令牌安全。

## 常见问题

- **JwtStrategy requires a secret or key**：说明容器未获取 `JWT_SECRET`，请在部署环境中设置该变量或在 Compose 中提供安全的默认值。
- **Bind for 0.0.0.0:80 failed: port is already allocated**：宿主机 80 端口已被占用，可先释放占用端口，或修改 Compose 映射（如 `8080:80`）后重新启动。
- **默认管理员账号**：`docker-compose.prod.yml` 默认将 `DEFAULT_ADMIN_*` 环境变量注入后端，并开启 `DEFAULT_ADMIN_FORCE_RESET=true`，确保每次部署后都存在 `admin / admin123`（可自行覆盖为更安全的凭证）。

## 许可与开发说明

- 项目协议：MIT License。
- 本项目使用 Cursor 协同开发完成。
- 作者介绍：三一集团智能制造总部设备工程师，主导集团设备管理系统开发。本项目也没有完全参考三一设备管理体系设计，源代码与三一集团无任何隶属或共享关系，功能是依据对设备管理的理解要求Cursor来实现。
