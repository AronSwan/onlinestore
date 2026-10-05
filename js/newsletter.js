/**
 * B9 · 订阅表单处理器（M7 诚实包，2026-10-05）
 *
 * 修复实锤（北京席 P2）：订阅表单原先无 JS 处理器，原生 GET 提交整页刷新——
 * "比静默更深"。本模块接管 submit：
 *   - preventDefault（不再整页刷新/裸 GET）
 *   - 邮箱格式校验：不过 → 行内提示（aria-live），不弹窗不惊动
 *   - 通过 → localStorage 记录（演示站本地闭环，诚实：不上后端假装发信）
 *   - 统一 toast 反馈（js/shared/toast.js——与加购/收藏同位置同时长同动画，只换文案）
 *
 * 文案过 voice-sheet：从容、无促销词、无感叹号。
 * 承诺具体化（香港席 P3）："每月一封"——具体承诺才可信。
 */
import { showToast } from './shared/toast.js';

const STORAGE_KEY = 'reich_newsletter_email';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setupNewsletter() {
  const form = document.querySelector('form[aria-labelledby="newsletter-heading"]');
  const input = document.getElementById('newsletter-email');
  if (!form || !input) return; // 非首页/结构变动时静默退场（健壮：失败路径不抛错）

  // 行内状态位（aria-describedby 已指向 newsletter-description，复用其公告语义）
  const status = document.getElementById('newsletter-description');

  form.addEventListener('submit', (e) => {
    e.preventDefault(); // B9 核心：不再原生 GET 刷新

    const email = input.value.trim();
    if (!EMAIL_RE.test(email)) {
      input.setAttribute('aria-invalid', 'true');
      if (status) {
        status.textContent = '这个邮箱好像少了个 @ 或点点——再看一眼？';
      }
      input.focus();
      return;
    }

    input.removeAttribute('aria-invalid');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, subscribedAt: new Date().toISOString() }));
    } catch (err) {
      console.warn('订阅记录写入失败（存储满/隐私模式）——反馈照常给出', err);
    }

    // 统一 toast 语系：同位置同时长同进出动画，只换文案
    showToast({
      message: '收到，偶尔见。',
      sub: '每月一封，下个月见——想退订随时说一声。',
      confirmText: '好呀',
      dismissText: '继续逛',
    });

    if (status) {
      status.textContent = '我们承诺保护您的隐私，不会向第三方分享您的信息。';
    }
    input.value = '';
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupNewsletter);
} else {
  setupNewsletter();
}
