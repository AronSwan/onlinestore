/**
 * REICH 商品管理页控制器（M3 · docs/modernization-discussion.md v1.1 §2.4）
 * 页面：/admin.html（仓库根，纯 CSS 自研，复用 css/tokens.css）
 * 三闸（M4）：js/admin/gates.js 承担计算层，本文件负责编排与 DOM。
 *
 * 登录分流守卫：无有效 token 自动跳 /login.html?returnUrl=/admin.html；
 * JWT 15min 过期由 fetch 包装器静默续期（POST /api/auth/refresh）后重放原请求，
 * 续期失败清 storage 踢回登录页。令牌键名与 js/auth.js 登录流一致：
 * localStorage（记住我）或 sessionStorage 的 token / refreshToken / userEmail。
 *
 * 本文件不使用构建链：浏览器原生 ESM。
 */

import {
  evaluateGates,
  gateVerdict,
  factCardComplete,
  renderLintBackdrop,
  describeWarnings,
  escapeHtml,
  COLOR_OPTIONS,
  BAG_TYPE_OPTIONS,
  HARDWARE_OPTIONS,
  OCCASION_OPTIONS,
} from './gates.js';

// ─────────────────────────────────────────────────────────────
// 工具 & 常量
// ─────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

/** 事实卡四选的字段 → 选项来源 */
const FC_GROUPS = [
  { key: 'colorGroup', label: '主色', options: COLOR_OPTIONS },
  { key: 'bagType', label: '包型', options: BAG_TYPE_OPTIONS },
  { key: 'hardware', label: '五金', options: HARDWARE_OPTIONS },
  { key: 'occasion', label: '场合', options: OCCASION_OPTIONS },
];

// ─────────────────────────────────────────────────────────────
// 登录态 & fetch 包装器（JWT 15min + refresh 静默续期）
// ─────────────────────────────────────────────────────────────

function readStorage() {
  // js/auth.js 登录流：勾「记住我」写 localStorage，否则写 sessionStorage
  for (const s of [localStorage, sessionStorage]) {
    if (s.getItem('token')) return s;
  }
  return null;
}

function kickToLogin() {
  const s = readStorage();
  const target = s || localStorage;
  for (const k of ['token', 'refreshToken', 'userId', 'userEmail', 'userLoggedIn']) {
    target.removeItem(k);
  }
  // returnUrl 必须带前导斜杠（/admin.html）——1515d84 白名单只收站内绝对路径,
  // 无斜杠相对值会被拒致登录后落首页(双盲审挂账的静默降级, 此处根治)
  window.location.replace('/login.html?returnUrl=/admin.html');
}

let refreshing = null; // 并发 401 共享同一次续期

async function tryRefresh() {
  const s = readStorage();
  const refreshToken = s ? s.getItem('refreshToken') : null;
  if (!refreshToken) return false;
  if (!refreshing) {
    refreshing = fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (resp) => {
        if (!resp.ok) return false;
        const data = await resp.json();
        // 后端响应形状与 /api/auth/login 一致：{ access_token, refresh_token, … }
        if (!data.access_token || !data.refresh_token) return false;
        s.setItem('token', data.access_token);
        s.setItem('refreshToken', data.refresh_token);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

/**
 * 带 Bearer 与静默续期的 fetch：401 → refresh → 重放原请求一次；再 401 → 踢登录。
 * @returns {Promise<Response>} 非 2xx 也返回 Response（由调用方按业务分支处理）
 */
async function apiFetch(path, options = {}, retried = false) {
  const s = readStorage();
  const token = s ? s.getItem('token') : null;
  const resp = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (resp.status === 401 && !retried) {
    const ok = await tryRefresh();
    if (ok) return apiFetch(path, options, true);
    kickToLogin();
    throw new Error('登录已过期，请重新登录');
  }
  return resp;
}

// ─────────────────────────────────────────────────────────────
// 页面状态
// ─────────────────────────────────────────────────────────────

const state = {
  view: 'list',
  editingId: null, // null = 新建
  products: [],
  factCard: { colorGroup: '', bagType: '', hardware: '', occasion: '' },
  specs: [], // [{ key, value }] 不含 factCard
  mainImage: '',
  imageExists: null, // true / false / null（未检）
  lastGates: null,
  peerPrices: [],
};

// ─────────────────────────────────────────────────────────────
// toast / 顶栏登录态
// ─────────────────────────────────────────────────────────────

let toastTimer = null;
function toast(message, isError = false) {
  const el = $('toast');
  el.textContent = message;
  el.classList.toggle('err', isError);
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), isError ? 6000 : 3200);
}

function initSessionBar() {
  const s = readStorage();
  const email = s ? s.getItem('userEmail') : '';
  $('admin-email').textContent = email || '已登录';
  $('logout-btn').addEventListener('click', () => {
    // 登出：清两处 storage 的登录键，回首页（与主站语义一致）
    for (const store of [localStorage, sessionStorage]) {
      for (const k of ['token', 'refreshToken', 'userId', 'userEmail', 'userLoggedIn']) {
        store.removeItem(k);
      }
    }
    window.location.href = '/';
  });
}

// ─────────────────────────────────────────────────────────────
// 列表视图
// ─────────────────────────────────────────────────────────────

function fmtPrice(v) {
  const n = Number(v);
  return Number.isFinite(n) ? `¥${n % 1 === 0 ? n : n.toFixed(2)}` : '—';
}

function renderList() {
  const tbody = $('product-rows');
  const rows = state.products
    .map((p) => {
      const off = !p.isActive;
      const tags = Array.isArray(p.tags) ? p.tags.join(' · ') : '';
      const cat = p.category && p.category.name ? p.category.name : '—';
      const actions = off
        ? `<button class="link-btn" data-act="edit" data-id="${p.id}">编辑</button>
           <button class="link-btn off" data-act="on" data-id="${p.id}">上架</button>`
        : `<button class="link-btn" data-act="edit" data-id="${p.id}">编辑</button>
           <button class="link-btn" data-act="off" data-id="${p.id}">下架</button>`;
      return `<tr class="${off ? 'row-off' : ''}">
        <td>${
          p.mainImage
            ? `<img class="thumb" src="${escapeHtml(p.mainImage)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`
            : '<div class="thumb"></div>'
        }</td>
        <td class="cell-name">${escapeHtml(p.name)}</td>
        <td class="cell-price">${fmtPrice(p.price)}</td>
        <td>${escapeHtml(String(p.stock ?? '—'))}</td>
        <td>${escapeHtml(cat)}</td>
        <td class="cell-tags">${escapeHtml(tags)}</td>
        <td><span class="badge ${off ? 'badge-off' : 'badge-on'}">${off ? '已下架' : '在售'}</span></td>
        <td><div class="cell-actions">${actions}</div></td>
      </tr>`;
    })
    .join('');
  tbody.innerHTML = rows;
  $('list-empty').classList.toggle('hidden', state.products.length > 0);
  $('list-count').textContent = `共 ${state.products.length} 件 · 下架品灰显`;
}

async function loadList() {
  $('list-count').textContent = '读取中…';
  try {
    const resp = await apiFetch('/api/products/admin/all?page=1&limit=50');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    state.products = data.products || [];
    state.peerPrices = state.products
      .map((p) => Number(p.price))
      .filter((n) => Number.isFinite(n) && n > 0);
    renderList();
  } catch (e) {
    $('list-count').textContent = '列表读取失败，稍后再试。';
    if (String(e.message).includes('登录')) return; // 已踢登录页
    toast('列表读取失败：' + e.message, true);
  }
}

async function toggleActive(id, activate) {
  try {
    if (activate) {
      const resp = await apiFetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      toast('已重新上架。');
    } else {
      // 软删=下架（M2-B6：order_items FK NO ACTION，硬删必败）
      const resp = await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      toast('已下架——前台列表同步消失。');
    }
    await loadList();
  } catch (e) {
    toast((activate ? '上架' : '下架') + '失败：' + e.message, true);
  }
}

// ─────────────────────────────────────────────────────────────
// 编辑视图：表单读写
// ─────────────────────────────────────────────────────────────

function showView(name) {
  state.view = name;
  $('view-list').classList.toggle('hidden', name !== 'list');
  $('view-editor').classList.toggle('hidden', name !== 'edit');
  window.scrollTo(0, 0);
}

function openEditor(product) {
  state.editingId = product ? product.id : null;
  $('editor-title').textContent = product ? `编辑 · ${product.name}` : '新包入住';
  $('f-name').value = product ? product.name : '';
  $('f-desc').value = product ? product.description : '';
  $('f-price').value = product ? product.price : '';
  $('f-original').value = product && product.originalPrice != null ? product.originalPrice : '';
  $('f-stock').value = product ? product.stock : '';
  $('f-category').value = product && product.category && product.category.id ? String(product.category.id) : '';
  $('f-tags').value = product && Array.isArray(product.tags) ? product.tags.join(', ') : '';
  $('f-active').checked = product ? !!product.isActive : true;

  // 事实卡：从 specifications.factCard 弹出（兼容 mainColor 旧拼法）
  const fc = product && product.specifications && product.specifications.factCard;
  state.factCard = {
    colorGroup: fc ? String(fc.colorGroup || fc.mainColor || '') : '',
    bagType: fc ? String(fc.bagType || '') : '',
    hardware: fc ? String(fc.hardware || '') : '',
    occasion: fc ? String(fc.occasion || '') : '',
  };

  // 规格键值行：除 factCard 外全部
  state.specs = [];
  if (product && product.specifications && typeof product.specifications === 'object') {
    for (const [k, v] of Object.entries(product.specifications)) {
      if (k === 'factCard') continue;
      state.specs.push({ key: k, value: typeof v === 'string' ? v : JSON.stringify(v) });
    }
  }

  setMainImage(product ? product.mainImage || '' : '', { openFactCard: false });
  renderSpecRows();
  renderFactCardSummary();
  runGates();
  showView('edit');
}

function collectPayload() {
  const specs = {};
  for (const row of state.specs) {
    const k = row.key.trim();
    if (!k) continue;
    let v = row.value;
    // JSON 列：值若形如 JSON（对象/数组）则存对象，否则存字符串
    const t = v.trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      try {
        v = JSON.parse(t);
      } catch {
        /* 保持字符串 */
      }
    }
    specs[k] = v;
  }
  specs.factCard = { ...state.factCard }; // 事实卡随 specifications 落库

  const price = parseFloat($('f-price').value);
  const original = $('f-original').value.trim();
  const tags = $('f-tags').value
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);

  const payload = {
    name: $('f-name').value.trim(),
    description: $('f-desc').value.trim(),
    price,
    stock: parseInt($('f-stock').value, 10),
    categoryId: $('f-category').value ? parseInt($('f-category').value, 10) : undefined,
    // 主图只走 mainImage（前台渲染字段）。不传 images：该 DTO 字段落库映射
    // products.images 一对多关系（ProductImage 实体），传 URL 字符串会让
    // TypeORM UpdateQueryBuilder 抛「Cannot query across one-to-many」→ 500。
    mainImage: state.mainImage || undefined,
    tags,
    specifications: specs,
    isActive: $('f-active').checked,
  };
  if (original !== '') payload.originalPrice = parseFloat(original);
  return payload;
}

// ─────────────────────────────────────────────────────────────
// 主图：上传 / 预览 / 存在性（HEAD）
// ─────────────────────────────────────────────────────────────

function setMainImage(url, { openFactCard = false } = {}) {
  state.mainImage = url;
  const wrap = $('image-preview');
  const pathEl = $('image-path');
  if (url) {
    $('image-preview-img').src = url;
    wrap.classList.remove('hidden');
    pathEl.textContent = url;
    pathEl.classList.remove('hidden');
    checkImageExists(url);
  } else {
    wrap.classList.add('hidden');
    pathEl.classList.add('hidden');
    state.imageExists = null;
    $('image-alert').classList.add('hidden');
  }
  if (openFactCard) openFactCardModal(); // 第一闸：上传图后弹四选卡
}

/** 图片存在性校验（M4-T1）：主图填好后 HEAD；404 = 红警 */
async function checkImageExists(url) {
  const alertEl = $('image-alert');
  if (!url) {
    alertEl.classList.add('hidden');
    state.imageExists = null;
    return;
  }
  try {
    const resp = await fetch(url, { method: 'HEAD' });
    state.imageExists = resp.ok;
  } catch {
    state.imageExists = false; // 网络层失败按不可达处理（dev 代理下少见）
  }
  alertEl.classList.toggle('hidden', state.imageExists !== false);
  runGates();
}

async function uploadFile(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    toast('这张图超过 5MB 了——压一压再来。', true);
    return;
  }
  const fd = new FormData();
  fd.append('file', file);
  try {
    const resp = await apiFetch('/api/products/upload', { method: 'POST', body: fd });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data.message || `HTTP ${resp.status}`);
    }
    setMainImage(data.path, { openFactCard: true });
    toast('图传好了——先看图把四选点齐。');
  } catch (e) {
    toast('上传失败：' + e.message, true);
  }
}

// ─────────────────────────────────────────────────────────────
// 第一闸：事实卡四选模态
// ─────────────────────────────────────────────────────────────

function buildFactCardOptions() {
  const containers = {
    colorGroup: $('fc-color'),
    bagType: $('fc-bagtype'),
    hardware: $('fc-hardware'),
    occasion: $('fc-occasion'),
  };
  for (const g of FC_GROUPS) {
    containers[g.key].innerHTML = g.options
      .map(
        (opt) =>
          `<button type="button" class="fc-opt${state.factCard[g.key] === opt ? ' sel' : ''}" data-key="${g.key}" data-val="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`,
      )
      .join('');
  }
}

function renderFactCardSummary() {
  const box = $('factcard-summary');
  const fc = state.factCard;
  box.innerHTML = FC_GROUPS.map(
    (g) =>
      `<span class="fc-chip"><b>${g.label}</b>${fc[g.key] ? escapeHtml(fc[g.key]) : '未选'}</span>`,
  ).join('');
  $('fc-missing').classList.toggle('hidden', factCardComplete(fc));
}

function updateFcProgress() {
  const done = FC_GROUPS.filter((g) => state.factCard[g.key]).length;
  $('fc-progress').textContent = `已选 ${done}/4`;
  $('fc-done').disabled = done < 4;
}

function openFactCardModal() {
  if (state.mainImage) {
    $('fc-image').src = state.mainImage;
    $('fc-image-wrap').classList.remove('hidden');
  } else {
    $('fc-image-wrap').classList.add('hidden');
  }
  buildFactCardOptions();
  updateFcProgress();
  $('factcard-modal').classList.remove('hidden');
}

function closeFactCardModal() {
  $('factcard-modal').classList.add('hidden');
  renderFactCardSummary();
  runGates();
}

// ─────────────────────────────────────────────────────────────
// 第二闸（前端侧）：lint 红下划线 + 浮层建议 + 黄警条/红拦条 + sanity
// ─────────────────────────────────────────────────────────────

function syncLintBackdrops(gates) {
  $('backdrop-name').innerHTML = renderLintBackdrop($('f-name').value, gates.lintName);
  $('backdrop-desc').innerHTML = renderLintBackdrop($('f-desc').value, gates.lintDesc);
  // textarea 滚动镜像
  const ta = $('f-desc');
  const bd = $('backdrop-desc');
  ta.onscroll = () => {
    bd.scrollTop = ta.scrollTop;
  };
}

function renderLintPopovers(gates) {
  const fields = [
    { wrap: 'wrap-name', violations: gates.lintName, input: 'f-name', single: true },
    { wrap: 'wrap-desc', violations: gates.lintDesc, input: 'f-desc', single: false },
  ];
  for (const f of fields) {
    const wrap = $(f.wrap);
    let pop = wrap.querySelector('.lint-popover');
    if (f.violations.length === 0) {
      if (pop) pop.remove();
      continue;
    }
    if (!pop) {
      pop = document.createElement('div');
      pop.className = 'lint-popover';
      wrap.appendChild(pop);
    }
    pop.innerHTML = f.violations
      .map(
        (v, i) =>
          `<div class="lint-row"><span class="w">「${escapeHtml(v.word)}」</span>` +
          `<span class="s">${escapeHtml(v.reason || '禁用词')} → 建议「${escapeHtml(v.suggestion || '删掉')}」</span>` +
          `<span class="fix"><button type="button" class="btn" style="padding:2px 12px" data-fix="${i}" data-field="${f.input}" data-word="${escapeHtml(v.word)}" data-sugg="${escapeHtml(v.suggestion || '')}">替换</button></span></div>`,
      )
      .join('');
  }
}

function applyLintFix(inputId, word, suggestion) {
  const el = $(inputId);
  const at = el.value.indexOf(word);
  if (at === -1) return;
  // 词表建议形如「本季 / 新到」（多个可选）：替换时取第一个，避免把斜杠选项原样写进文案
  const replacement = (suggestion || '').split(/\s*\/\s*/)[0].trim();
  el.value = el.value.slice(0, at) + replacement + el.value.slice(at + word.length);
  runGates();
}

function renderGateBars(gates, verdict) {
  const warnBar = $('gate-warn');
  const blockBar = $('gate-block');
  const warnLines = describeWarnings(gates.conflicts.warnings);
  if (warnLines.length > 0) {
    warnBar.classList.remove('hidden');
    warnBar.innerHTML = `<b>黄警（可过闸，发布预览再确认一遍）</b><ul>${warnLines
      .map((l) => `<li>${escapeHtml(l)}</li>`)
      .join('')}</ul>`;
  } else {
    warnBar.classList.add('hidden');
  }

  const blockLines = verdict.blockingReasons.map((r) => r.message);
  const sanityWarn = gates.sanity.warnings.map((w) => w.message);
  if (blockLines.length > 0) {
    blockBar.classList.remove('hidden');
    blockBar.innerHTML = `<b class="why">红拦（改完才亮保存）</b><ul>${blockLines
      .map((l) => `<li>${escapeHtml(l)}</li>`)
      .join('')}</ul>${sanityWarn.length ? `<ul style="color:var(--warning)">${sanityWarn.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>` : ''}`;
  } else {
    blockBar.classList.add('hidden');
  }
}

function runGates() {
  const payload = collectPayload();
  const gates = evaluateGates({
    name: payload.name,
    description: payload.description,
    price: typeof payload.price === 'number' && !Number.isNaN(payload.price) ? payload.price : undefined,
    originalPrice: payload.originalPrice,
    stock: Number.isInteger(payload.stock) ? payload.stock : undefined,
    factCard: state.factCard,
    peerPrices: state.peerPrices,
  });
  state.lastGates = gates;
  const verdict = gateVerdict(gates, { factCard: state.factCard });

  syncLintBackdrops(gates);
  renderLintPopovers(gates);
  renderGateBars(gates, verdict);

  const saveBtn = $('btn-save');
  const hint = $('save-hint');
  saveBtn.disabled = !verdict.canSave;
  if (verdict.canSave) {
    hint.textContent = '三闸前两关都过了——点「过闸」对图朗读，读完才发布。';
    hint.classList.add('ok');
  } else {
    hint.textContent = verdict.blockingReasons[0].message;
    hint.classList.remove('ok');
  }
  return { gates, verdict, payload };
}

// ─────────────────────────────────────────────────────────────
// 规格键值编辑器
// ─────────────────────────────────────────────────────────────

function renderSpecRows() {
  const box = $('spec-rows');
  box.innerHTML = state.specs
    .map(
      (row, i) => `
      <div class="spec-row">
        <input type="text" placeholder="键（如 材质）" value="${escapeHtml(row.key)}" data-spec-idx="${i}" data-spec-k="key">
        <input type="text" placeholder="值（JSON 或文本）" value="${escapeHtml(row.value)}" data-spec-idx="${i}" data-spec-k="value">
        <button type="button" class="del" data-spec-del="${i}" aria-label="删除本行">×</button>
      </div>`,
    )
    .join('');
}

// ─────────────────────────────────────────────────────────────
// 第三闸：对图朗读预览 + 保存
// ─────────────────────────────────────────────────────────────

function openPreview() {
  const { gates, payload } = runGates();
  const btn = $('btn-save');
  if (btn.disabled) return; // 红拦时不该到这（按钮已禁用）

  if (state.mainImage) {
    $('pv-image').src = state.mainImage;
  } else {
    $('pv-image').removeAttribute('src');
  }
  $('pv-name').textContent = payload.name;
  $('pv-desc').textContent = payload.description;
  $('pv-price').innerHTML =
    `${escapeHtml(fmtPrice(payload.price))}` +
    (payload.originalPrice ? `<span class="orig">${escapeHtml(fmtPrice(payload.originalPrice))}</span>` : '');
  $('pv-factcard').innerHTML = FC_GROUPS.map(
    (g) => `${g.label}：${escapeHtml(state.factCard[g.key] || '—')}`,
  ).join(' · ');

  const warnLines = [...describeWarnings(gates.conflicts.warnings), ...gates.sanity.warnings.map((w) => w.message)];
  const warnBox = $('pv-warn');
  if (warnLines.length > 0) {
    warnBox.classList.remove('hidden');
    warnBox.innerHTML = `<b>逐条确认</b><ul>${warnLines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
  } else {
    warnBox.classList.add('hidden');
  }

  $('pv-confirm-box').checked = false;
  $('pv-publish').disabled = true; // 强制勾选才能发布
  $('preview-modal').classList.remove('hidden');
}

async function publish() {
  const { payload } = runGates();
  const isNew = state.editingId == null;
  try {
    const resp = await apiFetch(isNew ? '/api/products' : `/api/products/${state.editingId}`, {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      showBackendErrors(resp.status, data);
      return;
    }
    $('preview-modal').classList.add('hidden');
    toast(isNew ? '发布成功——新包入住了。' : '保存成功。');
    await loadList();
    showView('list');
  } catch (e) {
    if (String(e.message).includes('登录')) return;
    toast('保存失败：' + e.message, true);
  }
}

/** 后端错误字段展示：全局信封 message + details.integrity（复检闸明细） */
function showBackendErrors(status, data) {
  const parts = [];
  if (data && data.message) parts.push(String(data.message));
  const integrity = data && data.details && data.details.integrity;
  if (integrity) {
    for (const b of integrity.blockers || []) parts.push(`红拦：${b.message}`);
    for (const v of integrity.bannedWords || []) {
      parts.push(`禁用词「${v.word}」（${v.reason || ''}）→ 建议「${v.suggestion || '删掉'}」`);
    }
    // 复检被服务端拦下：预览模态收起，红拦条常驻编辑视图（不只 toast 一闪）
    $('preview-modal').classList.add('hidden');
    const blockBar = $('gate-block');
    blockBar.classList.remove('hidden');
    blockBar.innerHTML =
      `<b class="why">服务端复检拦下（第二闸后端侧，HTTP ${status}）</b><ul>` +
      parts.map((l) => `<li>${escapeHtml(l)}</li>`).join('') +
      '</ul>';
  }
  toast(parts.join(' ｜ ') || `保存失败（HTTP ${status}）`, true);
}

// ─────────────────────────────────────────────────────────────
// 事件接线 & 引导
// ─────────────────────────────────────────────────────────────

function bindEvents() {
  $('btn-new').addEventListener('click', () => openEditor(null));
  $('btn-back').addEventListener('click', () => {
    showView('list');
    loadList();
  });
  $('btn-cancel').addEventListener('click', () => {
    showView('list');
    loadList();
  });

  // 列表操作（事件委托）
  $('product-rows').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.act === 'edit') {
      const product = state.products.find((p) => p.id === id);
      if (product) openEditor(product);
    } else if (btn.dataset.act === 'off') {
      toggleActive(id, false);
    } else if (btn.dataset.act === 'on') {
      toggleActive(id, true);
    }
  });

  // 第二闸实时：名称/描述/价格/库存
  $('f-name').addEventListener('input', runGates);
  $('f-desc').addEventListener('input', runGates);
  $('f-price').addEventListener('input', runGates);
  $('f-original').addEventListener('input', runGates);
  $('f-stock').addEventListener('input', runGates);

  // 禁用词浮层的「替换」按钮（事件委托，浮层随 runGates 重建）
  document.addEventListener('click', (e) => {
    const fix = e.target.closest('button[data-fix]');
    if (fix) applyLintFix(fix.dataset.field, fix.dataset.word, fix.dataset.sugg);
  });

  // 上传：点击 + 拖拽
  const dz = $('dropzone');
  const fileInput = $('f-file');
  dz.addEventListener('click', () => fileInput.click());
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener('change', () => uploadFile(fileInput.files[0]));
  ['dragover', 'dragenter'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add('dragover');
    }),
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.remove('dragover');
    }),
  );
  dz.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    uploadFile(file);
  });

  // 事实卡模态
  $('btn-factcard').addEventListener('click', openFactCardModal);
  $('fc-close').addEventListener('click', closeFactCardModal);
  $('fc-cancel').addEventListener('click', closeFactCardModal);
  $('fc-done').addEventListener('click', () => {
    closeFactCardModal();
    toast('事实卡记下了——四选和图对上了。');
  });
  for (const g of FC_GROUPS) {
    const containerId = { colorGroup: 'fc-color', bagType: 'fc-bagtype', hardware: 'fc-hardware', occasion: 'fc-occasion' }[g.key];
    $(containerId).addEventListener('click', (e) => {
      const opt = e.target.closest('.fc-opt');
      if (!opt) return;
      state.factCard[opt.dataset.key] = opt.dataset.val;
      buildFactCardOptions();
      updateFcProgress();
    });
  }

  // 规格键值编辑器
  $('btn-spec-add').addEventListener('click', () => {
    state.specs.push({ key: '', value: '' });
    renderSpecRows();
  });
  $('spec-rows').addEventListener('click', (e) => {
    const del = e.target.closest('button[data-spec-del]');
    if (del) {
      state.specs.splice(Number(del.dataset.specDel), 1);
      renderSpecRows();
      runGates();
    }
  });
  $('spec-rows').addEventListener('input', (e) => {
    const input = e.target.closest('input[data-spec-idx]');
    if (!input) return;
    state.specs[Number(input.dataset.specIdx)][input.dataset.specK] = input.value;
  });

  // 保存 → 第三闸预览 → 发布
  $('btn-save').addEventListener('click', openPreview);
  $('pv-close').addEventListener('click', () => $('preview-modal').classList.add('hidden'));
  $('pv-cancel').addEventListener('click', () => $('preview-modal').classList.add('hidden'));
  $('pv-confirm-box').addEventListener('change', (e) => {
    $('pv-publish').disabled = !e.target.checked;
  });
  $('pv-publish').addEventListener('click', publish);
}

function boot() {
  // 登录分流守卫：无 token 直接踢登录（带 returnUrl 回跳）
  if (!readStorage()) {
    kickToLogin();
    return;
  }
  initSessionBar();
  bindEvents();
  showView('list');
  loadList();
}

boot();
