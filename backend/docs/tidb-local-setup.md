# TiDB 本地部署指南（Windows）

## 方案一：WSL2 + TiUP（推荐）

### 1. 安装 WSL2 和 Ubuntu
```powershell
# 以管理员身份运行 PowerShell
wsl --install -d Ubuntu
# 重启计算机后继续
```

### 2. 在 Ubuntu 中安装 TiUP
```bash
# 打开 Ubuntu 终端
curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh
source ~/.bashrc

# 验证安装
tiup --version
```

### 3. 启动本地 TiDB 集群
```bash
# 启动开发集群（1个TiDB + 1个PD + 1个TiKV）
tiup playground v7.5.0 --db 1 --pd 1 --kv 1 --host 0.0.0.0

# 或者启动更完整的集群
tiup playground v7.5.0 --db 2 --pd 3 --kv 3 --host 0.0.0.0
```

### 4. 初始化数据库
```bash
# 连接到 TiDB（在 Ubuntu 或 Windows PowerShell 中）
mysql -h 127.0.0.1 -P 4000 -u root

# 创建数据库和用户
CREATE DATABASE caddy_shopping_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'caddy_app'@'%' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON caddy_shopping_db.* TO 'caddy_app'@'%';
FLUSH PRIVILEGES;
EXIT;
```

### 5. 验证连接
```bash
# 在项目根目录执行
cd backend
npm run tidb:health
```

## 方案二：Windows 原生 TiUP

### 1. 下载 TiUP
```powershell
# 下载 Windows 版本的 TiUP
Invoke-WebRequest -Uri "https://download.pingcap.org/tiup-latest-windows-amd64.zip" -OutFile "tiup.zip"
Expand-Archive -Path "tiup.zip" -DestinationPath "C:\tiup"
$env:PATH += ";C:\tiup"
```

### 2. 启动集群
```powershell
# 启动本地集群
tiup playground v7.5.0 --db 1 --pd 1 --kv 1
```

## 集群信息

启动成功后，你会看到类似输出：
```
CLUSTER START SUCCESSFULLY, Enjoy it ^-^
To connect TiDB: mysql --comments -h 127.0.0.1 -P 4000 -u root
To view the dashboard: http://127.0.0.1:2379/dashboard
To view the Grafana: http://127.0.0.1:3000 (Username: admin, Password: admin)
```

## 连接信息

- **TiDB SQL 端口**: 127.0.0.1:4000
- **用户名**: root
- **密码**: 空（默认）
- **PD Dashboard**: http://127.0.0.1:2379/dashboard
- **Grafana 监控**: http://127.0.0.1:3000

## 常用命令

```bash
# 查看集群状态
tiup playground display

# 停止集群
tiup playground stop

# 清理集群数据
tiup playground destroy

# 查看日志
tiup playground logs
```

## 故障排查

### 端口冲突
如果 4000 端口被占用：
```bash
# 查看端口占用
netstat -ano | findstr :4000

# 使用其他端口启动
tiup playground v7.5.0 --db.port 4001 --host 0.0.0.0
```

### 权限问题
确保 WSL2 中的防火墙允许端口访问：
```bash
sudo ufw allow 4000
sudo ufw allow 2379
```

## 生产环境部署

对于生产环境，建议使用完整的集群部署：
```bash
# 创建拓扑文件 topology.yaml
tiup cluster deploy prod-cluster v7.5.0 topology.yaml --user root
tiup cluster start prod-cluster
```

详细的生产部署配置请参考 `tidb-distributed-setup-guide.md`。