# 后端开发安全检查清单

**版本**: 1.0
**最后更新**: 2025-10-02
**适用分支**: main

## 目录

- [使用说明与角色视角筛选](#使用说明与角色视角筛选)
- [自动化检查命令](#自动化检查命令)
- [认证与授权](#认证与授权)
  - [JWT认证 (OWASP ASVS 2.1) - P0 (必选)](#jwt认证-owasp-asvs-21---p0-必选)
- [输入验证与数据过滤 (OWASP ASVS 4.1)](#输入验证与数据过滤-owasp-asvs-41)
  - [输入验证 - P0 (必选)](#输入验证---p0-必选)
  - [数据过滤 - P0 (必选)](#数据过滤---p0-必选)
- [数据库安全 (OWASP ASVS 6.2)](#数据库安全-owasp-asvs-62)
  - [数据访问 - P0 (必选)](#数据访问---p0-必选)
  - [事务处理 - P0 (必选)](#事务处理---p0-必选)
- [Web安全基础 (OWASP ASVS 10.2)](#web安全基础-owasp-asvs-102)
  - [安全响应头 - P0 (必选)](#安全响应头---p0-必选)
  - [CORS配置 - P0 (必选)](#cors配置---p0-必选)
  - [CSRF防护 - P1 (强烈建议)](#csrf防护---p1-强烈建议)
  - [文件上传安全 - P1 (强烈建议)](#文件上传安全---p1-强烈建议)
  - [路径遍历防护 - P1 (强烈建议)](#路径遍历防护---p1-强烈建议)
- [秘密管理 (OWASP ASVS 7.2)](#秘密管理-owasp-asvs-72)
  - [密钥管理 - P0 (必选)](#密钥管理---p0-必选)
  - [密码安全 - P0 (必选)](#密码安全---p0-必选)
  - [会话管理 - P0 (必选)](#会话管理---p0-必选)
- [业务逻辑安全 (OWASP ASVS 10.1)](#业务逻辑安全-owasp-asvs-101)
  - [支付处理 - P0 (必选)](#支付处理---p0-必选)
  - [订单处理 - P0 (必选)](#订单处理---p0-必选)
- [API安全 (OWASP API Security Top 10)](#api安全-owasp-api-security-top-10)
  - [API设计 - P0 (必选)](#api设计---p0-必选)
  - [速率限制 - P0 (必选)](#速率限制---p0-必选)
  - [SSRF防护 - P1 (强烈建议)](#ssrf防护---p1-强烈建议)
- [供应链安全 (OWASP ASVS 11.1)](#供应链安全-owasp-asvs-111)
  - [依赖项安全 - P0 (必选)](#依赖项安全---p0-必选)
- [日志与监控 (OWASP ASVS 8.1)](#日志与监控-owasp-asvs-81)
  - [日志记录 - P0 (必选)](#日志记录---p0-必选)
  - [监控告警 - P0 (必选)](#监控告警---p0-必选)
- [应急响应 (OWASP ASVS 13.1)](#应急响应-owasp-asvs-131)
  - [事件响应 - P0 (必选)](#事件响应---p0-必选)
  - [恢复计划 - P0 (必选)](#恢复计划---p0-必选)
- [使用指南](#使用指南)
- [注意事项](#注意事项)
- [参考资源](#参考资源)

## 规则ID索引表

| 规则ID | 规则名称 | 类别 | 优先级 | 锚点 |
|--------|----------|------|--------|------|
| jwt-expiration | JWT令牌过期时间检查 | 认证与授权 | P0 | #jwt-expiration |
| jwt-secret-strength | JWT密钥强度检查 | 认证与授权 | P0 | #jwt-secret-strength |
| jwt-format-validation | JWT格式验证检查 | 认证与授权 | P0 | #jwt-format-validation |
| jwt-refresh-mechanism | JWT刷新机制检查 | 认证与授权 | P1 | #jwt-refresh-mechanism |
| jwt-minimal-payload | JWT最小载荷检查 | 认证与授权 | P0 | #jwt-minimal-payload |
| roles-guard | 角色守卫检查 | 认证与授权 | P0 | #roles-guard |
| least-privilege | 最小权限原则检查 | 认证与授权 | P0 | #least-privilege |
| multi-factor-auth | 多重验证检查 | 认证与授权 | P1 | #multi-factor-auth |
| role-inheritance | 角色继承机制检查 | 认证与授权 | P2 | #role-inheritance |
| permission-review | 权限审查检查 | 认证与授权 | P1 | #permission-review |
| input-validation | 输入验证检查 | 输入验证 | P0 | #input-validation |
| input-length-validation | 输入长度限制检查 | 输入验证 | P0 | #input-length-validation |
| input-format-validation | 输入格式验证检查 | 输入验证 | P0 | #input-format-validation |
| input-range-validation | 输入范围验证检查 | 输入验证 | P0 | #input-range-validation |
| whitelist-validation | 白名单验证检查 | 输入验证 | P0 | #whitelist-validation |
| special-char-filtering | 特殊字符过滤检查 | 输入验证 | P0 | #special-char-filtering |
| sql-injection-protection | SQL注入防护检查 | 输入验证 | P0 | #sql-injection-protection |
| xss-protection | XSS防护检查 | 输入验证 | P0 | #xss-protection |
| nosql-injection-protection | NoSQL注入防护检查 | 输入验证 | P1 | #nosql-injection-protection |
| command-injection-protection | 命令注入防护检查 | 输入验证 | P1 | #command-injection-protection |
| db-connection-pool | 数据库连接池检查 | 数据库安全 | P0 | #db-connection-pool |
| db-user-permissions | 数据库用户权限检查 | 数据库安全 | P0 | #db-user-permissions |
| sensitive-data-encryption | 敏感数据加密检查 | 数据库安全 | P1 | #sensitive-data-encryption |
| data-backup-strategy | 数据备份策略检查 | 数据库安全 | P1 | #data-backup-strategy |
| transaction-usage | 事务使用检查 | 数据库安全 | P0 | #transaction-usage |
| locking-mechanism | 锁机制检查 | 数据库安全 | P0 | #locking-mechanism |
| transaction-rollback | 事务回滚检查 | 数据库安全 | P0 | #transaction-rollback |
| long-transaction-avoidance | 长事务避免检查 | 数据库安全 | P1 | #long-transaction-avoidance |
| transaction-performance-monitoring | 事务性能监控检查 | 数据库安全 | P1 | #transaction-performance-monitoring |
| security-headers | 安全响应头检查 | Web安全基础 | P0 | #security-headers |
| client-cache-control | 客户端缓存控制检查 | Web安全基础 | P0 | #client-cache-control |
| csp-policy | CSP内容安全策略检查 | Web安全基础 | P0 | #csp-policy |
| hsts-configuration | HSTS配置检查 | Web安全基础 | P1 | #hsts-configuration |
| x-frame-options | X-Frame-Options检查 | Web安全基础 | P1 | #x-frame-options |
| cors-config | CORS配置检查 | Web安全基础 | P0 | #cors-config |
| cors-no-wildcard | CORS无通配符检查 | Web安全基础 | P0 | #cors-no-wildcard |
| cors-methods-restriction | CORS方法限制检查 | Web安全基础 | P0 | #cors-methods-restriction |
| cors-headers-restriction | CORS请求头限制检查 | Web安全基础 | P1 | #cors-headers-restriction |
| cors-preflight-cache | CORS预检缓存检查 | Web安全基础 | P1 | #cors-preflight-cache |
| csrf-protection | CSRF防护检查 | Web安全基础 | P1 | #csrf-protection |
| samesite-cookie | SameSite Cookie检查 | Web安全基础 | P1 | #samesite-cookie |
| double-submit-cookie | 双重提交Cookie检查 | Web安全基础 | P2 | #double-submit-cookie |
| csrf-token-validation | CSRF令牌验证检查 | Web安全基础 | P2 | #csrf-token-validation |
| origin-referer-validation | Origin和Referer验证检查 | Web安全基础 | P2 | #origin-referer-validation |
| file-upload-type-restriction | 文件上传类型限制检查 | Web安全基础 | P1 | #file-upload-type-restriction |
| file-upload-size-limit | 文件上传大小限制检查 | Web安全基础 | P1 | #file-upload-size-limit |
| file-upload-content-validation | 文件上传内容验证检查 | Web安全基础 | P1 | #file-upload-content-validation |
| file-upload-storage-location | 文件上传存储位置检查 | Web安全基础 | P2 | #file-upload-storage-location |
| file-upload-virus-scan | 文件上传病毒扫描检查 | Web安全基础 | P2 | #file-upload-virus-scan |
| path-traversal-protection | 路径遍历防护检查 | Web安全基础 | P1 | #path-traversal-protection |
| filename-whitelist | 文件名白名单检查 | Web安全基础 | P1 | #filename-whitelist |
| path-normalization | 路径规范化检查 | Web安全基础 | P2 | #path-normalization |
| file-access-permissions | 文件访问权限检查 | Web安全基础 | P2 | #file-access-permissions |
| secure-file-api | 安全文件API检查 | Web安全基础 | P2 | #secure-file-api |
| password-hash | 密码哈希检查 | 秘密管理 | P0 | #password-hash |
| password-hash-cost | 密码哈希成本检查 | 秘密管理 | P0 | #password-hash-cost |
| password-complexity | 密码复杂度检查 | 秘密管理 | P0 | #password-complexity |
| password-history | 密码历史检查 | 秘密管理 | P1 | #password-history |
| password-expiry | 密码过期策略检查 | 秘密管理 | P1 | #password-expiry |
| session-management | 会话管理检查 | 秘密管理 | P0 | #session-management |
| session-invalidation | 会话失效检查 | 秘密管理 | P0 | #session-invalidation |
| session-id-generation | 会话ID生成检查 | 秘密管理 | P0 | #session-id-generation |
| session-fixation-protection | 会话固定防护检查 | 秘密管理 | P1 | #session-fixation-protection |
| concurrent-session-limit | 并发会话限制检查 | 秘密管理 | P1 | #concurrent-session-limit |
| rate-limiting | API速率限制检查 | API安全 | P0 | #rate-limiting |
| user-specific-rate-limit | 用户特定速率限制检查 | API安全 | P0 | #user-specific-rate-limit |
| dynamic-rate-limit | 动态速率限制检查 | API安全 | P0 | #dynamic-rate-limit |
| rate-limit-monitoring | 速率限制监控检查 | API安全 | P1 | #rate-limit-monitoring |
| rate-limit-exemption | 速率限制豁免检查 | API安全 | P1 | #rate-limit-exemption |
| ssrf-protection | SSRF防护检查 | API安全 | P1 | #ssrf-protection |
| ip-range-restriction | IP范围限制检查 | API安全 | P1 | #ip-range-restriction |
| redirect-follow-disabled | 重定向跟随禁用检查 | API安全 | P1 | #redirect-follow-disabled |
| response-size-limit | 响应大小限制检查 | API安全 | P2 | #response-size-limit |
| request-timeout | 请求超时检查 | API安全 | P2 | #request-timeout |
| dependency-vulnerability | 依赖项漏洞检查 | 供应链安全 | P0 | #dependency-vulnerability |
| dependency-update | 依赖项更新检查 | 供应链安全 | P0 | #dependency-update |
| dependency-locking | 依赖项锁定检查 | 供应链安全 | P1 | #dependency-locking |
| dependency-integrity | 依赖项完整性检查 | 供应链安全 | P1 | #dependency-integrity |
| dependency-whitelist | 依赖项白名单检查 | 供应链安全 | P2 | #dependency-whitelist |
| security-event-logging | 安全事件日志检查 | 日志与监控 | P0 | #security-event-logging |
| sensitive-data-sanitization | 敏感数据脱敏检查 | 日志与监控 | P0 | #sensitive-data-sanitization |
| log-context | 日志上下文检查 | 日志与监控 | P0 | #log-context |
| log-rotation | 日志轮转检查 | 日志与监控 | P1 | #log-rotation |
| log-file-security | 日志文件安全检查 | 日志与监控 | P1 | #log-file-security |
| abnormal-login-monitoring | 异常登录监控检查 | 日志与监控 | P0 | #abnormal-login-monitoring |
| high-frequency-access-monitoring | 高频访问监控检查 | 日志与监控 | P0 | #high-frequency-access-monitoring |
| error-rate-monitoring | 错误率监控检查 | 日志与监控 | P0 | #error-rate-monitoring |
| real-time-alerting | 实时告警检查 | 日志与监控 | P0 | #real-time-alerting |
| monitoring-data-review | 监控数据审查检查 | 日志与监控 | P1 | #monitoring-data-review |

## 使用说明与角色视角筛选

### 使用指南
1. **开发阶段**: 在设计阶段参考此清单，在编码阶段逐项检查
2. **维护阶段**: 定期(每季度)审查清单，根据新威胁更新
3. **审计阶段**: 使用清单进行安全审计，记录不符合项
4. **角色筛选**:
   - **后端开发**: 重点关注代码实现、测试覆盖
   - **安全团队**: 重点关注安全配置、漏洞扫描
   - **运维/SRE**: 重点关注部署安全、监控告警

### 环境差异说明
- **开发环境**: 所有检查项必须通过
- **测试环境**: 所有检查项必须通过，增加渗透测试
- **生产环境**: 所有检查项必须通过，增加合规性检查

### 自动化检查命令
```bash
# 运行所有安全检查
npm run security:check

# 运行特定类别检查
npm run security:check -- --category=auth
npm run security:check -- --category=input-validation
npm run security:check -- --category=database

# 生成JSON格式报告
npm run security:report

# 生成SARIF格式报告
npm run security:sarif

# 按严重级别失败
npm run security:fail-high
npm run security:fail-critical

# 使用特定环境文件
npm run security:check:test
```

## 认证与授权

### JWT认证 (OWASP ASVS 2.1) - P0 (必选) <a id="jwt-authentication"></a>

**适用场景**: 所有使用JWT认证的API
**标准引用**:
- OWASP ASVS 2.1.1: 验证身份认证机制
- OWASP ASVS 2.1.3: 验证会话管理
- ISO/IEC 27001: A.9.2.1 访问控制
- GDPR: 第32条 数据安全的技术措施

- [P0] JWT令牌是否包含过期时间？ (ruleId: jwt-expiration, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发) {#jwt-expiration}
  - **验收证据示例**:
    ```typescript
    // 代码片段
    const payload = {
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1小时过期
    };
    ```
  - **自动化检查**: `npm run security:check -- --rule=jwt-expiration`
- [P0] JWT令牌是否使用强密钥签名？ (ruleId: jwt-secret-strength, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE) {#jwt-secret-strength}
  - **验收证据示例**:
    ```bash
    # 配置片段
    JWT_SECRET=256-bit-strong-random-key-here
    ```
  - **自动化检查**: `npm run security:check -- --rule=jwt-secret-strength`
- [P0] JWT认证守卫是否正确验证令牌格式？ (ruleId: jwt-format-validation, 检查方式: 单元测试, 频率: 每次发布, 责任角色: 后端开发) {#jwt-format-validation}
  - **验收证据示例**:
    ```typescript
    // 测试片段
    it('should reject invalid JWT format', () => {
      expect(guard.canActivate(mockContext)).toBe(false);
    });
    ```
  - **自动化检查**: `npm run security:check -- --rule=jwt-format-validation`
- [P1] 是否实现了令牌刷新机制？ (ruleId: jwt-refresh-mechanism, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发) {#jwt-refresh-mechanism}
  - **验收证据示例**:
    ```typescript
    // 代码片段
    @Post('refresh')
    async refreshToken(@Body() refreshDto: RefreshTokenDto) {
      return this.authService.refresh(refreshDto.refreshToken);
    }
    ```
  - **自动化检查**: `npm run security:check -- --rule=jwt-refresh-mechanism`
- [P0] 是否在令牌中包含最小必要信息？ (ruleId: jwt-minimal-payload, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/架构师) {#jwt-minimal-payload}
  - **验收证据示例**:
    ```typescript
    // 代码片段
    const payload = {
      sub: userId,
      role: user.role,
      iat: Date.now()
    }; // 只包含必要信息
    ```
  - **自动化检查**: `npm run security:check -- --rule=jwt-minimal-payload`

### 角色权限控制 (OWASP ASVS 1.5.3) - P0 (必选) <a id="role-permission-control"></a>

**适用场景**: 所有基于角色的访问控制(RBAC)功能
**标准引用**:
- OWASP ASVS 1.5.3: 验证访问控制
- NIST SP 800-53: AC-2, AC-3, AC-6
- ISO/IEC 27001: A.9.2.2 访问控制
- SOX: 第404条 内部控制

- [P0] 角色守卫是否正确验证用户角色？ (ruleId: roles-guard, 检查方式: 单元测试, 频率: 每次发布, 责任角色: 后端开发) {#roles-guard}
- [P0] 是否实现了最小权限原则？ (ruleId: least-privilege, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/架构师) {#least-privilege}
- [P1] 敏感操作是否需要多重验证？ (ruleId: multi-factor-auth, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发) {#multi-factor-auth}
- [P2] 是否实现了角色继承机制？ (ruleId: role-inheritance, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发) {#role-inheritance}
- [P1] 是否定期审查用户权限？ (ruleId: permission-review, 检查方式: 运营流程审查, 频率: 季度, 责任角色: 安全团队/运维) {#permission-review}

## 输入验证与数据过滤 (OWASP ASVS 4.1)

### 输入验证 - P0 (必选)
**适用场景**: 所有接收用户输入的API端点
**标准引用**:
- OWASP ASVS 4.1: 验证输入
- CWE-20: 输入验证不当
- NIST SP 800-53: SI-10
- PCI DSS: 6.5.1

- [P0] 所有用户输入是否经过验证？ (ruleId: input-validation, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否验证了输入长度限制？ (ruleId: input-length-validation, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否验证了输入格式？ (ruleId: input-format-validation, 检查方式: 单元测试, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否验证了输入范围？ (ruleId: input-range-validation, 检查方式: 单元测试, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否使用了白名单而非黑名单验证？ (ruleId: whitelist-validation, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)

### 数据过滤 - P0 (必选)
**适用场景**: 所有处理用户输入的服务
**标准引用**:
- OWASP ASVS 5.2.3: 输出编码和转义
- CWE-79: 跨站脚本(XSS)
- CWE-89: SQL注入
- CWE-78: 操作系统命令注入

- [P0] 是否过滤了特殊字符？ (ruleId: special-char-filtering, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否防止了SQL注入？ (ruleId: sql-injection-protection, 检查方式: 安全扫描, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [P0] 是否防止了XSS攻击？ (ruleId: xss-protection, 检查方式: 安全扫描, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [P1] 是否防止了NoSQL注入？ (ruleId: nosql-injection-protection, 检查方式: 安全扫描, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [P1] 是否防止了命令注入？ (ruleId: command-injection-protection, 检查方式: 安全扫描, 频率: 每次发布, 责任角色: 后端开发/安全团队)

## 数据库安全 (OWASP ASVS 6.2)

### 数据访问 - P0 (必选)
**适用场景**: 所有数据库操作
**标准引用**:
- OWASP ASVS 6.2.1: 验证数据访问
- CWE-89: SQL注入
- NIST SP 800-53: AC-3, SC-8
- PCI DSS: 3.1, 7.2

- [P0] 是否使用参数化查询？ (ruleId: sql-injection-protection, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
  - **自动化检查**: `npm run security:check -- --rule=sql-injection-protection`
- [P0] 是否实现了数据库连接池？ (ruleId: db-connection-pool, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [P0] 是否限制了数据库用户权限？ (ruleId: db-user-permissions, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [P1] 是否加密了敏感数据？ (ruleId: sensitive-data-encryption, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [P1] 是否实现了数据备份策略？ (ruleId: data-backup-strategy, 检查方式: 运维流程审查, 频率: 季度, 责任角色: SRE/运维)

### 事务处理 - P0 (必选)
**适用场景**: 所有关键业务操作
**标准引用**:
- OWASP ASVS 6.2.3: 验证事务完整性
- CWE-662: 序列化/反序列化不当
- NIST SP 800-53: AC-4
- SOX: 第404条 内部控制

- [P0] 关键操作是否使用事务？ (ruleId: transaction-usage, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
  - **自动化检查**: `npm run security:check -- --rule=transaction-usage`
- [P0] 是否实现了乐观锁或悲观锁？ (ruleId: locking-mechanism, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否处理了事务回滚？ (ruleId: transaction-rollback, 检查方式: 单元测试, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否避免了长事务？ (ruleId: long-transaction-avoidance, 检查方式: 性能监控, 频率: 每周, 责任角色: 后端开发/SRE)
- [P1] 是否监控了事务性能？ (ruleId: transaction-performance-monitoring, 检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE)

## Web安全基础 (OWASP ASVS 10.2)

### 安全响应头 - P0 (必选)
**适用场景**: 所有Web API
**标准引用**:
- OWASP ASVS 10.2.1: 验证HTTP安全头
- CWE-693: 保护机制失败
- NIST SP 800-53: SC-7, SC-8
- PCI DSS: 4.1

- [P0] 是否配置了安全响应头？ (ruleId: security-headers, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
  - **验收证据示例**:
    ```typescript
    // 代码片段
    import * as helmet from 'helmet';
    app.use(helmet());
    ```
  - **自动化检查**: `npm run security:check -- --rule=security-headers`
- [P0] 是否禁用了客户端缓存敏感响应？ (ruleId: client-cache-control, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否配置了CSP内容安全策略？ (ruleId: csp-policy, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [P1] 是否配置了HSTS？ (ruleId: hsts-configuration, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [P1] 是否配置了X-Frame-Options防止点击劫持？ (ruleId: x-frame-options, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)

### CORS配置 - P0 (必选)
**适用场景**: 所有跨域API
**标准引用**:
- OWASP ASVS 10.2.2: 验证跨域资源共享
- CWE-942: 过于宽松的CORS策略
- NIST SP 800-53: AC-4
- PCI DSS: 1.2.1

- [P0] 是否配置了CORS策略？ (ruleId: cors-config, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)
  - **自动化检查**: `npm run security:check -- --rule=cors-config`
- [P0] CORS策略是否不使用通配符(*)？ (ruleId: cors-no-wildcard, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [P0] 是否限制了允许的HTTP方法？ (ruleId: cors-methods-restriction, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否限制了允许的请求头？ (ruleId: cors-headers-restriction, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否配置了预检缓存？ (ruleId: cors-preflight-cache, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)

### CSRF防护 - P1 (强烈建议)
**适用场景**: 所有使用Cookie的Web应用
**标准引用**:
- OWASP ASVS 10.2.3: 验证CSRF防护
- CWE-352: 跨站请求伪造
- NIST SP 800-53: SC-23
- PCI DSS: 6.5.9

- [P1] 是否实现了CSRF防护？ (ruleId: csrf-protection, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否使用SameSite Cookie属性？ (ruleId: samesite-cookie, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)
- [P2] 是否实现了双重提交Cookie模式？ (ruleId: double-submit-cookie, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P2] 是否实现了CSRF令牌验证？ (ruleId: csrf-token-validation, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P2] 是否验证了Origin和Referer头？ (ruleId: origin-referer-validation, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)

### 文件上传安全 - P1 (强烈建议)
**适用场景**: 所有文件上传功能
**标准引用**:
- OWASP ASVS 10.3.1: 验证文件上传
- CWE-434: 未限制上传文件类型
- NIST SP 800-53: SI-10
- PCI DSS: 6.5.10

- [P1] 是否限制了上传文件类型？ (ruleId: file-upload-type-restriction, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否限制了上传文件大小？ (ruleId: file-upload-size-limit, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否验证了文件内容？ (ruleId: file-upload-content-validation, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P2] 是否将上传文件存储在非Web目录？ (ruleId: file-upload-storage-location, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [P2] 是否对上传文件进行了病毒扫描？ (ruleId: file-upload-virus-scan, 检查方式: 流程审查, 频率: 季度, 责任角色: 安全团队/运维)

### 路径遍历防护 - P1 (强烈建议)
**适用场景**: 所有文件系统访问
**标准引用**:
- OWASP ASVS 10.3.3: 验证路径遍历防护
- CWE-22: 路径遍历
- NIST SP 800-53: SI-10

- [P1] 是否验证了文件路径？ (ruleId: path-traversal-protection, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否使用了白名单验证文件名？ (ruleId: filename-whitelist, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P2] 是否规范化了文件路径？ (ruleId: path-normalization, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P2] 是否限制了文件访问权限？ (ruleId: file-access-permissions, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [P2] 是否使用了安全的文件API？ (ruleId: secure-file-api, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)

## 秘密管理 (OWASP ASVS 7.2)

### 密钥管理 - P0 (必选)
**适用场景**: 所有使用密钥的功能
**标准引用**:
- OWASP ASVS 7.2.1: 验证密钥管理
- CWE-320: 密钥管理不当
- NIST SP 800-57: 密钥管理
- PCI DSS: 3.5, 3.6

- [P0] 密钥是否不存储在代码仓库？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [P0] 是否使用了环境变量存储密钥？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [P0] 是否实现了密钥轮换机制？ (检查方式: 流程审查, 频率: 季度, 责任角色: 安全团队/SRE)
- [P1] 是否使用了密钥管理服务(KMS)？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [P1] 是否限制了密钥访问权限？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)

### 密码安全 - P0 (必选)
**适用场景**: 所有用户密码处理
**标准引用**:
- OWASP ASVS 2.1.4: 验证密码策略
- CWE-521: 弱密码策略
- NIST SP 800-63B: 密码认证
- PCI DSS: 3.5.1

- [P0] 是否使用了强密码哈希算法？ (ruleId: password-hash, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
  - **验收证据示例**:
    ```typescript
    // 代码片段
    import * as bcrypt from 'bcrypt';
    const saltRounds = 12; // 使用足够的轮次
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    ```
- [P0] 是否设置了足够的哈希成本因子？ (ruleId: password-hash-cost, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否实现了密码复杂度要求？ (ruleId: password-complexity, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否实现了密码历史检查？ (ruleId: password-history, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否实现了密码过期策略？ (ruleId: password-expiry, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)

### 会话管理 - P0 (必选)
**适用场景**: 所有用户会话
**标准引用**:
- OWASP ASVS 2.1.6: 验证会话管理
- CWE-384: 会话固定
- CWE-613: 会话过期不当
- NIST SP 800-63B: 会话认证

- [P0] 是否实现了会话超时机制？ (ruleId: session-management, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否实现了会话失效机制？ (ruleId: session-invalidation, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否实现了安全的会话ID生成？ (ruleId: session-id-generation, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否实现了会话固定防护？ (ruleId: session-fixation-protection, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否实现了并发会话限制？ (ruleId: concurrent-session-limit, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)

## 业务逻辑安全 (OWASP ASVS 10.1)

### 支付处理 - P0 (必选)
**适用场景**: 所有支付相关功能
**标准引用**:
- OWASP ASVS 10.1.2: 验证支付处理
- CWE-841: 业务逻辑错误
- PCI DSS: 4.1, 5.2
- SOX: 第404条 内部控制

- [P0] 支付状态更新是否原子性？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否实现了幂等性检查？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否验证了支付金额？ (检查方式: 单元测试, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否实现了支付超时处理？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否记录了支付审计日志？ (检查方式: 日志审查, 频率: 每月, 责任角色: 后端开发/安全团队)

### 订单处理 - P0 (必选)
**适用场景**: 所有订单相关功能
**标准引用**:
- OWASP ASVS 10.1.3: 验证业务逻辑
- CWE-841: 业务逻辑错误
- SOX: 第404条 内部控制

- [P0] 库存更新是否原子性？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否防止了超卖问题？ (检查方式: 压力测试, 频率: 每次发布, 责任角色: 后端开发/QA)
- [P0] 是否实现了订单状态机？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否验证了订单数据完整性？ (检查方式: 单元测试, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否实现了订单取消机制？ (检查方式: 功能测试, 频率: 每次发布, 责任角色: 后端开发/QA)

## 缓存安全 (OWASP ASVS 5.1)

### 缓存键管理
- [ ] 缓存键是否唯一？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [ ] 缓存键是否包含命名空间？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [ ] 是否实现了缓存键版本控制？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [ ] 是否实现了缓存键过期策略？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [ ] 是否监控了缓存命中率？ (检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE)

### 缓存数据
- [ ] 敏感数据是否缓存？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [ ] 缓存数据是否加密？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [ ] 是否实现了缓存失效策略？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [ ] 是否监控了缓存大小？ (检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE)
- [ ] 是否实现了缓存预热？ (检查方式: 运维流程审查, 频率: 每次发布, 责任角色: SRE/运维)

## 安全配置 (OWASP ASVS 7.2)

### 加密配置
- [ ] 加密密钥是否足够复杂？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [ ] 加密密钥是否定期轮换？ (检查方式: 运维流程审查, 频率: 季度, 责任角色: SRE/安全团队)
- [ ] 是否使用了强加密算法？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [ ] 是否验证了密钥格式？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [ ] 是否实现了密钥管理策略？ (检查方式: 流程审查, 频率: 半年, 责任角色: 安全团队/架构师)

### 环境配置
- [ ] 是否使用了环境变量存储敏感配置？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [ ] 默认密码是否已更改？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: SRE/运维)
- [ ] 是否禁用了调试模式？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [ ] 是否配置了安全头？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [ ] 是否限制了CORS策略？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)

## 日志与监控 (OWASP ASVS 8.1)

### 日志记录
- [ ] 是否记录了安全事件？ (检查方式: 日志审查, 频率: 每月, 责任角色: 后端开发/安全团队)
- [ ] 敏感信息是否已脱敏？ (检查方式: 日志审查, 频率: 每月, 责任角色: 后端开发/安全团队)
- [ ] 日志是否包含足够上下文？ (检查方式: 日志审查, 频率: 每月, 责任角色: 后端开发/SRE)
- [ ] 是否实现了日志轮转？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: SRE/运维)
- [ ] 是否保护了日志文件安全？ (检查方式: 安全审查, 频率: 季度, 责任角色: 安全团队/SRE)

### 监控告警
- [ ] 是否监控了异常登录？ (检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE/安全团队)
- [ ] 是否监控了高频访问？ (检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE)
- [ ] 是否监控了错误率？ (检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE/后端开发)
- [ ] 是否实现了实时告警？ (检查方式: 告警配置审查, 频率: 每月, 责任角色: SRE/运维)
- [ ] 是否定期审查监控数据？ (检查方式: 流程审查, 频率: 季度, 责任角色: SRE/安全团队)

## API安全 (OWASP API Security Top 10)

### API设计 - P0 (必选)
**适用场景**: 所有API端点
**标准引用**:
- OWASP API Security Top 10: API1:2023 - Broken Object Level Authorization
- OWASP ASVS 9.1: 验证API安全
- NIST SP 800-53: AC-1, AC-2
- PCI DSS: 4.1, 7.2

- [P0] 是否实现了API版本控制？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/架构师)
- [P0] 是否限制了请求大小？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [P0] 是否实现了请求签名验证？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [P0] 是否使用了HTTPS？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: SRE/运维)
- [P0] 是否实现了API文档？ (检查方式: 文档审查, 频率: 每次发布, 责任角色: 后端开发/技术文档)

### 速率限制 - P0 (必选)
**适用场景**: 所有API端点
**标准引用**:
- OWASP API Security Top 10: API4:2023 - Unrestricted Resource Consumption
- OWASP ASVS 9.2: 验证速率限制
- NIST SP 800-53: SC-5, SC-7
- PCI DSS: 10.2

- [P0] 是否实现了API速率限制？ (ruleId: rate-limiting, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否区分了不同用户的限制？ (ruleId: user-specific-rate-limit, 检查方式: 功能测试, 频率: 每次发布, 责任角色: 后端开发/QA)
- [P0] 是否实现了动态调整策略？ (ruleId: dynamic-rate-limit, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否监控了限制触发？ (ruleId: rate-limit-monitoring, 检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE)
- [P1] 是否实现了限制豁免机制？ (ruleId: rate-limit-exemption, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)

### SSRF防护 - P1 (强烈建议)
**适用场景**: 所有发起外部请求的功能
**标准引用**:
- OWASP API Security Top 10: API10:2023 - Server-Side Request Forgery
- CWE-918: 服务端请求伪造
- NIST SP 800-53: AC-4, SI-10

- [P1] 是否验证了外部请求URL？ (ruleId: ssrf-protection, 检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否限制了可访问的IP范围？ (ruleId: ip-range-restriction, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [P1] 是否禁用了重定向跟随？ (ruleId: redirect-follow-disabled, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)
- [P2] 是否实现了响应大小限制？ (ruleId: response-size-limit, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)
- [P2] 是否实现了请求超时机制？ (ruleId: request-timeout, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)

## 供应链安全 (OWASP ASVS 11.1)

### 依赖项安全 - P0 (必选)
**适用场景**: 所有第三方依赖
**标准引用**:
- OWASP ASVS 11.1.1: 验证供应链安全
- CWE-1104: 使用具有已知漏洞的组件
- NIST SP 800-53: SA-12, RA-5
- Executive Order 14028: Improving the Nation's Cybersecurity

- [P0] 是否扫描了依赖项漏洞？ (ruleId: dependency-vulnerability, 检查方式: 安全扫描, 频率: 每周, 责任角色: 后端开发/安全团队)
  - **验收证据示例**:
    ```bash
    # 命令示例
    npm audit --audit-level high
    ```
- [P0] 是否及时更新了有漏洞的依赖？ (ruleId: dependency-update, 检查方式: 流程审查, 频率: 每周, 责任角色: 后端开发/安全团队)
- [P1] 是否锁定了依赖版本？ (ruleId: dependency-locking, 检查方式: 配置审查, 频率: 每次发布, 责任角色: 后端开发)
- [P1] 是否验证了依赖完整性？ (ruleId: dependency-integrity, 检查方式: 流程审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [P2] 是否使用了依赖项白名单？ (ruleId: dependency-whitelist, 检查方式: 配置审查, 频率: 季度, 责任角色: 后端开发/安全团队)

### SBOM管理 - P1 (强烈建议)
**适用场景**: 所有发布版本
**标准引用**:
- OWASP ASVS 11.1.2: 验证软件物料清单
- NIST SP 800-161: Supply Chain Risk Management
- Executive Order 14028: Improving the Nation's Cybersecurity

- [P1] 是否生成了软件物料清单(SBOM)？ (检查方式: 流程审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [P2] 是否验证了SBOM完整性？ (检查方式: 流程审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [P2] 是否维护了SBOM版本历史？ (检查方式: 流程审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [P2] 是否实现了SBOM自动化更新？ (检查方式: 流程审查, 频率: 季度, 责任角色: 后端开发/安全团队)
- [P2] 是否集成了SBOM到安全扫描？ (检查方式: 流程审查, 频率: 季度, 责任角色: 后端开发/安全团队)

### 容器安全 - P1 (强烈建议)
**适用场景**: 所有容器化部署
**标准引用**:
- OWASP ASVS 12.1: 验证部署安全
- CIS Docker Benchmark
- NIST SP 800-190: Container Security Guide

- [P1] 是否使用了官方基础镜像？ (检查方式: 镜像审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [P1] 是否以非root用户运行？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: SRE/运维)
- [P1] 是否扫描了镜像漏洞？ (检查方式: 安全扫描, 频率: 每次发布, 责任角色: SRE/安全团队)
- [P1] 是否实现了镜像签名验证？ (检查方式: 流程审查, 频率: 每次发布, 责任角色: SRE/安全团队)
- [P2] 是否限制了容器资源？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: SRE)

## 日志与监控 (OWASP ASVS 8.1)

### 日志记录 - P0 (必选)
**适用场景**: 所有安全相关操作
**标准引用**:
- OWASP ASVS 8.1.1: 验证日志记录
- CWE-532: 敏感信息插入日志
- NIST SP 800-53: AU-2, AU-3
- PCI DSS: 10.2, 10.3

- [P0] 是否记录了安全事件？ (ruleId: security-event-logging, 检查方式: 日志审查, 频率: 每月, 责任角色: 后端开发/安全团队)
- [P0] 敏感信息是否已脱敏？ (ruleId: sensitive-data-sanitization, 检查方式: 日志审查, 频率: 每月, 责任角色: 后端开发/安全团队)
- [P0] 日志是否包含足够上下文？ (ruleId: log-context, 检查方式: 日志审查, 频率: 每月, 责任角色: 后端开发/SRE)
- [P1] 是否实现了日志轮转？ (ruleId: log-rotation, 检查方式: 配置审查, 频率: 每次发布, 责任角色: SRE/运维)
- [P1] 是否保护了日志文件安全？ (ruleId: log-file-security, 检查方式: 安全审查, 频率: 季度, 责任角色: 安全团队/SRE)

### 监控告警 - P0 (必选)
**适用场景**: 所有生产环境系统
**标准引用**:
- OWASP ASVS 8.2.1: 验证监控
- NIST SP 800-53: CA-7, IR-4
- ISO/IEC 27001: A.12.4.1

- [P0] 是否监控了异常登录？ (ruleId: abnormal-login-monitoring, 检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE/安全团队)
- [P0] 是否监控了高频访问？ (ruleId: high-frequency-access-monitoring, 检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE)
- [P0] 是否监控了错误率？ (ruleId: error-rate-monitoring, 检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE/后端开发)
- [P0] 是否实现了实时告警？ (ruleId: real-time-alerting, 检查方式: 告警配置审查, 频率: 每月, 责任角色: SRE/运维)
- [P1] 是否定期审查监控数据？ (ruleId: monitoring-data-review, 检查方式: 流程审查, 频率: 季度, 责任角色: SRE/安全团队)

## 代码质量 (OWASP ASVS 1.1)

### 代码审查 - P0 (必选)
**适用场景**: 所有代码提交
**标准引用**:
- OWASP ASVS 1.1.1: 验证代码质量
- CWE-710: 包含未验证代码
- NIST SP 800-53: SA-4, SA-11

- [P0] 是否进行了安全代码审查？ (检查方式: 流程审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [P0] 是否使用了静态分析工具？ (检查方式: 工具配置审查, 频率: 每次发布, 责任角色: 后端开发/QA)
- [P0] 是否检查了依赖项漏洞？ (检查方式: 安全扫描, 频率: 每周, 责任角色: 后端开发/安全团队)
- [P0] 是否实现了代码规范？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [P0] 是否进行了安全测试？ (检查方式: 测试报告审查, 频率: 每次发布, 责任角色: QA/安全团队)

### 错误处理
- [ ] 是否统一了错误响应格式？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [ ] 是否避免了敏感信息泄露？ (检查方式: 安全扫描, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [ ] 是否记录了错误详情？ (检查方式: 日志审查, 频率: 每月, 责任角色: 后端开发/SRE)
- [ ] 是否实现了错误恢复机制？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发)
- [ ] 是否监控了错误率？ (检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE/后端开发)

## 部署安全 (OWASP ASVS 12.1)

### 容器安全
- [ ] 是否使用了官方基础镜像？ (检查方式: 镜像审查, 频率: 每次发布, 责任角色: 后端开发/SRE)
- [ ] 是否以非root用户运行？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: SRE/运维)
- [ ] 是否限制了容器资源？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: SRE)
- [ ] 是否扫描了镜像漏洞？ (检查方式: 安全扫描, 频率: 每次发布, 责任角色: SRE/安全团队)
- [ ] 是否实现了镜像签名验证？ (检查方式: 流程审查, 频率: 每次发布, 责任角色: SRE/安全团队)

### 网络安全
- [ ] 是否实现了网络隔离？ (检查方式: 网络配置审查, 频率: 每次发布, 责任角色: SRE/运维)
- [ ] 是否配置了防火墙规则？ (检查方式: 安全配置审查, 频率: 季度, 责任角色: SRE/安全团队)
- [ ] 是否使用了VPN或专线？ (检查方式: 网络审查, 频率: 半年, 责任角色: SRE/运维)
- [ ] 是否监控了网络流量？ (检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE/安全团队)
- [ ] 是否实现了DDoS防护？ (检查方式: 安全配置审查, 频率: 季度, 责任角色: SRE/安全团队)

## 数据保护 (OWASP ASVS 3.1)

### 数据分类
- [ ] 是否对数据进行了分类？ (检查方式: 文档审查, 频率: 半年, 责任角色: 数据团队/安全团队)
- [ ] 是否标识了敏感数据？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/数据团队)
- [ ] 是否实现了数据访问控制？ (检查方式: 权限审查, 频率: 季度, 责任角色: 安全团队/后端开发)
- [ ] 是否实现了数据加密？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/安全团队)
- [ ] 是否实现了数据脱敏？ (检查方式: 代码审查, 频率: 每次发布, 责任角色: 后端开发/数据团队)

### 数据生命周期
- [ ] 是否实现了数据备份？ (检查方式: 运维流程审查, 频率: 季度, 责任角色: SRE/运维)
- [ ] 是否实现了数据恢复？ (检查方式: 灾备测试, 频率: 半年, 责任角色: SRE/运维)
- [ ] 是否实现了数据归档？ (检查方式: 流程审查, 频率: 半年, 责任角色: 数据团队/法务)
- [ ] 是否实现了数据销毁？ (检查方式: 流程审查, 频率: 半年, 责任角色: 数据团队/法务)
- [ ] 是否符合数据保护法规？ (检查方式: 合规审查, 频率: 年度, 责任角色: 法务/安全团队)

## 测试安全 (OWASP ASVS 1.4)

### 安全测试
- [ ] 是否进行了渗透测试？ (检查方式: 测试报告审查, 频率: 半年, 责任角色: 安全团队/QA)
- [ ] 是否进行了模糊测试？ (检查方式: 测试报告审查, 频率: 季度, 责任角色: QA/安全团队)
- [ ] 是否进行了漏洞扫描？ (检查方式: 扫描报告审查, 频率: 每次发布, 责任角色: 安全团队/后端开发)
- [ ] 是否进行了安全配置检查？ (检查方式: 配置审查, 频率: 每次发布, 责任角色: 安全团队/SRE)
- [ ] 是否进行了依赖项审计？ (检查方式: 扫描报告审查, 频率: 每周, 责任角色: 安全团队/后端开发)

### 测试数据
- [ ] 测试数据是否脱敏？ (检查方式: 数据审查, 频率: 每次发布, 责任角色: QA/数据团队)
- [ ] 是否隔离了测试环境？ (检查方式: 环境审查, 频率: 每次发布, 责任角色: SRE/QA)
- [ ] 是否清理了测试数据？ (检查方式: 流程审查, 频率: 每次发布, 责任角色: QA/SRE)
- [ ] 是否保护了测试凭据？ (检查方式: 安全审查, 频率: 每次发布, 责任角色: QA/安全团队)
- [ ] 是否监控了测试环境？ (检查方式: 监控配置审查, 频率: 每月, 责任角色: SRE/QA)

## 合规性 (OWASP ASVS 11.1)

### 法规遵循
- [ ] 是否符合GDPR要求？ (检查方式: 合规审查, 频率: 年度, 责任角色: 法务/安全团队)
- [ ] 是否符合PCI DSS要求？ (检查方式: 合规审查, 频率: 年度, 责任角色: 法务/安全团队)
- [ ] 是否符合本地法规？ (检查方式: 合规审查, 频率: 年度, 责任角色: 法务/安全团队)
- [ ] 是否实现了数据主体权利？ (检查方式: 功能测试, 频率: 每次发布, 责任角色: 后端开发/法务)
- [ ] 是否记录了数据处理活动？ (检查方式: 文档审查, 频率: 季度, 责任角色: 数据团队/法务)

### 审计跟踪
- [ ] 是否实现了操作审计？ (检查方式: 日志审查, 频率: 每月, 责任角色: 后端开发/安全团队)
- [ ] 是否记录了数据访问？ (检查方式: 日志审查, 频率: 每月, 责任角色: 后端开发/安全团队)
- [ ] 是否实现了审计日志保护？ (检查方式: 安全审查, 频率: 季度, 责任角色: 安全团队/SRE)
- [ ] 是否定期审查审计日志？ (检查方式: 流程审查, 频率: 季度, 责任角色: 安全团队/审计)
- [ ] 是否实现了审计报告生成？ (检查方式: 功能测试, 频率: 季度, 责任角色: 安全团队/审计)

## 应急响应 (OWASP ASVS 13.1)

### 事件响应 - P0 (必选)
**适用场景**: 所有安全事件
**标准引用**:
- OWASP ASVS 13.1.1: 验证事件响应
- NIST SP 800-61: Computer Security Incident Handling Guide
- ISO/IEC 27035: Information security incident management
- PCI DSS: 12.9

- [P0] 是否制定了应急响应计划？ (检查方式: 文档审查, 频率: 半年, 责任角色: 安全团队/运维)
- [P0] 是否建立了事件分类标准？ (检查方式: 文档审查, 频率: 半年, 责任角色: 安全团队)
- [P0] 是否实现了事件通知机制？ (检查方式: 功能测试, 频率: 季度, 责任角色: 安全团队/SRE)
- [P0] 是否进行了应急响应演练？ (检查方式: 演练报告审查, 频率: 半年, 责任角色: 安全团队/运维)
- [P0] 是否建立了事后分析流程？ (检查方式: 流程审查, 频率: 季度, 责任角色: 安全团队)

### 恢复计划 - P0 (必选)
**适用场景**: 所有系统恢复
**标准引用**:
- NIST SP 800-34: Contingency Planning Guide
- ISO/IEC 22301: Business continuity management systems
- DRI International: Professional Practices for Business Continuity Planning

- [P0] 是否制定了业务连续性计划？ (检查方式: 文档审查, 频率: 年度, 责任角色: 管理层/运维)
- [P0] 是否实现了系统备份？ (检查方式: 备份测试, 频率: 季度, 责任角色: SRE/运维)
- [P0] 是否测试了恢复流程？ (检查方式: 灾备测试, 频率: 半年, 责任角色: SRE/运维)
- [P0] 是否建立了备用系统？ (检查方式: 系统审查, 频率: 年度, 责任角色: SRE/架构师)
- [P0] 是否定期更新恢复计划？ (检查方式: 文档审查, 频率: 季度, 责任角色: SRE/运维)

### 备份与恢复演练 - P1 (强烈建议)
**适用场景**: 所有关键数据
**标准引用**:
- NIST SP 800-53: CP-9, CP-10
- ISO/IEC 27001: A.17.1.1
- SOX: 第404条 内部控制

- [P1] 是否实现了自动化备份？ (检查方式: 流程审查, 频率: 季度, 责任角色: SRE/运维)
- [P1] 是否验证了备份完整性？ (检查方式: 流程审查, 频率: 季度, 责任角色: SRE/运维)
- [P1] 是否实现了异地备份？ (检查方式: 配置审查, 频率: 季度, 责任角色: SRE/运维)
- [P1] 是否进行了恢复演练？ (检查方式: 演练报告审查, 频率: 半年, 责任角色: SRE/运维)
- [P2] 是否定义了RTO/RPO目标？ (检查方式: 文档审查, 频率: 年度, 责任角色: 管理层/SRE)

## 使用指南

### 开发阶段

#### 设计阶段
1. **需求分析时**:
   - 识别安全需求
   - 评估潜在风险
   - 设计安全架构
   - 选择安全控制措施

2. **技术选型时**:
   - 评估组件安全性
   - 选择安全库和框架
   - 设计安全接口
   - 规划数据保护策略

#### 编码阶段
1. **实现前**:
   ```bash
   # 运行安全检查脚本，确保环境安全
   npm run security:check -- --env-file=.env.dev
   ```

2. **实现中**:
   - 按照清单逐项检查
   - 使用安全编码规范
   - 实现安全控制
   - 编写安全测试

3. **代码提交前**:
   ```bash
   # 运行完整安全检查
   npm run security:check -- --format=json --output=security-check-pr.json
   
   # 检查是否有严重或高危问题
   npm run security:fail-high
   ```

#### 测试阶段
1. **单元测试**:
   - 测试安全功能
   - 验证输入验证
   - 测试错误处理
   - 检查权限控制

2. **集成测试**:
   - 测试端到端安全
   - 验证会话管理
   - 测试API安全
   - 检查数据流安全

3. **安全测试**:
   ```bash
   # 运行特定类别测试
   npm run security:check -- --category=auth
   npm run security:check -- --category=input-validation
   npm run security:check -- --category=database
   ```

#### 部署前检查
1. **最终检查**:
   ```bash
   # 生成完整安全报告
   npm run security:report
   
   # 生成SARIF报告用于CI/CD
   npm run security:sarif
   ```

2. **配置验证**:
   - 验证生产配置
   - 检查环境变量
   - 确认密钥安全
   - 验证网络配置

### 维护阶段

#### 定期审查
1. **每月**:
   - 检查依赖项漏洞
   - 审查安全日志
   - 更新安全规则
   - 监控安全指标

2. **每季度**:
   - 全面安全审计
   - 更新安全清单
   - 进行渗透测试
   - 评估安全策略

3. **每年**:
   - 安全架构评估
   - 合规性审查
   - 风险评估更新
   - 安全培训更新

#### 清单更新流程
1. **识别新威胁**:
   - 监控安全公告
   - 分析漏洞趋势
   - 评估影响范围
   - 确定优先级

2. **更新清单**:
   - 添加新检查项
   - 更新现有规则
   - 调整优先级
   - 完善操作指南

3. **验证更新**:
   - 测试新规则
   - 验证检查逻辑
   - 更新文档
   - 培训团队

#### 团队培训
1. **新员工入职**:
   - 安全意识培训
   - 清单使用培训
   - 安全编码培训
   - 应急响应培训

2. **定期培训**:
   - 季度安全培训
   - 年度安全演练
   - 专项技能培训
   - 认证培训支持

### 审计阶段

#### 内部审计
1. **准备阶段**:
   - 确定审计范围
   - 收集相关文档
   - 准备审计工具
   - 制定审计计划

2. **执行阶段**:
   ```bash
   # 运行全面安全检查
   npm run security:check -- --format=json --output=internal-audit.json
   
   # 验证特定规则
   npm run security:check -- --rule=jwt-expiration
   npm run security:check -- --rule=sql-injection-protection
   ```

3. **报告阶段**:
   - 分析检查结果
   - 识别不符合项
   - 评估风险等级
   - 编写审计报告

#### 外部审计
1. **配合审计**:
   - 提供必要文档
   - 回答审计问题
   - 演示安全控制
   - 提供测试环境

2. **整改跟踪**:
   - 制定整改计划
   - 分配整改责任
   - 跟踪整改进度
   - 验证整改效果

### 角色特定指南

#### 后端开发人员
1. **日常开发**:
   - 使用安全编码规范
   - 实现输入验证
   - 正确处理错误
   - 保护敏感数据

2. **代码审查**:
   - 检查安全漏洞
   - 验证权限控制
   - 审查数据处理
   - 确认日志记录

3. **测试编写**:
   - 编写安全测试
   - 测试边界条件
   - 验证错误处理
   - 检查权限测试

#### 安全工程师
1. **安全评估**:
   - 定期安全扫描
   - 漏洞评估分析
   - 风险评估更新
   - 安全策略制定

2. **事件响应**:
   - 监控安全事件
   - 分析安全日志
   - 响应安全事件
   - 编写事件报告

3. **安全培训**:
   - 开发安全培训
   - 组织安全演练
   - 更新安全文档
   - 推广安全意识

#### 运维/SRE工程师
1. **部署安全**:
   - 配置安全环境
   - 管理访问权限
   - 监控系统安全
   - 更新安全补丁

2. **运维安全**:
   - 保护系统配置
   - 管理密钥证书
   - 监控异常活动
   - 备份安全数据

3. **应急响应**:
   - 处理安全事件
   - 恢复系统服务
   - 分析事件原因
   - 改进安全措施

### 环境特定指南

#### 开发环境
1. **配置要求**:
   - 使用开发专用配置
   - 禁用生产功能
   - 启用调试日志
   - 使用测试数据

2. **检查频率**:
   - 每次提交前检查
   - 每日自动扫描
   - 每周全面检查
   - 每月安全评估

#### 测试环境
1. **配置要求**:
   - 模拟生产配置
   - 使用脱敏数据
   - 启用安全监控
   - 配置测试工具

2. **检查频率**:
   - 每次部署前检查
   - 每日自动扫描
   - 每周渗透测试
   - 每月安全评估

#### 生产环境
1. **配置要求**:
   - 使用生产安全配置
   - 启用所有安全控制
   - 强化监控告警
   - 限制访问权限

2. **检查频率**:
   - 每次部署前检查
   - 每小时安全监控
   - 每日安全扫描
   - 每周安全评估

### 工具集成指南

#### CI/CD集成
1. **GitHub Actions示例**:
   ```yaml
   name: Security Check
   on: [push, pull_request]
   jobs:
     security:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Setup Node.js
           uses: actions/setup-node@v2
           with:
             node-version: '18'
         - name: Install dependencies
           run: npm ci
         - name: Run security check
           run: npm run security:check:ci
         - name: Upload security report
           uses: actions/upload-artifact@v2
           with:
             name: security-report
             path: security-report.json
   ```

2. **Jenkins集成示例**:
   ```groovy
   pipeline {
     agent any
     stages {
       stage('Security Check') {
         steps {
           sh 'npm ci'
           sh 'npm run security:check -- --format=json --output=security-report.json'
           publishHTML([
             allowMissing: false,
             alwaysLinkToLastBuild: true,
             keepAll: true,
             reportDir: '.',
             reportFiles: 'security-report.json',
             reportName: 'Security Report'
           ])
         }
       }
     }
   }
   ```

#### IDE集成
1. **VS Code扩展**:
   - 安装安全扫描扩展
   - 配置自动检查
   - 设置问题高亮
   - 添加快速修复

2. **JetBrains IDE**:
   - 配置安全检查插件
   - 设置代码检查规则
   - 添加安全注释
   - 配置实时扫描

### 常见问题与解决方案

#### Q: 如何处理检查失败？
A:
1. 分析失败原因
2. 查看详细错误信息
3. 参考修复建议
4. 实施修复措施
5. 重新运行检查

#### Q: 如何自定义检查规则？
A:
1. 修改规则配置文件
2. 添加自定义检查逻辑
3. 测试新规则
4. 更新文档
5. 部署到团队

#### Q: 如何处理误报？
A:
1. 分析误报原因
2. 调整检查规则
3. 使用豁免标记
4. 记录误报案例
5. 改进检查逻辑

#### Q: 如何提高检查效率？
A:
1. 优化检查脚本
2. 使用并行检查
3. 缓存检查结果
4. 增量检查
5. 自动化流程

## 注意事项

1. 此清单应根据具体项目需求进行调整
2. 清单项目应定期更新以应对新的安全威胁
3. 团队成员应接受清单使用培训
4. 清单执行情况应纳入绩效考核
5. 应建立清单反馈机制，持续改进

## 豁免标记使用指南

### 豁免标记格式

在代码中，可以使用豁免标记来临时绕过安全检查。豁免标记必须包含以下信息：
- 规则ID或漏洞ID
- 豁免原因
- 批准人
- 到期日期

### 中文格式示例

```typescript
// SECURITY-EXEMPTION: RULE:jwt-expiration, 原因: 兼容旧系统, 批准人: 张三, 到期日: 2025-12-31
export const JWT_EXPIRY = '30d'; // 临时延长过期时间

// SECURITY-EXEMPTION: VULN:VULN-001, 原因: 第三方库限制, 批准人: 李四, 到期日: 2025-10-31
import vulnerableLibrary from 'vulnerable-library';
```

### 英文格式示例

```typescript
// SECURITY-EXEMPTION: RULE:jwt-expiration, Reason: Legacy system compatibility, ApprovedBy: John Smith, ExpiresOn: 2025-12-31
export const JWT_EXPIRY = '30d'; // Temporary extended expiry time

// SECURITY-EXEMPTION: VULN:VULN-001, Reason: Third-party library limitation, ApprovedBy: Jane Doe, ExpiresOn: 2025-10-31
import vulnerableLibrary from 'vulnerable-library';
```

### 日期格式要求

- **格式**: 必须使用 YYYY-MM-DD 格式（例如：2025-12-31）
- **有效性**: 日期必须是有效的日历日期
- **时区**: 日期按照系统本地时区解释
- **过期检查**: 到期日早于当前日期的豁免标记将被视为已过期

### 豁免标记管理

1. **审批流程**: 所有豁免标记必须获得安全团队或技术负责人批准
2. **定期审查**: 每月审查所有有效的豁免标记
3. **自动提醒**: 到期前7天自动发送提醒通知
4. **及时更新**: 如需延长豁免期限，必须在到期前更新标记
5. **文档记录**: 在项目管理系统中记录所有豁免决策和原因

### 豁免标记最佳实践

1. **最小范围**: 仅豁免必要的代码部分，避免大范围豁免
2. **明确原因**: 详细说明豁免的技术或业务原因
3. **设置期限**: 设置合理的到期日期，最长不超过6个月
4. **跟踪计划**: 制定解决安全问题的具体计划和时间表
5. **定期评估**: 定期评估豁免的必要性和风险影响

## 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [SANS Critical Security Controls](https://www.sans.org/critical-security-controls/)
- [ISO 27001](https://www.iso.org/isoiec-27001-information-security.html)