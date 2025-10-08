import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
// OpenObserve集成：完全移除Prometheus导出器，使用OpenObserve统一可观测性
import { BatchSpanProcessor, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { IncomingMessage, ServerResponse } from 'http';
import { createOpenObserveSpanExporter } from './openobserve-exporter';

/**
 * 追踪配置选项 - 集成OpenObserve
 */
export interface TracingConfig {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  openobserve?: {
    enabled: boolean;
    endpoint?: string;
    organization?: string;
    stream?: string;
  };
  jaeger?: {
    enabled: boolean;
    endpoint?: string;
  };
  zipkin?: {
    enabled: boolean;
    endpoint?: string;
  };
  console?: {
    enabled: boolean;
  };
  sampling?: {
    ratio: number;
  };
  metrics?: {
    enabled: boolean;
    // 使用OpenObserve替代Prometheus
    openobserveEndpoint?: string;
  };
}

/**
 * 默认追踪配置 - 优先使用OpenObserve
 */
const defaultConfig: TracingConfig = {
  serviceName: 'caddy-shopping-site',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  openobserve: {
    enabled: process.env.OPENOBSERVE_ENABLED === 'true',
    endpoint: process.env.OPENOBSERVE_ENDPOINT || 'http://localhost:5080',
    organization: process.env.OPENOBSERVE_ORG || 'default',
    stream: process.env.OPENOBSERVE_STREAM || 'traces',
  },
  jaeger: {
    enabled: process.env.JAEGER_ENABLED === 'true',
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  },
  zipkin: {
    enabled: process.env.ZIPKIN_ENABLED === 'true',
    endpoint:
      process.env.ZIPKIN_ENABLED === 'true'
        ? process.env.ZIPKIN_ENDPOINT || 'http://localhost:9411/api/v2/spans'
        : undefined,
  },
  console: {
    enabled: process.env.CONSOLE_TRACING === 'true' || process.env.NODE_ENV === 'development',
  },
  sampling: {
    ratio: parseFloat(process.env.TRACE_SAMPLING_RATIO || '0.1'),
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    openobserveEndpoint:
      process.env.OPENOBSERVE_METRICS_ENDPOINT || 'http://localhost:5080/api/metrics',
  },
};

/**
 * 创建追踪资源
 */
function createResource(config: TracingConfig) {
  return resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
    [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: config.environment,
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'e-commerce',
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'unknown',
  });
}

/**
 * 创建Span导出器 - 集成OpenObserve
 */
function createSpanExporters(config: TracingConfig) {
  const exporters: any[] = [];

  // OpenObserve导出器（优先使用）
  if (config.openobserve?.enabled) {
    // 使用真正的 OpenObserve 导出器
    exporters.push(
      createOpenObserveSpanExporter({
        url: config.openobserve.endpoint || 'http://localhost:5080',
        organization: config.openobserve.organization || 'default',
        stream: config.openobserve.stream || 'traces',
        token: process.env.OPENOBSERVE_TOKEN,
        username: process.env.OPENOBSERVE_USERNAME,
        password: process.env.OPENOBSERVE_PASSWORD,
      }),
    );
  }

  // Jaeger导出器（备用）
  if (config.jaeger?.enabled && !config.openobserve?.enabled) {
    exporters.push(
      new JaegerExporter({
        endpoint: config.jaeger.endpoint,
      }),
    );
  }

  // Zipkin导出器（备用）
  if (config.zipkin?.enabled && !config.openobserve?.enabled) {
    exporters.push(
      new ZipkinExporter({
        url: config.zipkin.endpoint,
      }),
    );
  }

  // 控制台导出器（开发环境）
  if (config.console?.enabled) {
    exporters.push(new ConsoleSpanExporter());
  }

  return exporters;
}

/**
 * 创建指标导出器 - 使用OpenObserve替代Prometheus
 */
function createMetricReaders(config: TracingConfig) {
  const readers: any[] = [];

  if (config.metrics?.enabled) {
    // 使用OpenObserve指标导出器
    readers.push(
      new PeriodicExportingMetricReader({
        exporter: new ConsoleMetricExporter(), // 临时使用控制台导出器
        exportIntervalMillis: 5000,
      }),
    );
  }

  return readers;
}

/**
 * 初始化OpenTelemetry追踪
 */
export function initializeTracing(customConfig?: Partial<TracingConfig>): NodeSDK {
  const config = { ...defaultConfig, ...customConfig };

  console.log('Initializing OpenTelemetry tracing...', {
    serviceName: config.serviceName,
    environment: config.environment,
    jaegerEnabled: config.jaeger?.enabled,
    zipkinEnabled: config.zipkin?.enabled,
    consoleEnabled: config.console?.enabled,
  });

  const resource = createResource(config);
  const spanExporters = createSpanExporters(config);
  const metricReaders = createMetricReaders(config);

  // 创建Span处理器
  const spanProcessors = spanExporters.map(exporter => {
    // 在生产环境使用批量处理器，开发环境使用简单处理器
    if (config.environment === 'production') {
      return new BatchSpanProcessor(exporter, {
        maxQueueSize: 2048,
        maxExportBatchSize: 512,
        exportTimeoutMillis: 30000,
        scheduledDelayMillis: 5000,
      });
    } else {
      return new SimpleSpanProcessor(exporter);
    }
  });

  const sdk = new NodeSDK({
    resource,
    spanProcessors,
    metricReader: metricReaders.length > 0 ? metricReaders[0] : undefined,
    instrumentations: [
      getNodeAutoInstrumentations({
        // 禁用某些不需要的自动仪表化
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
          requestHook: (span, request: any) => {
            const headers = request.headers || {};
            span.setAttributes({
              'http.request.header.user-agent': headers['user-agent'] || 'unknown',
              'http.request.header.x-forwarded-for': headers['x-forwarded-for'] || 'unknown',
            });
          },
          responseHook: (span, response: ServerResponse) => {
            span.setAttributes({
              'http.response.status_code': response.statusCode || 0,
            });
          },
        },
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-mysql2': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-redis': {
          enabled: true,
        },
      }),
    ],
  });

  // 初始化SDK
  try {
    sdk.start();
    console.log('OpenTelemetry tracing initialized successfully');

    // 注册优雅关闭处理
    process.on('SIGTERM', () => {
      sdk
        .shutdown()
        .then(() => console.log('OpenTelemetry terminated'))
        .catch(error => console.error('Error terminating OpenTelemetry', error))
        .finally(() => process.exit(0));
    });
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry:', error);
  }

  return sdk;
}

/**
 * 追踪装饰器工厂
 */
export function Trace(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const spanName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const { trace } = await import('@opentelemetry/api');
      const tracer = trace.getTracer('caddy-shopping-site');

      return tracer.startActiveSpan(spanName, async span => {
        try {
          span.setAttributes({
            'method.class': target.constructor.name,
            'method.name': propertyKey,
            'method.args.count': args.length,
          });

          const result = await originalMethod.apply(this, args);
          span.setStatus({ code: 1 }); // SpanStatusCode.OK
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message }); // SpanStatusCode.ERROR
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}

/**
 * 数据库操作追踪装饰器
 */
export function TraceDatabase(tableName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const operation = propertyKey;
    const table = tableName || 'unknown';

    descriptor.value = async function (...args: any[]) {
      const { trace } = await import('@opentelemetry/api');
      const tracer = trace.getTracer('caddy-shopping-site');

      return tracer.startActiveSpan(`DB ${operation}`, async span => {
        try {
          span.setAttributes({
            'db.operation': operation,
            'db.table': table,
            'db.system': 'mysql',
            'method.class': target.constructor.name,
          });

          const result = await originalMethod.apply(this, args);
          span.setStatus({ code: 1 }); // SpanStatusCode.OK
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message }); // SpanStatusCode.ERROR
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}

/**
 * HTTP请求追踪装饰器
 */
export function TraceHttp(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const spanName = operationName || `HTTP ${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const { trace } = await import('@opentelemetry/api');
      const tracer = trace.getTracer('caddy-shopping-site');

      return tracer.startActiveSpan(spanName, async span => {
        try {
          span.setAttributes({
            'http.operation': propertyKey,
            'controller.class': target.constructor.name,
          });

          const result = await originalMethod.apply(this, args);
          span.setStatus({ code: 1 }); // SpanStatusCode.OK
          return result;
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message }); // SpanStatusCode.ERROR
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}

export { defaultConfig };
