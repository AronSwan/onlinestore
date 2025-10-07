# 新人培训指南

## 📋 概述
本文档为新加入团队的开发人员提供全面的入职培训指南，帮助他们快速熟悉项目架构、开发流程和团队规范。

## 🚀 快速开始

### 环境准备
1. **开发环境配置**
   ```bash
   # 安装 Node.js 18+
   nvm install 18
   nvm use 18
   
   # 安装依赖
   npm install
   
   # 配置数据库
   docker-compose up -d postgres redis
   ```

2. **项目结构了解**
   ```
   backend/
   ├── src/                    # 源代码目录
   │   ├── modules/           # 业务模块
   │   ├── shared/           # 共享组件
   │   └── main.ts           # 应用入口
   ├── docs/                  # 文档目录
   └── scripts/              # 工具脚本
   ```

### 第一个任务
完成以下任务来熟悉项目：
- [ ] 设置开发环境
- [ ] 运行测试套件
- [ ] 创建一个简单的API端点
- [ ] 提交第一个PR

## 📚 核心概念学习

### 技术栈
- **后端框架**: NestJS
- **数据库**: PostgreSQL + TypeORM
- **缓存**: Redis
- **消息队列**: RabbitMQ
- **测试**: Jest + Supertest

### 架构模式
- 领域驱动设计（DDD）
- 微服务架构
- 事件驱动架构
- CQRS模式

## 🔧 开发工具

### IDE配置
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### 调试配置
```json
// launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug NestJS",
      "program": "${workspaceFolder}/src/main.ts",
      "runtimeArgs": ["--require", "ts-node/register"]
    }
  ]
}
```

## 📖 学习路径

### 第一周：基础熟悉
- [ ] 阅读项目文档
- [ ] 了解代码规范
- [ ] 运行示例项目
- [ ] 参与代码审查

### 第二周：功能开发
- [ ] 实现简单功能
- [ ] 编写单元测试
- [ ] 参与团队会议
- [ ] 学习部署流程

### 第三周：独立开发
- [ ] 独立完成功能模块
- [ ] 参与架构讨论
- [ ] 代码优化改进

## 🎯 考核标准

### 技术能力
- [ ] 能够独立开发功能模块
- [ ] 掌握测试驱动开发
- [ ] 理解项目架构设计
- [ ] 熟悉代码审查流程

### 团队协作
- [ ] 积极参与团队讨论
- [ ] 按时完成任务
- [ ] 良好的沟通能力
- [ ] 主动学习新技术

## 📞 支持资源

### 导师制度
每位新人都会分配一位导师，负责：
- 解答技术问题
- 代码审查指导
- 职业发展建议

### 学习资源
- [项目文档](./index.md)
- [技术规范](./standards/)
- [最佳实践](./learning/)

## 🔄 反馈机制

### 定期评估
- **第一周**: 环境熟悉度评估
- **第二周**: 开发能力评估  
- **第三周**: 综合能力评估

### 改进建议
根据评估结果提供个性化的改进建议和学习路径。

*最后更新: 2025年10月5日*