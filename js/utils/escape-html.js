/**
 * HTML 转义工具（F7 渲染层转义）
 *
 * 用途：所有把业务数据（商品名、地址、订单字段等）拼进 innerHTML 模板的
 * 渲染点，插值一律包一层 escapeHtml()，防止数据中的 HTML 字符被浏览器
 * 解释为标签/属性（存储型/反射型 XSS 的渲染层兜底）。
 *
 * 覆盖字符：& < > " '（单引号转义为 &#39;，保证单/双引号属性上下文都安全）
 *
 * 加载方式：经典 <script> 直接加载（必须在 cart.js / orders.js /
 * profile-manager.js 之前）；经典脚本与 ES module 均通过
 * window.escapeHtml 使用（module 内裸标识符 escapeHtml 也会解析到
 * window.escapeHtml，双语境通用）。
 */

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }
    return String(value).replace(/[&<>"']/g, function (ch) {
        switch (ch) {
            case '&':
                return '&amp;';
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
            case '"':
                return '&quot;';
            case "'":
                return '&#39;';
            default:
                return ch;
        }
    });
}

// 经典 + module 双语境：module 脚本内裸引用 escapeHtml 时同样取到该全局
if (typeof window !== 'undefined') {
    window.escapeHtml = escapeHtml;
}
