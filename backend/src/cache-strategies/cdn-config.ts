// 用途：CDN配置和静态资源缓存策略
// 依赖文件：无
// 作者：后端开发团队
// 时间：2025-09-29 23:30:00

export interface CDNConfig {
  enabled: boolean;
  provider: 'cloudflare' | 'aws' | 'azure' | 'custom';
  domain: string;
  apiToken?: string;
  zoneId?: string;
  distributionId?: string;
  cacheRules: CacheRule[];
  compression: CompressionConfig;
  security: SecurityConfig;
}

export interface CacheRule {
  pattern: string;
  ttl: number;
  staleWhileRevalidate?: number;
  staleOnError?: number;
  headers?: string[];
  queryParams?: string[];
  cookies?: string[];
}

export interface CompressionConfig {
  enabled: boolean;
  algorithms: ('brotli' | 'gzip' | 'deflate')[];
  level: number;
  mimeTypes: string[];
}

export interface SecurityConfig {
  https: boolean;
  hsts: boolean;
  cors: boolean;
  waf: boolean;
  ddosProtection: boolean;
}

// 默认CDN配置
export const defaultCDNConfig: CDNConfig = {
  enabled: true,
  provider: 'cloudflare',
  domain: 'cdn.caddy-shopping.com',
  apiToken: process.env.CDN_API_TOKEN,
  zoneId: process.env.CDN_ZONE_ID,
  cacheRules: [
    // 静态资源缓存规则
    {
      pattern: '/static/**/*.(js|css|png|jpg|jpeg|gif|svg|webp|ico)',
      ttl: 31536000, // 1年
      staleWhileRevalidate: 86400, // 1天
      staleOnError: 3600, // 1小时
      headers: ['Cache-Control', 'Expires', 'ETag'],
      queryParams: [],
      cookies: [],
    },
    // API响应缓存规则
    {
      pattern: '/api/**',
      ttl: 300, // 5分钟
      staleWhileRevalidate: 60, // 1分钟
      staleOnError: 30, // 30秒
      headers: ['Cache-Control', 'ETag'],
      queryParams: ['page', 'limit', 'sort'],
      cookies: [],
    },
    // 产品图片缓存规则
    {
      pattern: '/images/products/**/*',
      ttl: 2592000, // 30天
      staleWhileRevalidate: 3600, // 1小时
      staleOnError: 1800, // 30分钟
      headers: ['Cache-Control', 'Last-Modified', 'ETag'],
      queryParams: ['width', 'height', 'quality'],
      cookies: [],
    },
    // 默认缓存规则
    {
      pattern: '/**',
      ttl: 3600, // 1小时
      staleWhileRevalidate: 300, // 5分钟
      staleOnError: 60, // 1分钟
      headers: ['Cache-Control'],
      queryParams: [],
      cookies: [],
    },
  ],
  compression: {
    enabled: true,
    algorithms: ['brotli', 'gzip'],
    level: 6,
    mimeTypes: [
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      'application/json',
      'application/xml',
      'text/xml',
      'image/svg+xml',
      'application/xhtml+xml',
    ],
  },
  security: {
    https: true,
    hsts: true,
    cors: true,
    waf: true,
    ddosProtection: true,
  },
};

// CDN缓存键生成策略
export class CDNCacheKeyGenerator {
  /**
   * 生成标准化的缓存键
   */
  static generateKey(
    url: string,
    headers?: Record<string, string>,
    queryParams?: Record<string, string>,
  ): string {
    // 标准化URL
    const normalizedUrl = url.toLowerCase().trim();

    // 添加查询参数（如果指定）
    let key = normalizedUrl;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const sortedParams = Object.keys(queryParams)
        .sort()
        .map(k => `${k}=${queryParams[k]}`)
        .join('&');
      key += `?${sortedParams}`;
    }

    // 添加头部信息（如果指定）
    if (headers && Object.keys(headers).length > 0) {
      const headerKey = Object.keys(headers)
        .sort()
        .map(k => `${k}:${headers[k]}`)
        .join('|');
      key += `|${headerKey}`;
    }

    // 生成哈希以确保键长度合理
    return this.hash(key);
  }

  /**
   * 生成版本化的资源URL
   */
  static generateVersionedUrl(baseUrl: string, version: string, filePath: string): string {
    const cleanPath = filePath.replace(/^\/+/, '');
    return `${baseUrl}/${version}/${cleanPath}`;
  }

  /**
   * 生成带参数的图片URL
   */
  static generateImageUrl(
    baseUrl: string,
    imagePath: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'jpg' | 'png' | 'gif';
    },
  ): string {
    const cleanPath = imagePath.replace(/^\/+/, '');
    let url = `${baseUrl}/${cleanPath}`;

    if (options) {
      const params = new URLSearchParams();
      if (options.width) params.set('width', options.width.toString());
      if (options.height) params.set('height', options.height.toString());
      if (options.quality) params.set('quality', options.quality.toString());
      if (options.format) params.set('format', options.format);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }

    return url;
  }

  /**
   * 简单的哈希函数
   */
  private static hash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }
}

// CDN缓存失效策略
export class CDNCacheInvalidation {
  /**
   * 生成失效URL模式
   */
  static generateInvalidationPatterns(baseUrl: string, paths: string[]): string[] {
    return paths.map(path => {
      // 标准化路径
      const cleanPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
      return `${baseUrl}/${cleanPath}**`;
    });
  }

  /**
   * 生成标签失效模式
   */
  static generateTagInvalidation(tags: string[]): string[] {
    return tags.map(tag => `tag:${tag}`);
  }

  /**
   * 生成前缀失效模式
   */
  static generatePrefixInvalidation(prefixes: string[]): string[] {
    return prefixes.map(prefix => `prefix:${prefix}`);
  }
}

// CDN性能监控指标
export interface CDNMetrics {
  requestsTotal: number;
  cacheHits: number;
  cacheMisses: number;
  bandwidthSaved: number;
  averageResponseTime: number;
  errorRate: number;
  topEndpoints: Array<{
    path: string;
    requests: number;
    cacheHitRate: number;
  }>;
}

// CDN健康检查
export class CDNHealthChecker {
  /**
   * 检查CDN连接状态
   */
  static async checkConnectivity(config: CDNConfig): Promise<{
    healthy: boolean;
    responseTime: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const response = await fetch(`https://${config.domain}/health`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // 5秒超时
      });
      const responseTime = Date.now() - startTime;

      return {
        healthy: response.ok,
        responseTime,
      };
    } catch (error) {
      return {
        healthy: false,
        responseTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 检查CDN缓存命中率
   */
  static async checkCacheHitRate(config: CDNConfig): Promise<{
    hitRate: number;
    totalRequests: number;
    cacheHits: number;
  }> {
    // 这里应该调用CDN提供商的API获取真实的缓存命中率
    // 为了示例，返回模拟数据
    return {
      hitRate: 0.85, // 85%命中率
      totalRequests: 10000,
      cacheHits: 8500,
    };
  }

  /**
   * 检查CDN带宽节省
   */
  static async checkBandwidthSavings(config: CDNConfig): Promise<{
    savingsPercent: number;
    totalBytes: number;
    savedBytes: number;
  }> {
    // 这里应该调用CDN提供商的API获取真实的带宽节省数据
    // 为了示例，返回模拟数据
    return {
      savingsPercent: 0.65, // 65%带宽节省
      totalBytes: 1000000000, // 1GB
      savedBytes: 650000000, // 650MB
    };
  }
}
