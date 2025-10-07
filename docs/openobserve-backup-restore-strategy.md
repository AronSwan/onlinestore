# OpenObserve备份和恢复策略

## 概述

本文档描述了OpenObserve监控系统的备份和恢复策略，确保数据安全和业务连续性。

## 备份策略

### 备份类型

1. **完整备份**：包含所有配置、数据和元数据
2. **增量备份**：仅备份自上次完整备份以来的更改
3. **差异备份**：备份自上次完整备份以来的所有更改

### 备份内容

1. **配置备份**：
   - 环境变量
   - Docker Compose配置
   - 流配置
   - 用户和角色配置

2. **数据备份**：
   - Docker卷数据
   - 流数据导出
   - 元数据

3. **日志备份**：
   - 应用日志
   - 系统日志
   - 备份操作日志

### 备份频率

1. **完整备份**：每天一次（凌晨2点）
2. **增量备份**：每4小时一次
3. **保留策略**：保留最近7天的完整备份，30天的增量备份

## 备份工具

### 手动备份

```bash
# 执行完整备份
node scripts/backup-restore-strategy.js backup

# 列出可用备份
node scripts/backup-restore-strategy.js list

# 恢复指定备份
node scripts/backup-restore-strategy.js restore <backup-name>
```

### 自动备份

```bash
# 安装计划任务
node scripts/scheduled-backup.js install

# 卸载计划任务
node scripts/scheduled-backup.js uninstall

# 手动执行一次备份
node scripts/scheduled-backup.js run
```

## 备份存储

### 本地存储

- 备份目录：`./backups`
- 压缩格式：tar.gz
- 命名规则：`<type>-backup-<timestamp>.tar.gz`

### 远程存储

建议将备份同步到远程存储，如：

1. **云存储**：AWS S3、Azure Blob Storage、Google Cloud Storage
2. **网络存储**：NFS、SMB
3. **对象存储**：MinIO

### 备份同步脚本示例

```bash
#!/bin/bash
# 同步备份到AWS S3
aws s3 sync ./backups s3://your-backup-bucket/openobserve/

# 同步备份到Azure Blob Storage
az storage blob upload-batch --source ./backups --destination your-container/openobserve/

# 同步备份到MinIO
mc cp ./backups/* minio/your-backet/openobserve/
```

## 恢复策略

### 恢复场景

1. **配置恢复**：恢复系统配置、流配置、用户配置
2. **数据恢复**：恢复Docker卷数据、流数据
3. **完整恢复**：恢复所有配置和数据

### 恢复步骤

1. **停止OpenObserve服务**：
   ```bash
   docker-compose -f docker-compose.openobserve.yml stop
   ```

2. **选择备份**：
   ```bash
   node scripts/backup-restore-strategy.js list
   ```

3. **执行恢复**：
   ```bash
   node scripts/backup-restore-strategy.js restore <backup-name>
   ```

4. **启动OpenObserve服务**：
   ```bash
   docker-compose -f docker-compose.openobserve.yml up -d
   ```

5. **验证恢复**：
   ```bash
   node scripts/working-openobserve-test.js
   ```

### 灾难恢复

1. **评估损失**：确定需要恢复的数据范围
2. **准备环境**：确保OpenObserve环境可用
3. **恢复备份**：从最新的可用备份恢复
4. **验证系统**：确保系统正常运行
5. **监控性能**：观察系统性能指标

## 备份验证

### 自动验证

备份脚本包含自动验证功能：

1. **备份完整性检查**：验证备份文件是否完整
2. **数据一致性检查**：验证备份数据是否一致
3. **恢复测试**：定期测试备份恢复流程

### 手动验证

1. **检查备份文件**：确认备份文件存在且大小合理
2. **查看备份日志**：检查备份过程是否有错误
3. **执行测试恢复**：在测试环境中验证备份恢复

## 备份最佳实践

1. **定期测试**：每月至少进行一次备份恢复测试
2. **异地存储**：将备份存储在地理位置不同的地方
3. **加密备份**：对敏感数据进行加密
4. **文档记录**：记录备份和恢复流程
5. **监控告警**：设置备份失败告警

## 故障排除

### 常见问题

1. **备份失败**：
   - 检查磁盘空间
   - 验证网络连接
   - 查看错误日志

2. **恢复失败**：
   - 确认备份文件完整性
   - 检查权限设置
   - 验证环境配置

3. **性能问题**：
   - 优化备份时间窗口
   - 调整并发设置
   - 增加系统资源

### 日志位置

- 备份日志：`./backups/backup.log`
- 系统日志：`./logs/openobserve/`
- Docker日志：`docker-compose logs openobserve`

## 联系信息

如有备份和恢复相关的问题，请联系系统管理员。

---

**文档版本**：1.0  
**最后更新**：2025-10-07  
**维护人员**：系统管理员