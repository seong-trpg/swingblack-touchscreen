// 앱 시작과 오프라인 캐시 등록
(function (root) {
  'use strict';

  function boot() { root.SBApp.boot(); }
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // 오프라인에서도 동작하도록 서비스 워커를 등록한다(https 또는 localhost에서만 동작).
  if ('serviceWorker' in root.navigator && /^https?:$/.test(root.location.protocol)) {
    root.addEventListener('load', function () {
      root.navigator.serviceWorker.register('sw.js').catch(function () { /* 등록 실패 시 온라인으로만 동작 */ });
    });
  }
})(typeof self !== 'undefined' ? self : this);
