/**
 * F3 · PostCSS 管线（Tailwind 接入）
 *
 * 坑位说明（vite build 实测，见 docs/f3-build-switch-plan.md 坑 5）：
 * Vite 会把 HTML 里的 <style> 块（包括 CDN 专用的 <style type="text/tailwindcss">）
 * 抽成 html-proxy CSS 走本管线。这种块含 `@layer utilities` 但没有 `@tailwind` 指令，
 * 若 tailwindcss 插件无条件生效，会在 normalizeTailwindDirectives 处直接报错炸构建：
 *   "`@layer utilities` is used but no matching `@tailwind utilities` directive is present"
 * 因此 tailwindcss 以「指令探测」包装：仅当 CSS 里出现 @tailwind/@apply 等 Tailwind
 * 指令时才真正运行——html-proxy 块原样透传给 preset-env/cssnano（与接入前行为一致），
 * 切换日的构建入口 CSS（含 @tailwind 指令）正常编译。
 *
 * 插件顺序（Tailwind 官方推荐序）：
 *   1. postcss-import  —— @import 内联最先（当前 css/ 无 @import，为切换日入口预留）
 *   2. tailwindcss     —— 见上，指令探测版
 *   3. postcss-preset-env —— 语法降级/nesting 展开，在 Tailwind 之后
 *   4. autoprefixer    —— 前缀兜底（preset-env 内置 autoprefixer 已跑过，重复执行幂等）
 *   5. cssnano         —— 压缩收尾
 */
import postcssImport from 'postcss-import';
import tailwindcss from 'tailwindcss';
import postcssPresetEnv from 'postcss-preset-env';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';

/** 只认 Tailwind 专属指令。@layer 是原生 CSS（html-proxy 块在用），故意不列入。 */
const TAILWIND_DIRECTIVES = new Set([
  'tailwind',
  'apply',
  'screen',
  'utility',
  'plugin',
  'config',
  'variants',
  'responsive',
]);

function hasTailwindDirective(root) {
  let found = false;
  root.walkAtRules((node) => {
    if (TAILWIND_DIRECTIVES.has(node.name.toLowerCase())) {
      found = true;
      return false; // 提前结束 walk
    }
  });
  return found;
}

/** 指令探测版 tailwindcss：无 Tailwind 指令的 CSS 零介入。 */
const tailwindcssIfDirective = {
  postcssPlugin: 'tailwindcss-if-directive',
  async Once(root, helpers) {
    if (!hasTailwindDirective(root)) return;
    // tailwindcss() 返回 { postcssPlugin, plugins: [fn] }（node_modules/tailwindcss/lib/plugin.js）
    const tw = tailwindcss(); // 无参调用 → 按项目根目录解析 tailwind.config.js
    for (const plugin of tw.plugins) {
      await plugin(root, helpers.result);
    }
  },
};

export default {
  plugins: [
    postcssImport(),
    tailwindcssIfDirective,
    // ↓ 以下与 F3 接入前的配置逐字等价，仅从对象形式改为实例形式
    postcssPresetEnv({
      stage: 3,
      features: {
        'nesting-rules': true,
        'custom-properties': true,
        'custom-media-queries': true,
      },
      autoprefixer: {
        grid: true,
      },
    }),
    autoprefixer(),
    cssnano({ preset: 'default' }),
  ],
};
