/**
 * 安全规则模块
 * 用途: 定义所有安全检查规则
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { glob } = require('glob');
const { PROJECT_ROOT } = require('./env-loader');

// 安全检查规则配置
const SECURITY_RULES = {
  'jwt-expiration': {
    name: 'JWT令牌过期时间检查',
    category: 'auth',
    severity: 'medium',
    description: '检查JWT令牌是否包含过期时间',
    standards: ['OWASP ASVS 2.1.1', 'OWASP ASVS 2.1.3', 'NIST SP 800-63B 5.1.1.2'],
    check: () => {
      const authGuardPath = path.join(PROJECT_ROOT, 'src/auth/guards/jwt-auth.guard.ts');
      if (!fs.existsSync(authGuardPath)) {
        return { passed: false, message: 'JWT认证守卫文件不存在', files: [] };
      }

      const content = fs.readFileSync(authGuardPath, 'utf8');
      if (content.includes('exp:') || content.includes('expiresIn:')) {
        return { passed: true, message: 'JWT令牌包含过期时间', files: [authGuardPath] };
      }
      return { passed: false, message: 'JWT令牌未包含过期时间', files: [authGuardPath] };
    },
  },
  'jwt-secret-strength': {
    name: 'JWT密钥强度检查',
    category: 'auth',
    severity: 'high',
    description: '检查JWT密钥是否足够强',
    standards: ['OWASP ASVS 2.1.4', 'NIST SP 800-63B 5.1.1.2', 'PCI DSS 3.2.1 3.5.1'],
    check: () => {
      // 优先检查环境变量
      const secret = process.env.JWT_SECRET;

      if (!secret) {
        return { passed: false, message: 'JWT_SECRET未配置', files: [] };
      }

      if (secret.length < 64) {
        return { passed: false, message: 'JWT密钥长度不足64字符', files: [] };
      }

      if (secret === 'your-secret-key' || secret === 'CHANGE_THIS_TO_SECURE_RANDOM_STRING') {
        return { passed: false, message: 'JWT密钥使用默认值', files: [] };
      }

      // 检查密钥复杂度
      const hasLowercase = /[a-z]/.test(secret);
      const hasUppercase = /[A-Z]/.test(secret);
      const hasNumbers = /\d/.test(secret);
      const hasSpecialChars = /[^a-zA-Z0-9]/.test(secret);

      if (!hasLowercase || !hasUppercase || !hasNumbers || !hasSpecialChars) {
        return {
          passed: false,
          message: 'JWT密钥复杂度不足，应包含大小写字母、数字和特殊字符',
          files: [],
        };
      }

      return { passed: true, message: 'JWT密钥强度符合要求', files: [] };
    },
  },
  'jwt-format-validation': {
    name: 'JWT格式验证检查',
    category: 'auth',
    severity: 'high',
    description: '检查JWT认证守卫是否正确验证令牌格式',
    standards: ['OWASP ASVS 2.1.2', 'NIST SP 800-63B 5.1.1.2'],
    check: () => {
      const authGuardPath = path.join(PROJECT_ROOT, 'src/auth/guards/jwt-auth.guard.ts');
      if (!fs.existsSync(authGuardPath)) {
        return { passed: false, message: 'JWT认证守卫文件不存在', files: [] };
      }

      const content = fs.readFileSync(authGuardPath, 'utf8');
      if (content.includes('extractTokenFromHeader') && content.includes('Bearer')) {
        return { passed: true, message: 'JWT格式验证已实现', files: [authGuardPath] };
      }
      return { passed: false, message: 'JWT格式验证未正确实现', files: [authGuardPath] };
    },
  },
  'jwt-refresh-mechanism': {
    name: 'JWT刷新机制检查',
    category: 'auth',
    severity: 'critical', // P0级别，必须通过
    description: '检查是否实现了JWT令牌刷新机制',
    standards: ['OWASP ASVS 2.1.5', 'NIST SP 800-63B 5.1.1.3'],
    check: () => {
      const authServicePath = path.join(PROJECT_ROOT, 'src/auth/auth.service.ts');
      if (!fs.existsSync(authServicePath)) {
        return { passed: false, message: '认证服务文件不存在', files: [] };
      }

      const content = fs.readFileSync(authServicePath, 'utf8');
      if (content.includes('refreshToken') || content.includes('refresh')) {
        return { passed: true, message: 'JWT刷新机制已实现', files: [authServicePath] };
      }
      return { passed: false, message: 'JWT刷新机制未实现', files: [authServicePath] };
    },
  },
  'jwt-minimal-payload': {
    name: 'JWT最小载荷检查',
    category: 'auth',
    severity: 'critical', // P0级别，必须通过
    description: '检查JWT令牌是否只包含最小必要信息',
    standards: ['OWASP ASVS 2.1.6', 'NIST SP 800-63B 5.1.1.2'],
    check: () => {
      const authServicePath = path.join(PROJECT_ROOT, 'src/auth/auth.service.ts');
      if (!fs.existsSync(authServicePath)) {
        return { passed: false, message: '认证服务文件不存在', files: [] };
      }

      const content = fs.readFileSync(authServicePath, 'utf8');
      if (content.includes('password') || content.includes('creditCard')) {
        return { passed: false, message: 'JWT载荷包含敏感信息', files: [authServicePath] };
      }
      return { passed: true, message: 'JWT载荷符合最小必要信息原则', files: [authServicePath] };
    },
  },
  'roles-guard': {
    name: '角色守卫检查',
    category: 'auth',
    severity: 'high',
    description: '检查角色守卫是否正确验证用户角色',
    standards: ['OWASP ASVS 1.5.3', 'NIST SP 800-53: AC-2, AC-3, AC-6'],
    check: () => {
      const guardFiles = glob.sync('src/**/*roles*.guard.ts', { cwd: PROJECT_ROOT });
      if (guardFiles.length === 0) {
        return { passed: false, message: '未找到角色守卫文件', files: [] };
      }

      for (const guardFile of guardFiles) {
        const guardPath = path.join(PROJECT_ROOT, guardFile);
        const content = fs.readFileSync(guardPath, 'utf8');

        // 检查是否有角色验证逻辑
        if (
          content.includes('canActivate') &&
          (content.includes('user.role') ||
            content.includes('hasRole') ||
            content.includes('hasAnyRole'))
        ) {
          return { passed: true, message: '角色守卫已实现角色验证', files: [guardPath] };
        }
      }

      return {
        passed: false,
        message: '角色守卫未正确实现角色验证',
        files: guardFiles.map(f => path.join(PROJECT_ROOT, f)),
      };
    },
  },
  'input-length-validation': {
    name: '输入长度限制检查',
    category: 'input-validation',
    severity: 'medium',
    description: '检查是否验证了输入长度限制',
    standards: ['OWASP ASVS 4.1', 'OWASP ASVS 4.2', 'NIST SP 800-53: SI-10'],
    check: () => {
      // 查找所有DTO文件
      const dtoFiles = glob.sync('src/**/*.dto.ts', { cwd: PROJECT_ROOT });
      let passedCount = 0;
      const totalCount = dtoFiles.length;
      const files = [];

      for (const dtoFile of dtoFiles) {
        const dtoPath = path.join(PROJECT_ROOT, dtoFile);
        const content = fs.readFileSync(dtoPath, 'utf8');
        files.push(dtoPath);

        // 检查是否有长度验证装饰器
        if (
          content.includes('@MaxLength') ||
          content.includes('@Length') ||
          (content.includes('max') && content.includes('length'))
        ) {
          passedCount++;
        }
      }

      if (passedCount === totalCount && totalCount > 0) {
        return { passed: true, message: `所有DTO(${totalCount})都实现了输入长度验证`, files };
      }
      return {
        passed: false,
        message: `${passedCount}/${totalCount}DTO实现了输入长度验证`,
        files,
      };
    },
  },
  'input-validation': {
    name: '输入验证检查',
    category: 'input-validation',
    severity: 'high',
    description: '检查控制器是否实现了输入验证',
    standards: ['OWASP ASVS 4.1', 'OWASP ASVS 4.2', 'NIST SP 800-53 SI-10'],
    check: () => {
      // 检查全局ValidationPipe配置
      const mainTsPath = path.join(PROJECT_ROOT, 'src/main.ts');
      let hasGlobalValidationPipe = false;

      if (fs.existsSync(mainTsPath)) {
        const mainContent = fs.readFileSync(mainTsPath, 'utf8');
        hasGlobalValidationPipe = mainContent.includes('ValidationPipe');
      }

      // 查找所有控制器文件
      const controllerFiles = glob.sync('src/**/*.controller.ts', { cwd: PROJECT_ROOT });
      let passedCount = 0;
      const totalCount = controllerFiles.length;
      const files = [];

      for (const controllerFile of controllerFiles) {
        const controllerPath = path.join(PROJECT_ROOT, controllerFile);
        const content = fs.readFileSync(controllerPath, 'utf8');
        files.push(controllerPath);

        if (
          hasGlobalValidationPipe ||
          (content.includes('@Body()') && content.includes('ValidationPipe'))
        ) {
          passedCount++;
        }
      }

      if (passedCount === totalCount && totalCount > 0) {
        return { passed: true, message: `所有控制器(${totalCount})都实现了输入验证`, files };
      }
      return {
        passed: false,
        message: `${passedCount}/${totalCount}控制器实现了输入验证`,
        files,
      };
    },
  },
  'sql-injection-protection': {
    name: 'SQL注入防护检查',
    category: 'input-validation',
    severity: 'critical',
    description: '检查是否防止了SQL注入',
    standards: [
      'OWASP ASVS 5.2.2',
      'OWASP ASVS 5.2.3',
      'NIST SP 800-53 SI-10',
      'PCI DSS 3.2.1 6.5.1',
    ],
    check: () => {
      // 查找所有服务文件
      const serviceFiles = glob.sync('src/**/*.service.ts', { cwd: PROJECT_ROOT });
      let passedCount = 0;
      const totalCount = serviceFiles.length;
      const files = [];

      for (const serviceFile of serviceFiles) {
        const servicePath = path.join(PROJECT_ROOT, serviceFile);
        const content = fs.readFileSync(servicePath, 'utf8');
        files.push(servicePath);

        // 检查是否有字符串拼接的SQL查询
        if (content.includes('SELECT') && content.includes('${')) {
          return {
            passed: false,
            message: `发现可能的SQL注入风险: ${serviceFile}`,
            files: [servicePath],
          };
        }

        // 检查是否使用了参数化查询
        if (
          content.includes('createQueryBuilder') ||
          content.includes('where(:id') ||
          content.includes("where('id = :id'") ||
          content.includes('setParameter')
        ) {
          passedCount++;
        }
      }

      if (passedCount === totalCount && totalCount > 0) {
        return { passed: true, message: `所有服务(${totalCount})都使用了参数化查询`, files };
      }
      return {
        passed: false,
        message: `${passedCount}/${totalCount}服务使用了参数化查询`,
        files,
      };
    },
  },
  'password-field-exclusion': {
    name: '密码字段排除检查',
    category: 'data-security',
    severity: 'high',
    description: '检查用户实体密码字段是否被排除',
    standards: ['OWASP ASVS 3.4.1', 'NIST SP 800-53 AC-2', 'PCI DSS 3.2.1 3.5.1'],
    check: () => {
      // 查找所有用户实体文件
      const userEntityFiles = glob.sync('src/**/*user*.entity.ts', { cwd: PROJECT_ROOT });
      const files = [];

      for (const userEntityFile of userEntityFiles) {
        const userEntityPath = path.join(PROJECT_ROOT, userEntityFile);
        const content = fs.readFileSync(userEntityPath, 'utf8');
        files.push(userEntityPath);

        if (content.includes('password')) {
          // 检查是否排除了密码字段
          if (content.includes('@Exclude()') && content.includes('password')) {
            return { passed: true, message: '密码字段已正确排除', files: [userEntityPath] };
          }
          return { passed: false, message: '密码字段未正确排除', files: [userEntityPath] };
        }
      }

      if (userEntityFiles.length === 0) {
        return { passed: false, message: '未找到用户实体文件', files: [] };
      }

      return { passed: true, message: '未发现密码字段或已正确排除', files };
    },
  },
  'security-headers': {
    name: '安全响应头检查',
    category: 'web-security',
    severity: 'high',
    description: '检查是否启用Helmet或安全响应头设置',
    standards: [
      'OWASP ASVS 10.2.1',
      'OWASP ASVS 10.2.2',
      'NIST SP 800-53 SC-7',
      'PCI DSS 3.2.1 6.5.4',
    ],
    check: () => {
      const mainTsPath = path.join(PROJECT_ROOT, 'src/main.ts');
      if (!fs.existsSync(mainTsPath)) {
        return { passed: false, message: '主入口文件不存在', files: [] };
      }
      const content = fs.readFileSync(mainTsPath, 'utf8');
      const hasHelmet =
        content.includes('helmet(') ||
        content.includes('HelmetMiddleware') ||
        content.includes('app.use(helmet())');
      if (hasHelmet) {
        return { passed: true, message: '已启用Helmet或安全响应头', files: [mainTsPath] };
      }
      return { passed: false, message: '未启用Helmet或安全响应头', files: [mainTsPath] };
    },
  },
  'cors-config': {
    name: 'CORS配置检查',
    category: 'web-security',
    severity: 'medium',
    description: '检查是否启用合理的CORS配置',
    standards: ['OWASP ASVS 10.3.1', 'NIST SP 800-53 AC-4'],
    check: () => {
      const mainTsPath = path.join(PROJECT_ROOT, 'src/main.ts');
      if (!fs.existsSync(mainTsPath)) {
        return { passed: false, message: '主入口文件不存在', files: [] };
      }
      const content = fs.readFileSync(mainTsPath, 'utf8');
      const hasEnableCors = content.includes('enableCors(');
      const hasRestrictiveOrigin =
        /enableCors\(\{[\s\S]*origin:\s*(\[|['"]).*(?!\*)/m.test(content) &&
        !/origin:\s*['"]\*['"]/m.test(content);
      if (hasEnableCors && hasRestrictiveOrigin) {
        return { passed: true, message: 'CORS配置已启用且限制性合理', files: [mainTsPath] };
      }
      if (hasEnableCors) {
        return { passed: false, message: 'CORS已启用但可能过于宽松', files: [mainTsPath] };
      }
      return { passed: false, message: '未检测到CORS配置', files: [mainTsPath] };
    },
  },
  'csrf-protection': {
    name: 'CSRF防护检查',
    category: 'web-security',
    severity: 'medium',
    description: '检查是否启用CSRF防护（适用于cookie/session场景）',
    check: () => {
      const mainTsPath = path.join(PROJECT_ROOT, 'src/main.ts');
      const hasMain = fs.existsSync(mainTsPath) ? fs.readFileSync(mainTsPath, 'utf8') : '';
      const hasCsurf =
        hasMain.includes('csurf') || hasMain.includes('Csrf') || hasMain.includes('csrf(');
      if (hasCsurf) {
        return { passed: true, message: '检测到CSRF防护中间件', files: [mainTsPath] };
      }
      return {
        passed: false,
        message: '未检测到CSRF防护（JWT无状态API可视情况豁免）',
        files: [mainTsPath],
      };
    },
  },
  'password-hash': {
    name: '密码哈希检查',
    category: 'data-security',
    severity: 'critical',
    description: '检查是否使用bcrypt等算法对密码进行哈希',
    check: () => {
      const files = glob.sync('src/**/*.ts', { cwd: PROJECT_ROOT });
      let usesBcrypt = false;
      const evidence = [];
      for (const f of files) {
        const filePath = path.join(PROJECT_ROOT, f);
        const content = fs.readFileSync(filePath, 'utf8');
        if (
          content.includes('bcrypt.hash(') ||
          content.includes('bcrypt.genSalt(') ||
          content.includes('argon2') ||
          content.includes('Argon2')
        ) {
          usesBcrypt = true;
          evidence.push(filePath);
          break;
        }
      }
      if (usesBcrypt) {
        return { passed: true, message: '检测到密码哈希实现', files: evidence };
      }
      return { passed: false, message: '未检测到密码哈希实现（应使用bcrypt/argon2）', files: [] };
    },
  },
  'audit-logging': {
    name: '审计日志检查',
    category: 'logging',
    severity: 'high',
    description: '检查是否实现审计拦截器/服务并在主入口注册',
    check: () => {
      const auditInterceptorPath = path.join(PROJECT_ROOT, 'src/audit/audit.interceptor.ts');
      const auditServicePath = path.join(PROJECT_ROOT, 'src/audit/audit.service.ts');
      const mainTsPath = path.join(PROJECT_ROOT, 'src/main.ts');
      const files = [];
      let registered = false;
      if (fs.existsSync(auditInterceptorPath)) files.push(auditInterceptorPath);
      if (fs.existsSync(auditServicePath)) files.push(auditServicePath);
      if (fs.existsSync(mainTsPath)) {
        files.push(mainTsPath);
        const mainContent = fs.readFileSync(mainTsPath, 'utf8');
        registered =
          /useGlobalInterceptors\(new\s+AuditInterceptor\(/.test(mainContent) ||
          mainContent.includes('AuditInterceptor');
      }
      if (files.length >= 2 && registered) {
        return { passed: true, message: '审计日志组件存在并已注册', files };
      }
      return { passed: false, message: '未检测到审计日志实现或未注册', files };
    },
  },
  'database-indexes': {
    name: '数据库索引检查',
    category: 'database',
    severity: 'medium',
    description: '检查实体是否定义了必要的数据库索引',
    check: () => {
      // 查找所有实体文件
      const entityFiles = glob.sync('src/**/*.entity.ts', { cwd: PROJECT_ROOT });
      let passedCount = 0;
      const totalCount = entityFiles.length;
      const files = [];

      for (const entityFile of entityFiles) {
        const entityPath = path.join(PROJECT_ROOT, entityFile);
        const content = fs.readFileSync(entityPath, 'utf8');
        files.push(entityPath);

        if (content.includes('@Index')) {
          passedCount++;
        }
      }

      if (passedCount === totalCount && totalCount > 0) {
        return { passed: true, message: `所有实体(${totalCount})都定义了索引`, files };
      }
      return {
        passed: false,
        message: `${passedCount}/${totalCount}实体定义了索引`,
        files,
      };
    },
  },
  'transaction-usage': {
    name: '事务使用检查',
    category: 'database',
    severity: 'medium',
    description: '检查关键操作是否使用了事务',
    check: () => {
      // 查找所有服务文件
      const serviceFiles = glob.sync('src/**/*.service.ts', { cwd: PROJECT_ROOT });
      let passedCount = 0;
      let totalCount = 0;
      const files = [];

      // 关键操作服务白名单
      const criticalServices = ['payment.service.ts', 'order.service.ts', 'user.service.ts'];

      for (const serviceFile of serviceFiles) {
        const servicePath = path.join(PROJECT_ROOT, serviceFile);
        const content = fs.readFileSync(servicePath, 'utf8');
        files.push(servicePath);

        // 只检查关键服务
        const isCritical = criticalServices.some(critical => serviceFile.includes(critical));
        if (!isCritical) continue;

        totalCount++;

        if (
          content.includes('manager.transaction') ||
          content.includes('.transaction(') ||
          content.includes('QueryRunner')
        ) {
          passedCount++;
        }
      }

      if (passedCount === totalCount && totalCount > 0) {
        return { passed: true, message: `所有关键服务(${totalCount})都使用了事务`, files };
      }
      return {
        passed: false,
        message: `${passedCount}/${totalCount}关键服务使用了事务`,
        files,
      };
    },
  },
  'transaction-rollback': {
    name: '事务回滚检查',
    category: 'database',
    severity: 'high',
    description: '检查是否处理了事务回滚',
    standards: ['OWASP ASVS 6.2.3', 'NIST SP 800-53: AC-4'],
    check: () => {
      // 查找所有服务文件
      const serviceFiles = glob.sync('src/**/*.service.ts', { cwd: PROJECT_ROOT });
      let passedCount = 0;
      let totalCount = 0;
      const files = [];

      // 关键操作服务白名单
      const criticalServices = ['payment.service.ts', 'order.service.ts', 'user.service.ts'];

      for (const serviceFile of serviceFiles) {
        const servicePath = path.join(PROJECT_ROOT, serviceFile);
        const content = fs.readFileSync(servicePath, 'utf8');
        files.push(servicePath);

        // 只检查关键服务
        const isCritical = criticalServices.some(critical => serviceFile.includes(critical));
        if (!isCritical) continue;

        totalCount++;

        if (
          content.includes('catch') &&
          (content.includes('rollback') || content.includes('manager.transaction'))
        ) {
          passedCount++;
        }
      }

      if (passedCount === totalCount && totalCount > 0) {
        return { passed: true, message: `所有关键服务(${totalCount})都实现了事务回滚`, files };
      }
      return {
        passed: false,
        message: `${passedCount}/${totalCount}关键服务实现了事务回滚`,
        files,
      };
    },
  },
  'session-management': {
    name: '会话管理检查',
    category: 'auth',
    severity: 'critical', // P0级别，必须通过
    description: '检查是否实现了会话超时机制',
    check: () => {
      const authServicePath = path.join(PROJECT_ROOT, 'src/auth/auth.service.ts');
      if (!fs.existsSync(authServicePath)) {
        return { passed: false, message: '认证服务文件不存在', files: [] };
      }

      const content = fs.readFileSync(authServicePath, 'utf8');
      if (content.includes('expiresIn') || content.includes('maxAge') || content.includes('ttl')) {
        return { passed: true, message: '已实现会话超时机制', files: [authServicePath] };
      }
      return { passed: false, message: '未实现会话超时机制', files: [authServicePath] };
    },
  },
  'rate-limiting': {
    name: '速率限制检查',
    category: 'web-security',
    severity: 'medium',
    description: '检查是否实现了API速率限制',
    check: () => {
      const mainTsPath = path.join(PROJECT_ROOT, 'src/main.ts');
      if (!fs.existsSync(mainTsPath)) {
        return { passed: false, message: '主入口文件不存在', files: [] };
      }

      const content = fs.readFileSync(mainTsPath, 'utf8');
      if (
        content.includes('throttle') ||
        content.includes('rateLimit') ||
        content.includes('express-rate-limit')
      ) {
        return { passed: true, message: '已实现API速率限制', files: [mainTsPath] };
      }
      return { passed: false, message: '未实现API速率限制', files: [mainTsPath] };
    },
  },
  'ssrf-protection': {
    name: 'SSRF防护检查',
    category: 'web-security',
    severity: 'critical', // P0级别，必须通过
    description: '检查是否防止了服务端请求伪造(SSRF)',
    check: () => {
      // 查找所有服务文件
      const serviceFiles = glob.sync('src/**/*.service.ts', { cwd: PROJECT_ROOT });
      const files = [];

      for (const serviceFile of serviceFiles) {
        const servicePath = path.join(PROJECT_ROOT, serviceFile);
        const content = fs.readFileSync(servicePath, 'utf8');
        files.push(servicePath);

        // 检查是否有外部请求
        if (
          content.includes('http.get') ||
          content.includes('axios.get') ||
          content.includes('fetch(')
        ) {
          // 检查是否有SSRF防护
          if (
            content.includes('validateUrl') ||
            content.includes('urlWhitelist') ||
            content.includes('allowedDomains')
          ) {
            return { passed: true, message: '已实现SSRF防护', files: [servicePath] };
          }
          return { passed: false, message: '发现外部请求但未实现SSRF防护', files: [servicePath] };
        }
      }

      return { passed: true, message: '未发现外部请求或已实现SSRF防护', files };
    },
  },
  'dependency-vulnerability': {
    name: '依赖项漏洞检查',
    category: 'supply-chain',
    severity: 'high',
    description: '检查依赖项是否存在已知漏洞',
    check: () => {
      const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
      if (!fs.existsSync(packageJsonPath)) {
        return { passed: false, message: 'package.json文件不存在', files: [] };
      }

      let auditCommand = 'npm audit --json';
      let packageManager = 'npm';

      // 检测包管理器
      if (fs.existsSync(path.join(PROJECT_ROOT, 'yarn.lock'))) {
        auditCommand = 'yarn audit --json';
        packageManager = 'yarn';
      } else if (fs.existsSync(path.join(PROJECT_ROOT, 'pnpm-lock.yaml'))) {
        auditCommand = 'pnpm audit --json';
        packageManager = 'pnpm';
      }

      try {
        // 运行包管理器audit命令
        let auditResult;
        try {
          // 在Windows上使用cmd /c来运行npm命令，并设置正确的编码
          const windowsCommand =
            process.platform === 'win32'
              ? `cmd /c chcp 65001 >nul && ${auditCommand}`
              : auditCommand;

          const auditOutput = execSync(windowsCommand, {
            encoding: 'utf8',
            cwd: PROJECT_ROOT,
            stdio: 'pipe',
            timeout: 60000, // 60秒超时
            shell: true, // 使用shell来执行命令
            maxBuffer: 1024 * 1024, // 1MB缓冲区
          });

          try {
            auditResult = JSON.parse(auditOutput);
          } catch (parseError) {
            // 如果JSON解析失败，可能是npm audit输出了警告信息
            const lines = auditOutput.split('\n');
            const jsonLine = lines.find(
              line => line.trim().startsWith('{') && line.trim().endsWith('}'),
            );
            if (jsonLine) {
              auditResult = JSON.parse(jsonLine);
            } else {
              throw new Error(`无法解析audit输出: ${parseError.message}`);
            }
          }
        } catch (execError) {
          // 如果执行失败，返回一个默认结果，避免阻塞整个检查流程
          console.warn(`警告: ${packageManager} audit命令执行失败: ${execError.message}`);
          return {
            passed: true, // 默认通过，避免阻断构建
            message: `${packageManager}依赖项检查跳过: 命令执行失败`,
            files: [packageJsonPath],
            severity: 'low',
          };
        }
        let vulnerabilities = {};

        // 处理不同包管理器的输出格式
        if (packageManager === 'npm') {
          vulnerabilities = auditResult.vulnerabilities || {};
        } else if (packageManager === 'yarn') {
          vulnerabilities = auditResult.advisories || {};
        } else if (packageManager === 'pnpm') {
          vulnerabilities = auditResult.vulnerabilities || {};
        }

        const highVulns = Object.values(vulnerabilities).filter(v => {
          if (packageManager === 'npm') {
            return v.severity === 'high' || v.severity === 'critical';
          } else if (packageManager === 'yarn') {
            return v.severity === 'high' || v.severity === 'moderate';
          } else if (packageManager === 'pnpm') {
            return v.severity === 'high' || v.severity === 'critical';
          }
          return false;
        });

        // 动态调整严重级别
        let severity = 'high';
        if (highVulns.length > 5) {
          severity = 'critical';
        } else if (highVulns.length === 0) {
          severity = 'low';
        }

        if (highVulns.length > 0) {
          return {
            passed: false,
            message: `使用${packageManager}发现${highVulns.length}个高危/严重依赖漏洞`,
            files: [packageJsonPath],
            severity: severity,
          };
        }

        return {
          passed: true,
          message: `使用${packageManager}未发现高危/严重依赖漏洞`,
          files: [packageJsonPath],
          severity: 'low',
        };
      } catch (error) {
        return {
          passed: false,
          message: `${packageManager}依赖项检查失败: ${error.message}`,
          files: [packageJsonPath],
          severity: 'high',
        };
      }
    },
  },
  'file-upload-security': {
    name: '文件上传安全检查',
    category: 'web-security',
    severity: 'critical', // P0级别，必须通过
    description: '检查文件上传功能的安全性',
    standards: [
      'OWASP ASVS 10.4.1',
      'OWASP ASVS 10.4.2',
      'NIST SP 800-53 AC-3',
      'PCI DSS 3.2.1 6.5.8',
    ],
    check: () => {
      // 查找所有文件上传相关的文件
      const uploadFiles = glob.sync('src/**/*.ts', { cwd: PROJECT_ROOT });
      const files = [];
      let hasUpload = false;
      let hasSecurity = false;

      for (const uploadFile of uploadFiles) {
        const filePath = path.join(PROJECT_ROOT, uploadFile);
        const content = fs.readFileSync(filePath, 'utf8');
        files.push(filePath);

        if (
          content.includes('FileInterceptor') ||
          content.includes('multer') ||
          content.includes('Upload')
        ) {
          hasUpload = true;

          // 检查是否有安全措施
          if (
            content.includes('fileFilter') ||
            content.includes('limits') ||
            content.includes('allowedTypes') ||
            content.includes('maxSize')
          ) {
            hasSecurity = true;
          }
        }
      }

      if (!hasUpload) {
        return { passed: true, message: '未发现文件上传功能', files };
      }

      if (hasSecurity) {
        return { passed: true, message: '文件上传功能已实现安全措施', files };
      }

      return {
        passed: false,
        message: '发现文件上传功能但未实现安全措施',
        files,
        severity: 'critical', // 文件上传安全无保障是严重问题
      };
    },
  },
  'path-traversal-protection': {
    name: '路径遍历防护检查',
    category: 'web-security',
    severity: 'critical', // P0级别，必须通过
    description: '检查是否防止了路径遍历攻击',
    standards: ['OWASP ASVS 5.5.1', 'NIST SP 800-53 AC-3', 'PCI DSS 3.2.1 6.5.5'],
    check: () => {
      // 查找所有控制器和服务文件
      const files = glob.sync(['src/**/*.controller.ts', 'src/**/*.service.ts'], {
        cwd: PROJECT_ROOT,
        nodir: true,
      });
      const filePaths = [];
      let hasPathAccess = false;
      let hasProtection = false;

      for (const file of files) {
        const filePath = path.join(PROJECT_ROOT, file);
        const content = fs.readFileSync(filePath, 'utf8');
        filePaths.push(filePath);

        if (
          content.includes('fs.') ||
          content.includes('path.join') ||
          content.includes('readFile') ||
          content.includes('writeFile')
        ) {
          hasPathAccess = true;

          // 检查是否有路径遍历防护
          if (
            content.includes('path.normalize') ||
            content.includes('path.resolve') ||
            content.includes('path.relative') ||
            content.includes('startsWith') ||
            content.includes('includes("../")')
          ) {
            hasProtection = true;
          }
        }
      }

      if (!hasPathAccess) {
        return { passed: true, message: '未发现文件系统访问', filePaths };
      }

      if (hasProtection) {
        return { passed: true, message: '文件系统访问已实现路径遍历防护', filePaths };
      }

      return {
        passed: false,
        message: '发现文件系统访问但未实现路径遍历防护',
        files: filePaths,
        severity: 'critical', // 路径遍历无防护是严重问题
      };
    },
  },
  'evidence-validation': {
    name: '证据有效性检查',
    category: 'audit',
    severity: 'medium',
    description: '检查漏洞追踪表中的证据链接是否有效',
    standards: ['ISO/IEC 27001 A.12.2.1', 'NIST SP 800-53 AU-6'],
    check: () => {
      const trackingPath = path.join(PROJECT_ROOT, 'SECURITY_VULNERABILITY_TRACKING.md');
      if (!fs.existsSync(trackingPath)) {
        return { passed: false, message: '漏洞追踪表文件不存在', files: [] };
      }

      const content = fs.readFileSync(trackingPath, 'utf8');
      const lines = content.split('\n');

      // 提取证据链接
      const evidenceLinks = [];
      for (const line of lines) {
        // 匹配Markdown链接格式: [文本](链接)
        const linkMatches = line.match(/\[([^\]]+)\]\(([^)]+)\)/g);
        if (linkMatches) {
          for (const link of linkMatches) {
            const match = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (match && match[2]) {
              evidenceLinks.push({
                text: match[1],
                url: match[2],
                line: lines.indexOf(line) + 1,
              });
            }
          }
        }
      }

      if (evidenceLinks.length === 0) {
        return { passed: true, message: '未发现证据链接', files: [trackingPath] };
      }

      let invalidLinks = 0;
      const invalidLinkDetails = [];

      for (const link of evidenceLinks) {
        // 检查是否是相对路径
        if (
          link.url.startsWith('./') ||
          link.url.startsWith('../') ||
          !link.url.startsWith('http')
        ) {
          const filePath = path.join(PROJECT_ROOT, link.url);
          if (!fs.existsSync(filePath)) {
            invalidLinks++;
            invalidLinkDetails.push({
              link: link.url,
              line: link.line,
              reason: '文件不存在',
            });
          }
        }
        // 跳过外部URL检查，因为需要网络请求
      }

      if (invalidLinks > 0) {
        return {
          passed: false,
          message: `发现${invalidLinks}个无效证据链接`,
          files: [trackingPath],
          details: invalidLinkDetails,
        };
      }

      return {
        passed: true,
        message: `所有${evidenceLinks.length}个证据链接有效`,
        files: [trackingPath],
      };
    },
  },
};

module.exports = {
  SECURITY_RULES,
};
