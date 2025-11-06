# EMS Frontend

设备管理系统前端应用

## 技术栈

- Vue 3 (Composition API)
- TypeScript
- Vite
- Vue Router
- Pinia
- Element Plus (桌面端)
- Ionic Vue (移动端，待集成)

## 快速开始

### 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问应用
http://localhost:5173
```

### 构建

```bash
# 构建桌面端
npm run build:desktop

# 构建移动端
npm run build:mobile

# 构建所有
npm run build
```

## 项目结构

```
src/
├── assets/          # 静态资源
├── components/      # 公共组件
├── views/           # 页面视图
│   ├── desktop/     # 桌面端页面
│   └── mobile/      # 移动端页面
├── router/          # 路由配置
├── store/           # 状态管理
├── services/        # API 服务
├── utils/           # 工具函数
└── composables/     # 组合式函数
```

## 环境变量

创建 `.env` 文件：

```env
VITE_API_BASE_URL=http://localhost:3000/api
```
