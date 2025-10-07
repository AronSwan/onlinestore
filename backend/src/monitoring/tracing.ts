// 轻量版 OpenTelemetry 初始化：动态导入，避免编译/运行风险
// 仅在 ENABLE_OTEL=true 时执行；未安装依赖或配置不完整时安全降级

export async function initTracing(): Promise<void> {
  try {
    const [sdkNode, resources, semconv, otlp] = await Promise.all([
      import('@opentelemetry/sdk-node'),
      import('@opentelemetry/resources'),
      import('@opentelemetry/semantic-conventions'),
      import('@opentelemetry/exporter-trace-otlp-http').catch(() => null),
    ]);

    const { NodeSDK } = sdkNode as any;
    const { Resource } = resources as any;
    const { SemanticResourceAttributes } = semconv as any;

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'caddy-shopping-backend',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || 'dev',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    const sdkOptions: any = { resource };

    // 按需启用 OTLP 导出（可选）
    if (otlp && process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
      const { OTLPHttpSpanExporter } = otlp as any;
      sdkOptions.traceExporter = new OTLPHttpSpanExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
        headers: process.env.OTEL_EXPORTER_OTLP_HEADERS
          ? JSON.parse(process.env.OTEL_EXPORTER_OTLP_HEADERS)
          : undefined,
      });
      // 生产环境采样率配置
      if (process.env.NODE_ENV === 'production') {
        const { SimpleSpanProcessor } = await import('@opentelemetry/sdk-trace-base');
        const { ParentBasedSampler, TraceIdRatioBasedSampler } = await import(
          '@opentelemetry/sdk-trace-base'
        );
        sdkOptions.spanProcessor = new SimpleSpanProcessor(sdkOptions.traceExporter);
        sdkOptions.sampler = new ParentBasedSampler({
          root: new TraceIdRatioBasedSampler(parseFloat(process.env.OTEL_SAMPLING_RATIO || '0.1')),
        });
      }
    }

    const sdk = new NodeSDK(sdkOptions);
    await sdk.start();
    console.log('OpenTelemetry tracing initialized');

    process.on('SIGTERM', async () => {
      await sdk.shutdown();
      console.log('OpenTelemetry tracing shutdown');
    });
  } catch (err: any) {
    console.warn('OpenTelemetry tracing disabled:', err?.message || err);
  }
}
