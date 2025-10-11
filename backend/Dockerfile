# 后端服务 Dockerfile（修订版，兼容 Nest 构建与健康检查）

# 构建阶段：安装全部依赖并进行编译
FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++
WORKDIR /app

# 复制依赖与配置
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# 安装全部依赖（包含 devDependencies）
RUN npm ci

# 复制源代码
COPY src/ ./src/

# 构建应用
RUN npm run build

# 仅保留生产依赖
RUN npm prune --production && npm cache clean --force

# 运行时阶段：精简镜像并配置健康检查
FROM node:22-alpine AS runtime

RUN apk add --no-cache dumb-init curl
WORKDIR /app

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# 复制构建产物与生产依赖
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

# 不在镜像中复制 .env；通过环境变量或挂载配置提供
# 创建日志目录
RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app/logs

USER nestjs

# 健康检查（与全局前缀 api 保持一致）
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]