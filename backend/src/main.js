"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bootstrap = bootstrap;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const configuration_validator_1 = require("./config/configuration.validator");
const metrics_interceptor_1 = require("./monitoring/metrics.interceptor");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
const all_exceptions_problem_details_filter_1 = require("./common/filters/all-exceptions.problem-details.filter");
const monitoring_service_1 = require("./monitoring/monitoring.service");
const KNOWN_INSECURE_JWT_SECRETS = [
    'dev-jwt-secret-key-32-chars-xxxxxxxxxxxxxxxx',
    'dev-secret-key-please-change-xxxxxxxxxxxxxxxxxxxx',
    'dev-secret-key',
    'your-super-secret-jwt-key-change-in-production',
    'default-secret-change-in-production',
    'test-jwt-secret-key-for-testing-only-32-chars',
    'test-jwt-secret',
    'test-secret-key',
];
function isInsecureJwtSecret(secret) {
    if (!secret) {
        return true;
    }
    return (KNOWN_INSECURE_JWT_SECRETS.includes(secret) ||
        /CHANGE[_-]?ME/i.test(secret) ||
        /your-super-secret/i.test(secret));
}
function validateJwtSecretForEnvironment() {
    const isProduction = process.env.NODE_ENV === 'production';
    const jwtSecret = process.env.JWT_SECRET;
    if (isProduction) {
        const problems = [];
        if (!jwtSecret || jwtSecret.trim() === '') {
            problems.push('JWT_SECRET 未设置');
        }
        else {
            if (jwtSecret.length < 32) {
                problems.push(`JWT_SECRET 长度不足32字符（当前 ${jwtSecret.length}）`);
            }
            if (isInsecureJwtSecret(jwtSecret)) {
                problems.push('JWT_SECRET 为已知开发默认值或占位符');
            }
        }
        if (problems.length > 0) {
            throw new Error(`生产环境安全校验失败，拒绝启动：${problems.join('；')}`);
        }
    }
    else if (isInsecureJwtSecret(jwtSecret)) {
        console.warn('⚠️  JWT_SECRET 未设置或为开发默认值/占位符，仅供本地开发测试，严禁用于生产环境');
    }
}
async function bootstrap() {
    validateJwtSecretForEnvironment();
    const skipValidation = process.env.SKIP_CONFIG_VALIDATION === 'true';
    if (!skipValidation) {
        const configValidation = configuration_validator_1.ConfigurationValidator.validateAll();
        if (!configValidation.isValid) {
            console.error('❌ 配置验证失败:');
            configValidation.errors.forEach(error => console.error(`  - ${error}`));
            process.exit(1);
        }
        if (configValidation.warnings.length > 0) {
            console.warn('⚠️  配置警告:');
            configValidation.warnings.forEach(warning => console.warn(`  - ${warning}`));
        }
    }
    else {
        console.warn('⚠️ 本地开发跳过配置验证（SKIP_CONFIG_VALIDATION=true）');
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
    });
    const logger = new common_1.Logger('Bootstrap');
    app.useLogger(logger);
    const monitoringService = app.get(monitoring_service_1.MonitoringService);
    app.useGlobalFilters(new all_exceptions_problem_details_filter_1.AllExceptionsProblemDetailsFilter());
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor());
    app.useGlobalInterceptors(new metrics_interceptor_1.MetricsInterceptor(monitoringService));
    const isProduction = process.env.NODE_ENV === 'production';
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: isProduction
            ? {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                },
            }
            : false,
        crossOriginEmbedderPolicy: false,
        hidePoweredBy: true,
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'same-site' },
    }));
    app.use((0, compression_1.default)());
    const corsOrigins = (process.env.CORS_ORIGINS ||
        'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    app.enableCors({
        origin: corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        maxAge: 86400,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.setGlobalPrefix('api');
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
        const config = new swagger_1.DocumentBuilder()
            .setTitle('Caddy Style Shopping API')
            .setDescription(`
        ## 电商系统 API 文档
        
        ### 功能模块
        - **认证管理**: 用户注册、登录、JWT令牌管理
        - **用户管理**: 用户信息、权限管理、地址管理
        - **商品管理**: 商品CRUD、分类、库存管理
        - **购物车管理**: 购物车操作、商品选择、批量操作
        - **订单管理**: 订单创建、支付、状态跟踪
        - **支付管理**: 多种支付方式、支付回调处理
        - **系统管理**: 缓存管理、性能监控、健康检查
        
        ### 认证方式
        使用 JWT Bearer Token 进行认证，请在请求头中添加：
        \`Authorization: Bearer <your-token>\`
        
        ### 响应格式
        成功响应为裸资源形状（无统一信封）；错误响应统一为 RFC 9457 problem+json：
        \`\`\`json
        {
          "type": "about:blank",
          "title": "Bad Request",
          "status": 400,
          "detail": "中文错误说明",
          "instance": "/api/..."
        }
        \`\`\`

        ### 错误状态码
        - **400**: 参数错误 / **401**: 未认证 / **403**: 无权限
        - **404**: 资源不存在 / **429**: 限流（带 Retry-After 头）/ **5xx**: 服务器错误
      `)
            .setVersion('1.0.0')
            .setContact('开发团队', 'https://github.com/your-org/caddy-style-shopping', 'dev@example.com')
            .setLicense('MIT', 'https://opensource.org/licenses/MIT')
            .addServer('http://localhost:3000', '开发环境')
            .addServer('https://api-staging.example.com', '测试环境')
            .addServer('https://api.example.com', '生产环境')
            .addBearerAuth({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
        }, 'JWT-auth')
            .addTag('auth', '🔐 认证管理')
            .addTag('users', '👤 用户管理')
            .addTag('products', '📦 商品管理')
            .addTag('cart', '🛒 购物车管理')
            .addTag('orders', '📋 订单管理')
            .addTag('payments', '💳 支付管理')
            .addTag('admin', '⚙️ 系统管理')
            .addTag('monitoring', '📊 监控管理')
            .build();
        const document = swagger_1.SwaggerModule.createDocument(app, config, {
            extraModels: [
                require('./common/dto/problem-details.dto').ProblemDetailsDto,
            ],
        });
        const swaggerOptions = {
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                showExtensions: true,
                showCommonExtensions: true,
                tryItOutEnabled: true,
                requestInterceptor: (req) => {
                    req.headers['X-API-Version'] = '1.0';
                    return req;
                },
            },
            customSiteTitle: 'Caddy Style Shopping API 文档',
            customfavIcon: '/favicon.ico',
            customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #3b82f6 }
        .swagger-ui .scheme-container { background: #f8fafc; padding: 10px; border-radius: 4px; }
      `,
        };
        swagger_1.SwaggerModule.setup('api/docs', app, document, swaggerOptions);
        const fs = require('fs');
        const path = require('path');
        const docsDir = path.join(process.cwd(), 'docs');
        if (!fs.existsSync(docsDir)) {
            fs.mkdirSync(docsDir, { recursive: true });
        }
        fs.writeFileSync(path.join(docsDir, 'openapi.json'), JSON.stringify(document, null, 2));
        const port = process.env.PORT || 3000;
        logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
        logger.log(`📄 OpenAPI JSON exported to: docs/openapi.json`);
    }
    else {
        logger.log('Swagger documentation is disabled in production');
    }
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`🚀 应用启动成功！端口: ${port}`);
    logger.log(`🔗 健康检查: http://localhost:${port}/api/health`);
    logger.log('🧭 业务路由（前缀 /api）:');
    logger.log('   🔐 认证:        /api/auth（register/login/refresh/profile/change-password/logout）');
    logger.log('   👤 用户:        /api/users');
    logger.log('   📦 商品:        /api/products、/api/search');
    logger.log('   🛒 购物车:      /api/cart/items/:customerUserId 等');
    logger.log('   📋 订单:        /api/orders');
    logger.log('   ✉️  验证码:      /api/customer-user/verify-code/send');
    logger.log('   📊 监控:        /api/monitoring/*（含 /api/monitoring/metrics*）、/api/alerts/*（rules/active/history/stats）');
    logger.log(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
}
if (require.main === module) {
    bootstrap().catch(err => {
        console.error('应用启动失败:', err);
        process.exit(1);
    });
}
