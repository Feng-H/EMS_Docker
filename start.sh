#!/bin/bash

echo "🚀 启动设备管理系统 (EMS)..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker 未运行，请先启动 Docker Desktop"
    exit 1
fi

echo "✓ Docker 正在运行"

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，正在创建..."
    cp .env.example .env 2>/dev/null || echo "# 环境变量配置文件" > .env
    echo "✓ .env 文件已创建，请根据需要修改配置"
fi

# 启动服务
echo "📦 正在启动服务..."
docker-compose up -d --build

echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "📊 服务状态:"
docker-compose ps

echo ""
echo "✅ 启动完成！"
echo ""
echo "📍 服务访问地址:"
echo "   前端: http://localhost:5173"
echo "   后端 API: http://localhost:3000"
echo "   API 文档: http://localhost:3000/api/docs"
echo "   MinIO 控制台: http://localhost:9001 (用户名/密码: minioadmin/minioadmin)"
echo ""
echo "📝 查看日志: docker-compose logs -f"
echo "🛑 停止服务: docker-compose down"
