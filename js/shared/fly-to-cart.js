/**
 * fly-to-cart — B1 加购飞行动画（佛伦萨工艺全套 · 蓝图 M3 · v1.1 终裁版）
 *
 * 工艺规格（施工不再讨论，冲突以 docs/build-blueprint-v1.1.md §一1 为准）：
 *   - 克隆触发源图 3:4 缩略（64×85px），FLIP：getBoundingClientRect 运行时取坐标
 *     （源图中心 → .site-cart-btn 中心）；
 *   - 时长 = clamp(240ms, d/1.6 px/ms, 400ms)——400ms 上限与令牌 --dur-flight: 0.4s
 *     同源（罗马红线"≤400ms 别抢 toast 注目"；240 地板取米兰短距爽快）；
 *   - 曲线 cubic-bezier(0.22, 0.7, 0.3, 1) 无 overshoot（宪法禁回弹）；
 *   - 轨迹 = WAAPI 三帧弧线：中点垂直外抬 36px（抛物线观感）；
 *   - scale 1→0.25（落点≈30px，与 44px 袋钮图标同量级）；尾 30% opacity 1→0；
 *   - 只动 transform/opacity（合成层，不触 layout/paint）；
 *   - z-index = calc(var(--z-toast) - 1)：低于 toast（600）高于遮罩（400）——
 *     v1.1 竞态补：toast 永远压住飞行残影；
 *   - 同钮 cancel 旧动画重启 / 跨钮并行（WeakMap 按触发钮记账）；
 *   - prefers-reduced-motion: reduce → 整个飞行跳过（"到达反馈替代飞行"——
 *     徽章脉冲由 cart.js 在 itemAdded 即刻触发，与本动画完全解耦）；
 *   - 不加音效不留残影（米兰裁决）。
 *
 * 反馈时序（v1.1 终裁）：徽章脉冲在 itemAdded 即刻（反馈延迟归零，长距飞行是
 * 锦上添花而非反馈本体）——本模块不负责脉冲，onfinish 也无接棒动作。
 */

/** 触发钮 → 进行中动画（同钮 cancel 重启；跨钮天然并行） */
const flights = new WeakMap();

/** 飞行目标：站点头购物袋钮（冻结契约选择器族） */
function resolveTarget() {
  return (
    document.querySelector('.site-cart-btn') ||
    document.querySelector('[data-cart-icon]') ||
    document.querySelector('.cart-icon')
  );
}

/**
 * 从触发按钮解析飞行源图：
 * 1) 首页/搜索卡：.reich-product-card 内 .card-fig img（兜底 .reich-product-image）；
 * 2) PDP：[data-product-detail] 作用域内 .pdp-main img（product.js 挂的 scope 属性）；
 * 3) 都没有 → null（调用方跳过飞行只走脉冲）。
 */
export function resolveFlightSource(triggerEl) {
  if (!triggerEl || !triggerEl.closest) return null;
  const card = triggerEl.closest('.reich-product-card');
  if (card) {
    return card.querySelector('.card-fig img') || card.querySelector('.reich-product-image');
  }
  const pdp = triggerEl.closest('[data-product-detail]');
  if (pdp) {
    return pdp.querySelector('.pdp-main img');
  }
  return null;
}

/**
 * 飞行本体。返回进行的 Animation（reduced-motion / 无目标 / 无源 时返回 null）。
 * @param {HTMLImageElement} sourceImg 源图（运行时取 rect，随滚动自然命中）
 * @param {{triggerEl?: Element}} [opts] 触发钮（同钮 cancel 记账键）
 */
export function flyToCart(sourceImg, opts) {
  if (!sourceImg || !document.documentElement) return null;

  // reduced-motion 兜底：整个飞行跳过（到达反馈=徽章脉冲，已在别处即刻触发）
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }

  const target = resolveTarget();
  if (!target) return null;

  const from = sourceImg.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  if (!from.width || !to.width) return null;

  // 同钮 cancel 旧动画重启（连点不叠影）；跨钮互不干扰
  const triggerEl = opts && opts.triggerEl;
  if (triggerEl && flights.has(triggerEl)) {
    const prev = flights.get(triggerEl);
    try { prev.cancel(); } catch (e) { /* 已结束的动画 cancel 无害 */ }
  }

  // 克隆 3:4 缩略（64×85），定位于源图中心
  const W = 64;
  const H = 85;
  const startX = from.left + from.width / 2 - W / 2;
  const startY = from.top + from.height / 2 - H / 2;
  const endX = to.left + to.width / 2 - W / 2;
  const endY = to.top + to.height / 2 - H / 2;
  const dx = endX - startX;
  const dy = endY - startY;

  // v1.1 终裁时长公式：clamp(240ms, d/1.6 px/ms, 400ms)（--dur-flight=0.4s 即上限档）
  const d = Math.hypot(dx, dy);
  const duration = Math.min(400, Math.max(240, d / 1.6));

  const clone = sourceImg.cloneNode(false);
  clone.alt = '';
  clone.width = W;
  clone.height = H;
  Object.assign(clone.style, {
    position: 'fixed',
    left: startX + 'px',
    top: startY + 'px',
    width: W + 'px',
    height: H + 'px',
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
    boxShadow: 'var(--shadow-md)',
    pointerEvents: 'none',
    margin: '0',
    willChange: 'transform, opacity',
    // v1.1 竞态补：低于 --z-toast(600)、高于遮罩(400)——toast 永远可读
    zIndex: 'calc(var(--z-toast, 600) - 1)',
  });
  document.body.appendChild(clone);

  // WAAPI 三帧弧线：中点外抬 36px 抛物线；scale 1→0.25；尾 30% 淡出。
  // 只动 transform/opacity（合成层）——禁 layout 属性动画
  const animation = clone.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1, offset: 0 },
      { transform: `translate(${dx / 2}px, ${dy / 2 - 36}px) scale(0.6)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 1, offset: 0.7 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0, offset: 1 },
    ],
    {
      duration,
      easing: 'cubic-bezier(0.22, 0.7, 0.3, 1)', // 无 overshoot（宪法禁回弹）
      fill: 'forwards',
    }
  );

  if (triggerEl) flights.set(triggerEl, animation);
  const cleanup = () => clone.remove();
  animation.onfinish = cleanup;  // 脉冲已解耦——onfinish 只清场，无接棒动作
  animation.oncancel = cleanup;
  return animation;
}
