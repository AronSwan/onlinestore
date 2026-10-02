/**
 * OpenObserve 环境变量适配器（服务端）
 * - 标准化 OPENOBSERVE_* 变量，并对历史变体提供回退
 * - 统一去除 URL 尾部斜杠
 */
export interface OpenObserveEnv {
  OPENOBSERVE_URL?: string;
  OPENOBSERVE_BASE_URL?: string;
  OPENOBSERVE_ORGANIZATION?: string;
  OPENOBSERVE_ORG?: string;
  OPENOBSERVE_TOKEN?: string;
  OPENOBSERVE_ENABLED?: string | boolean;
}
let warnedBaseUrl = false;
let warnedOrg = false;
let warnedDegrade = false;

/**
 * 构造降级配置（enabled=false），保证导出形状不变，下游按禁用态处理
 */
function degradedOpenObserveConfig(url?: string, org?: string, token?: string) {
  return {
    url: url || 'http://localhost:5080',
    org: org || 'default',
    token: token, // 可能为 undefined，调用方需在 enabled=false 时避免使用
    enabled: false,
  };
}

export function resolveOpenObserveEnv(env: Partial<OpenObserveEnv> = process.env as any) {
  const rawUrl = env.OPENOBSERVE_URL ?? env.OPENOBSERVE_BASE_URL;
  const url = rawUrl ? String(rawUrl).replace(/\/+$/, '') : undefined;
  const org = env.OPENOBSERVE_ORGANIZATION ?? env.OPENOBSERVE_ORG;
  const token = env.OPENOBSERVE_TOKEN;
  const enabledRaw = env.OPENOBSERVE_ENABLED ?? 'true';
  const enabled = String(enabledRaw).toLowerCase() !== 'false';

  // 仅 production 严格校验；development / test / 未设置一律不抛错（D6.6 整改）
  const nodeEnv = (process.env.NODE_ENV || '').toLowerCase();
  const isProduction = nodeEnv === 'production';

  if (!env.OPENOBSERVE_URL && env.OPENOBSERVE_BASE_URL && !warnedBaseUrl) {
    console.warn('[OpenObserve] DEPRECATED: Use OPENOBSERVE_URL instead of OPENOBSERVE_BASE_URL');
    warnedBaseUrl = true;
  }
  if (!env.OPENOBSERVE_ORGANIZATION && env.OPENOBSERVE_ORG && !warnedOrg) {
    console.warn(
      '[OpenObserve] DEPRECATED: Use OPENOBSERVE_ORGANIZATION instead of OPENOBSERVE_ORG',
    );
    warnedOrg = true;
  }

  // 显式禁用：任何环境都不启用、不抛错
  if (!enabled) {
    return degradedOpenObserveConfig(url, org, token);
  }

  const configComplete = !!(url && org && token);

  // 非 production（含 test / 未设置 NODE_ENV）：缺配置时降级为 enabled:false，
  // 仅告警不抛错，避免 test 环境因缺少 OPENOBSERVE_* 在 import 期崩溃；
  // 配置完整时照常启用（允许开发/测试环境显式接入真实 OpenObserve）
  if (!isProduction) {
    if (!configComplete && !warnedDegrade) {
      console.warn(
        `[OpenObserve] 非 production 环境 (NODE_ENV=${process.env.NODE_ENV || 'unset'}) 缺少完整 ` +
          'OPENOBSERVE_URL / OPENOBSERVE_ORGANIZATION / OPENOBSERVE_TOKEN 配置，' +
          '已降级停用 (enabled=false)；生产环境缺少上述配置将在启动期直接抛错',
      );
      warnedDegrade = true;
    }
    if (!configComplete) {
      return degradedOpenObserveConfig(url, org, token);
    }
    return { url, org, token, enabled };
  }

  // 仅 production 且启用时严格校验（保持 throw）
  if (!url) throw new Error('OPENOBSERVE_URL is required (or OPENOBSERVE_BASE_URL as fallback)');
  if (!org)
    throw new Error('OPENOBSERVE_ORGANIZATION is required (or OPENOBSERVE_ORG as fallback)');
  if (!token) throw new Error('OPENOBSERVE_TOKEN is required');
  return { url, org, token, enabled };
}
export const {
  url: OPENOBSERVE_URL,
  org: OPENOBSERVE_ORGANIZATION,
  token: OPENOBSERVE_TOKEN,
  enabled: OPENOBSERVE_ENABLED,
} = resolveOpenObserveEnv();
