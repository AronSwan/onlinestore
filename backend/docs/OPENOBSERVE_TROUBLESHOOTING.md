# OpenObserve 故障排除指南

## 常见问题：无法登录

### 问题 1：默认凭据不正确

OpenObserve 的默认凭据可能因版本而异。请尝试以下组合：

#### 组合 1（推荐）
- 邮箱：`admin@example.com`
- 密码：`CHANGE_ME_openobserve_password`

#### 组合 2
- 邮箱：`admin@openobserve.com`
- 密码：`admin`

#### 组合 3
- 用户名：`admin`
- 密码：`admin`

#### 组合 4
- 用户名：`root`
- 密码：`root@example.com`

### 问题 2：容器未正确启动

检查容器状态：

```bash
# 查看容器状态
docker ps | grep openobserve

# 查看容器日志
docker logs openobserve

# 如果容器未运行，重新启动
docker-compose -f docker/openobserve/docker-compose.yml up -d
```

### 问题 3：端口冲突

如果 5080 端口被占用，修改 Docker Compose 配置：

```yaml
# 在 docker-compose.yml 中修改端口映射
ports:
  - "5081:5080"  # 使用 5081 端口
```

### 问题 4：网络问题

检查网络连接：

```bash
# 检查服务是否响应
curl -I http://localhost:5080

# 检查健康状态
curl http://localhost:5080/api/_health
```

## 完整的故障排除步骤

### 步骤 1：重置 OpenObserve

如果忘记密码或遇到认证问题，可以重置 OpenObserve：

```bash
# 停止容器
docker-compose -f docker/openobserve/docker-compose.yml down

# 删除数据卷（注意：这会删除所有数据）
docker volume rm openobserve_data

# 重新启动
docker-compose -f docker/openobserve/docker-compose.yml up -d

# 等待服务启动（约30秒）
sleep 30

# 重新初始化
node scripts/init-openobserve-streams.js
```

### 步骤 2：创建新用户

如果默认用户无法使用，可以通过 API 创建新用户：

```bash
# 创建用户脚本
cat > create-user.js << 'EOF'
const axios = require('axios');

async function createUser() {
  try {
    const response = await axios.post('http://localhost:5080/api/default/users', {
      email: 'admin@example.com',
      password: 'CHANGE_ME_openobserve_password',
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ User created successfully');
    console.log('Email: admin@example.com');
    console.log('Password: CHANGE_ME_openobserve_password');
  } catch (error) {
    console.error('❌ Failed to create user:', error.response?.data || error.message);
  }
}

createUser();
EOF

# 运行脚本
node create-user.js
```

### 步骤 3：检查环境变量

确保环境变量正确设置：

```bash
# 检查当前环境变量
cat .env.openobserve | grep -E "(USERNAME|PASSWORD|EMAIL)"

# 如果需要，更新环境变量
sed -i 's/LOGGING_OPENOBSERVE_USERNAME=.*/LOGGING_OPENOBSERVE_USERNAME=admin@example.com/' .env.openobserve
sed -i 's/LOGGING_OPENOBSERVE_PASSWORD=.*/LOGGING_OPENOBSERVE_PASSWORD=CHANGE_ME_openobserve_password/' .env.openobserve
```

### 步骤 4：使用 Token 认证

如果密码认证有问题，可以使用 Token 认证：

1. 访问 OpenObserve Web UI
2. 尝试使用任何凭据登录（即使失败）
3. 检查浏览器开发者工具中的网络请求
4. 或者通过 API 获取 Token：

```bash
# 获取 Token
curl -X POST http://localhost:5080/api/default/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"CHANGE_ME_openobserve_password"}'
```

### 步骤 5：修改 Docker Compose 配置

如果仍有问题，尝试使用更简单的配置：

```yaml
# 更新 docker-compose.yml
version: '3.8'

services:
  openobserve:
    image: public.ecr.aws/zinclabs/openobserve:latest
    container_name: openobserve
    ports:
      - "5080:5080"
    environment:
      - ZO_ROOT_USER_EMAIL=admin@example.com
      - ZO_ROOT_USER_PASSWORD=CHANGE_ME_openobserve_password
      - ZO_DATA_DIR=/data
    volumes:
      - openobserve_data:/data
    restart: unless-stopped

volumes:
  openobserve_data:
```

## 替代解决方案

### 方案 1：使用预配置的 Docker 镜像

```bash
# 使用包含默认用户的镜像
docker run -d \
  --name openobserve \
  -p 5080:5080 \
  -e ZO_ROOT_USER_EMAIL=admin@example.com \
  -e ZO_ROOT_USER_PASSWORD=CHANGE_ME_openobserve_password \
  public.ecr.aws/zinclabs/openobserve:latest
```

### 方案 2：使用 Kubernetes

如果 Docker 有问题，可以尝试 Kubernetes 部署：

```yaml
# openobserve-k8s.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openobserve
spec:
  replicas: 1
  selector:
    matchLabels:
      app: openobserve
  template:
    metadata:
      labels:
        app: openobserve
    spec:
      containers:
      - name: openobserve
        image: public.ecr.aws/zinclabs/openobserve:latest
        ports:
        - containerPort: 5080
        env:
        - name: ZO_ROOT_USER_EMAIL
          value: "admin@example.com"
        - name: ZO_ROOT_USER_PASSWORD
          value: "CHANGE_ME_openobserve_password"
---
apiVersion: v1
kind: Service
metadata:
  name: openobserve-service
spec:
  selector:
    app: openobserve
  ports:
  - port: 5080
    targetPort: 5080
  type: LoadBalancer
```

## 验证配置

### 检查服务状态

```bash
# 健康检查
curl http://localhost:5080/api/_health

# 检查版本
curl http://localhost:5080/api/version

# 检查组织
curl http://localhost:5080/api/organizations
```

### 测试 API 访问

```bash
# 测试基本 API 访问
curl -X GET http://localhost:5080/api/default/streams \
  -H "Authorization: Basic $(echo -n 'admin@example.com:CHANGE_ME_openobserve_password' | base64)"
```

## 联系支持

如果以上方法都无法解决问题：

1. 查看 [OpenObserve 官方文档](https://openobserve.ai/docs)
2. 检查 [GitHub Issues](https://github.com/openobserve/openobserve/issues)
3. 查看 [OpenObserve 社区](https://github.com/openobserve/openobserve/discussions)

## 快速修复脚本

创建一个快速修复脚本：

```bash
#!/bin/bash
# quick-fix-openobserve.sh

echo "🔧 Quick fix for OpenObserve login issues"

# 停止现有容器
docker-compose -f docker/openobserve/docker-compose.yml down 2>/dev/null || docker stop openobserve 2>/dev/null || true

# 删除容器和卷
docker rm openobserve 2>/dev/null || true
docker volume rm openobserve_data 2>/dev/null || true

# 重新创建配置
cat > docker/openobserve/docker-compose.yml << 'EOF'
version: '3.8'

services:
  openobserve:
    image: public.ecr.aws/zinclabs/openobserve:latest
    container_name: openobserve
    ports:
      - "5080:5080"
    environment:
      - ZO_ROOT_USER_EMAIL=admin@example.com
      - ZO_ROOT_USER_PASSWORD=CHANGE_ME_openobserve_password
    volumes:
      - openobserve_data:/data
    restart: unless-stopped

volumes:
  openobserve_data:
EOF

# 启动服务
docker-compose -f docker/openobserve/docker-compose.yml up -d

# 等待启动
echo "⏳ Waiting for OpenObserve to start..."
sleep 30

# 检查状态
if curl -f http://localhost:5080/api/_health > /dev/null 2>&1; then
    echo "✅ OpenObserve is running"
    echo "🌐 Web UI: http://localhost:5080"
    echo "📋 Login: admin@example.com / CHANGE_ME_openobserve_password"
else
    echo "❌ OpenObserve failed to start"
    echo "📋 Logs:"
    docker logs openobserve
fi
```

运行修复脚本：

```bash
chmod +x quick-fix-openobserve.sh
./quick-fix-openobserve.sh