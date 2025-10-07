#!/bin/bash
# TiDB 重启后自动设置脚本
# 在 WSL2 Ubuntu 中执行：bash /mnt/d/codes/onlinestore/caddy-style-shopping-site/backend/scripts/setup-tidb-after-reboot.sh

set -e

echo "🚀 TiDB 重启后自动设置开始..."

# 检查是否在 WSL2 中
if [[ ! -f /proc/version ]] || ! grep -q "microsoft" /proc/version; then
    echo "❌ 请在 WSL2 Ubuntu 中运行此脚本"
    exit 1
fi

# 更新系统包
echo "📦 更新系统包..."
sudo apt update -y

# 安装必要工具
echo "🔧 安装必要工具..."
sudo apt install -y curl mysql-client-core-8.0

# 安装 TiUP
echo "📥 安装 TiUP..."
if ! command -v tiup &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh
    source ~/.bashrc
    export PATH=$PATH:~/.tiup/bin
else
    echo "✅ TiUP 已安装"
fi

# 检查是否已有集群运行
echo "🔍 检查现有集群..."
if tiup playground display 2>/dev/null | grep -q "TiDB"; then
    echo "⚠️  检测到已有 TiDB 集群在运行"
    echo "停止现有集群..."
    tiup playground stop || true
    sleep 3
fi

# 启动 TiDB 集群
echo "🚀 启动 TiDB 集群..."
echo "配置：1 TiDB + 1 PD + 1 TiKV，监听所有接口"

# 后台启动集群
nohup tiup playground v7.5.0 --db 1 --pd 1 --kv 1 --host 0.0.0.0 > ~/tidb.log 2>&1 &
TIDB_PID=$!

echo "📝 TiDB 进程 ID: $TIDB_PID"
echo "📄 日志文件: ~/tidb.log"

# 等待集群启动
echo "⏳ 等待 TiDB 集群启动..."
max_attempts=60
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if mysql -h 127.0.0.1 -P 4000 -u root -e "SELECT 1" 2>/dev/null; then
        echo "✅ TiDB 集群启动成功！"
        break
    fi
    
    if ! kill -0 $TIDB_PID 2>/dev/null; then
        echo "❌ TiDB 进程意外退出，查看日志："
        tail -20 ~/tidb.log
        exit 1
    fi
    
    echo "⏳ 等待中... ($((attempt + 1))/$max_attempts)"
    sleep 2
    ((attempt++))
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ TiDB 启动超时，查看日志："
    tail -20 ~/tidb.log
    exit 1
fi

# 显示集群信息
echo ""
echo "🎉 TiDB 集群启动成功！"
echo "📊 集群信息："
echo "   SQL 连接: mysql -h 127.0.0.1 -P 4000 -u root"
echo "   Dashboard: http://127.0.0.1:2379/dashboard"
echo "   Grafana: http://127.0.0.1:3000 (admin/admin)"
echo ""

# 初始化应用数据库
echo "🗄️  初始化应用数据库..."
mysql -h 127.0.0.1 -P 4000 -u root << 'EOF'
CREATE DATABASE IF NOT EXISTS caddy_shopping_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'caddy_app'@'%' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON caddy_shopping_db.* TO 'caddy_app'@'%';
FLUSH PRIVILEGES;

-- 显示创建的数据库
SHOW DATABASES LIKE 'caddy_shopping_db';
SELECT User, Host FROM mysql.user WHERE User = 'caddy_app';
EOF

echo "✅ 数据库初始化完成！"
echo ""
echo "🔧 下一步操作："
echo "1. 在 Windows PowerShell 中进入项目目录"
echo "2. 执行: cd backend && npm run migration:run"
echo "3. 执行: npm run tidb:health"
echo "4. 检查后端 dev 进程是否连接成功"
echo ""
echo "💡 保持此 WSL2 终端开启以维持 TiDB 集群运行"
echo "📄 查看 TiDB 日志: tail -f ~/tidb.log"