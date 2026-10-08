/**
 * Framework Adapter for Email Verification Service
 * 
 * 功能特性：
 * - 支持多种框架的适配（Express, NestJS, Koa, Fastify等）
 * - 统一的接口转换
 * - 框架特定的中间件集成
 * - 依赖注入兼容性
 */

class FrameworkAdapter {
  constructor(frameworkType, options = {}) {
    this.frameworkType = frameworkType;
    this.options = options;
    
    // 根据框架类型初始化适配器
    this.initializeAdapter();
  }
  
  /**
   * 初始化适配器
   */
  initializeAdapter() {
    switch (this.frameworkType) {
      case 'express':
        this.initializeExpressAdapter();
        break;
      case 'nestjs':
        this.initializeNestJSAdapter();
        break;
      case 'koa':
        this.initializeKoaAdapter();
        break;
      case 'fastify':
        this.initializeFastifyAdapter();
        break;
      default:
        throw new Error(`Unsupported framework: ${this.frameworkType}`);
    }
  }
  
  /**
   * Express框架适配器
   */
  initializeExpressAdapter() {
    this.adapter = {
      // 路由注册方法
      registerRoute: (app, method, path, handler, middlewares = []) => {
        app[method](path, ...middlewares, handler);
      },
      
      // 中间件包装方法
      wrapMiddleware: (middleware) => {
        return (req, res, next) => {
          return middleware(req, res, next);
        };
      },
      
      // 响应包装方法
      wrapResponse: (data, statusCode = 200) => {
        return {
          success: true,
          data,
          statusCode,
        };
      },
      
      // 错误响应包装方法
      wrapErrorResponse: (error, statusCode = 500) => {
        return {
          success: false,
          error: error.message || 'Internal server error',
          code: error.code || 'INTERNAL_ERROR',
          statusCode,
        };
      },
      
      // 请求参数提取方法
      extractParams: (req) => ({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
        ip: req.ip || req.connection.remoteAddress,
      }),
    };
  }
  
  /**
   * NestJS框架适配器
   */
  initializeNestJSAdapter() {
    this.adapter = {
      // 路由注册方法（NestJS使用装饰器，这里提供兼容性）
      registerRoute: (app, method, path, handler, middlewares = []) => {
        // NestJS路由注册需要通过模块和控制器
        // 这里提供兼容方法，实际使用时应使用NestJS装饰器
        console.warn('NestJS detected: Consider using decorators instead of registerRoute');
      },
      
      // 中间件包装方法
      wrapMiddleware: (middleware) => {
        return (req, res, next) => {
          return middleware(req, res, next);
        };
      },
      
      // 响应包装方法
      wrapResponse: (data, statusCode = 200) => {
        return {
          success: true,
          data,
          statusCode,
        };
      },
      
      // 错误响应包装方法
      wrapErrorResponse: (error, statusCode = 500) => {
        return {
          success: false,
          error: error.message || 'Internal server error',
          code: error.code || 'INTERNAL_ERROR',
          statusCode,
        };
      },
      
      // 请求参数提取方法
      extractParams: (req) => ({
        body: req.body,
        query: req.query,
        params: req.params,
        headers: req.headers,
        ip: req.ip || req.connection.remoteAddress,
      }),
      
      // NestJS特定的依赖注入支持
      injectDependencies: (target, dependencies) => {
        // NestJS有自己的依赖注入系统，这里提供兼容方法
        return {
          target,
          dependencies,
        };
      },
    };
  }
  
  /**
   * Koa框架适配器
   */
  initializeKoaAdapter() {
    this.adapter = {
      // 路由注册方法
      registerRoute: (router, method, path, handler, middlewares = []) => {
        router[method](path, ...middlewares, async (ctx) => {
          const req = this.convertKoaContextToRequest(ctx);
          const res = this.convertKoaContextToResponse(ctx);
          
          return handler(req, res);
        });
      },
      
      // 中间件包装方法
      wrapMiddleware: (middleware) => {
        return async (ctx, next) => {
          const req = this.convertKoaContextToRequest(ctx);
          const res = this.convertKoaContextToResponse(ctx);
          
          return middleware(req, res, next);
        };
      },
      
      // 响应包装方法
      wrapResponse: (data, statusCode = 200) => {
        return {
          success: true,
          data,
          statusCode,
        };
      },
      
      // 错误响应包装方法
      wrapErrorResponse: (error, statusCode = 500) => {
        return {
          success: false,
          error: error.message || 'Internal server error',
          code: error.code || 'INTERNAL_ERROR',
          statusCode,
        };
      },
      
      // 请求参数提取方法
      extractParams: (ctx) => ({
        body: ctx.request.body,
        query: ctx.query,
        params: ctx.params,
        headers: ctx.headers,
        ip: ctx.ip || ctx.request.ip,
      }),
      
      // Koa特定的上下文转换方法
      convertKoaContextToRequest: (ctx) => {
        return {
          body: ctx.request.body,
          query: ctx.query,
          params: ctx.params,
          headers: ctx.headers,
          ip: ctx.ip || ctx.request.ip,
        };
      },
      
      convertKoaContextToResponse: (ctx) => {
        return {
          status: (code) => ctx.status = code,
          json: (data) => ctx.body = data,
        };
      },
    };
  }
  
  /**
   * Fastify框架适配器
   */
  initializeFastifyAdapter() {
    this.adapter = {
      // 路由注册方法
      registerRoute: (server, method, path, handler, options = {}) => {
        server.route({
          method,
          url: path,
          handler: async (request, reply) => {
            const req = this.convertFastifyRequestToRequest(request);
            const res = this.convertFastifyReplyToResponse(reply);
            
            return handler(req, res);
          },
          ...options,
        });
      },
      
      // 中间件包装方法
      wrapMiddleware: (middleware) => {
        return async (request, reply) => {
          const req = this.convertFastifyRequestToRequest(request);
          const res = this.convertFastifyReplyToResponse(reply);
          
          return middleware(req, res, () => {});
        };
      },
      
      // 响应包装方法
      wrapResponse: (data, statusCode = 200) => {
        return {
          success: true,
          data,
          statusCode,
        };
      },
      
      // 错误响应包装方法
      wrapErrorResponse: (error, statusCode = 500) => {
        return {
          success: false,
          error: error.message || 'Internal server error',
          code: error.code || 'INTERNAL_ERROR',
          statusCode,
        };
      },
      
      // 请求参数提取方法
      extractParams: (request) => ({
        body: request.body,
        query: request.query,
        params: request.params,
        headers: request.headers,
        ip: request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress,
      }),
      
      // Fastify特定的对象转换方法
      convertFastifyRequestToRequest: (request) => {
        return {
          body: request.body,
          query: request.query,
          params: request.params,
          headers: request.headers,
          ip: request.ip || request.headers['x-forwarded-for'] || request.connection.remoteAddress,
        };
      },
      
      convertFastifyReplyToResponse: (reply) => {
        return {
          status: (code) => reply.code(code),
          json: (data) => reply.send(data),
        };
      },
    };
  }
  
  /**
   * 注册Email Verification服务的路由
   */
  registerEmailVerificationRoutes(app, emailVerificationService) {
    const { registerRoute, wrapMiddleware, wrapResponse, wrapErrorResponse } = this.adapter;
    
    /**
     * 验证单个邮箱地址
     */
    registerRoute(app, 'post', '/api/email/verify', wrapMiddleware(async (req, res, next) => {
      try {
        const { email, options = {} } = req.body;
        
        // 参数验证
        if (!email || typeof email !== 'string') {
          return res.status(400).json(wrapErrorResponse(
            new Error('Email address is required'),
            400
          ));
        }
        
        // 执行验证
        const result = await emailVerificationService.verifyEmail(email, options);
        
        // 返回结果
        res.status(200).json(wrapResponse(result));
      } catch (error) {
        next(error);
      }
    }), []);
    
    /**
     * 批量验证邮箱地址
     */
    registerRoute(app, 'post', '/api/email/verify-batch', wrapMiddleware(async (req, res, next) => {
      try {
        const { emails, options = {} } = req.body;
        
        // 参数验证
        if (!Array.isArray(emails)) {
          return res.status(400).json(wrapErrorResponse(
            new Error('Emails must be an array'),
            400
          ));
        }
        
        // 执行批量验证
        const result = await emailVerificationService.verifyEmailBatch(emails, options);
        
        // 返回结果
        res.status(200).json(wrapResponse(result));
      } catch (error) {
        next(error);
      }
    }), []);
    
    /**
     * 获取服务健康状态
     */
    registerRoute(app, 'get', '/api/email/health', wrapMiddleware(async (req, res, next) => {
      try {
        const health = await emailVerificationService.getHealthStatus();
        
        res.status(200).json(wrapResponse(health));
      } catch (error) {
        next(error);
      }
    }), []);
    
    /**
     * 清理缓存
     */
    registerRoute(app, 'post', '/api/email/cache/clear', wrapMiddleware(async (req, res, next) => {
      try {
        await emailVerificationService.clearCache();
        
        res.status(200).json(wrapResponse({
          message: 'Cache cleared successfully',
        }));
      } catch (error) {
        next(error);
      }
    }), []);
    
    /**
     * 获取验证配置
     */
    registerRoute(app, 'get', '/api/email/config', wrapMiddleware(async (req, res, next) => {
      try {
        const config = {
          rules: emailVerificationService.rules,
          cache: {
            enabled: emailVerificationService.enableCache,
            expiry: emailVerificationService.cacheExpiry,
          },
          timeout: emailVerificationService.timeout,
        };
        
        res.status(200).json(wrapResponse(config));
      } catch (error) {
        next(error);
      }
    }), []);
  }
  
  /**
   * 注册错误处理中间件
   */
  registerErrorHandlingMiddleware(app) {
    const { wrapErrorResponse } = this.adapter;
    
    // 根据框架类型注册错误处理
    switch (this.frameworkType) {
      case 'express':
        app.use((error, req, res, next) => {
          console.error('Error in email verification:', error);
          res.status(500).json(wrapErrorResponse(error));
        });
        break;
      case 'nestjs':
        // NestJS有自己的错误处理机制，这里提供兼容方法
        console.warn('NestJS detected: Use @Catch decorator for error handling');
        break;
      case 'koa':
        app.on('error', (err, ctx) => {
          console.error('Error in email verification:', err);
          ctx.status = 500;
          ctx.body = wrapErrorResponse(err);
        });
        break;
      case 'fastify':
        app.setErrorHandler((error, request, reply) => {
          console.error('Error in email verification:', error);
          reply.status(500).send(wrapErrorResponse(error));
        });
        break;
    }
  }
  
  /**
   * 注册监控中间件
   */
  registerMonitoringMiddleware(app, monitoringService) {
    const { wrapMiddleware } = this.adapter;
    
    // 注册请求监控中间件
    const monitoringMiddleware = wrapMiddleware((req, res, next) => {
      const startTime = Date.now();
      
      // 记录请求开始
      monitoringService.recordRequestStart({
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      });
      
      // 记录请求结束
      const originalEnd = res.end || res.send;
      res.end = res.send = function(data) {
        const duration = Date.now() - startTime;
        
        monitoringService.recordRequestEnd({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode || status,
          duration,
          ip: req.ip,
        });
        
        return originalEnd.call(this, data);
      };
      
      next();
    });
    
    // 根据框架类型注册中间件
    switch (this.frameworkType) {
      case 'express':
        app.use(monitoringMiddleware);
        break;
      case 'nestjs':
        console.warn('NestJS detected: Use @UseInterceptors for monitoring');
        break;
      case 'koa':
        app.use(monitoringMiddleware);
        break;
      case 'fastify':
        app.addHook('preHandler', monitoringMiddleware);
        break;
    }
  }
  
  /**
   * 获取适配器实例
   */
  getAdapter() {
    return this.adapter;
  }
}

module.exports = FrameworkAdapter;