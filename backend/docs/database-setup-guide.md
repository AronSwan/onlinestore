# 数据库设置指南

## 问题诊断

当前迁移失败是因为无法连接到 MySQL 数据库（ECONNREFUSED 127.0.0.1:3306）。

## 解决方案

### 方案1：安装并启动 MySQL（推荐）

1. **下载安装 MySQL**
   ```bash
   # Windows: 下载 MySQL Installer
   # https://dev.mysql.com/downloads/installer/
   
   # 或使用 Chocolatey
   choco install mysql
   
   # 或使用 Scoop
   scoop install mysql
   ```

2. **启动 MySQL 服务**
   ```bash
   # Windows 服务管理
   net start mysql
   
   # 或通过服务管理器启动 MySQL80 服务
   ```

3. **创建数据库**
   ```sql
   mysql -u root -p
   CREATE DATABASE caddy_shopping CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

4. **运行迁移**
   ```bash
   cd backend
   npm run migration:run
   ```

### 方案2：使用 Docker MySQL（快速）

1. **启动 MySQL 容器**
   ```bash
   docker run --name mysql-caddy \
     -e MYSQL_ROOT_PASSWORD=123456 \
     -e MYSQL_DATABASE=caddy_shopping \
     -p 3306:3306 \
     -d mysql:8.0
   ```

2. **等待容器启动完成**
   ```bash
   docker logs mysql-caddy
   ```

3. **运行迁移**
   ```bash
   cd backend
   npm run migration:run
   ```

### 方案3：使用 SQLite（开发环境）

如果不想安装 MySQL，可以临时切换到 SQLite：

1. **修改 .env**
   ```env
   DATABASE_TYPE=sqlite
   DATABASE_NAME=./dev.sqlite
   ```

2. **更新 typeorm.config.ts**
   ```typescript
   export default new DataSource({
     type: 'sqlite',
     database: process.env.DATABASE_NAME || './dev.sqlite',
     // ... 其他配置
   });
   ```

## 验证连接

运行以下命令验证数据库连接：

```bash
# 测试 MySQL 连接
mysql -h localhost -P 3306 -u root -p123456 -e "SELECT 1"

# 或使用 Node.js 脚本
node -e "
const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '123456'
});
conn.connect(err => {
  if (err) console.error('连接失败:', err);
  else console.log('MySQL 连接成功!');
  conn.end();
});
"
```

## 当前状态

- ✅ 用户服务模块骨架已创建
- ✅ TypeORM 配置文件已修复
- ❌ 数据库连接需要解决
- ⏳ 迁移脚本等待数据库连接

## 下一步

1. 选择上述方案之一解决数据库连接
2. 运行 `npm run migration:run` 创建表结构
3. 启动服务 `npm run start:dev`
4. 访问 Swagger 文档验证新接口：http://localhost:3000/api/docs