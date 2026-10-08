---
title: "健康检查与监控面（现实版）"
description: "本仓实际存在的健康/监控端点与验证命令——原 764 行版本围绕从未实装的健康模块撰写，已重写对齐现实"
owner: "Backend Team"
lastUpdated: "2026-10-08"
version: "3.0.0"
status: "active"
category: "monitoring"
tags: ["health-check", "monitoring"]
audience: ["developer", "ops"]
---

# 健康检查与监控面

> 2026-10-08 重写：原文档描述的 `common/health/health.module` 健康体系（分项检查/
> 告警通知/k8s 探针/`/health/stats` 等）从未实装。本文只写真实存在的端点。

## 存活探针（公开，无认证）

| 端点 | 行为 |
|---|---|
| `GET /api/health` | 应用存活检查，返回 `{"status":"ok","timestamp":...}` |

```bash
curl http://localhost:3777/api/health
```

docker-compose 的 backend 服务 healthcheck 即探测此端点。

## 监控查询面（需 JWT + ADMIN 角色）

`/api/monitoring/*` 由 `monitoring.controller.ts` 提供，类级 `JwtAuthGuard + RolesGuard(ADMIN)`：

| 端点 | 说明 |
|---|---|
| `GET /api/monitoring/health` | 监控服务自身健康 |
| `GET /api/monitoring/metrics` | 指标列表 |
| `GET /api/monitoring/metrics/summary` | 指标汇总 |
| `GET /api/monitoring/metrics/category` | 按类目指标 |
| `GET /api/monitoring/metrics/history` | 指标历史 |

```bash
TOKEN=<管理员JWT>
curl -H "Authorization: Bearer $TOKEN" http://localhost:3777/api/monitoring/health
```

## 搜索引擎状态（需 JWT）

`GET /api/search/status` 返回当前/备用引擎及各引擎真实健康值
（`isStrategyHealthy` 实调各引擎 `healthCheck`；引擎未运行时如实报 `false`）。

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3777/api/search/status
```

## 指标采集链

- 请求级指标：`MetricsInterceptor`（全局，`main.ts` 注册）+ `LoggingInterceptor`（请求日志）
- 存储：`monitoring.service.ts`（Metric 实体，SQLite 表）
- Prometheus/Grafana：docker-compose 提供 `prometheus`/`grafana` 服务（`docker/start.sh monitoring` 启动）

## 已知边界

- Redis/MeiliSearch/Zinc 均为可选依赖：未运行时缓存降级内存、搜索降级 DB LIKE（`/api/products/search` 与 `/api/search` 同降级链），应用不崩
- 无邮件/webhook 告警通道——指标只存不报
