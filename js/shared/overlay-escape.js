/**
 * overlay-escape — Escape 键全站分发器（大师会诊批一·交互席裁决 2026-10-06）
 *
 * 背景：购物袋（cart.js）/用户菜单（navigation-icons.js）/移动菜单（site-header.js）/
 * 订单详情弹窗（orders.js）/搜索条（site-header.js）各自监听 document keydown 关 ESC，
 * N 份监听 N 份判断——同一键位语义散落五处。本模块收敛为单一 keydown 监听 + 注册表：
 * 各浮层启动时注册回调，回调自行判断"我是否打开"，只有真正关掉东西才返回 true，
 * 分发器收到第一个 true 即停（浮层叠开时按注册序逐层收）。
 *
 * 形态：ES module；首次 import 即挂 document keydown 监听（一次性）。
 * 契约：回调返回 true=已消费（我关了），false/undefined=与我无关。
 * 无需注销（注册方均为页面级单例浮层）；如需动态注销，unregisterOverlayEscape 可用。
 */

const registry = new Map(); // name → onClose

function onKeydown(e) {
  if (e.key !== 'Escape') return;
  // 按注册序调用；第一个真正关闭浮层的回调消费此键，停止分发
  for (const handler of registry.values()) {
    let consumed = false;
    try {
      consumed = handler(e) === true;
    } catch (error) {
      console.error('overlay-escape: 回调执行失败:', error);
    }
    if (consumed) return;
  }
}

let listening = false;

/**
 * 注册一个浮层的 ESC 关闭回调。
 * @param {string} name 浮层名（唯一键，重复注册覆盖旧回调）
 * @param {(e: KeyboardEvent) => boolean} onClose 返回 true 表示本次 ESC 已被该浮层消费
 */
export function registerOverlayEscape(name, onClose) {
  if (typeof onClose !== 'function') return;
  if (!listening) {
    document.addEventListener('keydown', onKeydown);
    listening = true;
  }
  registry.set(name, onClose);
}

/** 注销（浮层销毁时用；页面级单例通常不需要） */
export function unregisterOverlayEscape(name) {
  registry.delete(name);
}
