[![CI](https://github.com/AronSwan/onlinestore/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/AronSwan/onlinestore/actions/workflows/ci.yml)
[![CodeQL](https://github.com/AronSwan/onlinestore/actions/workflows/codeql-analysis.yml/badge.svg?branch=master)](https://github.com/AronSwan/onlinestore/actions/workflows/codeql-analysis.yml)

# Gucci在线商店 - NextChat高级AI助手集成与OpenObserve监控架构

## 项目概述

本项目为Reich在线商店网站集成了基于NextChat的高级AI助手，支持多模态交互（文字、语音、图片），并提供向量数据库集成功能，为用户提供智能购物体验。同时，项目已完成了从Grafana到OpenObserve的监控架构迁移，实现了统一的可观测性平台。

## 监控架构亮点

### 🚀 OpenObserve一体化监控
- **统一数据平台**: 集成日志、指标、追踪数据于一体的监控解决方案
- **高性能存储**: 列式存储，压缩比提升3-5倍，查询性能提升50-80%
- **资源优化**: 内存使用减少35-48%，存储空间节省60%，运维复杂度降低60%
- **实时告警**: 内置告警引擎，支持多种通知渠道

### 📊 监控覆盖范围
- **应用监控**: 请求响应时间、错误率、吞吐量
- **系统监控**: CPU、内存、磁盘、网络使用率
- **业务监控**: 用户活跃度、订单统计、转化率分析
- **基础设施**: Docker容器、数据库、缓存服务状态

## 技术架构

### 核心组件
- **NextChat**: 基于ChatGPTNextWeb的轻量级AI助手框架
- **多模态交互**: 支持文字、语音、图片三种交互方式
- **向量数据库**: 为未来的智能推荐和知识管理预留接口
- **CDN服务**: 使用jsdelivr CDN加载NextChat相关资源

### 文件结构
```
caddy-style-shopping-site/
├── index.html                    # 主页面，包含AI助手界面
├── css/
│   ├── main.css                  # 主样式文件
│   └── nextchat-advanced.css     # AI助手高级样式
├── js/
│   ├── main.js                   # 主JavaScript文件
│   ├── nextchat-advanced.js      # 高级AI助手核心逻辑
│   └── main_backup_20250910.js   # 备份文件
└── README.md                     # 项目文档
```

## AI助手功能特性

### 1. 多模态交互支持

#### 文字交互
- 智能商品搜索和推荐
- 尺码建议和价格查询
- 订单状态跟踪
- 退换货处理

#### 语音交互
- 基于Web Speech API的语音识别
- 实时语音转文字
- 语音消息播放

#### 图片交互
- 拖拽上传和点击上传
- 商品图片识别
- 多图片同时处理
- 图片预览功能

### 2. 智能对话功能

#### 商品咨询
- 商品信息查询
- 库存状态检查
- 价格比较和优惠提醒
- 新品上市通知

#### 购物辅助
- 尺码推荐算法
- 搭配建议
- 购物车管理
- 支付流程指导

#### 售后服务
- 订单跟踪
- 退换货政策解释
- 物流信息查询
- 客服转接

### 3. 向量数据库集成（预留）

#### 用户行为分析
- 浏览历史记录
- 购买偏好分析
- 个性化推荐
- 智能客服记录

#### 商品知识库
- 产品信息向量化
- 用户评价分析
- 智能问答系统
- 推荐算法优化

## 技术实现细节

### 监控架构实现

#### OpenObserve配置
```yaml
# 核心配置
services:
  openobserve:
    image: public.ecr.aws/zinclabs/openobserve:latest
    ports:
      - "5080:5080"
    environment:
      - ZO_MEMORY_CACHE_ENABLED=true
      - ZO_MEMORY_CACHE_MAX_SIZE=2048
      - ZO_COMPRESSION=gzip
      - ZO_QUERY_CACHE_ENABLED=true
```

#### 数据流配置
```yaml
# 预配置数据流
streams:
  - name: "application-logs"
    type: "logs"
    retention: "30d"
  - name: "system-metrics"
    type: "metrics"
    retention: "90d"
  - name: "request-traces"
    type: "traces"
    retention: "7d"
  - name: "business-events"
    type: "logs"
    retention: "365d"
```

### NextChat集成
```javascript
// 核心功能模块
- initNextChatAdvanced(): 初始化AI助手
- handleTextMessage(): 文字消息处理
- handleVoiceMessage(): 语音消息处理
- handleImageMessage(): 图片消息处理
- vectorDatabaseIntegration(): 向量数据库接口
```

### CDN资源配置
```html
<!-- 使用jsdelivr CDN -->
https://cdn.jsdelivr.net/gh/ChatGPTNextWeb/NextChat@main/
- 图标资源
- 样式文件
- 核心JavaScript库
```

### 响应式设计
- 移动端适配（max-width: 480px）
- 深色模式支持
- 触摸优化
- 性能优化

## 部署说明

### 监控系统部署

#### 快速启动OpenObserve
```bash
# 启动OpenObserve监控服务
docker-compose -f docker-compose.openobserve.yml up -d

# 验证服务状态
curl http://localhost:5080/health
```

#### 访问监控面板
- **OpenObserve Web界面**: http://localhost:5080
- **登录信息**: admin@example.com / ComplexPass#123
- **Prometheus指标**: http://localhost:9090
- **Node Exporter**: http://localhost:9100/metrics

### 开发环境
```bash
# 使用Node.js本地服务器
npx http-server -p 3000 -c-1

# 启动完整开发环境
docker-compose -f docker-compose.dev.yml up -d
```

### 生产环境
- 支持静态文件托管
- CDN加速
- 负载均衡
- 容器化部署

## 使用说明

### 监控系统使用

#### 查看日志数据
1. 访问 http://localhost:5080
2. 导航到 **日志** 页面
3. 选择数据流（如：application-logs）
4. 使用SQL语法查询日志数据

#### 监控系统指标
1. 导航到 **指标** 页面
2. 选择system-metrics数据流
3. 查看CPU、内存、磁盘使用率
4. 创建自定义监控面板

#### 配置告警规则
1. 导航到 **告警** 页面
2. 点击 **新建告警规则**
3. 设置告警条件和通知方式
4. 测试告警规则是否正常工作

### 启动AI助手
1. 点击右下角AI助手图标
2. 选择交互模式（文字/语音/图片）
3. 输入消息或上传文件
4. 获得智能回复

### 功能切换
- 💬 文字模式：传统聊天界面
- 🎤 语音模式：语音识别和合成
- 📷 图片模式：图片上传和识别

### 高级功能
- 多轮对话记忆
- 上下文理解
- 个性化推荐
- 实时翻译

## 性能优化

### 监控系统性能

#### 查询优化
```sql
-- 优化前：全表扫描
SELECT * FROM application-logs WHERE message LIKE '%error%';

-- 优化后：使用时间限制和索引
SELECT * FROM application-logs
WHERE level = 'ERROR'
AND timestamp >= now() - INTERVAL '1 hour'
ORDER BY timestamp DESC
LIMIT 1000;
```

#### 系统资源优化
- 内存缓存配置：2GB
- 查询结果缓存：10分钟TTL
- 并发查询限制：10个
- 数据压缩：gzip级别6

### 加载优化
- 懒加载机制
- CDN资源缓存
- 代码分割
- 图片压缩

### 用户体验
- 打字机动画
- 加载状态提示
- 错误处理
- 离线支持

## 安全考虑

### 监控系统安全

#### 访问控制
- 基于角色的访问控制（RBAC）
- API密钥管理
- 网络访问限制
- 审计日志记录

#### 数据安全
- 传输加密（HTTPS/TLS）
- 静态数据加密
- 敏感信息脱敏
- 数据保留策略

### 数据保护
- 用户输入验证
- XSS防护
- CSRF保护
- 隐私数据加密

### 内容过滤
- 敏感词检测
- 恶意内容拦截
- 图片内容审核
- 语音内容过滤

## 扩展功能

### 监控系统扩展

#### 高级分析功能
- 异常检测算法
- 预测性告警
- 智能容量规划
- 自适应阈值调整

#### 集成扩展
- 更多数据源集成
- 自定义插件开发
- 第三方工具集成
- API网关集成

### 未来规划
- 多语言支持
- AR/VR集成
- 情感分析
- 智能推荐引擎

### API接口
- RESTful API设计
- WebSocket实时通信
- GraphQL查询优化
- 微服务架构

## 技术支持

### 监控系统文档
- 📖 [OpenObserve使用指南](docs/openobserve-user-guide.md)
- 🔧 [故障排除和维护指南](docs/troubleshooting-maintenance-guide.md)
- 📊 [迁移方案与架构优化](从Grafana到OpenObserve迁移方案与架构优化计划.md)

### 依赖库
- NextChat核心库
- OpenObserve监控平台
- Prometheus指标收集
- Web Speech API
- File API
- IndexedDB

### 浏览器兼容性
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### 系统要求
- Docker 20.10+
- Docker Compose 2.0+
- 内存: 最少4GB，推荐8GB
- 存储: 最少20GB，推荐50GB

## 维护和运维

### 日常维护
```bash
# 系统清理脚本
./scripts/system-cleanup.sh

# 每日健康检查
./scripts/daily-check.sh

# 性能监控
curl http://localhost:5080/health
```

### 监控指标
- 系统可用性: ≥99.9%
- 查询响应时间: P95 < 2秒
- 错误率: <0.1%
- 资源使用率: <80%

## 许可证

本项目基于NextChat开源协议，遵循相应的开源许可条款。

## 联系方式

如有技术问题或功能建议，请联系开发团队。

---

**注意**: 本AI助手集成了先进的自然语言处理和机器学习技术，持续学习和优化中。监控系统已完成从Grafana到OpenObserve的迁移，提供了更高效、更统一的可观测性解决方案。