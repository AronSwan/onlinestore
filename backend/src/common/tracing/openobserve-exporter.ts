import { SpanExporter } from '@opentelemetry/sdk-trace-base';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { ExportResultCode } from '@opentelemetry/core';
import { diag, DiagConsoleLogger } from '@opentelemetry/api';
import axios from 'axios';

// 设置诊断日志
diag.setLogger(new DiagConsoleLogger());

/**
 * OpenObserve 追踪数据导出器
 * 实现将 OpenTelemetry 追踪数据发送到 OpenObserve
 */
export class OpenObserveSpanExporter implements SpanExporter {
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(options: { endpoint: string; headers?: Record<string, string>; timeout?: number }) {
    this.endpoint = options.endpoint;
    this.headers = options.headers || {};
  }

  /**
   * 导出追踪数据到 OpenObserve
   */
  async export(
    spans: ReadableSpan[],
    resultCallback: (result: { code: ExportResultCode; error?: Error }) => void,
  ): Promise<void> {
    try {
      // 转换为 OpenObserve 格式并添加额外元数据
      const enrichedSpans = spans.map(span => this.enrichSpanWithOpenObserveMetadata(span));

      // 直接发送到 OpenObserve API
      const response = await axios.post(
        `${this.endpoint}/api/default/traces/_json`,
        {
          streams: ['traces'],
          data: enrichedSpans.map(span => this.convertToOpenObserveFormat(span)),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...this.headers,
          },
          timeout: 10000,
        },
      );

      if (response.status === 200) {
        diag.debug('Successfully exported spans to OpenObserve');
        resultCallback({ code: ExportResultCode.SUCCESS });
      } else {
        diag.error('Failed to export spans to OpenObserve:', response.statusText);
        resultCallback({
          code: ExportResultCode.FAILED,
          error: new Error(`HTTP ${response.status}: ${response.statusText}`),
        });
      }
    } catch (error) {
      diag.error('Error exporting spans to OpenObserve:', error);
      resultCallback({
        code: ExportResultCode.FAILED,
        error: error as Error,
      });
    }
  }

  /**
   * 丰富追踪数据，添加 OpenObserve 特定元数据
   */
  private enrichSpanWithOpenObserveMetadata(span: ReadableSpan): ReadableSpan {
    const attributes = span.attributes;

    // 添加 OpenObserve 特定属性
    const enrichedAttributes: Record<string, any> = {
      ...attributes,
      'openobserve.ingestion_timestamp': Date.now(),
      'openobserve.service.namespace': attributes['service.namespace'] || 'e-commerce',
      'openobserve.service.version': attributes['service.version'] || '1.0.0',
      'openobserve.environment': attributes['deployment.environment.name'] || 'development',
    };

    // 如果是 HTTP 请求，添加更多元数据
    if (attributes['http.method'] && attributes['http.url']) {
      enrichedAttributes['openobserve.http.method'] = attributes['http.method'];
      enrichedAttributes['openobserve.http.url'] = this.sanitizeUrl(
        attributes['http.url'] as string,
      );
      enrichedAttributes['openobserve.http.status_code'] = attributes['http.status_code'];
    }

    // 如果是数据库操作，添加更多元数据
    if (attributes['db.system']) {
      enrichedAttributes['openobserve.db.system'] = attributes['db.system'];
      enrichedAttributes['openobserve.db.operation'] = attributes['db.operation'];
      enrichedAttributes['openobserve.db.table'] = attributes['db.table'] || 'unknown';
    }

    // 返回丰富后的 span
    return {
      ...span,
      attributes: enrichedAttributes,
    };
  }

  /**
   * 将 span 转换为 OpenObserve 格式
   */
  private convertToOpenObserveFormat(span: ReadableSpan): any {
    return {
      trace_id: span.spanContext().traceId,
      span_id: span.spanContext().spanId,
      parent_span_id: (span as any).parentSpanId,
      operation_name: span.name,
      start_time: span.startTime[0],
      duration: span.duration[0],
      tags: span.attributes,
      status: span.status.code,
      service_name: span.attributes['service.name'],
      resource: span.attributes,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 清理 URL，移除敏感信息
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // 移除查询参数中的敏感信息
      if (urlObj.searchParams.has('token') || urlObj.searchParams.has('password')) {
        urlObj.searchParams.delete('token');
        urlObj.searchParams.delete('password');
      }
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * 强制导出所有待处理的追踪数据
   */
  async forceFlush(): Promise<void> {
    // OpenObserve 是实时写入，不需要强制刷新
    return Promise.resolve();
  }

  /**
   * 关闭导出器并清理资源
   */
  async shutdown(): Promise<void> {
    // 清理资源
    return Promise.resolve();
  }
}

/**
 * 创建 OpenObserve 导出器的工厂函数
 */
export function createOpenObserveSpanExporter(config: {
  url: string;
  organization?: string;
  stream?: string;
  token?: string;
  username?: string;
  password?: string;
}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // 设置认证头
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`;
  } else if (config.username && config.password) {
    const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
    headers['Authorization'] = `Basic ${credentials}`;
  }

  // 如果指定了组织和流，添加到头部
  if (config.organization) {
    headers['X-Org-ID'] = config.organization;
  }
  if (config.stream) {
    headers['X-Stream-Name'] = config.stream;
  }

  return new OpenObserveSpanExporter({
    endpoint: config.url,
    headers,
    timeout: 10000,
  });
}
