# 阶段4部署: 美团安全配置+文档同步

## 1. 秘密管理配置

### 1.1 环境变量配置
```bash
# 生产环境配置
API_SECRET_KEY=${VAULT_API_SECRET}
DB_PASSWORD=${VAULT_DB_PASSWORD}
JWT_SECRET=${VAULT_JWT_SECRET}
REDIS_PASSWORD=${VAULT_REDIS_PASSWORD}
```

### 1.2 Vault集成配置
```yaml
# vault-config.yml
vault:
  address: "https://vault.internal.company.com"
  auth_method: "kubernetes"
  role: "shopping-site-prod"
  secrets:
    - path: "secret/shopping-site/api"
      key: "api_secret_key"
    - path: "secret/shopping-site/db"
      key: "db_password"
```

### 1.3 K8s Secrets配置
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: shopping-site-secrets
  namespace: production
type: Opaque
data:
  api-secret: <base64-encoded-secret>
  db-password: <base64-encoded-password>
```

## 2. 环境配置隔离

### 2.1 开发环境
```javascript
// config/development.js
module.exports = {
  database: {
    host: 'localhost',
    port: 5432,
    name: 'shopping_dev'
  },
  api: {
    baseUrl: 'http://localhost:3000/api',
    timeout: 5000
  },
  security: {
    enableHttps: false,
    corsOrigins: ['http://localhost:8080']
  }
};
```

### 2.2 生产环境
```javascript
// config/production.js
module.exports = {
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    ssl: true
  },
  api: {
    baseUrl: process.env.API_BASE_URL,
    timeout: 10000
  },
  security: {
    enableHttps: true,
    corsOrigins: process.env.CORS_ORIGINS.split(',')
  }
};
```

## 3. 依赖锁定

### 3.1 NPM依赖锁定
```json
{
  "name": "caddy-style-shopping-site",
  "version": "1.0.0",
  "engines": {
    "node": ">=16.0.0",
    "npm": ">=8.0.0"
  },
  "dependencies": {
    "express": "4.18.2",
    "bcrypt": "5.1.0",
    "jsonwebtoken": "9.0.0"
  },
  "devDependencies": {
    "jest": "29.5.0",
    "eslint": "8.40.0"
  }
}
```

### 3.2 安全依赖扫描
```bash
# 执行安全扫描
npm audit --audit-level=moderate
npm audit fix

# 生成依赖报告
npm ls --depth=0 > .refactor/dependency-tree.txt
```

## 4. 部署检查清单

- [ ] 所有敏感信息已从代码中移除
- [ ] 环境变量配置完成
- [ ] Vault/K8s Secrets集成测试通过
- [ ] 依赖漏洞扫描通过
- [ ] 生产环境配置验证
- [ ] SSL/TLS证书配置
- [ ] 日志配置（不记录敏感信息）
- [ ] 监控告警配置

## 5. 回滚方案

### 5.1 配置回滚
```bash
# 回滚到上一个稳定版本
kubectl rollout undo deployment/shopping-site

# 恢复配置文件
git checkout HEAD~1 -- config/
```

### 5.2 数据库回滚
```sql
-- 如有数据库变更，准备回滚脚本
-- 示例：回滚表结构变更
ALTER TABLE users DROP COLUMN new_field;
```

## 6. 部署验证

### 6.1 健康检查
```bash
# API健康检查
curl -f http://localhost:3000/health || exit 1

# 数据库连接检查
npm run db:check

# 缓存连接检查
npm run cache:check
```

### 6.2 功能验证
```javascript
// 自动化验证脚本
const tests = [
  { name: 'User Login', endpoint: '/api/auth/login' },
  { name: 'Product List', endpoint: '/api/products' },
  { name: 'Cart Operations', endpoint: '/api/cart' }
];

tests.forEach(test => {
  // 执行功能测试
  console.log(`Testing ${test.name}...`);
});
```