/*
 * 터치스크린(세로 대형 화면) 화면: 가격판, 상담 사이트(가로형 index.html), 이벤트 배너를 세로로 쌓는다.
 * - 금액은 모두 SBPricing.board()가 계산한 값을 그대로 보여 준다. 여기서 더하거나 나누지 않는다.
 * - 제목·문구·구역 순서는 설정(cfg.kiosk, cfg.promos, cfg.texts)에서 읽는다.
 * - 상담 사이트 안의 관리자 페이지에서 저장하면(storage 이벤트) 가격판과 배너도 바로 바뀐다.
 */
(function (root) {
  'use strict';

  var P = root.SBPricing, Store = root.SBStore, IL = root.SBIllust;
  var doc = root.document;
  var W = 1080, H = 1920; // 기준 화면 크기(px)
  var ZONES = { prices: 'kzPrices', site: 'kzSite', banner: 'kzBanner' };
  var cfg = Store.load();
  var bannerImages = [];   // 실제 파일이 있는 배너 그림 주소
  var slides = [], slideSig = '', slideIdx = 0, slideTimer = null;
  var boardSig = '';

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return doc.getElementById(id); }

  // ---------- 화면 맞춤: 1080 x 1920 기준 화면을 실제 화면에 꽉 차게 확대·축소한다 ----------
  function fit() {
    var el = $('kroot');
    var k = Math.min(root.innerWidth / W, root.innerHeight / H);
    el.style.top = Math.max(0, (root.innerHeight - H * k) / 2) + 'px';
    el.style.transform = 'translateX(-50%) scale(' + k + ')';
  }

  // ---------- 상담 사이트 주소 ----------
  // 개발 폴더에서는 이 화면이 kiosk.html이고 상담 앱이 index.html이다.
  // 터치스크린용 사이트에서는 이 화면이 index.html, 상담 앱이 app.html이다(tools/build-dist.js kiosk).
  function siteUrl() {
    return (/(^|\/)kiosk\.html$/.test(root.location.pathname) ? 'index.html' : 'app.html') + '?kiosk=1';
  }

  // ---------- 전체화면 ----------
  // 브라우저는 사람이 화면을 누른 순간에만 전체화면 전환을 허락한다. 그래서 화면을 손으로 터치할 때마다
  // 전체화면이 아니면 전체화면으로 바꾼다(마우스 클릭에는 반응하지 않아 PC에서 열어 볼 때는 그대로다).
  function isFullscreen() {
    return !!doc.fullscreenElement || !!(root.matchMedia && root.matchMedia('(display-mode: fullscreen)').matches);
  }
  function enterFullscreen() {
    if (isFullscreen()) return;
    var el = doc.documentElement;
    try {
      var done = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : null;
      if (done && done.catch) done.catch(function () { /* 허락되지 않으면 그대로 둔다 */ });
    } catch (e) { /* 지원하지 않는 브라우저 */ }
  }

  // ---------- 구역 순서 ----------
  function applyOrder() {
    var order = String((cfg.kiosk && cfg.kiosk.order) || 'prices-site-banner').split('-');
    if (order.length !== 3 || order.some(function (z) { return !ZONES[z]; })) order = ['prices', 'site', 'banner'];
    order.forEach(function (z, i) {
      var el = $(ZONES[z]);
      (z === 'site' ? el.parentNode : el).style.order = i;
    });
    $('kroot').setAttribute('data-order', order.join('-'));
  }

  // ---------- 가격판 ----------
  function useSale() {
    return !!(cfg.kiosk && cfg.kiosk.boardSale) && Store.activeToday(cfg.discount);
  }
  function priceHtml(c) {
    return (c.onSale ? '<s>' + P.fmt(c.price) + '원</s>' : '') +
      '<span class="kp-price' + (c.onSale ? ' sale' : '') + '"><b>' + P.fmt(c.shown) + '</b><i>원</i></span>';
  }
  function renderPrices() {
    var k = cfg.kiosk || {}, t = cfg.texts;
    var b = P.board(cfg, useSale());
    var sig = JSON.stringify([b, k.boardTitle, k.boardNote, t.brand, t.branch]);
    if (sig === boardSig) return;
    boardSig = sig;

    var cols = [1, 2, 3].map(function (n) {
      var s = P.SLOTS[n];
      return '<div class="kp-col s' + n + '" role="columnheader"><b>' + s.name + '</b><span>' + s.range + '</span>' +
        IL.rail({ ranges: [{ from: s.from, to: s.to, cls: 's' + n }], compact: true }) + '</div>';
    }).join('');
    var rows = b.rows.map(function (r) {
      return '<div class="kp-rowh" role="rowheader"><b>' + r.months + '</b>개월</div>' + r.cells.map(function (c) {
        return '<button class="kp-cell' + (c.onSale ? ' on-sale' : '') + '" data-slot="' + c.slot + '" data-months="' + c.months + '"' +
          ' aria-label="' + c.months + '개월 ' + P.SLOTS[c.slot].name + ' ' + P.fmt(c.shown) + '원, 이 구성으로 견적 열기">' +
          priceHtml(c) +
          (c.months > 1 ? '<span class="kp-month">한 달에 ' + P.fmt(c.monthly) + '원</span>' : '<span class="kp-month"> </span>') +
          '</button>';
      }).join('');
    }).join('');
    var extras = b.lessons.map(function (l) {
      return '<div><span>' + l.min + '분 레슨</span><b>1회 ' + P.fmt(l.pkg) + '원부터</b><small>3개월 이상 가입 시 패키지</small></div>';
    }).join('') +
      '<div><span>일일 이용권</span><b>' + P.fmt(b.daily.shown) + '원</b><small>1일 1회</small></div>' +
      '<div><span>락커</span><b>월 ' + P.fmt(b.lockerFrom) + '원부터</b><small>' + b.lockers.map(function (l) {
        return l.name + ' ' + P.fmt(l.shown) + '원';
      }).join(' · ') + '</small></div>';

    $('kzPrices').innerHTML =
      '<header class="kp-head"><div class="kp-title"><h1>' + esc(k.boardTitle) + '</h1>' +
      (b.anySale ? '<em class="kp-saletag">할인가 적용 중</em>' : '') +
      '<p>' + esc(k.boardNote) + '</p></div>' +
      '<div class="kp-brand"><span class="b24">24H</span><b>' + esc(t.brand) + '</b><i>' + esc(t.branch) + '</i></div></header>' +
      '<div class="kp-grid" role="table" aria-label="' + esc(k.boardTitle) + '">' +
      '<div class="kp-corner" aria-hidden="true">기간<i></i>시간대</div>' + cols + rows + '</div>' +
      '<footer class="kp-extra">' + extras + '</footer>';
  }

  // 가격을 누르면 상담 사이트가 그 시간대·기간으로 이용권 설계를 연다.
  function onPick(el) {
    var frame = $('kzSite'), app = frame && frame.contentWindow && frame.contentWindow.SBApp;
    if (!app || !app.pickMembership) return;
    if (!app.pickMembership(+el.getAttribute('data-slot'), +el.getAttribute('data-months'))) return;
    var zone = frame.parentNode;
    el.classList.add('picked');
    zone.classList.remove('ping');
    void zone.offsetWidth; // 같은 강조 모션을 다시 재생한다
    zone.classList.add('ping');
    root.setTimeout(function () { el.classList.remove('picked'); zone.classList.remove('ping'); }, 1200);
  }

  // ---------- 이벤트 배너 ----------
  function untilText(end) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(end || '');
    return m ? (+m[2]) + '월 ' + (+m[3]) + '일까지' : '';
  }
  function buildSlides() {
    var list = bannerImages.map(function (url) { return { type: 'image', url: url }; });
    (cfg.promos || []).forEach(function (p) {
      if (Store.activeToday(p) && p.text) list.push({ type: 'promo', text: p.text, detail: p.detail || '', until: untilText(p.end) });
    });
    if (!list.length) list.push({ type: 'brand' });
    return list;
  }
  function slideHtml(s, i) {
    var t = cfg.texts, on = i === 0 ? ' on' : '';
    if (s.type === 'image') {
      return '<div class="kb-slide kb-image' + on + '"><img src="' + esc(s.url) + '" alt=""></div>';
    }
    if (s.type === 'promo') {
      return '<div class="kb-slide kb-promo' + on + '"><div class="kb-in"><span class="kb-tag">진행 중인 이벤트</span>' +
        '<h2>' + esc(s.text) + '</h2>' + (s.detail ? '<p>' + esc(s.detail) + '</p>' : '') +
        (s.until ? '<span class="kb-until">' + s.until + '</span>' : '') + '</div>' +
        '<div class="kb-mark"><b>' + esc(t.brand) + '</b> ' + esc(t.branch) + '</div></div>';
    }
    var trust = (t.trust || []).filter(function (x) { return x.on !== false; });
    return '<div class="kb-slide kb-brand' + on + '"><div class="kb-in"><span class="kb-sub">' + esc(t.slogan1) + '</span>' +
      '<h2>' + esc(t.slogan2) + '</h2>' +
      (trust.length ? '<ul class="kb-trust">' + trust.map(function (x) {
        return '<li><b>' + esc(x.big) + '</b><span>' + esc(x.label) + '</span></li>';
      }).join('') + '</ul>' : '') + '</div>' +
      '<p class="kb-call">' + esc((cfg.kiosk || {}).bannerCall) + '</p></div>';
  }
  function renderBanner() {
    var next = buildSlides();
    var k = cfg.kiosk || {}, t = cfg.texts;
    var sig = JSON.stringify([next, t.brand, t.branch, t.slogan1, t.slogan2, t.trust, k.bannerCall, k.bannerSec]);
    if (sig === slideSig) return;
    slideSig = sig;
    slides = next;
    slideIdx = 0;
    $('kzBanner').innerHTML = slides.map(slideHtml).join('') +
      (slides.length > 1 ? '<div class="kb-dots" aria-hidden="true">' + slides.map(function (s, i) {
        return '<i class="' + (i === 0 ? 'on' : '') + '"></i>';
      }).join('') + '</div>' : '');
    root.clearInterval(slideTimer);
    if (slides.length > 1) slideTimer = root.setInterval(nextSlide, Math.max(3, +k.bannerSec || 8) * 1000);
  }
  function nextSlide() { showSlide((slideIdx + 1) % slides.length); }
  function showSlide(i) {
    slideIdx = i;
    var box = $('kzBanner');
    Array.prototype.forEach.call(box.querySelectorAll('.kb-slide'), function (el, n) { el.classList.toggle('on', n === i); });
    Array.prototype.forEach.call(box.querySelectorAll('.kb-dots i'), function (el, n) { el.classList.toggle('on', n === i); });
  }

  // 배너 그림: assets.json의 kiosk-banner-* 가운데 실제 파일이 있는 것만 쓴다.
  function loadBannerImages() {
    if (!root.fetch) return;
    root.fetch('assets/images/assets.json').then(function (r) { return r.json(); }).then(function (m) {
      var keys = Object.keys(m).filter(function (key) { return key.indexOf('kiosk-banner-') === 0; }).sort();
      var left = keys.length, ok = {};
      if (!left) return;
      keys.forEach(function (key) {
        var img = new root.Image();
        function done() {
          if (--left) return;
          bannerImages = keys.filter(function (x) { return ok[x]; }).map(function (x) { return 'assets/images/' + m[x].path; });
          renderBanner();
        }
        img.onload = function () { ok[key] = true; done(); };
        img.onerror = done;
        img.src = 'assets/images/' + m[key].path;
      });
    }).catch(function () { /* 목록이 없으면 문구 배너만 쓴다 */ });
  }

  // ---------- 설정 반영 ----------
  function refresh() {
    cfg = Store.load();
    applyOrder();
    renderPrices();
    renderBanner();
  }

  function keepAwake() {
    try {
      if (root.navigator.wakeLock && doc.visibilityState === 'visible') {
        root.navigator.wakeLock.request('screen').catch(function () {});
      }
    } catch (e) { /* 지원하지 않는 기기 */ }
  }

  function boot() {
    // 이 화면이 다른 화면 안에 들어가 있으면(잘못 겹쳐 열린 경우) 상담 사이트를 또 넣지 않는다.
    if (root.self === root.top) $('kzSite').src = siteUrl();
    fit();
    refresh();
    loadBannerImages();
    keepAwake();
    root.addEventListener('resize', fit);
    // 상담 사이트(같은 주소의 다른 문서)의 관리자 페이지에서 저장하면 여기에도 바로 반영한다.
    root.addEventListener('storage', function (ev) {
      if (!ev.key || ev.key.indexOf('swingblack.') === 0) refresh();
    });
    // 날짜가 바뀌면 기간이 끝난 이벤트와 할인가를 내린다.
    root.setInterval(refresh, 5 * 60 * 1000);
    doc.addEventListener('visibilitychange', keepAwake);
    doc.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });
    doc.addEventListener('pointerup', function (ev) { if (ev.pointerType !== 'mouse') enterFullscreen(); }, true);
    doc.addEventListener('fullscreenchange', fit);
    doc.addEventListener('click', function (ev) {
      var el = ev.target.closest ? ev.target.closest('.kp-cell') : null;
      if (el) onPick(el);
    });
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();

  // 오프라인에서도 동작하도록 서비스 워커를 등록한다(https 또는 localhost에서만 동작).
  if ('serviceWorker' in root.navigator && /^https?:$/.test(root.location.protocol)) {
    root.addEventListener('load', function () {
      root.navigator.serviceWorker.register('sw.js').catch(function () { /* 등록 실패 시 온라인으로만 동작 */ });
    });
  }

  // 점검 스크립트에서 쓴다.
  root.SBKiosk = {
    refresh: refresh, showSlide: showSlide, enterFullscreen: enterFullscreen, isFullscreen: isFullscreen,
    state: function () { return { slides: slides, index: slideIdx, order: $('kroot').getAttribute('data-order'), sale: useSale() }; }
  };
})(typeof self !== 'undefined' ? self : this);
