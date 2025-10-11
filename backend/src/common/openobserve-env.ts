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
export function resolveOpenObserveEnv(env: Partial<OpenObserveEnv> = process.env as any) {
  const rawUrl = env.OPENOBSERVE_URL ?? env.OPENOBSERVE_BASE_URL;
  const url = rawUrl ? String(rawUrl).replace(/\/+$/, '') : undefined;
  const org = env.OPENOBSERVE_ORGANIZATION ?? env.OPENOBSERVE_ORG;
  const token = env.OPENOBSERVE_TOKEN;
  const enabledRaw = env.OPENOBSERVE_ENABLED ?? 'true';
  const enabled = String(enabledRaw).toLowerCase() !== 'false';

  // 开发/禁用模式下：不强制要求 URL/ORG/TOKEN，返回占位并保持 enabled=false
  const isDevMode = (process.env.NODE_ENV || 'development').toLowerCase() === 'development';

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

  if (!enabled || isDevMode) {
    // 提供安全的占位返回，避免启动阶段抛错
    return {
      url: url || 'http://localhost:5080',
      org: org || 'default',
      token: token, // 可能为 undefined，调用方需在 enabled=false 时避免使用
      enabled: false,
    };
  }

  // 仅在启用且非开发模式时严格校验
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
