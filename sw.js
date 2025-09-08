// Service Worker for Caddy Style Shopping Site
const CACHE_NAME = 'caddy-shop-v1.0.0';
const OFFLINE_URL = '/offline.html';

// 需要缓存的核心资源
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/image-optimization.js',
  '/js/utils.js',
  '/js/cart.js',
  '/js/lazy-loader.js',
  '/offline.html'
];

// 需要缓存的CSS和图片资源模式
const CACHEABLE_PATTERNS = [
  /\.css$/,
  /\.js$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.svg$/,
  /\.webp$/,
  /\.woff2?$/,
  /\.ttf$/
];

// 安装事件 - 预缓存核心资源
self.addEventListener('install', event => {
  console.log('[SW] 安装中...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] 预缓存核心资源');
        return cache.addAll(CORE_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('[SW] 安装完成');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] 安装失败:', error);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('[SW] 激活中...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log('[SW] 删除旧缓存:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] 激活完成');
        return self.clients.claim();
      })
  );
});

// 获取事件 - 实现缓存策略
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 只处理同源请求
  if (url.origin !== location.origin) {
    return;
  }

  // 处理导航请求（HTML页面）
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // 处理静态资源请求
  if (shouldCache(request)) {
    event.respondWith(handleAssetRequest(request));
    return;
  }
});

// 处理导航请求（网络优先策略）
async function handleNavigationRequest(request) {
  try {
    // 尝试从网络获取
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // 缓存成功的响应
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    throw new Error('网络响应不正常');
  } catch (error) {
    console.log('[SW] 网络请求失败，尝试缓存:', error);

    // 尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // 返回离线页面
    return caches.match(OFFLINE_URL);
  }
}

// 处理静态资源请求（缓存优先策略）
async function handleAssetRequest(request) {
  try {
    // 先尝试从缓存获取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // 后台更新缓存
      updateCache(request);
      return cachedResponse;
    }

    // 缓存中没有，从网络获取
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // 缓存新资源
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] 资源请求失败:', request.url, error);

    // 如果是图片请求失败，返回占位符
    if (request.destination === 'image') {
      return new Response(
        `<svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f3f4f6"/>
          <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#9ca3af" text-anchor="middle" dy=".3em">Image unavailable</text>
        </svg>`,
        {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache'
          }
        }
      );
    }

    throw error;
  }
}

// 后台更新缓存
async function updateCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // 静默失败，不影响用户体验
    console.log('[SW] 后台更新缓存失败:', request.url);
  }
}

// 判断是否应该缓存该请求
function shouldCache(request) {
  const url = new URL(request.url);

  // 检查文件扩展名
  return CACHEABLE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// 监听消息事件
self.addEventListener('message', event => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_CACHE_INFO':
      getCacheInfo().then(info => {
        event.ports[0].postMessage(info);
      });
      break;

    case 'CLEAR_CACHE':
      clearCache().then(success => {
        event.ports[0].postMessage({ success });
      });
      break;

    case 'FORCE_UPDATE':
      forceUpdate().then(success => {
        event.ports[0].postMessage({ success });
      });
      break;
  }
});

// 获取缓存信息
async function getCacheInfo() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();

    return {
      cacheName: CACHE_NAME,
      cacheSize: keys.length,
      cachedUrls: keys.map(request => request.url)
    };
  } catch (error) {
    return { error: error.message };
  }
}

// 清理缓存
async function clearCache() {
  try {
    const deleted = await caches.delete(CACHE_NAME);
    console.log('[SW] 缓存清理结果:', deleted);
    return deleted;
  } catch (error) {
    console.error('[SW] 清理缓存失败:', error);
    return false;
  }
}

// 强制更新
async function forceUpdate() {
  try {
    // 清理旧缓存
    await caches.delete(CACHE_NAME);

    // 重新缓存核心资源
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);

    console.log('[SW] 强制更新完成');
    return true;
  } catch (error) {
    console.error('[SW] 强制更新失败:', error);
    return false;
  }
}

// 错误处理
self.addEventListener('error', event => {
  console.error('[SW] 全局错误:', event.error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('[SW] 未处理的Promise拒绝:', event.reason);
});

console.log('[SW] Service Worker 已加载');