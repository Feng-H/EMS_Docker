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
docker compose up -d
# 浏览器访问 http://localhost:5173
# 后端文档 http://localhost:3000/api/docs
```

更多环境变量说明可参考仓库中的示例配置文件。

## 许可与开发说明

- 项目协议：MIT License。
- 本项目使用 Cursor 协同开发完成。
- 作者介绍：三一集团智能制造总部设备工程师，主导集团设备管理系统开发。本项目也没有完全参考三一设备管理体系设计，源代码与三一集团无任何隶属或共享关系，功能是依据对设备管理的理解要求Cursor来实现。
