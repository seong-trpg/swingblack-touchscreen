/*
 * 앱 뼈대: 상태, 화면 전환, 상단 바, 모달·토스트·자막, 무조작 초기화, 이미지 확인.
 * 화면은 SBApp.screens에, 버튼 동작은 SBApp.actions에 등록한다.
 */
(function (root) {
  'use strict';

  var P = root.SBPricing, Store = root.SBStore, V = root.SBVoice, IL = root.SBIllust;
  var doc = root.document;
  var cfg = Store.load();
  var $app, $modal, $toast, $idle;
  var reduced = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var muted = false;
  var rollPrev = {};
  var lastScrollKey = null;
  var lastActive = Date.now();
  var toastTimer = null;
  var assets = { manifest: {}, ok: {} };
  var capText = '', capLive = false;
  var CAP_EMPTY = '화면을 고르면 음성과 자막으로 안내합니다.';
  // 터치스크린(kiosk.html)의 가로 구역 안에서 열렸는지. 주소에 ?kiosk=1이 붙어 있으면 가로형 배치(css의 html.kiosk)를 쓴다.
  var kiosk = /[?&]kiosk=1(&|$)/.test(root.location.search);
  if (kiosk) doc.documentElement.classList.add('kiosk');

  function freshBuilder() {
    return {
      step: 1, tab: 'membership',
      slot: null, kind: null, months: null, days: 30, coupon: null,
      lessonMin: null, lessonCount: null, lessonDone: false,
      locker: null, lockerDone: false,
      editing: null,
      walk: false // '다른 구성 더 담기' 뒤 1단계부터 한 단계씩 넘어가는 중인지
    };
  }
  function freshSession() {
    return {
      screen: 'start', hist: [], b: freshBuilder(), compare: [],
      discountOn: false, heard: {}, proId: null, pick: null, intro: 0
    };
  }
  var S = freshSession();

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n, cls) {
    return '<span class="money ' + (cls || '') + '"><b>' + P.fmt(n) + '</b><i>원</i></span>';
  }
  // 받침에 따라 조사를 고른다: josa('A안', '이', '가') → '이'
  function josa(word, withFinal, withoutFinal) {
    var code = String(word).charCodeAt(String(word).length - 1);
    if (code >= 0xAC00 && code <= 0xD7A3) return (code - 0xAC00) % 28 ? withFinal : withoutFinal;
    return withoutFinal;
  }
  function toMin(hhmm) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || '');
    return m ? (+m[1]) * 60 + (+m[2]) : 0;
  }
  function hm(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  // ----- 프로 근무표: 요일별 레슨 가능 시간 -----
  var DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
  var DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

  function mergeRanges(list) {
    var sorted = list.slice().sort(function (a, b) { return a[0] - b[0]; });
    var out = [];
    sorted.forEach(function (r) {
      var last = out[out.length - 1];
      if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
      else out.push([r[0], r[1]]);
    });
    return out;
  }
  function schedule() {
    var groups = [], bySig = {};
    DAY_ORDER.forEach(function (d) {
      var per = cfg.pros.map(function (p) {
        var off = (p.off || []).indexOf(d) >= 0;
        return { name: p.name, off: off, range: off ? null : [toMin(p.start), toMin(p.end)] };
      });
      var working = per.filter(function (x) { return x.range; }).map(function (x) { return x.range; });
      var overlap = [];
      for (var i = 0; i < working.length; i++) {
        for (var j = i + 1; j < working.length; j++) {
          var a = Math.max(working[i][0], working[j][0]), b = Math.min(working[i][1], working[j][1]);
          if (b > a) overlap.push([a, b]);
        }
      }
      var sig = JSON.stringify(per);
      if (!bySig[sig]) {
        bySig[sig] = { days: [], per: per, ranges: mergeRanges(working), overlap: mergeRanges(overlap) };
        groups.push(bySig[sig]);
      }
      bySig[sig].days.push(d);
    });
    groups.forEach(function (g) {
      g.dayLabel = g.days.map(function (d) { return DAY_NAMES[d]; }).join('·');
      g.label = g.ranges.length
        ? g.ranges.map(function (r) { return hm(r[0]) + '~' + hm(r[1]); }).join(', ')
        : '레슨 없음';
    });
    return groups;
  }
  function scheduleSummary() {
    return schedule().map(function (g) { return g.dayLabel + ' ' + g.label; }).join(' / ');
  }

  // ----- 이미지: 실제 파일이 있으면 사진을, 없으면 일러스트를 쓴다 -----
  function loadAssets() {
    if (!root.fetch) return;
    root.fetch('assets/images/assets.json').then(function (r) { return r.json(); }).then(function (m) {
      assets.manifest = m;
      var keys = Object.keys(m), left = keys.length, found = 0;
      keys.forEach(function (k) {
        var img = new root.Image();
        img.onload = function () { assets.ok[k] = true; found++; done(); };
        img.onerror = function () { assets.ok[k] = false; done(); };
        img.src = 'assets/images/' + m[k].path;
      });
      function done() { if (--left === 0 && found) render(); }
    }).catch(function () { /* 목록이 없으면 일러스트만 쓴다 */ });
  }
  function photo(key, alt) {
    if (!key || !assets.ok[key]) return '';
    return '<img class="photo" src="assets/images/' + esc(assets.manifest[key].path) + '" alt="' + esc(alt || '') + '">';
  }
  // 실제 파일이 있는 이미지의 주소(없으면 빈 문자열)
  function assetUrl(key) {
    return (key && assets.ok[key]) ? 'assets/images/' + assets.manifest[key].path : '';
  }
  function media(key, artName, cls) {
    var ph = photo(key);
    return '<div class="media ' + (cls || '') + (ph ? ' has-photo' : '') + '">' + (ph || IL.art(artName)) + '</div>';
  }

  // ----- 소리 -----
  function applySound() {
    V.setRate(cfg.settings.voiceRate);
    V.setVoice(!muted && cfg.settings.voiceOn);
    V.setSfx(!muted && cfg.settings.sfxOn);
  }
  function say(text, opt) {
    lastActive = Date.now();
    V.speak(text, opt);
  }
  function sayOnce(key) {
    if (S.heard[key] || !cfg.ments[key]) return;
    S.heard[key] = 1;
    say(cfg.ments[key], { id: key });
  }

  // ----- 화면 -----
  function header(out) {
    var n = S.compare.length;
    var showBack = S.screen !== 'home';
    return '<header class="top">' +
      '<div class="top-l">' + (showBack
        ? '<button class="tbtn" data-act="back" aria-label="뒤로">' + IL.icon('back') + '<span>뒤로</span></button>' : '') + '</div>' +
      '<div class="brand" data-longpress="admin-open">' + brandMark() + '</div>' +
      '<div class="top-r">' +
      (out.noCart ? '' : '<button class="tbtn cart' + (n ? ' has' : '') + '" id="cartBtn" data-act="go" data-to="compare">' +
        IL.icon('cart') + '<span>비교함</span><b>' + n + '</b></button>') +
      '<button class="tbtn icon" data-act="sound" aria-label="' + (muted ? '소리 켜기' : '소리 끄기') + '">' + IL.icon(muted ? 'mute' : 'sound') + '</button>' +
      '<button class="tbtn" data-act="restart">' + IL.icon('reset') + '<span>처음부터</span></button>' +
      '</div></header>' + (out.noCaption ? '' : captionBar());
  }
  // 자막 줄: 상단 바 아래에 항상 같은 높이로 있어 화면을 가리거나 밀지 않는다.
  function captionBar() {
    return '<div class="capbar' + (capLive ? ' live' : '') + '" id="capbar"><span class="cap-tag">AI 음성 안내</span>' +
      '<p>' + esc(capText || CAP_EMPTY) + '</p>' +
      '<button data-act="replay"' + (capText ? '' : ' disabled') + '>' + IL.icon('replay') + '다시 듣기</button></div>';
  }
  function brandMark() {
    var logo = photo('brand-logo', cfg.texts.brand);
    if (logo) return logo;
    return '<span class="wm">' + esc(cfg.texts.brand) + '</span><span class="br">' + esc(cfg.texts.branch) + '</span>';
  }

  function render() {
    if (!$app) return;
    var def = SB.screens[S.screen];
    if (!def) return;
    var prevMain = doc.getElementById('main');
    var prevTop = prevMain ? prevMain.scrollTop : 0;
    var out = def.render() || {};
    var key = S.screen + ':' + (out.scrollKey || '');
    $app.className = 'app scr-' + S.screen;
    doc.body.setAttribute('data-screen', S.screen);
    $app.innerHTML = (out.bare ? '' : header(out)) +
      '<main class="main" id="main">' + (out.html || '') + '</main>' + (out.footer || '');
    var main = doc.getElementById('main');
    main.scrollTop = key === lastScrollKey ? prevTop : 0;
    lastScrollKey = key;
    roll($app);
    if (def.after) def.after($app);
  }

  function go(screen, opt) {
    opt = opt || {};
    var def = SB.screens[screen];
    if (!def) return;
    V.stop();
    capText = ''; // 다른 화면의 자막이 남아 있지 않게 한다
    closeModal();
    if (!opt.replace && S.screen !== screen) {
      S.hist.push(S.screen);
      if (S.hist.length > 30) S.hist.shift();
    }
    S.screen = screen;
    lastScrollKey = null;
    if (def.enter) def.enter(opt);
    render();
    if (def.ment) sayOnce(def.ment);
  }
  function back() {
    var prev = S.hist.pop();
    while (prev && (prev === 'start' || prev === 'intro' || prev === S.screen)) prev = S.hist.pop();
    go(prev || 'home', { replace: true });
  }

  function resetSession(toStart) {
    V.stop();
    closeModal();
    hideIdle();
    S = freshSession();
    capText = ''; capLive = false;
    rollPrev = {};
    if (toStart) muted = false; // 다음 고객은 관리자가 정한 소리 기본값으로 시작한다
    applySound();
    lastActive = Date.now();
    lastScrollKey = null;
    S.screen = toStart ? 'start' : 'home';
    var def = SB.screens[S.screen];
    if (def && def.enter) def.enter({});
    render();
  }

  // ----- 숫자 롤링: 합계가 바뀌면 0.7초 동안 굴러 바뀐다 -----
  function roll(scope) {
    var els = scope.querySelectorAll('[data-roll]');
    Array.prototype.forEach.call(els, function (el) {
      var k = el.getAttribute('data-rk');
      var v = +el.getAttribute('data-roll');
      var prev = rollPrev[k];
      rollPrev[k] = v;
      if (prev === undefined || prev === v || reduced || !root.gsap) return;
      var o = { v: prev };
      el.textContent = P.fmt(prev);
      root.gsap.to(o, {
        v: v, duration: 0.7, ease: 'power2.out',
        onUpdate: function () { el.textContent = P.fmt(o.v); },
        onComplete: function () { el.textContent = P.fmt(v); }
      });
      V.sfx('tick');
    });
  }

  // ----- 모달, 토스트, 자막 -----
  function openModal(html, cls) {
    $modal.innerHTML = '<div class="modal-back" data-act="modal-close"></div><div class="modal ' + (cls || '') + '" role="dialog" aria-modal="true">' + html + '</div>';
    $modal.classList.add('open');
  }
  function closeModal() {
    if (!$modal) return;
    $modal.classList.remove('open');
    $modal.innerHTML = '';
  }
  function toast(text, ms) {
    $toast.textContent = text;
    $toast.classList.add('show');
    root.clearTimeout(toastTimer);
    toastTimer = root.setTimeout(function () { $toast.classList.remove('show'); }, ms || 2600);
  }
  function showCaption(text) {
    if (text) { capText = text; capLive = true; } else capLive = false;
    var bar = doc.getElementById('capbar');
    if (!bar) return;
    bar.classList.toggle('live', capLive);
    bar.querySelector('p').textContent = capText || CAP_EMPTY;
    bar.querySelector('button').disabled = !capText;
  }

  // ----- 무조작 초기화: 앞 고객의 구성이 다음 고객에게 보이지 않게 한다 -----
  function hideIdle() { if ($idle) $idle.classList.remove('show'); }
  function idleTick() {
    var sec = +cfg.settings.idleSec || 0;
    if (!sec || S.screen === 'start' || S.screen === 'admin') { hideIdle(); return; }
    var left = sec * 1000 - (Date.now() - lastActive);
    if (left <= 0) { resetSession(true); return; }
    if (left <= 10000) {
      $idle.querySelector('b').textContent = Math.ceil(left / 1000);
      $idle.classList.add('show');
    } else hideIdle();
  }

  // ----- 화면 꺼짐 방지 -----
  function keepAwake() {
    try {
      if (root.navigator.wakeLock && doc.visibilityState === 'visible') {
        root.navigator.wakeLock.request('screen').catch(function () {});
      }
    } catch (e) { /* 지원하지 않는 기기 */ }
  }

  // ----- 이벤트 -----
  function bind() {
    doc.addEventListener('click', function (ev) {
      var el = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (!el || el.disabled) return;
      var fn = SB.actions[el.getAttribute('data-act')];
      if (fn) fn(el.dataset, el, ev);
    });

    var pressTimer = null;
    function cancelPress() { root.clearTimeout(pressTimer); pressTimer = null; }
    doc.addEventListener('pointerdown', function (ev) {
      var el = ev.target.closest ? ev.target.closest('[data-longpress]') : null;
      if (!el) return;
      var name = el.getAttribute('data-longpress');
      cancelPress();
      pressTimer = root.setTimeout(function () {
        pressTimer = null;
        if (SB.actions[name]) SB.actions[name]({}, el, ev);
      }, 1500);
    });
    ['pointerup', 'pointercancel', 'pointerleave', 'scroll'].forEach(function (t) {
      doc.addEventListener(t, cancelPress, true);
    });
    doc.addEventListener('contextmenu', function (ev) {
      if (ev.target.closest && ev.target.closest('[data-longpress]')) ev.preventDefault();
    });

    ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (t) {
      doc.addEventListener(t, function () { lastActive = Date.now(); hideIdle(); }, { passive: true, capture: true });
    });
    doc.addEventListener('visibilitychange', keepAwake);
    // 터치스크린: 이 구역을 손으로 터치해도 바깥 화면(kiosk.html)이 전체화면으로 바뀌게 알린다.
    if (kiosk) {
      doc.addEventListener('pointerup', function (ev) {
        if (ev.pointerType === 'mouse') return;
        try { root.parent.SBKiosk.enterFullscreen(); } catch (e) { /* 단독으로 열린 경우 */ }
      }, true);
    }
    root.setInterval(idleTick, 1000);
  }

  var SB = {
    screens: {}, actions: {},
    get S() { return S; },
    get cfg() { return cfg; },
    get muted() { return muted; },
    get reduced() { return reduced; },
    get kiosk() { return kiosk; },
    get assets() { return assets; },
    setCfg: function (next) { cfg = next; applySound(); },
    reloadCfg: function () { cfg = Store.load(); applySound(); },
    freshBuilder: freshBuilder,
    esc: esc, money: money, josa: josa, toMin: toMin, hm: hm,
    schedule: schedule, scheduleSummary: scheduleSummary, DAY_NAMES: DAY_NAMES,
    photo: photo, media: media, assetUrl: assetUrl,
    say: say, sayOnce: sayOnce, sfx: function (n) { V.sfx(n); },
    render: render, go: go, back: back, resetSession: resetSession,
    openModal: openModal, closeModal: closeModal, toast: toast,
    keepAlive: function () { lastActive = Date.now(); },
    keepAwake: keepAwake,

    boot: function () {
      $app = doc.getElementById('app');
      $modal = doc.getElementById('modal');
      $toast = doc.getElementById('toast');
      $idle = doc.getElementById('idle');
      V.onCaption(showCaption);
      applySound();
      bind();
      loadAssets();
      render();
    }
  };

  // ----- 공통 동작 -----
  SB.actions.go = function (d) { V.sfx('click'); go(d.to); };
  SB.actions.back = function () { V.sfx('click'); back(); };
  SB.actions['modal-close'] = function () { closeModal(); };
  SB.actions.replay = function () { V.replay(); };
  SB.actions.sound = function () {
    muted = !muted;
    applySound();
    if (!muted) V.sfx('pop');
    toast(muted ? '소리를 껐습니다' : '소리를 켰습니다', 1600);
    render();
  };
  SB.actions.restart = function () {
    V.sfx('click');
    openModal(
      '<h2>처음부터 다시 할까요?</h2>' +
      '<p>지금까지 고른 내용과 비교함이 모두 지워지고, 소개 영상부터 다시 시작합니다.</p>' +
      '<div class="modal-btns"><button class="btn ghost" data-act="modal-close">계속 보기</button>' +
      '<button class="btn primary" data-act="restart-yes">처음부터 다시</button></div>');
  };
  // 처음부터: 고른 내용을 지우고 인트로 애니메이션부터 다시 보여 준다(SB.playIntro는 screens.js에서 등록).
  SB.actions['restart-yes'] = function () {
    resetSession(false);
    if (SB.playIntro) SB.playIntro();
  };

  root.SBApp = SB;
})(typeof self !== 'undefined' ? self : this);
