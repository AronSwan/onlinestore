/**
 * 分布式追踪中间件
 * 为Express应用添加分布式追踪功能
 */

const trace = require('@opentelemetry/api');
const { TracingUtils } = require('../tracing/opentelemetry-config');

/**
 * 追踪中间件 - 为每个请求创建追踪span
 */
function tracingMiddleware(req, res, next) {
  const tracer = trace.trace.getTracer('caddy-shopping-express');
  
  // 从请求头中提取追踪上下文
  const carrier = {};
  if (req.headers.traceparent) {
    carrier.traceparent = req.headers.traceparent;
  }
  if (req.headers.tracestate) {
    carrier.tracestate = req.headers.tracestate;
  }
  
  // 提取或创建上下文
  const context = trace.propagation.extract(trace.context.active(), carrier);
  
  // 创建请求span
  const span = tracer.startSpan(
    `${req.method} ${req.route?.path || req.path}`,
    {
      attributes: {
        'http.method': req.method,
        'http.url': req.url,
        'http.target': req.path,
        'http.host': req.get('host'),
        'http.scheme': req.protocol,
        'http.user_agent': req.get('user-agent'),
        'http.remote_addr': req.ip || req.connection.remoteAddress,
        'http.x_forwarded_for': req.get('x-forwarded-for'),
        'http.x_real_ip': req.get('x-real-ip'),
        'express.route': req.route?.path,
        'express.params': JSON.stringify(req.params),
        'express.query': JSON.stringify(req.query),
        'user.id': req.user?.id,
        'user.session_id': req.sessionID,
        'request.id': req.id || TracingUtils.generateTraceId()
      }
    },
    context
  );
  
  // 将span设置到上下文中
  const contextWithSpan = trace.trace.setSpan(context, span);
  trace.context.with(contextWithSpan, () => {
    // 在响应对象上添加追踪方法
    res.addTraceEvent = (name, attributes = {}) => {
      span.addEvent(name, {
        ...attributes,
        'timestamp': new Date().toISOString()
      });
    };
    
    res.addTraceAttribute = (key, value) => {
      span.setAttribute(key, value);
    };
    
    res.setTraceStatus = (status, message) => {
      span.setStatus({ code: status, message: message });
    };
    
    // 记录响应开始
    span.addEvent('request_started', {
      'timestamp': new Date().toISOString()
    });
    
    // 监听响应完成
    res.on('finish', () => {
      span.setAttribute('http.status_code', res.statusCode);
      span.setAttribute('http.response_content_length', res.get('content-length') || 0);
      
      // 根据状态码设置span状态
      if (res.statusCode >= 400) {
        span.setStatus({
          code: trace.SpanStatusCode.ERROR,
          message: `HTTP ${res.statusCode}`
        });
      } else {
        span.setStatus({
          code: trace.SpanStatusCode.OK
        });
      }
      
      // 记录响应完成
      span.addEvent('request_completed', {
        'http.status_code': res.statusCode,
        'response_time_ms': Date.now() - req.startTime,
        'timestamp': new Date().toISOString()
      });
      
      span.end();
    });
    
    // 监听响应错误
    res.on('error', (error) => {
      span.recordException(error);
      span.setStatus({
        code: trace.SpanStatusCode.ERROR,
        message: error.message
      });
      
      span.addEvent('request_error', {
        'error.name': error.name,
        'error.message': error.message,
        'timestamp': new Date().toISOString()
      });
      
      span.end();
    });
    
    next();
  });
}

/**
 * 业务追踪中间件 - 记录业务操作
 */
function businessTracingMiddleware(req, res, next) {
  const tracer = trace.trace.getTracer('caddy-shopping-business');
  
  // 为特定业务路径创建业务span
  const businessPaths = [
    '/api/cart',
    '/api/orders',
    '/api/payments',
    '/api/auth/login',
    '/api/auth/register',
    '/api/products/search'
  ];
  
  const isBusinessPath = businessPaths.some(path => req.path.startsWith(path));
  
  if (isBusinessPath) {
    const businessSpan = tracer.startSpan(`business.${req.method}.${req.path}`, {
      attributes: {
        'business.operation': `${req.method} ${req.path}`,
        'business.path': req.path,
        'business.method': req.method,
        'user.id': req.user?.id,
        'user.session_id': req.sessionID,
        'business.timestamp': new Date().toISOString()
      }
    });
    
    // 记录业务事件开始
    businessSpan.addEvent('business_operation_started', {
      'business.operation': `${req.method} ${req.path}`,
      'timestamp': new Date().toISOString()
    });
    
    // 监听响应完成
    res.on('finish', () => {
      businessSpan.setAttribute('business.status_code', res.statusCode);
      businessSpan.setAttribute('business.success', res.statusCode < 400);
      
      // 记录业务事件完成
      businessSpan.addEvent('business_operation_completed', {
        'business.status_code': res.statusCode,
        'business.success': res.statusCode < 400,
        'timestamp': new Date().toISOString()
      });
      
      businessSpan.end();
    });
    
    // 监听响应错误
    res.on('error', (error) => {
      businessSpan.recordException(error);
      businessSpan.setStatus({
        code: trace.SpanStatusCode.ERROR,
        message: error.message
      });
      
      businessSpan.addEvent('business_operation_error', {
        'error.name': error.name,
        'error.message': error.message,
        'timestamp': new Date().toISOString()
      });
      
      businessSpan.end();
    });
  }
  
  next();
}

/**
 * 错误追踪中间件 - 记录错误信息
 */
function errorTracingMiddleware(error, req, res, next) {
  const tracer = trace.trace.getTracer('caddy-shopping-errors');
  
  const errorSpan = tracer.startSpan('error.handler', {
    attributes: {
      'error.name': error.name,
      'error.message': error.message,
      'error.stack': error.stack,
      'error.status': error.status || 500,
      'http.method': req.method,
      'http.url': req.url,
      'user.id': req.user?.id,
      'user.session_id': req.sessionID,
      'request.id': req.id || TracingUtils.generateTraceId()
    }
  });
  
  errorSpan.recordException(error);
  errorSpan.setStatus({
    code: trace.SpanStatusCode.ERROR,
    message: error.message
  });
  
  errorSpan.addEvent('error_occurred', {
    'error.name': error.name,
    'error.message': error.message,
    'error.status': error.status || 500,
    'timestamp': new Date().toISOString()
  });
  
  errorSpan.end();
  
  // 记录错误到业务事件
  TracingUtils.recordError(error, {
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body
    },
    user: {
      id: req.user?.id,
      sessionId: req.sessionID
    }
  });
  
  next(error);
}

/**
 * 数据库追踪中间件 - 记录数据库操作
 */
function databaseTracingMiddleware(operation, table) {
  return function(req, res, next) {
    const tracer = trace.trace.getTracer('caddy-shopping-database');
    
    const dbSpan = tracer.startSpan(`database.${operation}`, {
      attributes: {
        'db.operation': operation,
        'db.table': table,
        'db.system': 'postgresql',
        'db.statement': req.query?.query || req.body?.query,
        'user.id': req.user?.id
      }
    });
    
    const startTime = Date.now();
    
    // 监听数据库操作完成
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      dbSpan.setAttribute('db.duration_ms', duration);
      dbSpan.setAttribute('db.rows_affected', res.locals?.rowsAffected || 0);
      
      if (res.statusCode >= 400) {
        dbSpan.setStatus({
          code: trace.SpanStatusCode.ERROR,
          message: `Database operation failed`
        });
      }
      
      dbSpan.end();
    });
    
    next();
  };
}

/**
 * 缓存追踪中间件 - 记录缓存操作
 */
function cacheTracingMiddleware(operation, key) {
  return function(req, res, next) {
    const tracer = trace.trace.getTracer('caddy-shopping-cache');
    
    const cacheSpan = tracer.startSpan(`cache.${operation}`, {
      attributes: {
        'cache.operation': operation,
        'cache.key': key,
        'cache.system': 'redis',
        'user.id': req.user?.id
      }
    });
    
    const startTime = Date.now();
    
    // 监听缓存操作完成
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      cacheSpan.setAttribute('cache.duration_ms', duration);
      cacheSpan.setAttribute('cache.hit', res.locals?.cacheHit || false);
      
      cacheSpan.end();
    });
    
    next();
  };
}

/**
 * 外部服务追踪中间件 - 记录外部API调用
 */
function externalServiceTracingMiddleware(serviceName, url) {
  return function(req, res, next) {
    const tracer = trace.trace.getTracer('caddy-shopping-external');
    
    const externalSpan = tracer.startSpan(`external.${serviceName}`, {
      attributes: {
        'external.service': serviceName,
        'external.url': url,
        'external.method': req.method,
        'user.id': req.user?.id
      }
    });
    
    const startTime = Date.now();
    
    // 监听外部服务调用完成
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      externalSpan.setAttribute('external.duration_ms', duration);
      externalSpan.setAttribute('external.status_code', res.statusCode);
      
      if (res.statusCode >= 400) {
        externalSpan.setStatus({
          code: trace.SpanStatusCode.ERROR,
          message: `External service call failed`
        });
      }
      
      externalSpan.end();
    });
    
    next();
  };
}

module.exports = {
  tracingMiddleware,
  businessTracingMiddleware,
  errorTracingMiddleware,
  databaseTracingMiddleware,
  cacheTracingMiddleware,
  externalServiceTracingMiddleware
};