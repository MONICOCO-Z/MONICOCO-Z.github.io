// Service Worker for 全球市场监控 PWA
// 策略：优先网络，离线时回落到缓存（保证数据最新）

const CACHE_NAME = 'market-monitor-v1';

// 只缓存应用外壳（HTML 和图标），数据接口不缓存
const SHELL = [
  './全球市场监控.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
];

// 安装：缓存应用外壳
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧版本缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// Fetch：网络优先策略
// - 数据接口（eastmoney / gtimg / fundgz）：纯网络，不缓存
// - 应用外壳：网络优先，失败回落缓存
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // 数据 API 请求：直接走网络，不经过缓存（保证实时性）
  if (url.includes('eastmoney.com') ||
      url.includes('gtimg.cn') ||
      url.includes('fundgz.1234567.com.cn') ||
      url.includes('fundf10.eastmoney.com') ||
      url.includes('cdn.tailwindcss.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 应用外壳：网络优先，离线时回落缓存
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // 缓存成功的响应
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(function() {
        return caches.match(event.request);
      })
  );
});
