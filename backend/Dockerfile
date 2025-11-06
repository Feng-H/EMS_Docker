FROM node:20-alpine AS builder

WORKDIR /app

# 配置 npm 镜像源
RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app

# 配置 npm 镜像源
RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
