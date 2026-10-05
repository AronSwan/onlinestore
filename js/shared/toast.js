/**
 * toast — 统一反馈组件（B1 双选 · 蓝图 M3；B9 订阅 / C6 收藏后续复用同件）
 *
 * 规格（罗马动线三条 + v1.1 竞态补）：
 *   - 停留 ≥5s（5200ms），hover 暂停计时、移出续走；
 *   - 双选不是双主语："去结算"（ink 实底主钮）= 打开购物袋面板（不撞"未开通"死胡同，
 *     面板内结算钮才给诚实提示）；"继续逛"（文字钮）= 关闭即走；
 *   - 队列最多 2 条：第三条进来最老的立即让位（连点多商品不叠罗汉）；
 *   - z-index = var(--z-toast)（600）：压过购物袋遮罩(400)，也压过飞行 clone(599)；
 *   - reduced-motion：无进出动画，直接呈现/移除（功能性不变）。
 *
 * 样式随件注入（一次性 <style>，用设计令牌）——组件自包含，消费方零 CSS 接线：
 *   index/orders/product 现挂；login/profile 的订阅/收藏反馈（M6/M7）引入本模块即可。
 *
 * 对外 API：
 *   showToast({ message, sub, confirmText, onConfirm, dismissText, duration })
 */

const TOAST_MAX = 2;          // 队列上限（v1.1 遗漏处置 6）
const DEFAULT_DURATION = 5200; // ≥5s（罗马：移动端单手 4s 不够）
const CONTAINER_ID = 'reich-toast-container';
const STYLE_ID = 'reich-toast-style';

const liveToasts = []; // 活动队列（FIFO），超出上限从队头让位

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
#${CONTAINER_ID} {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: var(--z-toast, 600);
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}
@media (max-width: 639px) {
  #${CONTAINER_ID} { right: 16px; left: 16px; bottom: 16px; max-width: none; }
}
.reich-toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 16px;
  background: var(--bg-base, #fff);
  color: var(--ink, #1a202c);
  border: 1px solid var(--line, #e5e2dc);
  border-radius: var(--radius-md, 12px);
  box-shadow: var(--shadow-lg);
  opacity: 0;
  transform: translateY(8px);
  transition: opacity var(--dur-fast, 0.2s) var(--ease-lux, ease-in-out),
              transform var(--dur-fast, 0.2s) var(--ease-lux, ease-in-out);
}
.reich-toast.in { opacity: 1; transform: translateY(0); }
.reich-toast.out { opacity: 0; transform: translateY(8px); }
.reich-toast-main { flex: 1; min-width: 0; }
.reich-toast-message { margin: 0; font-size: var(--text-body, 0.9375rem); font-weight: 500; line-height: 1.45; }
.reich-toast-sub { margin: 2px 0 0; font-size: var(--text-xs, 0.75rem); color: var(--text-secondary); line-height: 1.4; }
.reich-toast-confirm {
  flex-shrink: 0;
  border: none;
  border-radius: var(--radius-pill, 999px);
  padding: 9px 18px;
  background: var(--ink, #1a202c);
  color: #fff;
  font-size: var(--text-small, 0.8125rem);
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: background var(--dur-fast, 0.2s) var(--ease-lux, ease-in-out);
}
.reich-toast-confirm:hover { background: var(--candy-blush-ink, #B93A54); }
.reich-toast-confirm:focus-visible,
.reich-toast-dismiss:focus-visible {
  outline: 2px solid var(--focus-ring-color, #B93A54);
  outline-offset: 2px;
}
.reich-toast-dismiss {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 6px 8px;
  color: var(--text-secondary);
  font-size: var(--text-small, 0.8125rem);
  cursor: pointer;
  border-radius: var(--radius-sm, 4px);
  transition: color var(--dur-fast, 0.2s) var(--ease-lux, ease-in-out);
}
.reich-toast-dismiss:hover { color: var(--candy-blush-ink, #B93A54); }
@media (prefers-reduced-motion: reduce) {
  .reich-toast { transition: none; }
}
@media print {
  #${CONTAINER_ID} { display: none; }
}`;
  document.head.appendChild(style);
}

function ensureContainer() {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  return el;
}

function reducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

/**
 * 弹一条统一反馈 toast。
 * @param {object} opts
 *   message      主文案（必填）
 *   sub          次行小字（可选）
 *   confirmText  主钮文字（默认"去结算"；传 null 不渲染主钮——纯通知语态）
 *   onConfirm    主钮回调（默认无 → 只关闭）
 *   dismissText  文字钮（默认"继续逛"；传 null 不渲染——纯通知语态）
 *   duration     停留毫秒（默认 5200，下限 5000——罗马红线）
 * @returns {Element} toast 元素（测试/扩展用）
 *
 * 大师会诊批一（2026-10-06）toast 四物种归一：cart.js showNotification /
 * orders.js showToast / navigation-icons.js showNotification 三处私货 toast
 * 改调本组件。纯通知（无动作）语态经 confirmText:null + dismissText:null 进入——
 * 样式语系统一（同底/同圆角/同进出/同位置），只保留各自文案。
 */
export function showToast(opts) {
  const o = opts || {};
  const message = String(o.message || '');
  if (!message) return null;

  ensureStyle();
  const container = ensureContainer();

  // 队列上限：最多 2 条，第三条进来最老的立即让位（不留动画时间——让位即退场）
  while (liveToasts.length >= TOAST_MAX) {
    const oldest = liveToasts.shift();
    if (oldest) oldest.destroy(true);
  }

  const el = document.createElement('div');
  el.className = 'reich-toast';

  const main = document.createElement('div');
  main.className = 'reich-toast-main';
  const msg = document.createElement('p');
  msg.className = 'reich-toast-message';
  msg.textContent = message; // textContent 天然转义，不进 innerHTML
  main.appendChild(msg);
  if (o.sub) {
    const sub = document.createElement('p');
    sub.className = 'reich-toast-sub';
    sub.textContent = String(o.sub);
    main.appendChild(sub);
  }
  el.appendChild(main);

  let done = false;
  let timer = null;
  let remaining = Math.max(5000, Number(o.duration) || DEFAULT_DURATION);
  let startedAt = 0;

  const dismiss = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    const i = liveToasts.findIndex((t) => t.el === el);
    if (i > -1) liveToasts.splice(i, 1);
    if (reducedMotion()) {
      el.remove();
    } else {
      el.classList.remove('in');
      el.classList.add('out');
      el.addEventListener('transitionend', () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 400); // transitionend 兜底
    }
  };

  // 纯通知语态（confirmText/dismissText 传 null）：不渲染两钮（批一 toast 归一）
  if (o.confirmText !== null) {
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'reich-toast-confirm';
    confirmBtn.textContent = o.confirmText || '去结算';
    confirmBtn.addEventListener('click', () => {
      try { if (typeof o.onConfirm === 'function') o.onConfirm(); } finally { dismiss(); }
    });
    el.appendChild(confirmBtn);
  }

  if (o.dismissText !== null) {
    const dismissBtn = document.createElement('button');
    dismissBtn.type = 'button';
    dismissBtn.className = 'reich-toast-dismiss';
    dismissBtn.textContent = o.dismissText || '继续逛';
    dismissBtn.addEventListener('click', dismiss);
    el.appendChild(dismissBtn);
  }

  // hover 暂停 / 移出续走（罗马：移动端单手 4s 不够 + 桌面端读完再走）
  el.addEventListener('mouseenter', () => {
    clearTimeout(timer);
    remaining -= Date.now() - startedAt;
    if (remaining < 0) remaining = 300; // 悬停超时：移出后给 300ms 缓冲退场
  });
  el.addEventListener('mouseleave', () => {
    startedAt = Date.now();
    timer = setTimeout(dismiss, remaining);
  });

  container.appendChild(el);
  liveToasts.push({ el, destroy: (immediate) => { if (immediate) { done = true; clearTimeout(timer); el.remove(); } else { dismiss(); } } });

  // 进场（reduced-motion 直接呈现）
  if (reducedMotion()) {
    el.classList.add('in');
  } else {
    requestAnimationFrame(() => el.classList.add('in'));
  }

  startedAt = Date.now();
  timer = setTimeout(dismiss, remaining);
  return el;
}

/**
 * 加购反馈专用语系（B1）——cart.js 调用；文案过 voice-sheet 禁促销词。
 * "去结算"语义 = 打开购物袋面板（罗马裁决），面板内结算钮才给"未开通"诚实提示。
 */
export function showCartToast({ name, merged, quantity, onCheckout }) {
  const label = name ? `「${name}」` : '这只包';
  return showToast({
    message: merged
      ? `${label}又放进一只，袋里现在 ${quantity} 只。`
      : `${label}放进袋子了。`,
    sub: '已含运费 · 30 天可退',
    confirmText: '去结算',
    onConfirm: onCheckout,
    dismissText: '继续逛',
  });
}
