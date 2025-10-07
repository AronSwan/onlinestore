# 开发者指南

## 📋 概述

本文档为开发人员提供项目开发规范、工作流程和最佳实践指南。

## 🛠️ 开发环境搭建

### 环境要求
- Node.js 20.x LTS
- MySQL 8.0+（开发环境）
- TiDB（生产环境）
- Redis 7.0+
- Git 2.30+

### 快速开始
```bash
# 1. 克隆代码库
git clone https://github.com/your-org/caddy-style-shopping-site.git
cd caddy-style-shopping-site/backend

# 2. 安装依赖
npm install

# 3. 配置环境
cp .env.example .env
# 编辑.env文件，配置数据库和Redis连接

# 4. 启动开发服务器
npm run start:dev

# 5. 运行测试
npm test
```

### 开发工具推荐
- **IDE**: VS Code 或 WebStorm
- **数据库工具**: MySQL Workstation 或 TablePlus（支持TiDB）
- **API测试**: Postman 或 Insomnia
- **调试工具**: Chrome DevTools

## 📝 代码规范

### 命名约定

#### 文件命名
- 使用小写字母和连字符：`user-service.ts`
- 测试文件：`user-service.spec.ts`
- 配置文件：`database.config.ts`

#### 变量命名
```typescript
// 好的命名
const userService = new UserService();
const MAX_RETRY_COUNT = 3;
const isLoading = false;

// 避免的命名
const us = new UserService(); // 过于简短
const maxRetryCount = 3; // 应该用常量
const flag = false; // 含义不明确
```

#### 函数命名
```typescript
// 好的命名
async getUserById(id: number): Promise<User> { }
function validateEmailFormat(email: string): boolean { }
const calculateTotalPrice = (items: CartItem[]): number => { }

// 避免的命名
async get(id: number): Promise<User> { } // 过于通用
function check(email: string): boolean { } // 含义不明确
```

### 代码风格

#### 缩进和格式
```typescript
// 使用2个空格缩进
class UserService {
  async createUser(userData: CreateUserDto): Promise<User> {
    const validatedData = await this.validateUserData(userData);
    const user = await this.userRepository.save(validatedData);
    
    await this.sendWelcomeEmail(user.email);
    
    return user;
  }
}

// 保持一致的括号风格
if (condition) {
  // 代码
} else {
  // 代码
}
```

#### 导入顺序
```typescript
// 1. 第三方库导入
import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';

// 2. 绝对路径导入
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';

// 3. 相对路径导入
import { EmailService } from './email.service';
import { logger } from '../common/logger';
```

### 类型定义

#### 接口定义
```typescript
// 使用接口定义对象结构
interface UserProfile {
  id: number;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// 使用类型别名定义复杂类型
type ApiResponse<T> = {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  timestamp: Date;
};

// 使用枚举定义常量集合
enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
```

#### 类定义
```typescript
// 使用装饰器定义NestJS服务
@Injectable()
export class UserService {
  // 使用访问修饰符
  private readonly logger = new Logger(UserService.name);
  
  // 依赖注入通过构造函数
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
  ) {}
  
  // 公共方法
  async createUser(createUserDto: CreateUserDto): Promise<User> {
    // 实现
  }
  
  // 私有方法
  private async validateUserData(userData: CreateUserDto): Promise<void> {
    // 实现
  }
}
```

## 🔧 开发工作流

### Git工作流

#### 分支策略
```
main (保护分支)
  │
  └── develop (开发分支)
        │
        ├── feature/user-authentication
        ├── feature/product-management
        └── hotfix/critical-bug-fix
```

#### 提交信息规范
```
类型(范围): 描述

正文（可选）

脚注（可选）

类型说明：
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具变动
```

示例：
```
feat(auth): 实现JWT认证功能

- 添加JWT令牌生成和验证
- 实现用户登录接口
- 添加权限守卫中间件

Closes #123
```

### 代码审查

#### 审查清单
- [ ] 代码是否符合项目规范
- [ ] 是否有适当的测试覆盖
- [ ] 是否有安全考虑
- [ ] 性能是否可接受
- [ ] 文档是否更新

#### 审查示例
```typescript
// 需要改进的代码
async function getUsers() {
  const users = await User.find();
  return users;
}

// 改进后的代码
async getUsers(params: UserQueryParams): Promise<User[]> {
  const { page = 1, limit = 20, search } = params;
  
  const queryBuilder = this.userRepository
    .createQueryBuilder('user')
    .where('user.isActive = :isActive', { isActive: true })
    .skip((page - 1) * limit)
    .take(limit);
    
  if (search) {
    queryBuilder.andWhere('user.username LIKE :search', { 
      search: `%${search}%` 
    });
  }
  
  return queryBuilder.getMany();
}
```

## 🧪 测试策略

### 测试金字塔
```
    /\
   /  \    E2E测试 (少量)
  /____\   
 /______\  集成测试 (适量)
/________\ 单元测试 (大量)
```

### 单元测试示例
```typescript
describe('UserService', () => {
  let userService: UserService;
  let userRepository: MockType<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useFactory: repositoryMockFactory,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('应该成功创建用户', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    };

    userRepository.save.mockReturnValue({
      id: 1,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await userService.createUser(userData);

    expect(result).toHaveProperty('id');
    expect(result.username).toBe(userData.username);
    expect(userRepository.save).toHaveBeenCalled();
  });
});
```

### 集成测试示例
```typescript
describe('AuthController (集成测试)', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    authService = moduleFixture.get<AuthService>(AuthService);
  });

  it('POST /auth/login - 应该成功登录', () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('token');
        expect(res.body.user.email).toBe('test@example.com');
      });
  });
});
```

## 🔍 调试技巧

### VS Code调试配置
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "调试NestJS应用",
      "args": ["${workspaceFolder}/src/main.ts"],
      "runtimeArgs": ["--nolazy", "-r", "ts-node/register"],
      "sourceMaps": true,
      "envFile": "${workspaceFolder}/.env",
      "console": "integratedTerminal"
    }
  ]
}
```

### 日志调试
```typescript
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async createUser(userData: CreateUserDto): Promise<User> {
    this.logger.debug(`开始创建用户: ${userData.email}`);
    
    try {
      const user = await this.userRepository.save(userData);
      this.logger.log(`用户创建成功: ${user.id}`);
      return user;
    } catch (error) {
      this.logger.error(`用户创建失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}
```

## 📊 性能优化

### 数据库查询优化
```typescript
// 避免N+1查询问题
// 不好的做法
async getOrdersWithUsers(): Promise<Order[]> {
  const orders = await this.orderRepository.find();
  
  for (const order of orders) {
    order.user = await this.userRepository.findOne(order.userId);
  }
  
  return orders;
}

// 好的做法 - 使用关联查询
async getOrdersWithUsers(): Promise<Order[]> {
  return this.orderRepository
    .createQueryBuilder('order')
    .leftJoinAndSelect('order.user', 'user')
    .getMany();
}
```

### 缓存策略
```typescript
@Injectable()
export class ProductService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getProduct(id: number): Promise<Product> {
    const cacheKey = `product:${id}`;
    let product = await this.cacheManager.get<Product>(cacheKey);
    
    if (!product) {
      product = await this.productRepository.findOne(id);
      if (product) {
        await this.cacheManager.set(cacheKey, product, { ttl: 300 });
      }
    }
    
    return product;
  }
}
```

## 🔒 安全最佳实践

### 输入验证
```typescript
@Injectable()
export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: '密码必须包含大小写字母和数字',
  })
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}
```

### SQL注入防护
```typescript
// 使用参数化查询
async searchUsers(keyword: string): Promise<User[]> {
  return this.userRepository
    .createQueryBuilder('user')
    .where('user.username LIKE :keyword', { keyword: `%${keyword}%` })
    .getMany();
}

// 避免字符串拼接
// 错误做法 - 容易SQL注入
const query = `SELECT * FROM users WHERE username = '${username}'`;
```

## 📈 监控和指标

### 自定义指标
```typescript
@Injectable()
export class MetricsService {
  private readonly requestCounter = new Counter({
    name: 'http_requests_total',
    help: 'HTTP请求总数',
    labelNames: ['method', 'path', 'status'],
  });

  incrementRequest(method: string, path: string, status: number) {
    this.requestCounter.labels(method, path, status.toString()).inc();
  }
}
```

### 性能监控
```typescript
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        // 记录性能指标
        this.metrics.recordApiDuration(request.method, request.path, duration);
      }),
    );
  }
}
```

## 🔄 部署和CI/CD

### GitHub Actions示例
```yaml
name: 后端CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: 安装Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: 安装依赖
      run: npm ci
      
    - name: 运行测试
      run: npm test
      
    - name: 代码质量检查
      run: npm run lint
```

---

**最后更新**: 2025-09-30  
**文档版本**: v1.0.0

## 🔧 常用命令

以下是项目中常用的 npm 脚本命令：


### 构建生产版本
```bash
npm run build
```

### 运行测试
```bash
npm run test
```

### 运行单元测试
```bash
npm run test:unit
```

### 运行集成测试
```bash
npm run test:integration
```

### 运行端到端测试
```bash
npm run test:e2e
```

### 安全检查
```bash
npm run security:check
```

### 验证文档一致性
```bash
npm run docs:validate
```

### 同步所有文档
```bash
npm run docs:sync:all
```
