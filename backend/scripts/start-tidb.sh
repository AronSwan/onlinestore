#!/bin/bash
# TiDB 本地启动脚本
# 使用方法：在 WSL2 Ubuntu 中执行 bash scripts/start-tidb.sh

echo "🚀 启动 TiDB 本地集群..."

# 检查 TiUP 是否安装
if ! command -v tiup &> /dev/null; then
    echo "❌ TiUP 未安装，正在安装..."
    curl --proto '=https' --tlsv1.2 -sSf https://tiup-mirrors.pingcap.com/install.sh | sh
    source ~/.bashrc
fi

# 检查是否已有集群在运行
if tiup playground display 2>/dev/null | grep -q "TiDB"; then
    echo "⚠️  检测到已有 TiDB 集群在运行"
    echo "是否要停止现有集群并重新启动？(y/N)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "🛑 停止现有集群..."
        tiup playground stop
        sleep 2
    else
        echo "✅ 使用现有集群"
        exit 0
    fi
fi

# 启动新集群
echo "🔧 启动 TiDB 集群（1 TiDB + 1 PD + 1 TiKV）..."
tiup playground v7.5.0 --db 1 --pd 1 --kv 1 --host 0.0.0.0 &

# 等待集群启动
echo "⏳ 等待集群启动..."
sleep 10

# 检查集群状态
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if mysql -h 127.0.0.1 -P 4000 -u root -e "SELECT 1" 2>/dev/null; then
        echo "✅ TiDB 集群启动成功！"
        echo ""
        echo "📊 集群信息："
        echo "   TiDB SQL: mysql -h 127.0.0.1 -P 4000 -u root"
        echo "   Dashboard: http://127.0.0.1:2379/dashboard"
        echo "   Grafana: http://127.0.0.1:3000"
        echo ""
        
        # 初始化数据库
        echo "🗄️  初始化应用数据库..."
        mysql -h 127.0.0.1 -P 4000 -u root << EOF
CREATE DATABASE IF NOT EXISTS caddy_shopping_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'caddy_app'@'%' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON caddy_shopping_db.* TO 'caddy_app'@'%';
FLUSH PRIVILEGES;
EOF
        echo "✅ 数据库初始化完成！"
        exit 0
    fi
    
    echo "⏳ 等待 TiDB 启动... ($((attempt + 1))/$max_attempts)"
    sleep 2
    ((attempt++))
done

echo "❌ TiDB 启动超时，请检查日志"
tiup playground logs
exit 1