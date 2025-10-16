# 测试运行器Docker镜像
FROM node:18-alpine

# 安装必要的系统依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    docker \
    docker-cli \
    redis-tools

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 创建测试目录
RUN mkdir -p /app/tests

# 复制测试脚本
COPY scripts/ /app/tests/

# 设置权限
RUN chmod +x /app/tests/*.cjs

# 暴露端口
EXPOSE 3000

# 设置环境变量
ENV NODE_ENV=test
ENV NODE_PATH=/app/node_modules

# 启动命令
CMD ["/bin/sh"]