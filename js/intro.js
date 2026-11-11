/*
 * 인트로 장면(지금은 10개): 장면별 화면(HTML·SVG)과 모션(GSAP).
 *
 * 장면 하나는 여러 '박자(beat)'로 나뉜다. 박자는 음성이 원고의 그 낱말에 닿을 때 시작한다.
 * 예: 2장면은 타석 18개 → "1.5배"에서 넓이 비교 → "회원이 아닌"에서 회원 전용 자물쇠.
 * 박자의 시작 시점은 원고에서 낱말이 나오는 위치(글자 수 비율)로 정하므로, 음성 파일 길이가 달라져도 맞는다.
 * 재생 위치(0~1)는 screens.js가 0.1초마다 progress()로 알려 준다.
 *
 * 모션 줄이기 설정이 켜져 있거나 GSAP이 없으면 모든 그림을 처음부터 보이는 정지 화면으로 둔다.
 */
(function (root) {
  'use strict';

  var IL = root.SBIllust, V = root.SBVoice;

  function letters(text) {
    return String(text).split('').map(function (ch) {
      return '<span>' + (ch === ' ' ? '&nbsp;' : ch) + '</span>';
    }).join('');
  }
  // 원고에서 낱말이 나오는 위치(0~1). 낱말이 없으면 fallback을 쓴다.
  function when(text, phrase, fallback) {
    text = String(text || '');
    var i = text.indexOf(phrase);
    if (i < 0 || !text.length) return fallback;
    return Math.max(0, i / text.length - 0.03);
  }
  // 원고에서 그 낱말이 든 문장(마침표 제외). 화면 문구를 원고에서 가져올 때 쓴다.
  function sentenceWith(text, phrase) {
    var list = String(text || '').split(/[.?!]\s*/);
    for (var i = 0; i < list.length; i++) if (list[i].indexOf(phrase) >= 0) return list[i].trim();
    return '';
  }
  function sfx(name) { return function () { V.sfx(name); }; }

  var STAR = 'M0-13l3.4 9.6 9.6 3.4-9.6 3.4-3.4 9.6-3.4-9.6-9.6-3.4 9.6-3.4z';

  var scenes = {
    logo: function (cfg, SB, text) {
      var logo = SB.photo('brand-logo', cfg.texts.brand);
      var thanks = sentenceWith(text, '감사');
      return '<div class="in-logo">' +
        (logo ? '<div class="in-logo-img">' + logo + '</div>' : '<div class="in-wm">' + letters(cfg.texts.brand) + '</div>') +
        '<div class="in-rule"></div><div class="in-branch">' + SB.esc(cfg.texts.branch) + '</div>' +
        '<p class="in-slogan">' + SB.esc(cfg.texts.slogan1) + '</p>' +
        (thanks ? '<p class="in-thanks" id="inThanks">' + SB.esc(thanks) + '</p>' : '') + '</div>';
    },

    // 18개 타석 → 1.5배 넓은 타석 → 회원 전용
    bays: function () {
      var rects = '';
      for (var r = 0; r < 2; r++) {
        for (var i = 0; i < 9; i++) {
          rects += '<g class="in-bay" transform="translate(' + (44 + i * 80) + ',' + (14 + r * 132) + ')">' +
            '<rect class="' + ((i + r) % 2 ? 'fb' : 'fg') + '" width="64" height="112" rx="8"/>' +
            '<rect class="fd" x="10" y="12" width="44" height="38" rx="4" opacity=".35"/>' +
            '<circle class="fd" cx="32" cy="84" r="5" opacity=".5"/></g>';
        }
      }
      return '<svg class="in-svg in-bays" viewBox="0 0 800 272">' + rects + '</svg>' +
        '<div class="in-count"><b id="inBayCount">18</b><span>개 타석</span></div>' +
        '<div class="in-facts">' +
        // 넓이 비교: 골프채를 든 사람(얼굴 없는 실루엣)이 서 있고, 발밑 타석이 일반 넓이(점선)에서 1.5배로 넓어진다.
        '<div class="in-fact" id="inWide"><div class="fact-art"><svg class="il wide-art" viewBox="0 0 240 132" aria-hidden="true">' +
        // (선 굵기는 style로 준다. CSS의 .il .sg 굵기가 stroke-width 속성보다 우선하기 때문이다.)
        '<rect id="inMat" class="fb" x="60" y="92" width="120" height="16" rx="5"/>' +
        '<rect class="sw" x="80" y="92" width="80" height="16" rx="5" style="stroke-width:2" stroke-dasharray="5 4"/>' +
        '<g id="inWideMark"><path class="sg" d="M60 119h120M60 114v10M180 114v10" style="stroke-width:2.5"/></g>' +
        '<circle class="fg" cx="115" cy="20" r="10.5"/>' +
        '<path class="sg" d="M115 40l-2 22" style="stroke-width:17"/>' +
        '<path class="sg" d="M109 68l-5 22M117 68l7 22" style="stroke-width:9.5"/>' +
        '<path class="sg" d="M119 42l16 19" style="stroke-width:7"/>' +
        '<path class="sw" d="M135 61l14 28" style="stroke-width:2.6"/><path class="sw" d="M149 89h9" style="stroke-width:4.5"/>' +
        '<circle class="fw" cx="166" cy="87" r="4"/></svg></div>' +
        '<b>1.5배 넓은 타석</b><span>점선은 일반 연습장 타석 넓이</span></div>' +
        '<div class="in-fact" id="inPrivate"><div class="fact-art"><svg class="il in-ic" viewBox="0 0 64 64" aria-hidden="true">' +
        '<path id="inShackle" class="sg" d="M20 30v-8a12 12 0 0 1 24 0v8" style="stroke-width:5"/>' +
        '<rect class="fg" x="12" y="30" width="40" height="28" rx="6"/><circle class="td" cx="32" cy="42" r="4"/><rect class="td" x="30.4" y="43" width="3.2" height="8" rx="1.6"/></svg></div>' +
        '<b>회원 전용 타석</b><span>회원이 아니면 들어올 수 없어 프라이빗하게</span></div></div>';
    },

    // 24시간 → 무인 매장 → 오픈 시간에 몰리는 연습장과 비교
    clock: function () {
      var ticks = '';
      for (var i = 0; i < 12; i++) {
        ticks += '<path class="' + (i % 3 ? 'sb' : 'sg') + '" d="M400 62v' + (i % 3 ? 12 : 22) + '" transform="rotate(' + (i * 30) + ' 400 200)"/>';
      }
      var other = [0, 0, 0, 0, 0, 0, 96, 70, 44, 30, 88, 60, 40, 34, 30, 34, 40, 52, 66, 72, 58, 40, 24, 0];
      var ours = [22, 18, 16, 16, 20, 28, 36, 42, 40, 36, 36, 38, 40, 38, 36, 36, 38, 42, 46, 48, 44, 38, 32, 26];
      function bars(list) {
        return list.map(function (h) { return '<i style="height:' + h + '%"></i>'; }).join('');
      }
      return '<div class="in-clock-wrap"><svg class="in-svg in-clock" viewBox="200 30 400 340">' +
        '<circle class="fp" cx="400" cy="200" r="150"/><circle class="sg" cx="400" cy="200" r="150"/>' + ticks +
        '<path id="inHand" class="sw" d="M400 200V84" stroke-width="6"/><circle class="fg" cx="400" cy="200" r="10"/></svg>' +
        '<div class="in-24" id="in24">24H</div>' +
        '<div class="in-unmanned" id="inUnmanned"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' +
        '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 12.5l2.2 2.2L15.5 10"/></svg>무인 매장</div></div>' +
        '<div class="in-dist"><div id="inDistOther"><span>오픈 시간에 몰리는 연습장</span><div class="dist other">' + bars(other) + '</div></div>' +
        '<div id="inDistOurs"><span>24시간 분산되는 스윙블랙</span><div class="dist ours">' + bars(ours) + '</div></div></div>';
    },

    // 미국 제품 GC3 → 정밀 측정과 기능 → 사용하는 선수
    gc3: function () {
      return '<svg class="in-svg" viewBox="0 0 800 420">' +
        '<path class="sg" d="M30 392h740"/>' +
        '<rect class="fp" x="70" y="290" width="170" height="100" rx="14"/><rect class="sg" x="70" y="290" width="170" height="100" rx="14"/>' +
        '<circle class="fb" cx="120" cy="340" r="20"/><circle class="fb" cx="186" cy="340" r="20" opacity=".6"/>' +
        '<text class="tw" x="155" y="278" text-anchor="middle" font-size="30" font-weight="800">GC3</text>' +
        '<g id="inUsa"><rect class="fg" x="86" y="196" width="138" height="42" rx="21"/>' +
        '<text class="to" x="155" y="225" text-anchor="middle" font-size="22" font-weight="800">미국 제품</text></g>' +
        '<path id="inTraj" class="sb" d="M310 380Q520 -40 760 210" stroke-width="5"/>' +
        '<circle id="inBall" class="fw" cx="310" cy="380" r="13"/></svg>' +
        '<div class="in-stats">' +
        '<div><small>볼 스피드</small><b data-to="62">62</b><i>m/s</i></div>' +
        '<div><small>발사각</small><b data-to="14">14</b><i>도</i></div>' +
        '<div><small>비거리</small><b data-to="215">215</b><i>m</i></div></div>' +
        '<div class="in-users" id="inUsers"><small>사용하는 선수</small><span>미국 프로</span><span>한국 프로</span><span>미국 아마추어</span></div>';
    },

    partition: function () {
      var body = '<path class="sg" d="M30 392h740"/>';
      [150, 400, 650].forEach(function (x) {
        body += '<rect class="fg" x="' + (x - 62) + '" y="366" width="124" height="24" rx="6" opacity=".85"/>' +
          '<circle class="fw" cx="' + x + '" cy="352" r="11"/>';
      });
      [25, 275, 525, 775].forEach(function (x) {
        body += '<rect class="in-panel fb" x="' + (x - 11) + '" y="70" width="22" height="322" rx="6"/>';
      });
      return '<svg class="in-svg" viewBox="0 0 800 420">' + body + '<path class="sg" d="M14 70h772" stroke-width="6"/></svg>' +
        '<div class="in-count"><span>타석마다 칸막이, 타구 사고 걱정 없이</span></div>';
    },

    putting: function () {
      return '<svg class="in-svg" viewBox="0 0 800 420">' +
        '<ellipse class="fp" cx="400" cy="270" rx="360" ry="130"/><ellipse class="sb" cx="400" cy="270" rx="360" ry="130"/>' +
        '<ellipse class="fd" cx="600" cy="250" rx="30" ry="11"/>' +
        '<path class="sw" d="M600 250V60" stroke-width="5"/><path id="inFlag" class="fg" d="M600 62l78 28-78 28z"/>' +
        '<path class="sg" d="M190 318Q400 270 572 254" stroke-dasharray="4 12"/>' +
        '<circle id="inPutt" class="fw" cx="170" cy="322" r="15"/></svg>' +
        '<div class="in-count"><span>실내 퍼팅장과 레슨</span></div>';
    },

    // 피팅룸 → 주차 2시간 무료 → 청소 로봇과 시설 관리
    amenity: function () {
      var sparks = [150, 215, 280, 345].map(function (x, i) {
        return '<g transform="translate(' + x + ',' + (i % 2 ? 62 : 78) + ')"><path class="in-spark ' + (i % 2 ? 'fb' : 'fg') + '" d="' + STAR + '"/></g>';
      }).join('');
      return '<div class="in-tiles">' +
        '<div class="in-tile" id="tFit">' + IL.art('fitting') + '<b>피팅룸</b><span>편하게 옷을 갈아입는 공간</span></div>' +
        '<div class="in-tile" id="tPark">' + IL.art('parking') + '<b>주차 2시간 무료</b><span>연습하는 동안 주차 걱정 없이</span></div>' +
        '<div class="in-tile wide" id="tClean"><svg class="in-svg in-robot" viewBox="0 0 400 120" aria-hidden="true">' +
        '<path class="sg" d="M10 104h380"/>' + sparks +
        '<g id="inRobot"><rect class="fg" x="20" y="64" width="88" height="36" rx="18"/><path class="fb" d="M38 64a26 16 0 0 1 52 0z"/>' +
        '<circle class="to" cx="90" cy="80" r="5"/><circle class="fd" cx="42" cy="102" r="6"/><circle class="fd" cx="86" cy="102" r="6"/></g></svg>' +
        '<div><b>청소 로봇과 시설 관리</b><span>24시간 쾌적한 환경을 유지합니다</span></div></div></div>';
    },

    // 1부·2부·3부 → 기본 60분 → 빈 타석 2개 이상이면 30분 연장 → 타석 여유가 있는 시간대는 무제한
    slots: function () {
      var P = root.SBPricing;
      return '<div class="in-slots">' + [1, 2, 3].map(function (n) {
        var s = P.SLOTS[n];
        return '<div class="in-slot" id="inSlot' + n + '"><div class="in-slot-h"><b class="t' + n + '">' + s.name + '</b><span>' + s.range + '</span></div>' +
          IL.rail({ ranges: [{ from: s.from, to: s.to, cls: 's' + n }], compact: n < 3 }) + '</div>';
      }).join('') + '</div>' +
        '<div class="in-usage">' +
        '<div class="u-item" id="u60"><b>60분</b><span>기본 1일 1회</span></div>' +
        '<i class="u-plus" id="uPlus1">+</i>' +
        '<div class="u-item" id="u30"><b>30분 연장</b><span>빈 타석이 2개 이상이면</span></div>' +
        '<i class="u-plus" id="uPlus2">+</i>' +
        '<div class="u-item" id="uInf"><b>무제한</b><span>타석 여유가 있는 시간대</span></div></div>';
    },

    // 9장면: 멤버십과 레슨이 하나의 패키지로 묶인다 → 레슨비가 100% 프로에게 흘러간다 → 합리적인 가격, 고퀄리티 레슨
    package: function () {
      var check = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
      return '<div class="pk-combo" id="pkCombo">' +
        '<i class="pk-ring" id="pkRing"></i>' +
        '<em class="pk-badge"><b id="pkBadge">멤버십 + 레슨 패키지</b></em>' +
        '<div class="pk-tile" id="pkMem">' + IL.art('ticket') + '<b>멤버십</b><span>타석 이용</span></div>' +
        '<i class="pk-plus" id="pkPlus">+</i>' +
        '<div class="pk-tile" id="pkLesson">' + IL.art('lesson') + '<b>레슨</b><span>프로에게 배우기</span></div></div>' +
        '<div class="pk-flow" id="pkFlow">' +
        '<div class="pk-node" id="pkFee"><svg class="il pk-art" viewBox="0 0 64 64" aria-hidden="true">' +
        '<ellipse class="fb" cx="32" cy="48" rx="21" ry="8"/><ellipse class="fg" cx="32" cy="42" rx="21" ry="8"/>' +
        '<ellipse class="fb" cx="32" cy="34" rx="21" ry="8"/><ellipse class="fg" cx="32" cy="28" rx="21" ry="8"/>' +
        '<ellipse class="fb" cx="32" cy="20" rx="21" ry="8"/><ellipse class="fg" cx="32" cy="14" rx="21" ry="8"/>' +
        '<ellipse class="td" cx="32" cy="14" rx="10" ry="3.4" opacity=".55"/></svg><b>레슨비</b></div>' +
        '<div class="pk-pipe"><strong class="pk-pct"><i id="pkPct">100</i>%</strong>' +
        '<div class="pk-track"><i class="pk-fill" id="pkFill"></i><i class="pk-coin"></i><i class="pk-coin"></i><i class="pk-coin"></i></div>' +
        '<span class="pk-arrow">모두 프로에게</span></div>' +
        '<div class="pk-node" id="pkPro"><svg class="il pk-art" viewBox="0 0 64 64" aria-hidden="true">' +
        '<circle class="fg" cx="28" cy="11" r="8.5"/><path class="sg" d="M28 26v14" style="stroke-width:14"/>' +
        '<path class="sg" d="M24 44l-3 16M32 44l3 16" style="stroke-width:7.5"/><path class="sg" d="M31 28l11 10" style="stroke-width:5.5"/>' +
        '<path class="sw" d="M42 38l9 20" style="stroke-width:2.4"/><path class="sw" d="M51 58h7" style="stroke-width:4"/></svg><b>프로</b></div></div>' +
        '<div class="pk-result" id="pkResult"><span>' + check + '합리적인 가격</span><span>' + check + '고퀄리티 레슨</span></div>';
    },

    // 10장면: 10년을 향해 뻗는 길과 깃발 → 편하게 질문 → 가격 살펴보기(시간대·기간·레슨·락커)와 상담 시작
    start: function () {
      var road = 'M70 246C230 250 270 160 400 160S610 78 720 78';
      function mark(x, y, label) {
        return '<g class="st-ms" transform="translate(' + x + ',' + y + ')"><circle class="fw" r="11" style="stroke-width:4"/>' +
          '<text class="tw" y="40" text-anchor="middle" font-size="24" font-weight="800">' + label + '</text></g>';
      }
      var steps = ['시간대', '기간', '레슨', '락커'];
      return '<div class="st-road"><svg class="in-svg st-svg" viewBox="0 -34 800 334" aria-hidden="true">' +
        '<path class="fp" d="M0 300V262C200 268 270 176 410 170S640 84 800 70V300z"/>' +
        '<path class="st-dash" d="' + road + '"/>' +
        '<path id="stPath" class="sg" d="' + road + '" style="stroke-width:6"/>' +
        mark(70, 246, '지금') + mark(400, 160, '5년') +
        '<ellipse class="fd" cx="720" cy="80" rx="28" ry="9" opacity=".3"/>' +
        '<path id="stPole" class="sw" d="M720 80V-18" style="stroke-width:5"/><path id="stFlag" class="fg" d="M720 -16l68 23-68 23z"/>' +
        '<circle id="stBall" class="fw" cx="70" cy="236" r="12"/></svg>' +
        '<div class="st-ten"><b><i id="stYears">10</i>년</b><span>뒤를 내다보는 아카데미</span></div></div>' +
        '<div class="st-ask" id="stAsk"><i class="st-bubble" id="stBubble">?</i><p>궁금하신 점은 편하게 질문해 주세요</p></div>' +
        '<div class="st-steps" id="stSteps">' + steps.map(function (s, i) { return (i ? '<i>›</i>' : '') + '<span>' + s + '</span>'; }).join('') + '</div>' +
        '<div class="in-start"><button class="btn primary xl" data-act="intro-done"><i class="st-ripple" id="stRipple"></i>상담 시작</button></div>';
    }
  };

  /*
   * 장면 모션. B(시작 위치, 만드는 함수)로 박자를 등록한다.
   * from() 트윈은 등록하는 순간 시작 상태(숨김 등)로 그려지므로, 뒤 박자의 그림은 자기 차례까지 숨어 있다.
   */
  var motion = {
    logo: function (el, text, B) {
      B(0, function (g) {
        g.call(sfx('chime'), null, 0);
        g.from(el.querySelectorAll('.in-wm span, .in-logo-img'), { opacity: 0, y: 26, duration: 0.6, stagger: 0.045, ease: 'power2.out' }, 0);
        g.from(el.querySelector('.in-rule'), { scaleX: 0, duration: 0.7, ease: 'power2.inOut' }, '-=0.2');
        g.from(el.querySelectorAll('.in-branch, .in-slogan'), { opacity: 0, y: 12, duration: 0.5, stagger: 0.2 }, '-=0.2');
      });
      var thanks = el.querySelector('#inThanks');
      if (thanks) B(when(text, '귀하', 0.5), function (g) {
        g.from(thanks, { opacity: 0, y: 16, duration: 0.7, ease: 'power2.out' });
      });
    },

    bays: function (el, text, B) {
      var count = el.querySelector('#inBayCount'), n = { v: 0 };
      count.textContent = '0';
      B(0, function (g) {
        g.from(el.querySelectorAll('.in-bay'), { opacity: 0.12, duration: 0.3, stagger: { each: 0.1, onStart: sfx('tick') } }, 0);
        g.to(n, { v: 18, duration: 1.8, ease: 'none', onUpdate: function () { count.textContent = Math.round(n.v); } }, 0);
      });
      B(when(text, '1.5배', 0.3), function (g) {
        // 카드가 나온 뒤, 사람 발밑의 타석이 일반 넓이(80)에서 1.5배(120)로 양옆으로 넓어진다.
        g.from(el.querySelector('#inWide'), { opacity: 0, y: 18, duration: 0.5, ease: 'power2.out' }, 0);
        g.call(sfx('pop'), null, 0.55);
        g.from(el.querySelector('#inMat'), { attr: { x: 80, width: 80 }, duration: 1.1, ease: 'power2.inOut' }, 0.55);
        g.from(el.querySelector('#inWideMark'), { scaleX: 0.667, opacity: 0, transformOrigin: '50% 50%', duration: 1.1, ease: 'power2.inOut' }, 0.55);
      });
      B(when(text, '회원이 아닌', 0.55), function (g) {
        g.from(el.querySelector('#inPrivate'), { opacity: 0, y: 18, duration: 0.5, ease: 'power2.out' }, 0);
        g.from(el.querySelector('#inShackle'), { y: -9, duration: 0.3, ease: 'power2.in' }, 0.45);
        g.call(sfx('lock'), null, 0.75);
      });
    },

    clock: function (el, text, B) {
      B(0, function (g) {
        g.call(sfx('tick'), null, 0);
        g.to(el.querySelector('#inHand'), { rotation: 360, svgOrigin: '400 200', duration: 2.2, ease: 'power1.inOut' }, 0);
        g.from(el.querySelector('#in24'), { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(2)', onStart: sfx('chime') });
      });
      B(when(text, '무인', 0.25), function (g) {
        g.from(el.querySelector('#inUnmanned'), { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(2)', onStart: sfx('pop') });
      });
      B(when(text, '다른 연습장', 0.45), function (g) {
        g.from(el.querySelector('#inDistOther'), { opacity: 0, y: 12, duration: 0.4 }, 0);
        g.from(el.querySelectorAll('.dist.other i'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.5, stagger: 0.014, ease: 'power2.out' }, 0.1);
      });
      B(when(text, '원하시는', 0.75), function (g) {
        g.from(el.querySelector('#inDistOurs'), { opacity: 0, y: 12, duration: 0.4 }, 0);
        g.from(el.querySelectorAll('.dist.ours i'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.5, stagger: 0.014, ease: 'power2.out' }, 0.1);
      });
    },

    gc3: function (el, text, B) {
      var path = el.querySelector('#inTraj'), ball = el.querySelector('#inBall');
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      B(0, function (g) {
        g.from(el.querySelector('#inUsa'), { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(2)', onStart: sfx('pop') }, 0.3);
      });
      B(when(text, '정밀한', 0.3), function (g) {
        var t = { v: 0 };
        g.call(sfx('swing'), null, 0);
        g.to(path, { strokeDashoffset: 0, duration: 1.3, ease: 'power2.out' }, 0);
        g.to(t, {
          v: 1, duration: 1.3, ease: 'power2.out',
          onUpdate: function () {
            var p = path.getPointAtLength(len * t.v);
            ball.setAttribute('cx', p.x); ball.setAttribute('cy', p.y);
          }
        }, 0);
        Array.prototype.forEach.call(el.querySelectorAll('.in-stats b'), function (b, i) {
          var o = { v: 0 }, to = +b.getAttribute('data-to');
          b.textContent = '0';
          g.to(o, { v: to, duration: 0.9, ease: 'power1.out', onUpdate: function () { b.textContent = Math.round(o.v); } }, 0.6 + i * 0.15);
        });
      });
      B(when(text, '프로 선수', 0.6), function (g) {
        g.from(el.querySelectorAll('#inUsers > *'), { opacity: 0, y: 14, duration: 0.4, ease: 'back.out(1.6)', stagger: { each: 0.35, onStart: sfx('pop') } });
      });
    },

    partition: function (el, text, B) {
      B(0, function (g) {
        g.from(el.querySelectorAll('.in-panel'), {
          y: -420, duration: 0.5, ease: 'power3.in',
          stagger: { each: 0.22, onComplete: sfx('lock') }
        });
      });
    },

    putting: function (el, text, B) {
      B(0, function (g) {
        var ball = el.querySelector('#inPutt');
        g.to(ball, { x: 430, y: -72, duration: 1.9, ease: 'power2.out' });
        g.to(ball, { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: 0.25, onStart: sfx('cup') });
        g.to(el.querySelector('#inFlag'), { skewY: 6, transformOrigin: '0% 50%', duration: 0.3, yoyo: true, repeat: 3 }, '-=0.2');
      });
    },

    amenity: function (el, text, B) {
      function pop(id) {
        return function (g) {
          g.from(el.querySelector(id), { scale: 0.6, opacity: 0, duration: 0.5, ease: 'back.out(1.8)', onStart: sfx('pop') });
        };
      }
      B(0, pop('#tFit'));
      B(when(text, '주차', 0.2), pop('#tPark'));
      B(when(text, '또한', 0.5), function (g) {
        g.from(el.querySelector('#tClean'), { opacity: 0, y: 22, duration: 0.5, ease: 'power2.out' }, 0);
        g.call(sfx('sweep'), null, 0.4);
        g.to(el.querySelector('#inRobot'), { x: 262, duration: 2.6, ease: 'power1.inOut' }, 0.4);
        g.from(el.querySelectorAll('.in-spark'), { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: 0.4, ease: 'back.out(2.5)', stagger: 0.5 }, 1.1);
      });
    },

    slots: function (el, text, B) {
      [1, 2, 3].forEach(function (n) {
        var row = el.querySelector('#inSlot' + n);
        B(when(text, n + '부는', 0.12 + n * 0.1), function (g) {
          g.call(sfx('sweep'), null, 0);
          g.from(row, { opacity: 0.25, duration: 0.3 }, 0);
          g.from(row.querySelector('.rail-fill'), { width: 0, duration: 0.8, ease: 'power2.out' }, 0);
        });
      });
      function pop(ids) {
        return function (g) {
          g.from(el.querySelectorAll(ids), { scale: 0.7, opacity: 0, duration: 0.45, ease: 'back.out(1.8)', stagger: 0.12, onStart: sfx('pop') });
        };
      }
      B(when(text, '기본 1일', 0.6), pop('#u60'));
      B(when(text, '빈 타석', 0.72), pop('#uPlus1, #u30'));
      B(when(text, '타석 여유', 0.84), pop('#uPlus2, #uInf'));
    },

    package: function (el, text, B) {
      // 박자 1: 멤버십과 레슨이 양쪽에서 들어와 '+'로 만나고, 테두리가 둘을 감싸며 하나의 패키지가 된다.
      B(0, function (g) {
        g.from(el.querySelector('#pkMem'), { x: -90, opacity: 0, rotation: -4, duration: 0.65, ease: 'back.out(1.3)' }, 0);
        g.from(el.querySelector('#pkLesson'), { x: 90, opacity: 0, rotation: 4, duration: 0.65, ease: 'back.out(1.3)' }, 0.18);
        g.from(el.querySelector('#pkPlus'), { scale: 0, rotation: -180, duration: 0.5, ease: 'back.out(2.2)', onStart: sfx('pop') }, 0.6);
        g.to(el.querySelector('#pkMem'), { x: 10, duration: 0.22, ease: 'power2.in', yoyo: true, repeat: 1 }, 1.25);
        g.to(el.querySelector('#pkLesson'), { x: -10, duration: 0.22, ease: 'power2.in', yoyo: true, repeat: 1 }, 1.25);
        g.to(el.querySelector('#pkPlus'), { scale: 1.35, duration: 0.22, ease: 'power2.in', yoyo: true, repeat: 1 }, 1.25);
        g.fromTo(el.querySelector('#pkRing'), { clipPath: 'inset(0% 50% 0% 50%)', opacity: 0 },
          { clipPath: 'inset(0% 0% 0% 0%)', opacity: 1, duration: 0.7, ease: 'power2.out' }, 1.45);
        g.from(el.querySelector('#pkBadge'), { scale: 0, y: 14, duration: 0.5, ease: 'back.out(2.2)', onStart: sfx('chime') }, 1.9);
      });
      // 박자 2: 레슨비 → 프로. 관이 0에서 100%까지 차오르고 동전이 프로에게 건너간다.
      B(when(text, '스윙블랙은', 0.42), function (g) {
        var pct = el.querySelector('#pkPct'), o = { v: 0 };
        pct.textContent = '0';
        g.from(el.querySelector('#pkFlow'), { opacity: 0, y: 22, duration: 0.5, ease: 'power2.out' }, 0);
        g.from(el.querySelector('#pkFee'), { scale: 0.7, duration: 0.45, ease: 'back.out(2)' }, 0.1);
        g.from(el.querySelector('#pkPro'), { scale: 0.7, duration: 0.45, ease: 'back.out(2)' }, 0.25);
        g.from(el.querySelector('#pkFill'), { width: 0, duration: 1.5, ease: 'power1.inOut' }, 0.5);
        g.to(o, { v: 100, duration: 1.5, ease: 'power1.inOut', onUpdate: function () { pct.textContent = Math.round(o.v); } }, 0.5);
        g.to(el.querySelectorAll('.pk-coin'), {
          keyframes: { '0%': { left: '0%', opacity: 0 }, '12%': { opacity: 1 }, '88%': { opacity: 1 }, '100%': { left: '100%', opacity: 0 } },
          duration: 1.0, ease: 'power1.in', stagger: { each: 0.32, repeat: 1, repeatDelay: 0.25, onComplete: sfx('tick') }
        }, 0.7);
        g.to(el.querySelector('.pk-pct'), { scale: 1.18, duration: 0.2, ease: 'power2.out', yoyo: true, repeat: 1, onStart: sfx('ding') }, 2.0);
        g.to(el.querySelector('#pkPro'), { scale: 1.12, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 3 }, 1.7);
      });
      // 박자 3: 그래서 얻는 것 두 가지
      B(when(text, '합리적인', 0.74), function (g) {
        g.from(el.querySelectorAll('#pkResult span'), {
          opacity: 0, y: 18, scale: 0.85, duration: 0.45, ease: 'back.out(2)', stagger: { each: 0.4, onStart: sfx('pop') }
        });
      });
    },

    start: function (el, text, B) {
      var path = el.querySelector('#stPath'), ball = el.querySelector('#stBall');
      var len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      // 박자 1: 길이 지금에서 10년 깃발까지 그려지고, 공이 길을 따라 굴러가 홀에 들어간다. 숫자는 0에서 10까지 올라간다.
      B(0, function (g) {
        var t = { v: 0 }, years = el.querySelector('#stYears'), y = { v: 0 };
        var marks = el.querySelectorAll('.st-ms');
        years.textContent = '0';
        g.from(el.querySelector('.st-ten'), { opacity: 0, y: 14, duration: 0.5 }, 0.1);
        g.from(marks[0], { scale: 0, transformOrigin: '50% 50%', duration: 0.4, ease: 'back.out(2.5)', onStart: sfx('pop') }, 0);
        g.to(path, { strokeDashoffset: 0, duration: 2.6, ease: 'power1.inOut' }, 0.25);
        g.to(t, {
          v: 1, duration: 2.6, ease: 'power1.inOut',
          onUpdate: function () {
            var p = path.getPointAtLength(len * t.v);
            ball.setAttribute('cx', p.x); ball.setAttribute('cy', p.y - 11);
          }
        }, 0.25);
        g.to(y, { v: 10, duration: 2.6, ease: 'power1.inOut', onUpdate: function () { years.textContent = Math.round(y.v); } }, 0.25);
        g.from(marks[1], { scale: 0, transformOrigin: '50% 50%', duration: 0.4, ease: 'back.out(2.5)', onStart: sfx('pop') }, 1.45);
        g.from(el.querySelector('#stPole'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.45, ease: 'power2.out' }, 2.2);
        g.from(el.querySelector('#stFlag'), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.4, ease: 'back.out(2)', onStart: sfx('chime') }, 2.6);
        g.to(ball, { scale: 0, opacity: 0, transformOrigin: '50% 50%', duration: 0.25, ease: 'power2.in', onStart: sfx('cup') }, 2.9);
        g.to(el.querySelector('.st-ten b'), { scale: 1.15, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 }, 2.9);
        g.to(el.querySelector('#stFlag'), { skewY: 7, transformOrigin: '0% 50%', duration: 0.45, ease: 'sine.inOut', yoyo: true, repeat: 7 }, 3.0);
      });
      // 박자 2: 질문 말풍선
      B(when(text, '궁금하신', 0.45), function (g) {
        g.from(el.querySelector('#stAsk'), { opacity: 0, y: 18, duration: 0.5, ease: 'power2.out' }, 0);
        g.from(el.querySelector('#stBubble'), { scale: 0, rotation: -40, duration: 0.55, ease: 'back.out(3)', onStart: sfx('pop') }, 0.15);
        g.to(el.querySelector('#stBubble'), { rotation: 10, duration: 0.16, ease: 'sine.inOut', yoyo: true, repeat: 5 }, 0.75);
      });
      // 박자 3: 이제 볼 순서(시간대·기간·레슨·락커)가 차례로 나오고, 상담 시작 버튼에 물결이 퍼진다.
      // 버튼은 처음부터 누를 수 있게 보여 둔다.
      B(when(text, '지금부터', 0.74), function (g) {
        g.from(el.querySelectorAll('#stSteps > *'), { opacity: 0, x: -16, duration: 0.3, ease: 'power2.out', stagger: { each: 0.11, onStart: sfx('tick') } }, 0);
        g.to(el.querySelector('.in-start .btn'), { scale: 1.08, duration: 0.25, ease: 'power2.out', yoyo: true, repeat: 1, onStart: sfx('pop') }, 0.9);
        g.fromTo(el.querySelector('#stRipple'), { scaleX: 1, scaleY: 1, opacity: 0.7 },
          { scaleX: 1.22, scaleY: 1.6, opacity: 0, duration: 1.4, ease: 'power1.out', repeat: -1, repeatDelay: 0.5 }, 1.1);
      });
    }
  };

  var beats = [];      // { at, tl, fired }
  var held = false;    // 일시정지 중인지

  function clear() {
    beats.forEach(function (b) { b.tl.kill(); });
    beats = [];
    held = false;
  }
  function progress(p) {
    beats.forEach(function (b) {
      if (b.fired || p < b.at) return;
      b.fired = true;
      if (!held) b.tl.play();
    });
  }

  root.SBIntro = {
    html: function (scene, cfg, SB, text) {
      return (scenes[scene] || scenes.start)(cfg, SB, text || '');
    },
    // 장면 모션을 준비하고 첫 박자를 시작한다. text는 그 장면의 원고(박자 위치 계산용).
    // resumeAt을 주면(재생 도중 화면을 다시 그린 경우) 처음부터 틀지 않고 그 위치에서 이어 간다: { p: 재생 위치, total: 음성 길이(초) }
    play: function (scene, el, reduced, text, resumeAt) {
      clear();
      if (!el || reduced || !root.gsap || !motion[scene]) return;
      try {
        motion[scene](el, text || '', function (at, build) {
          var tl = root.gsap.timeline({ paused: true });
          build(tl);
          beats.push({ at: at, tl: tl, fired: false });
        });
      } catch (e) {
        // 모션을 만들다 실패하면 숨겨 둔 그림이 남지 않게 모두 끝 상태로 보낸 뒤 정지 화면으로 둔다.
        beats.forEach(function (b) { try { b.tl.progress(1); } catch (err) {} });
        clear();
        return;
      }
      if (!resumeAt) { progress(0); return; }
      // 이미 시작했던 박자는 그때부터 지난 시간만큼 건너뛴 자리에서 이어 간다(효과음은 다시 내지 않는다).
      beats.forEach(function (b) {
        if (resumeAt.p < b.at) return;
        b.fired = true;
        var into = Math.max(0, (resumeAt.p - b.at) * (resumeAt.total || 0));
        if (into >= b.tl.duration()) { b.tl.progress(1, true); return; }
        b.tl.time(into, true);
        b.tl.play();
      });
    },
    // 재생 위치(0~1)를 알려 주면 그 위치까지의 박자를 시작한다.
    progress: progress,
    stop: clear,
    // 장면 모션을 멈췄다 이어 재생한다(인트로 재생바의 일시정지·재생)
    pause: function () {
      held = true;
      beats.forEach(function (b) { if (b.fired) b.tl.pause(); });
    },
    resume: function () {
      held = false;
      beats.forEach(function (b) { if (b.fired && b.tl.progress() < 1) b.tl.play(); });
    },
    // 점검용: 박자 수와 시작된 박자 수
    state: function () {
      return { beats: beats.length, fired: beats.filter(function (b) { return b.fired; }).length, held: held };
    }
  };
})(typeof self !== 'undefined' ? self : this);
