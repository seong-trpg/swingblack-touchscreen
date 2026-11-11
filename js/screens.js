/*
 * 시작, 인트로, 홈, 시설 소개, 레슨·프로, 프로 상세, 이용 안내 화면.
 */
(function (root) {
  'use strict';

  var SB = root.SBApp, P = root.SBPricing, Store = root.SBStore, IL = root.SBIllust, V = root.SBVoice;
  var esc = SB.esc;
  var A = SB.actions;
  var doc = root.document;

  function nowHour() {
    var d = new Date();
    return d.getHours() + d.getMinutes() / 60;
  }
  function nowText() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    var ampm = h < 12 ? '오전' : '오후';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return ampm + ' ' + h12 + '시 ' + (m < 10 ? '0' : '') + m + '분';
  }

  // ---------- 시작 화면: 첫 터치로 소리를 켠다 ----------
  SB.screens.start = {
    render: function () {
      var logo = SB.photo('brand-logo', SB.cfg.texts.brand);
      return {
        bare: true,
        html: '<button class="start" data-act="start" aria-label="터치해서 시작">' +
          '<div class="start-glow"></div>' +
          (logo ? '<div class="start-logo">' + logo + '</div>'
            : '<div class="start-wm">' + esc(SB.cfg.texts.brand) + '</div>') +
          '<div class="start-branch">' + esc(SB.cfg.texts.branch) + '</div>' +
          '<div class="start-24"><b>24H</b><span>지금도 열려 있습니다</span></div>' +
          '<div class="start-touch">화면을 터치하면 시작합니다</div></button>'
      };
    }
  };
  A.start = function () {
    V.unlock();
    SB.keepAwake();
    SB.sfx('chime');
    SB.go('intro', { replace: true });
    speakScene();
  };

  // ---------- 인트로 ----------
  var introToken = 0;
  var MIN_SCENE = 4200;  // 한 장면을 보여 주는 최소 시간(ms)
  var TAIL = 700;        // 음성이 끝난 뒤 다음 장면으로 넘어가기 전 쉬는 시간(ms)
  /*
   * 인트로 재생 상태. t는 이 장면을 실제로 재생한 시간(ms)이고 일시정지 중에는 멈춘다.
   * 다음 장면으로 넘어가는 조건: 음성이 끝났고(voiceDone) t가 최소 시간과 음성 끝 + 쉬는 시간을 모두 넘겼을 때.
   */
  var player = { t: 0, last: 0, voiceDone: false, doneAt: 0, paused: false, ended: false };

  function resetPlayer() {
    player.t = 0; player.last = Date.now();
    player.voiceDone = false; player.doneAt = 0; player.paused = false; player.ended = false;
  }
  // 이 장면이 끝나는 시각(ms). 음성이 끝나기 전에는 녹음 길이나 글자 수로 어림한다.
  function sceneEnd(sc) {
    if (player.voiceDone) return Math.max(MIN_SCENE, player.doneAt + TAIL);
    var d = V.duration();
    return Math.max(MIN_SCENE, (d ? d * 1000 : V.estimate(sc.text)) + TAIL);
  }
  function playerState() {
    return player.ended ? 'ended' : (player.paused ? 'paused' : 'playing');
  }
  var PB_LABEL = { playing: '일시정지', paused: '재생', ended: '처음부터 다시 보기' };
  var PB_ICON = { playing: 'pause', paused: 'play', ended: 'replay' };

  // 재생바를 지금 상태로 맞춘다(화면을 다시 그리지 않는다. 다시 그리면 장면 모션이 처음부터 시작된다).
  function paintPlayer() {
    var bar = doc.getElementById('playbar');
    if (!bar) return;
    var sc = SB.cfg.intro[SB.S.intro];
    var p = sc ? Math.min(1, player.t / sceneEnd(sc)) : 0;
    if (!player.voiceDone) p = Math.min(p, 0.97);
    if (player.ended) p = 1;
    var fill = bar.querySelector('.pb-seg.on i');
    if (fill) fill.style.width = (p * 100).toFixed(1) + '%';
    var state = playerState(), btn = doc.getElementById('pbBtn');
    if (btn && btn.getAttribute('data-state') !== state) {
      btn.setAttribute('data-state', state);
      btn.setAttribute('aria-label', PB_LABEL[state]);
      btn.innerHTML = IL.icon(PB_ICON[state]);
      bar.className = 'playbar ' + state;
    }
  }

  function speakScene() {
    var S = SB.S, list = SB.cfg.intro, i = S.intro, sc = list[i];
    if (!sc) return;
    var my = ++introToken;
    resetPlayer();
    SB.keepAlive();
    SB.say(sc.text, {
      id: sc.id, say: sc.say,
      onend: function () {
        if (my !== introToken || SB.S.screen !== 'intro') return;
        player.voiceDone = true;
        player.doneAt = player.t;
      }
    });
    paintPlayer();
  }
  function showScene(i) {
    var list = SB.cfg.intro;
    SB.S.intro = Math.max(0, Math.min(list.length - 1, i));
    resetPlayer();
    SB.render();
    speakScene();
  }

  // 0.1초마다 재생 시간을 올리고, 장면이 끝나면 다음 장면으로 넘긴다.
  root.setInterval(function () {
    if (SB.S.screen !== 'intro') return;
    var now = Date.now(), dt = Math.min(500, now - player.last);
    player.last = now;
    if (player.paused || player.ended) return;
    player.t += dt;
    var list = SB.cfg.intro, i = SB.S.intro, sc = list[i];
    if (sc && player.voiceDone && player.t >= sceneEnd(sc)) {
      if (i < list.length - 1) { showScene(i + 1); return; }
      player.ended = true;
    }
    // 장면 그림은 음성이 원고의 해당 낱말에 닿을 때 차례로 나온다(js/intro.js의 박자).
    if (sc) root.SBIntro.progress(player.ended ? 1 : speechProgress(sc));
    paintPlayer();
  }, 100);

  // 음성이 원고의 어디쯤을 읽고 있는지(0~1). 음성이 끝난 뒤 쉬는 시간은 빼고 계산한다.
  function speechProgress(sc) {
    if (player.voiceDone) return 1;
    var d = V.duration();
    var speech = d ? d * 1000 : V.estimate(sc.text);
    return Math.min(1, player.t / speech);
  }

  function pauseIntro() {
    if (player.paused || player.ended) return;
    player.paused = true;
    V.pause();
    root.SBIntro.pause();
    paintPlayer();
  }
  function resumeIntro() {
    if (!player.paused) return;
    player.paused = false;
    player.last = Date.now();
    SB.keepAlive();
    if (V.resume() === 'restart') {
      // 기기 음성 합성은 멈춘 자리에서 잇지 못해 문장을 처음부터 다시 읽는다. 장면도 처음부터 맞춘다.
      player.t = 0; player.voiceDone = false; player.doneAt = 0;
      var sc = SB.cfg.intro[SB.S.intro];
      if (sc) root.SBIntro.play(sc.scene, doc.getElementById('stage'), SB.reduced, sc.text);
    } else {
      root.SBIntro.resume();
    }
    paintPlayer();
  }
  // 점검 스크립트에서 재생 상태를 읽을 때 쓴다.
  SB.introState = function () {
    return { t: player.t, paused: player.paused, ended: player.ended, voiceDone: player.voiceDone, state: playerState() };
  };

  SB.screens.intro = {
    enter: function () { SB.S.intro = 0; resetPlayer(); },
    render: function () {
      var S = SB.S, list = SB.cfg.intro, sc = list[S.intro] || list[0];
      var last = S.intro === list.length - 1;
      var state = playerState();
      // 재생바 한 줄: [이전] [일시정지·재생] 장면 수만큼의 칸(누르면 그 장면으로 이동) 몇 번째 장면인지 [다음]
      var playbar = '<div class="playbar ' + state + '" id="playbar">' +
        '<button class="tbtn pb-nav" data-act="intro-prev"' + (S.intro === 0 ? ' disabled' : '') + '>' + IL.icon('back') + '<span>이전</span></button>' +
        '<button class="pb-btn" id="pbBtn" data-act="intro-toggle" data-state="' + state + '" aria-label="' + PB_LABEL[state] + '">' + IL.icon(PB_ICON[state]) + '</button>' +
        '<div class="pb-track">' + list.map(function (x, i) {
          var cls = i === S.intro ? 'on' : (i < S.intro ? 'past' : '');
          return '<button class="pb-seg ' + cls + '" data-act="intro-seek" data-i="' + i + '" aria-label="' + (i + 1) + '번째 장면으로 이동"' +
            (i === S.intro ? ' aria-current="true"' : '') + '><span><i></i></span></button>';
        }).join('') + '</div>' +
        '<span class="pb-count"><b>' + (S.intro + 1) + '</b> / ' + list.length + '</span>' +
        (last ? '<button class="tbtn pb-nav" data-act="intro-done"><span>홈으로</span>' + IL.icon('next') + '</button>'
          : '<button class="tbtn pb-nav" data-act="intro-next"><span>다음</span>' + IL.icon('next') + '</button>') +
        '</div>';
      return {
        bare: true,
        html: '<div class="intro">' +
          '<div class="intro-top"><span class="intro-brand">' + esc(SB.cfg.texts.brand) + ' ' + esc(SB.cfg.texts.branch) + '</span>' +
          '<button class="skip" data-act="intro-done">건너뛰기' + IL.icon('next') + '</button></div>' +
          '<div class="stage scene-' + sc.scene + '" id="stage">' + root.SBIntro.html(sc.scene, SB.cfg, SB, sc.text) + '</div>' +
          playbar +
          '<div class="subtitle"><span class="cap-tag">AI 음성 안내</span><p>' + esc(sc.text) + '</p></div>' +
          '</div>'
      };
    },
    after: function (el) {
      var sc = SB.cfg.intro[SB.S.intro];
      if (sc) {
        // 재생 도중에 화면을 다시 그린 경우(앱 시작 직후 사진 확인이 끝났을 때 등)에는
        // 장면 모션을 처음부터 다시 틀지 않고, 진행 중이던 자리에서 이어 간다.
        var mid = player.t > 300 || player.ended;
        var d = V.duration();
        root.SBIntro.play(sc.scene, el.querySelector('#stage'), SB.reduced, sc.text, mid ? {
          p: player.ended ? 1 : speechProgress(sc),
          total: d || V.estimate(sc.text) / 1000
        } : null);
      }
      if (player.paused) root.SBIntro.pause();
      paintPlayer();
    }
  };
  A['intro-next'] = function () { SB.sfx('click'); showScene(SB.S.intro + 1); };
  A['intro-prev'] = function () { SB.sfx('click'); showScene(SB.S.intro - 1); };
  // 재생바 버튼: 재생 중이면 멈추고, 멈춰 있으면 이어 재생하고, 끝까지 봤으면 처음부터 다시 본다.
  A['intro-toggle'] = function () {
    SB.sfx('click');
    if (player.ended) showScene(0);
    else if (player.paused) resumeIntro();
    else pauseIntro();
  };
  // 재생바의 장면 칸: 그 장면으로 이동해 재생한다.
  A['intro-seek'] = function (d) { SB.sfx('click'); showScene(+d.i); };
  A['intro-done'] = function () {
    introToken++;
    root.SBIntro.stop();
    SB.sfx('click');
    SB.go('home', { replace: true });
  };
  // 인트로를 1장면부터 재생한다(소개 다시 보기, 처음부터 다시).
  SB.playIntro = function () {
    SB.go('intro');
    speakScene();
  };
  A['intro-replay'] = function () {
    SB.sfx('click');
    SB.playIntro();
  };

  // ---------- 홈 ----------
  SB.screens.home = {
    render: function () {
      var cfg = SB.cfg, t = cfg.texts;
      var promos = cfg.promos.filter(function (p) { return Store.activeToday(p) && p.text; });
      var trust = t.trust.filter(function (x) { return x.on !== false; });
      return {
        html: '<section class="hero">' +
          '<p class="hero-sub">' + esc(t.slogan1) + '</p>' +
          '<h1 class="hero-title">' + esc(t.slogan2) + '</h1>' +
          '<div class="now">' +
          '<div class="now-head"><span class="b24">24H</span><p>지금 <b id="nowText">' + nowText() + '</b>, 열려 있습니다</p></div>' +
          '<div id="nowRail">' + IL.rail({ ranges: [{ from: 0, to: 24, cls: 'open' }], now: nowHour() }) + '</div>' +
          '<p class="now-note">오픈 시간이 따로 없어 사람이 몰리지 않습니다. 새벽 출근 전에도, 퇴근 후 심야에도 원하는 시간에 오세요.</p>' +
          '</div></section>' +
          (promos.length ? '<div class="promos">' + promos.map(function (p) {
            return '<div class="promo">' + esc(p.text) + '</div>';
          }).join('') + '</div>' : '') +
          '<nav class="menu">' +
          '<button class="menu-main" data-act="go" data-to="builder">' + IL.art('ticket') +
          '<div><b>이용권 설계</b><span>' + esc(t.builderTagline) + '</span>' +
          '<em>시간대, 기간, 레슨, 락커를 고르면 가격이 바로 나옵니다</em></div>' + IL.icon('next') + '</button>' +
          '<div class="menu-row">' +
          '<button class="menu-sub" data-act="go" data-to="facility">' + IL.art('bay') + '<b>시설 소개</b><span>' + t.promises.length + '가지 약속과 시설</span></button>' +
          '<button class="menu-sub" data-act="go" data-to="lesson">' + IL.art('lesson') + '<b>레슨·프로</b><span>레슨 종류와 소속 프로</span></button>' +
          '<button class="menu-sub" data-act="go" data-to="guide">' + IL.art('guide') + '<b>이용 안내</b><span>이용 시간과 규정</span></button>' +
          '</div></nav>' +
          (trust.length ? '<ul class="trust">' + trust.map(function (x) {
            return '<li><b>' + esc(x.big) + '</b><span>' + esc(x.label) + '</span></li>';
          }).join('') + '</ul>' : '') +
          '<div class="home-foot">' +
          '<button class="link" data-act="intro-replay">' + IL.icon('replay') + '소개 다시 보기</button>' +
          '<button class="link" data-act="sound">' + IL.icon(SB.muted ? 'mute' : 'sound') + (SB.muted ? '음성 꺼짐' : '음성 켜짐') + '</button>' +
          '</div>'
      };
    }
  };
  // 홈의 현재 시각 표시를 갱신한다.
  root.setInterval(function () {
    if (SB.S.screen !== 'home') return;
    var text = doc.getElementById('nowText'), rail = doc.querySelector('#nowRail .rail-now');
    if (text) text.textContent = nowText();
    if (rail) rail.style.left = (nowHour() / 24 * 100) + '%';
  }, 20000);

  // ---------- 시설 소개 ----------
  SB.screens.facility = {
    ment: 'facility',
    render: function () {
      var cfg = SB.cfg, t = cfg.texts;
      var cards = cfg.facility.filter(function (f) { return f.on !== false; });
      var trust = t.trust.filter(function (x) { return x.on !== false; });
      return {
        // 제목의 "N가지"는 약속 목록의 개수를 따른다(2026-11-11에 7가지에서 6가지로 바뀜).
        html: '<h1 class="q">스윙블랙의 ' + t.promises.length + '가지 약속</h1>' +
          '<ol class="promises">' + t.promises.map(function (p, i) {
            return '<li><span>' + (i + 1 < 10 ? '0' : '') + (i + 1) + '</span><p>' + esc(p) + '</p></li>';
          }).join('') + '</ol>' +
          '<h2 class="sec">시설</h2><div class="fac">' + cards.map(function (f) {
            var wide = f.id === 'open24';
            return '<article class="fac-card' + (wide ? ' wide' : '') + '">' + SB.media(f.asset, f.icon) +
              '<div class="fac-text"><h3>' + esc(f.title) + '</h3><p>' + esc(f.desc) + '</p>' +
              (wide ? IL.rail({ ranges: [{ from: 0, to: 24, cls: 'open' }] }) : '') + '</div></article>';
          }).join('') + '</div>' +
          (trust.length ? '<h2 class="sec">회원님들이 만들어 주신 기록</h2><ul class="trust big">' + trust.map(function (x) {
            return '<li><b>' + esc(x.big) + '</b><span>' + esc(x.label) + '</span></li>';
          }).join('') + '</ul>' : '') +
          '<p class="pledge">' + esc(t.pledge) + '</p>' +
          '<button class="btn primary wide" data-act="go" data-to="builder">이용권 설계하기</button>'
      };
    }
  };

  // ---------- 레슨·프로 ----------
  function proHours(p) { return p.start + '~' + p.end; }
  function offText(p) {
    return (p.off && p.off.length)
      ? p.off.slice().sort(function (a, b) { return ((a + 6) % 7) - ((b + 6) % 7); }).map(function (d) { return SB.DAY_NAMES[d]; }).join('·') + ' 휴무'
      : '휴무 없음';
  }
  // 프로 사진 무대: 배경을 지운 인물 사진을 하늘색 무대 위에 세운다.
  // 카드에는 상반신(<asset>), 약력 화면에는 전신(<asset>-full, 없으면 상반신)을 쓴다.
  // 사진이 없으면 얼굴 없는 실루엣을 보여 준다.
  function proPhoto(p, cls) {
    var full = cls === 'lg' ? SB.assetUrl(p.asset + '-full') : '';
    var url = full || SB.assetUrl(p.asset);
    if (!url) return '<div class="pro-stage none ' + (cls || '') + '">' + IL.art('silhouette') + '</div>';
    return '<div class="pro-stage ' + (cls || '') + (full ? ' full' : '') + '">' +
      '<img class="cut" src="' + esc(url) + '" alt="' + esc(p.name) + ' 프로"></div>';
  }

  function weekTable() {
    var groups = SB.schedule();
    return '<div class="week">' + groups.map(function (g) {
      var ranges = g.ranges.map(function (r) { return { from: r[0] / 60, to: r[1] / 60, cls: 'lesson' }; })
        .concat(g.overlap.map(function (r) { return { from: r[0] / 60, to: r[1] / 60, cls: 'both' }; }));
      var who = g.per.map(function (x) {
        return '<span class="' + (x.off ? 'off' : '') + '">' + esc(x.name) + ' ' + (x.off ? '휴무' : SB.hm(x.range[0]) + '~' + SB.hm(x.range[1])) + '</span>';
      }).join('');
      var both = g.overlap.length
        ? '<em>' + g.overlap.map(function (r) { return SB.hm(r[0]) + '~' + SB.hm(r[1]); }).join(', ') + '은 두 프로 모두 가능</em>' : '';
      return '<div class="week-row' + (g.ranges.length ? '' : ' none') + '">' +
        '<div class="week-day">' + g.dayLabel + '</div>' +
        '<div class="week-main"><b>' + g.label + '</b>' + both + IL.rail({ ranges: ranges, compact: true }) +
        '<div class="week-who">' + who + '</div></div></div>';
    }).join('') + '<div class="rail-legend">' + IL.rail({ ranges: [], marks: [0, 6, 12, 18, 24] }) + '</div></div>';
  }

  // 패키지와 단독의 레슨 유효기간 비교 (값은 설정의 유효기간에서 읽는다)
  function pkgValidity(cfg) {
    var extra = P.packageExtraList(cfg);
    if (!extra.length) return '';
    return '<section class="pkg-valid"><h2 class="sec">패키지로 하면 레슨 기간이 더 깁니다</h2>' +
      '<table class="sheet"><thead><tr><th>레슨 횟수</th><th class="r">레슨만 따로</th><th class="r">패키지</th></tr></thead><tbody>' +
      extra.map(function (x) {
        var c = x.count, d = x.extra;
        return '<tr><th>' + c + '회</th><td class="r">' + cfg.validity.solo[c] + '개월</td>' +
          '<td class="r"><b>' + cfg.validity.pkg[c] + '개월</b>' + (d ? ' <em class="tag more">+' + d + '개월</em>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></section>';
  }

  SB.screens.lesson = {
    ment: 'pros',
    render: function () {
      var cfg = SB.cfg, items = cfg.items;
      function col(min, text) {
        return '<div class="lcol"><h3>' + min + '분 레슨</h3><p>' + esc(text) + '</p><dl>' +
          '<div><dt>3개월 이상 가입 시 패키지</dt><dd>1회 ' + P.fmt(items['pkg.' + min + '.8'].price / 8) + '원</dd></div>' +
          '<div><dt>레슨만 따로 (8회)</dt><dd>1회 ' + P.fmt(items['solo.' + min + '.8'].price / 8) + '원</dd></div></dl></div>';
      }
      return {
        html: '<h1 class="q">레슨·프로</h1>' +
          '<div class="lcols">' + col(15, cfg.lessonInfo.m15) + col(25, cfg.lessonInfo.m25) + '</div>' +
          '<p class="payout">' + esc(cfg.lessonInfo.payout) + '</p>' + pkgValidity(cfg) +
          '<h2 class="sec">소속 프로</h2><div class="pros">' + cfg.pros.map(function (p) {
            return '<button class="pro-card" data-act="pro" data-id="' + esc(p.id) + '">' + proPhoto(p) +
              '<div class="pro-info"><div class="pro-name"><b>' + esc(p.name) + ' 프로</b>' + (p.badge ? '<em>' + esc(p.badge) + '</em>' : '') + '</div>' +
              '<span>근무 ' + proHours(p) + '</span><span>' + offText(p) + '</span>' +
              '<i>약력 보기' + IL.icon('next') + '</i></div></button>';
          }).join('') + '</div>' +
          '<h2 class="sec">요일별 레슨 가능 시간</h2>' + weekTable() +
          '<ul class="rules"><li>시설은 24시간 운영하지만 레슨은 프로님 근무 시간에만 받을 수 있습니다.</li>' +
          '<li>소속 프로 외 레슨은 금지됩니다.</li><li>레슨 예약 취소는 24시간 전까지 가능합니다.</li></ul>' +
          '<div class="cta2"><button class="btn primary" data-act="lesson-build">레슨 포함해서 이용권 설계하기</button>' +
          '<button class="btn ghost" data-act="go" data-to="compare">비교함 보기</button></div>'
      };
    }
  };
  A['lesson-build'] = function () {
    SB.sfx('click');
    SB.go('builder', { step: 3 });
    SB.sayOnce('lesson');
  };
  A.pro = function (d) {
    SB.S.proId = d.id;
    SB.sfx('click');
    SB.go('pro');
  };

  SB.screens.pro = {
    render: function () {
      var p = SB.cfg.pros.filter(function (x) { return x.id === SB.S.proId; })[0] || SB.cfg.pros[0];
      if (!p) return { html: '<div class="empty"><h1 class="q">프로 정보가 없습니다</h1></div>' };
      function list(title, arr) {
        return (arr && arr.length) ? '<h2 class="sec">' + title + '</h2><ul class="career">' + arr.map(function (x) {
          return '<li>' + esc(x) + '</li>';
        }).join('') + '</ul>' : '';
      }
      var days = [1, 2, 3, 4, 5, 6, 0].map(function (d) {
        var off = (p.off || []).indexOf(d) >= 0;
        return '<span class="' + (off ? 'off' : 'on') + '">' + SB.DAY_NAMES[d] + '</span>';
      }).join('');
      return {
        html: '<div class="pro-detail"><div class="pro-head">' + proPhoto(p, 'lg') +
          '<div><div class="pro-name"><h1 class="q">' + esc(p.name) + ' 프로</h1>' + (p.badge ? '<em>' + esc(p.badge) + '</em>' : '') + '</div>' +
          '<p class="pro-time">근무 ' + proHours(p) + '</p>' +
          IL.rail({ ranges: [{ from: SB.toMin(p.start) / 60, to: SB.toMin(p.end) / 60, cls: 'lesson' }] }) +
          '<div class="pro-days">' + days + '</div><p class="q-sub">' + offText(p) + '</p></div></div>' +
          list('대회 성적', p.awards) + list('경력', p.career) +
          '<ul class="rules"><li>소속 프로 외 레슨은 금지됩니다.</li><li>레슨 예약 취소는 24시간 전까지 가능합니다.</li></ul>' +
          '<div class="cta2"><button class="btn primary" data-act="lesson-build">레슨 포함해서 이용권 설계하기</button>' +
          '<button class="btn ghost" data-act="go" data-to="compare">비교함 보기</button></div></div>'
      };
    }
  };

  // ---------- 이용 안내 ----------
  SB.screens.guide = {
    ment: 'guide',
    render: function () {
      var cfg = SB.cfg;
      return {
        html: '<h1 class="q">이용 안내</h1>' +
          '<div class="guide-24">' + IL.rail({ ranges: [{ from: 0, to: 12, cls: 's1' }], compact: true }) +
          IL.rail({ ranges: [{ from: 0, to: 17, cls: 's2' }], compact: true }) +
          IL.rail({ ranges: [{ from: 0, to: 24, cls: 's3' }], marks: [0, 6, 12, 17, 24] }) +
          '<div class="guide-legend"><span class="t1">1부 00~12시</span><span class="t2">2부 00~17시</span><span class="t3">3부 종일</span></div></div>' +
          '<dl class="guide">' + cfg.guide.map(function (g) {
            return '<div><dt>' + esc(g.title) + '</dt><dd>' + esc(g.body) + '</dd></div>';
          }).join('') + '</dl>' +
          (cfg.texts.terms
            ? '<button class="btn ghost wide" data-act="terms">이용약관 전문 보기</button>'
            : '<p class="q-sub">이용약관 전문은 데스크에서 안내해 드립니다.</p>')
      };
    }
  };
  A.terms = function () {
    SB.openModal('<h2>이용약관</h2><div class="terms">' + esc(SB.cfg.texts.terms).replace(/\n/g, '<br>') + '</div>' +
      '<div class="modal-btns"><button class="btn primary" data-act="modal-close">닫기</button></div>', 'tall');
  };
})(typeof self !== 'undefined' ? self : this);
