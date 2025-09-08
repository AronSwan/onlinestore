# 部署与运维文档

## 文档信息
- **版本**: 1.0.0
- **创建时间**: 2025-01-14
- **最后更新**: 2025-01-14
- **维护者**: 开发团队

## 目录
1. [环境要求](#环境要求)
2. [部署前准备](#部署前准备)
3. [本地开发环境](#本地开发环境)
4. [生产环境部署](#生产环境部署)
5. [Docker部署](#docker部署)
6. [监控与日志](#监控与日志)
7. [备份与恢复](#备份与恢复)
8. [故障排除](#故障排除)
9. [性能优化](#性能优化)
10. [安全配置](#安全配置)

## 环境要求

### 最低系统要求
- **操作系统**: Linux (Ubuntu 20.04+), Windows 10+, macOS 10.15+
- **内存**: 最少 2GB RAM，推荐 4GB+
- **存储**: 最少 1GB 可用空间
- **网络**: 稳定的互联网连接

### 软件依赖
- **Web服务器**: Python 3.8+ (内置http.server) 或 Nginx/Apache
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **开发工具**: Node.js 16+ (用于开发工具链)
- **版本控制**: Git 2.25+

### 可选依赖
- **Docker**: 20.10+ (容器化部署)
- **Docker Compose**: 1.29+ (多容器编排)
- **SSL证书**: Let's Encrypt 或商业证书

## 部署前准备

### 1. 代码获取
```bash
# 克隆仓库
git clone <repository-url>
cd caddy-style-shopping-site

# 检查代码完整性
git log --oneline -10
ls -la
```

### 2. 环境配置
```bash
# 复制环境配置模板
cp .env.example .env

# 编辑环境变量
vim .env
```

### 3. 依赖安装
```bash
# 安装Node.js依赖（开发环境）
npm install

# 运行代码质量检查
npm run quality:check
```

## 本地开发环境

### 快速启动
```bash
# 方法1: 使用Python内置服务器
python -m http.server 8000

# 方法2: 使用npm脚本
npm run serve

# 方法3: 使用开发模式（包含质量检查）
npm run dev
```

### 开发工具
```bash
# 代码格式化
npm run format

# 代码检查
npm run lint

# 运行测试
npm run test

# 测试覆盖率
npm run test:coverage
```

### 本地访问
- **主站**: http://localhost:8000
- **测试页面**: http://localhost:8002/test-runner.html
- **API文档**: http://localhost:8000/docs (如果配置)

## 生产环境部署

### 1. 服务器准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install -y nginx python3 python3-pip git certbot

# 创建部署用户
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG sudo deploy
```

### 2. 代码部署
```bash
# 切换到部署用户
sudo su - deploy

# 克隆代码
git clone <repository-url> /var/www/caddy-shopping
cd /var/www/caddy-shopping

# 设置权限
sudo chown -R deploy:www-data /var/www/caddy-shopping
sudo chmod -R 755 /var/www/caddy-shopping
```

### 3. Nginx配置
```nginx
# /etc/nginx/sites-available/caddy-shopping
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    root /var/www/caddy-shopping;
    index index.html;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # 静态文件缓存
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # HTML文件
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # 主页面
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API代理（如果需要）
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 安全配置
    location ~ /\. {
        deny all;
    }
    
    location ~ ~$ {
        deny all;
    }
}
```

### 4. 启用站点
```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/caddy-shopping /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

### 5. SSL证书配置
```bash
# 获取Let's Encrypt证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
sudo crontab -e
# 添加: 0 12 * * * /usr/bin/certbot renew --quiet
```

## Docker部署

### 1. Dockerfile
```dockerfile
# Dockerfile
FROM nginx:alpine

# 复制网站文件
COPY . /usr/share/nginx/html

# 复制Nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

### 2. Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # 可选: 添加监控服务
  monitoring:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    restart: unless-stopped

networks:
  default:
    driver: bridge
```

### 3. 部署命令
```bash
# 构建和启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 更新部署
docker-compose pull
docker-compose up -d

# 停止服务
docker-compose down
```

## 监控与日志

### 1. 系统监控
```bash
# 系统资源监控
top
htop
df -h
free -m

# 网络监控
netstat -tulpn
ss -tulpn
```

### 2. Web服务器日志
```bash
# Nginx访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx错误日志
sudo tail -f /var/log/nginx/error.log

# 日志分析
sudo grep "404" /var/log/nginx/access.log | tail -10
sudo grep "error" /var/log/nginx/error.log | tail -10
```

### 3. 性能监控
```bash
# 网站响应时间
curl -o /dev/null -s -w "Time: %{time_total}s\n" http://your-domain.com

# 并发测试
ab -n 1000 -c 10 http://your-domain.com/
```

### 4. 自动化监控脚本
```bash
#!/bin/bash
# monitor.sh

LOG_FILE="/var/log/site-monitor.log"
SITE_URL="http://your-domain.com"

echo "$(date): 开始监控检查" >> $LOG_FILE

# 检查网站可用性
if curl -f -s $SITE_URL > /dev/null; then
    echo "$(date): 网站正常" >> $LOG_FILE
else
    echo "$(date): 网站异常!" >> $LOG_FILE
    # 发送告警邮件
    echo "网站 $SITE_URL 无法访问" | mail -s "网站告警" admin@example.com
fi

# 检查磁盘空间
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): 磁盘空间不足: ${DISK_USAGE}%" >> $LOG_FILE
fi
```

## 备份与恢复

### 1. 文件备份
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/caddy-shopping"
SOURCE_DIR="/var/www/caddy-shopping"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份网站文件
tar -czf "$BACKUP_DIR/site_$DATE.tar.gz" -C "$SOURCE_DIR" .

# 保留最近7天的备份
find $BACKUP_DIR -name "site_*.tar.gz" -mtime +7 -delete

echo "备份完成: site_$DATE.tar.gz"
```

### 2. 配置备份
```bash
# 备份Nginx配置
sudo cp /etc/nginx/sites-available/caddy-shopping /backup/nginx_config_$(date +%Y%m%d).conf

# 备份SSL证书
sudo cp -r /etc/letsencrypt /backup/ssl_$(date +%Y%m%d)/
```

### 3. 恢复流程
```bash
# 恢复网站文件
cd /var/www
sudo rm -rf caddy-shopping
sudo tar -xzf /backup/caddy-shopping/site_YYYYMMDD_HHMMSS.tar.gz
sudo chown -R deploy:www-data caddy-shopping

# 恢复Nginx配置
sudo cp /backup/nginx_config_YYYYMMDD.conf /etc/nginx/sites-available/caddy-shopping
sudo nginx -t
sudo systemctl reload nginx
```

## 故障排除

### 常见问题

#### 1. 网站无法访问
```bash
# 检查Nginx状态
sudo systemctl status nginx

# 检查端口占用
sudo netstat -tulpn | grep :80

# 检查防火墙
sudo ufw status

# 检查DNS解析
nslookup your-domain.com
```

#### 2. 静态文件404错误
```bash
# 检查文件权限
ls -la /var/www/caddy-shopping/

# 检查Nginx配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

#### 3. SSL证书问题
```bash
# 检查证书状态
sudo certbot certificates

# 测试证书
openssl s_client -connect your-domain.com:443

# 手动续期
sudo certbot renew --dry-run
```

#### 4. 性能问题
```bash
# 检查系统负载
uptime
top

# 检查内存使用
free -m

# 检查磁盘IO
iostat -x 1
```

### 日志分析
```bash
# 分析访问模式
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10

# 分析请求状态
awk '{print $9}' /var/log/nginx/access.log | sort | uniq -c | sort -nr

# 分析请求路径
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -nr | head -10
```

## 性能优化

### 1. 前端优化
- **文件压缩**: 启用Gzip压缩
- **缓存策略**: 设置合适的Cache-Control头
- **CDN**: 使用内容分发网络
- **图片优化**: 使用WebP格式，懒加载

### 2. 服务器优化
```nginx
# Nginx性能优化
worker_processes auto;
worker_connections 1024;

# 启用Gzip
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# 缓存配置
open_file_cache max=1000 inactive=20s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;
open_file_cache_errors on;
```

### 3. 监控指标
- **响应时间**: < 200ms
- **可用性**: > 99.9%
- **错误率**: < 0.1%
- **并发用户**: 根据业务需求

## 安全配置

### 1. 服务器安全
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 配置防火墙
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# 禁用root登录
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

### 2. Web安全
```nginx
# 安全头配置
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

# 隐藏服务器信息
server_tokens off;

# 限制请求大小
client_max_body_size 10M;

# 防止DDoS
limit_req_zone $binary_remote_addr zone=one:10m rate=1r/s;
limit_req zone=one burst=5;
```

### 3. 定期安全检查
```bash
# 检查开放端口
sudo nmap -sT -O localhost

# 检查系统漏洞
sudo apt list --upgradable

# 检查登录日志
sudo grep "Failed password" /var/log/auth.log | tail -10
```

## 维护计划

### 日常维护
- 检查网站可用性
- 监控系统资源使用
- 查看错误日志
- 备份重要数据

### 周期维护
- **每周**: 系统更新，日志清理
- **每月**: 性能分析，安全检查
- **每季度**: 备份测试，灾难恢复演练
- **每年**: 证书更新，架构评估

### 应急响应
1. **故障检测**: 自动监控告警
2. **问题定位**: 日志分析，性能诊断
3. **快速恢复**: 备份恢复，服务重启
4. **根因分析**: 问题复盘，流程改进

---

## 联系信息
- **技术支持**: tech-support@example.com
- **紧急联系**: +86-xxx-xxxx-xxxx
- **文档维护**: dev-team@example.com

## 更新日志
- **v1.0.0** (2025-01-14): 初始版本，包含基础部署和运维指南

---

*本文档将根据项目发展持续更新，请定期检查最新版本。*