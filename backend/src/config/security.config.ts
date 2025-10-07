// 安全配置中心
export const SecurityConfig = {
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // 限流配置
  throttle: {
    ttl: parseInt(process.env.THROTTLER_TTL || '60', 10) * 1000, // 转换为毫秒
    limit: parseInt(process.env.THROTTLER_LIMIT || '100', 10),
    // 不同端点的特殊限流配置
    endpoints: {
      '/auth/login': { ttl: 60 * 1000, limit: 5 }, // 登录接口更严格
      '/auth/register': { ttl: 60 * 1000, limit: 3 },
      '/api/cart': { ttl: 60 * 1000, limit: 200 }, // 购物车操作较频繁
    },
  },

  // CORS配置
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? (process.env.CORS_ORIGINS || '').split(',').filter(Boolean)
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },

  // Helmet安全头配置
  helmet: {
    contentSecurityPolicy:
      process.env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              scriptSrc: ["'self'"],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              frameSrc: ["'none'"],
              objectSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false,
    crossOriginEmbedderPolicy: false,
    hidePoweredBy: true,
    hsts:
      process.env.NODE_ENV === 'production'
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
  },

  // 会话配置
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24小时
    },
  },
};
