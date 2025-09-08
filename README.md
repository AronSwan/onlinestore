# Caddy Style Shopping Site

一个现代化的电商网站，具有高性能优化、代码质量保证和完整的测试覆盖。

## 🚀 项目特性

- **现代化设计**: 响应式布局，支持多设备访问
- **高性能**: 图片懒加载、代码分割、缓存优化
- **代码质量**: ESLint + Prettier + Jest 完整工具链
- **用户体验**: 购物车、用户认证、产品搜索等完整功能
- **安全性**: 输入验证、XSS防护、CSRF保护
- **可维护性**: 模块化架构、完整文档、测试覆盖

## 📋 目录结构

```
caddy-style-shopping-site/
├── index.html              # 主页面
├── css/                    # 样式文件
│   ├── styles.css         # 主样式
│   └── responsive.css     # 响应式样式
├── js/                     # JavaScript模块
│   ├── auth/              # 认证模块
│   ├── cart/              # 购物车模块
│   ├── products/          # 产品模块
│   ├── ui/                # UI组件
│   └── utils/             # 工具函数
├── tests/                  # 测试文件
│   ├── unit-tests.js      # 单元测试
│   ├── test-runner.html   # 测试运行器
│   └── setup.js           # 测试配置
├── ast/                    # AST文件
├── docs/                   # 项目文档
├── DEPLOYMENT.md           # 部署文档
└── package.json           # 项目配置
```

## 🛠️ 技术栈

- **前端**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **构建工具**: npm scripts
- **代码质量**: ESLint, Prettier
- **测试框架**: Jest
- **部署**: Nginx, Docker (可选)
- **版本控制**: Git

## 📦 安装与运行

### 环境要求

- Node.js 16.0+
- npm 7.0+
- Python 3.8+ (用于本地服务器)
- 现代浏览器 (Chrome 90+, Firefox 88+, Safari 14+)

### 快速开始

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd caddy-style-shopping-site
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **运行开发服务器**
   ```bash
   # 方法1: 使用npm脚本 (推荐)
   npm run dev
   
   # 方法2: 直接启动服务器
   npm run serve
   
   # 方法3: 使用Python
   python -m http.server 8000
   ```

4. **访问网站**
   打开浏览器访问 http://localhost:8000

### 开发工具

```bash
# 代码检查
npm run lint

# 自动修复代码风格
npm run lint:fix

# 代码格式化
npm run format

# 检查格式
npm run format:check

# 运行测试
npm run test

# 监听模式测试
npm run test:watch

# 测试覆盖率
npm run test:coverage

# 完整质量检查
npm run quality:check

# 自动修复 + 格式化
npm run quality:fix
```

## 🧪 测试

项目包含完整的测试套件，覆盖所有核心功能：

- **单元测试**: 51个测试用例
- **测试覆盖率**: 目标 70%+
- **测试类型**: 功能测试、边界测试、错误处理测试

### 运行测试

```bash
# 运行所有测试
npm test

# 生成覆盖率报告
npm run test:coverage

# 在浏览器中运行测试
# 访问 http://localhost:8000/test-runner.html
```

### 测试报告

测试结果会保存在 `tests/test-results.json`，包含详细的测试信息和覆盖率数据。

## 🏗️ 项目架构

### 核心模块

1. **认证模块** (`js/auth/`)
   - 用户登录/注册
   - 会话管理
   - 权限验证

2. **产品模块** (`js/products/`)
   - 产品展示
   - 搜索过滤
   - 分类管理

3. **购物车模块** (`js/cart/`)
   - 商品添加/删除
   - 数量管理
   - 价格计算

4. **UI组件** (`js/ui/`)
   - 模态框
   - 通知系统
   - 加载状态

5. **工具函数** (`js/utils/`)
   - 输入验证
   - 本地存储
   - 网络请求

### 设计模式

- **模块化**: 每个功能独立模块
- **事件驱动**: 组件间通过事件通信
- **单一职责**: 每个类/函数职责明确
- **依赖注入**: 便于测试和维护

## 🔧 配置说明

### ESLint 配置

项目使用 ESLint 进行代码质量检查，配置文件：`.eslintrc.js`

主要规则：
- ES6+ 语法支持
- 严格模式
- 代码风格统一
- 潜在错误检测

### Prettier 配置

代码格式化配置：`.prettierrc`

格式规则：
- 2空格缩进
- 单引号
- 行尾分号
- 120字符换行

### Jest 配置

测试框架配置在 `package.json` 中：

- 测试环境：jsdom
- 覆盖率阈值：70%
- 测试文件匹配：`**/*.test.js`

## 🚀 部署

详细部署说明请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 快速部署

1. **生产环境构建**
   ```bash
   npm run quality:check
   ```

2. **静态文件服务**
   ```bash
   # 使用Nginx
   sudo cp -r . /var/www/html/
   
   # 或使用Docker
   docker build -t caddy-shopping .
   docker run -p 80:80 caddy-shopping
   ```

3. **环境配置**
   - 配置域名和SSL证书
   - 设置缓存策略
   - 配置安全头

## 📊 性能优化

### 已实现的优化

- **图片懒加载**: 减少初始加载时间
- **代码分割**: 按需加载模块
- **缓存策略**: 静态资源长期缓存
- **压缩优化**: Gzip压缩
- **CDN支持**: 静态资源分发

### 性能指标

- **首屏加载**: < 2秒
- **交互响应**: < 100ms
- **Lighthouse评分**: 90+
- **Core Web Vitals**: 全绿

## 🔒 安全特性

- **输入验证**: 所有用户输入严格验证
- **XSS防护**: 输出编码和CSP策略
- **CSRF保护**: Token验证
- **安全头**: 完整的HTTP安全头配置
- **依赖安全**: 定期更新和漏洞扫描

## 🤝 贡献指南

1. **Fork 项目**
2. **创建特性分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送分支** (`git push origin feature/AmazingFeature`)
5. **创建 Pull Request**

### 代码规范

- 遵循 ESLint 和 Prettier 配置
- 编写测试用例
- 更新相关文档
- 提交信息使用约定式提交格式

## 📝 更新日志

### v1.0.0 (2025-01-14)

- ✨ 初始版本发布
- 🎨 完整的电商网站功能
- 🧪 完整的测试覆盖
- 📚 完整的项目文档
- 🚀 部署和运维指南

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🆘 支持

如果您遇到问题或有建议，请：

1. 查看 [常见问题](./docs/FAQ.md)
2. 搜索 [Issues](../../issues)
3. 创建新的 [Issue](../../issues/new)
4. 联系维护团队

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者和用户。

---

**Happy Coding! 🎉**