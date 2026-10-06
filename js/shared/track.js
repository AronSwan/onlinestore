/**
 * track — 本地事件流埋点（国际挑剔用户批 A 档 7 · PM"仪表盘装传感器"，2026-10-06）
 *
 * 规格（裁决书：10 行单函数 + localStorage 事件流）：
 *   - track(event, props) → 追加一条 { t, event, props } 进 localStorage 'reich_events'；
 *   - 上限 200 条 FIFO（超出丢最老）；
 *   - 纯本地（隐私页"没有第三方分析"口径自洽——浏览器站点数据清除即删）；
 *   - 静默降级：隐私模式/配额异常吞掉，绝不影响宿主功能；
 *   - 零 console（console 纪律 A 档 16 同批）。
 *
 * 六点位接线（事件名 · 挂点）：
 *   ProductViewed    product.js PDP 渲染完成
 *   AddToCart        cart.js addToCart 成功（含 merged 场景）
 *   CartOpened       cart.js CartUI.show()
 *   CheckoutClicked  cart.js 结算钮点击（拦截前）
 *   Wishlisted       wishlist.js addToWishlist
 *   SearchSubmitted  site-header.js 增强搜索 search 事件
 *   CheckoutIntercepted cart.js 结算拦截模态曝光（A/B arm 字段，A 档 8）
 */

const KEY = 'reich_events';
const MAX = 200;

export function track(event, props) {
  try {
    var list = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!Array.isArray(list)) list = [];
    list.push({ t: Date.now(), event: String(event), props: props || {} });
    while (list.length > MAX) list.shift(); // FIFO：第 201 条进来丢最老
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    /* 隐私模式/配额满：埋点不可连累宿主功能 */
  }
}
