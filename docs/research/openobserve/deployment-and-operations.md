# 部署与运维（加强版，依据 README 与仓库）

快速启动（README）
- Docker 单机：
```bash
docker run -d \
  --name openobserve \
  -v $PWD/data:/data \
  -p 5080:5080 \
  -e ZO_ROOT_USER_EMAIL="root@example.com" \
  -e ZO_ROOT_USER_PASSWORD="Complexpass#123" \
  public.ecr.aws/zinclabs/openobserve:latest
```
- Docker Compose：
```yaml
services:
  openobserve:
    image: public.ecr.aws/zinclabs/openobserve:latest
    restart: unless-stopped
    environment:
      ZO_ROOT_USER_EMAIL: "root@example.com"
      ZO_ROOT_USER_PASSWORD: "Complexpass#123"
    ports:
      - "5080:5080"
    volumes:
      - data:/data
volumes:
  data:
```
- HA 部署：README 链接至官方 HA 文档（openobserve.ai/docs/ha_deployment）

基础配置
- Root 用户：环境变量设定 root 邮箱与密码（见 .env.example 与 README）
- 组织与流：在 UI 中创建 org/stream，生成 Ingest Token
- 端口：默认 5080（HTTP Ingest 与 UI）
- 存储：本地卷或对象存储（S3/MinIO/GCS/Azure Blob）

运维建议（结合仓库）
- 备份：持久化卷/对象存储策略（依据部署方式）
- 监控：关注 Ingest 成功率、查询延迟、存储占用（benchmarks/ 与 README 的性能目标）
- 滚动升级：单二进制与 HA 模式下平滑升级
- 多租户治理：org/stream 命名规范与配额策略