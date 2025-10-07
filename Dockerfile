# 前端静态文件服务 Dockerfile
FROM nginx:alpine

# 安装必要工具
RUN apk add --no-cache curl

# 创建应用目录
WORKDIR /usr/share/nginx/html

# 复制静态文件
COPY index.html .
COPY login.html .
COPY orders.html .
COPY css/ ./css/
COPY js/ ./js/
COPY images/ ./images/

# 复制 Nginx 配置
COPY docker/nginx/frontend.conf /etc/nginx/conf.d/default.conf

# 创建日志目录
RUN mkdir -p /var/log/nginx

# 设置权限
RUN chown -R nginx:nginx /usr/share/nginx/html
RUN chmod -R 755 /usr/share/nginx/html

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# 暴露端口
EXPOSE 80

# 启动命令
CMD ["nginx", "-g", "daemon off;"]