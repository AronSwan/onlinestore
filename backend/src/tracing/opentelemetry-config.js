/**
 * OpenTelemetry配置文件
 * 用于配置分布式追踪系统，将追踪数据发送到OpenObserve
 */

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { RandomIdGenerator } = require('@opentelemetry/sdk-trace-base');

// 配置OpenTelemetry SDK
function initializeTracing() {
  // 从环境变量获取配置
  const openobserveUrl = process.env.OPENOBSERVE_URL || 'http://localhost:5080';
  const organization = process.env.OPENOBSERVE_ORGANIZATION || 'default';
  const serviceName = process.env.SERVICE_NAME || 'caddy-shopping-backend';
  const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
  const environment = process.env.NODE_ENV || 'development';

  // 创建OTLP追踪导出器，发送到OpenObserve
  const traceExporter = new OTLPTraceExporter({
    url: `${openobserveUrl}/api/${organization}/traces`,
    headers: {
      'Authorization': `Bearer ${process.env.OPENOBSERVE_TOKEN || ''}`,
      'Content-Type': 'application/json'
    }
  });

  // 创建资源标识
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
    [SemanticResourceAttributes.HOST_NAME]: require('os').hostname(),
    [SemanticResourceAttributes.PROCESS_PID]: process.pid,
  });

  // 配置采样策略
  const samplingConfig = {
    // 开发环境：100%采样
    // 生产环境：基于采样率的采样
    samplingRatio: environment === 'production' ? 0.1 : 1.0
  };

  // 初始化OpenTelemetry SDK
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations({
      // 配置自动插桩选项
      '@opentelemetry/instrumentation-express': {
        requestHook: (span, info) => {
          // 为Express请求添加额外属性
          span.setAttribute('express.route', info.request.route?.path);
          span.setAttribute('express.method', info.request.method);
          span.setAttribute('express.url', info.request.url);
        }
      },
      '@opentelemetry/instrumentation-http': {
        applyCustomAttributesOnSpan: (span, request, response) => {
          // 为HTTP请求添加自定义属性
          if (request.headers) {
            span.setAttribute('http.user_agent', request.headers['user-agent']);
            span.setAttribute('http.x_forwarded_for', request.headers['x-forwarded-for']);
          }
        }
      }
    })],
    spanProcessors: [
      // 批量处理器用于生产环境，提高性能
      new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        scheduledDelayMillis: 5000,
        exportTimeoutMillis: 30000,
      }),
      // 简单处理器用于开发和调试
      ...(environment === 'development' ? [new SimpleSpanProcessor(traceExporter)] : [])
    ],
    sampler: {
      // 基于采样率的采样器
      sample: (context, traceId, spanName, spanKind, attributes) => {
        // 对于错误追踪，总是采样
        if (attributes && attributes.error === true) {
          return { decision: 'RECORD_AND_SAMPLE' };
        }
        
        // 基于配置的采样率进行采样
        const shouldSample = Math.random() < samplingConfig.samplingRatio;
        return { 
          decision: shouldSample ? 'RECORD_AND_SAMPLE' : 'DROP' 
        };
      }
    }
  });

  // 启动SDK
  sdk.start();
  
  console.log(`🔍 OpenTelemetry已初始化 - 服务: ${serviceName}, 环境: ${environment}, 采样率: ${samplingConfig.samplingRatio}`);
  
  return sdk;
}

// 创建追踪工具函数
class TracingUtils {
  static generateTraceId() {
    const idGenerator = new RandomIdGenerator();
    return idGenerator.generateTraceId();
  }
  
  static generateSpanId() {
    const idGenerator = new RandomIdGenerator();
    return idGenerator.generateSpanId();
  }
  
  // 创建自定义span
  static createCustomSpan(name, attributes = {}) {
    const trace = require('@opentelemetry/api');
    const tracer = trace.trace.getTracer('caddy-shopping-custom');
    
    return tracer.startSpan(name, {
      attributes: {
        ...attributes,
        'custom.span': true,
        'service.name': process.env.SERVICE_NAME || 'caddy-shopping-backend'
      }
    });
  }
  
  // 记录业务事件
  static recordBusinessEvent(eventName, eventData = {}) {
    const trace = require('@opentelemetry/api');
    const tracer = trace.trace.getTracer('caddy-shopping-business');
    
    const span = tracer.startSpan(`business.event.${eventName}`, {
      attributes: {
        'business.event.name': eventName,
        'business.event.data': JSON.stringify(eventData),
        'service.name': process.env.SERVICE_NAME || 'caddy-shopping-backend'
      }
    });
    
    span.addEvent('business_event', {
      'event.name': eventName,
      'event.data': JSON.stringify(eventData),
      'event.timestamp': new Date().toISOString()
    });
    
    span.end();
  }
  
  // 记录错误信息
  static recordError(error, context = {}) {
    const trace = require('@opentelemetry/api');
    const tracer = trace.trace.getTracer('caddy-shopping-errors');
    
    const span = tracer.startSpan('error.record', {
      attributes: {
        'error.name': error.name,
        'error.message': error.message,
        'error.stack': error.stack,
        'error.context': JSON.stringify(context),
        'service.name': process.env.SERVICE_NAME || 'caddy-shopping-backend'
      }
    });
    
    span.recordException(error);
    span.setStatus({ code: trace.SpanStatusCode.ERROR, message: error.message });
    span.end();
  }
}

// 优雅关闭处理
function shutdownTracing(sdk) {
  process.on('SIGTERM', async () => {
    console.log('🔄 正在关闭OpenTelemetry SDK...');
    await sdk.shutdown();
    console.log('✅ OpenTelemetry SDK已关闭');
    process.exit(0);
  });
  
  process.on('SIGINT', async () => {
    console.log('🔄 正在关闭OpenTelemetry SDK...');
    await sdk.shutdown();
    console.log('✅ OpenTelemetry SDK已关闭');
    process.exit(0);
  });
}

module.exports = {
  initializeTracing,
  TracingUtils,
  shutdownTracing
};