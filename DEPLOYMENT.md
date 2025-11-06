# 部署文档

## 使用 Docker Compose 部署

### 开发环境

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 生产环境

1. 复制环境变量文件：

```bash
cp .env.example .env
```

2. 修改 `.env` 文件中的配置（特别是密码和密钥）

3. 启动服务：

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 服务访问

- 前端: http://localhost:80
- 后端 API: http://localhost:3000
- API 文档: http://localhost:3000/api/docs
- MinIO 控制台: http://localhost:9001 (默认用户名/密码: minioadmin/minioadmin)

## 数据库初始化

数据库容器启动时会自动执行 `backend/database/init.sql` 脚本。

首次运行后，建议通过应用创建管理员用户，或手动插入：

```sql
-- 注意：密码需要先使用 bcrypt 加密
INSERT INTO users (username, password_hash, name, role_id) VALUES
('admin', '$2b$10$加密后的密码', '系统管理员', 1);
```

## 备份

### 数据库备份

```bash
docker exec ems-postgres-prod pg_dump -U ems_user ems_db > backup.sql
```

### 恢复

```bash
docker exec -i ems-postgres-prod psql -U ems_user ems_db < backup.sql
```

## 日志

查看服务日志：

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 更新

```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose -f docker-compose.prod.yml up -d --build
```
