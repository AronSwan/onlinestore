#!/bin/bash
# 用途：Paperless-NGX数据迁移脚本，从SQLite迁移到PostgreSQL
# 依赖文件：paperless-data目录
# 作者：AI助手
# 时间：2025-09-30 15:40:00

set -e

echo "🚀 开始Paperless-NGX数据迁移..."

# 检查源数据目录
if [ ! -d "../paperless-data" ]; then
    echo "❌ 源数据目录不存在: ../paperless-data"
    exit 1
fi

echo "📁 检查源数据文件..."
ls -la ../paperless-data/

# 备份源数据
echo "💾 备份源数据..."
cp -r ../paperless-data ../paperless-data-backup-$(date +%Y%m%d%H%M%S)
echo "✅ 数据备份完成"

# 创建临时迁移目录
mkdir -p /tmp/paperless-migration

# 导出SQLite数据
echo "📊 导出SQLite数据..."
sqlite3 ../paperless-data/db.sqlite3 ".dump" > /tmp/paperless-migration/sqlite-dump.sql

# 转换SQLite dump为PostgreSQL兼容格式
echo "🔄 转换SQL格式..."
sed -i 's/INTEGER PRIMARY KEY AUTOINCREMENT/SERIAL PRIMARY KEY/g' /tmp/paperless-migration/sqlite-dump.sql
sed -i 's/DATETIME/TIMESTAMP/g' /tmp/paperless-migration/sqlite-dump.sql
sed -i 's/BLOB/BYTEA/g' /tmp/paperless-migration/sqlite-dump.sql

# 等待PostgreSQL服务就绪
echo "⏳ 等待PostgreSQL服务就绪..."
until pg_isready -h paperless-postgresql -p 5432 -U paperless; do
    echo "等待PostgreSQL..."
    sleep 5
done

# 导入数据到PostgreSQL
echo "📥 导入数据到PostgreSQL..."
psql -h paperless-postgresql -U paperless -d paperless -f /tmp/paperless-migration/sqlite-dump.sql

echo "✅ 数据库迁移完成"

# 迁移媒体文件
echo "📁 迁移媒体文件..."
if [ -d "../paperless-data/media" ]; then
    echo "复制媒体文件到持久化存储..."
    # 这里需要根据实际的存储配置进行调整
    # 假设使用NFS或云存储
    cp -r ../paperless-data/media/* /mnt/paperless-media/
    echo "✅ 媒体文件迁移完成"
fi

# 迁移索引文件
echo "🔍 迁移索引文件..."
if [ -d "../paperless-data/index" ]; then
    echo "重建索引..."
    # Paperless-NGX会自动重建索引
    echo "✅ 索引将在首次启动时重建"
fi

echo "🎉 Paperless-NGX数据迁移完成！"
echo ""
echo "📋 后续步骤："
echo "1. 验证数据库连接"
echo "2. 启动Paperless-NGX服务"
echo "3. 检查索引重建状态"
echo "4. 验证文档访问"