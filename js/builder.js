/*
 * 이용권 설계(4단계 선택), 비교함, 견적 요약 화면.
 * 금액은 모두 SBPricing에서 계산한 값을 그대로 보여 준다.
 */
(function (root) {
  'use strict';

  var SB = root.SBApp, P = root.SBPricing, Store = root.SBStore, IL = root.SBIllust;
  var esc = SB.esc, money = SB.money;
  var A = SB.actions;
  var CHECK = '<span class="c-check">' + IL.icon('check') + '</span>';

  function discountAvailable() { return Store.activeToday(SB.cfg.discount); }
  function useSale() { return SB.S.discountOn && discountAvailable(); }
  function quoteOf(sel) { return P.quote(sel, SB.cfg); }

  function selOf(b) {
    if (!b.kind) return null;
    if (b.kind === 'membership' && !(b.slot && b.months)) return null;
    if (b.kind === 'coupon' && !b.coupon) return null;
    return {
      kind: b.kind, slot: b.slot, months: b.months, days: b.days, coupon: b.coupon,
      lesson: b.lessonCount ? { min: b.lessonMin, count: b.lessonCount } : null,
      locker: b.kind === 'daily' ? null : b.locker
    };
  }

  function nextStep(b) {
    if (!b.slot && b.kind !== 'daily' && b.kind !== 'coupon') return 1;
    if (!b.kind) return 2;
    if (!b.lessonDone) return 3;
    if (!b.lockerDone && b.kind !== 'daily') return 4;
    return 5;
  }

  // 선택한 뒤 넘어갈 단계.
  // 보통은 아직 안 고른 첫 단계로 간다. '다른 구성 더 담기'로 들어온 동안(b.walk)에는
  // 이전 선택이 모두 남아 있어도 1단계부터 한 단계씩 넘어간다(바로 견적으로 건너뛰지 않는다).
  function stepAfter(b) {
    if (!b.walk) return nextStep(b);
    var n = b.step + 1;
    if (n === 4 && b.kind === 'daily') n = 5; // 일일 이용권은 락커 단계가 없다
    if (n >= 5) {
      b.walk = false;
      return selOf(b) ? 5 : nextStep(b);
    }
    return n;
  }
  // 이전 선택을 바꾸지 않고 넘어가는 버튼(순서대로 넘어가는 동안에만 보인다)
  function keepBtn(b, has) {
    return (b.walk && has)
      ? '<button class="btn ghost wide keep" data-act="b-next">선택 그대로 다음 단계' + IL.icon('next') + '</button>' : '';
  }

  function kindLabel(b) {
    if (b.kind === 'membership') return b.months + '개월';
    if (b.kind === 'daily') return '일일 ' + b.days + '일';
    if (b.kind === 'coupon') return b.coupon + '회 쿠폰';
    return '';
  }
  function lessonLabel(b) {
    if (!b.lessonDone) return '';
    return b.lessonCount ? b.lessonMin + '분 ' + b.lessonCount + '회' : '안 받음';
  }
  function lockerLabel(b) {
    if (b.kind === 'daily') return '해당 없음';
    if (!b.lockerDone) return '';
    return b.locker ? P.LOCKERS[b.locker] : '안 씀';
  }
  // 패키지로 하면 레슨 기간을 더 주는 횟수 안내 (예: "8회·16회는 레슨 기간도 1개월 더 드립니다.")
  function extraNote() {
    var list = P.packageExtraList(SB.cfg);
    if (!list.length) return '';
    var same = list.every(function (x) { return x.extra === list[0].extra; });
    var who = list.length === P.LESSON_COUNTS.length ? '패키지 레슨은'
      : list.map(function (x) { return x.count + '회'; }).join('·') + '는';
    return who + ' 레슨 기간 ' + (same ? '+' + list[0].extra + '개월.' : '연장.');
  }
  function extraTag(months) {
    return months > 0 ? '<em class="tag more">레슨 기간 +' + months + '개월</em>' : '';
  }
  function slotChip(n) {
    return '<span class="chip s' + n + '">' + P.SLOTS[n].name + '<i>' + P.SLOTS[n].range + '</i></span>';
  }

  // 합계 표시: 할인 적용 전에는 원가만, 적용 후에는 원가에 줄을 긋고 할인가를 강조한다.
  function priceBlock(q, rk, cls) {
    var on = useSale();
    if (on && q.hasAnySale) {
      return '<div class="price ' + (cls || '') + ' is-sale"><s>' + P.fmt(q.total) + '원</s>' +
        '<span class="money sale"><b data-roll="' + q.saleTotal + '" data-rk="' + rk + '">' + P.fmt(q.saleTotal) + '</b><i>원</i></span>' +
        '<em class="off">-' + P.fmt(q.discount) + '원 · ' + q.discountRate + '%</em></div>';
    }
    return '<div class="price ' + (cls || '') + '">' +
      '<span class="money"><b data-roll="' + q.total + '" data-rk="' + rk + '">' + P.fmt(q.total) + '</b><i>원</i></span>' +
      (on ? '<em class="nooff">할인 대상 아님</em>' : '') + '</div>';
  }

  function itemPrice(key) {
    var it = SB.cfg.items[key];
    var sale = (useSale() && typeof it.sale === 'number' && it.sale < it.price) ? it.sale : null;
    return { price: it.price, shown: sale === null ? it.price : sale, sale: sale };
  }
  function cardPrice(key) {
    var p = itemPrice(key);
    return (p.sale !== null ? '<s class="was">' + P.fmt(p.price) + '원</s>' : '') + money(p.shown, p.sale !== null ? 'sale' : '');
  }

  // ---------- 단계 탭 ----------
  function stepTabs(b) {
    var items = [
      ['시간대', b.slot ? P.SLOTS[b.slot].name : ''],
      ['기간', kindLabel(b)],
      ['레슨', lessonLabel(b)],
      ['락커', lockerLabel(b)],
      ['견적', '']
    ];
    return '<nav class="steps" aria-label="선택 단계">' + items.map(function (it, i) {
      var n = i + 1;
      return '<button class="step' + (b.step === n ? ' on' : '') + (it[1] ? ' done' : '') + '" data-act="b-step" data-step="' + n + '">' +
        '<small>' + (n < 5 ? n : IL.icon('check')) + '</small><b>' + it[0] + '</b><span>' + esc(it[1] || ' ') + '</span></button>';
    }).join('') + '</nav>';
  }

  // ---------- STEP 1 시간대 ----------
  var SLOT_NOTES = {
    1: '출근 전 새벽·오전 연습에 맞습니다.',
    2: '낮 시간이 자유로운 분께 맞습니다.',
    3: '퇴근 후와 심야에도 이용합니다.'
  };
  var PRESETS = [[3, 8], [3, 16], [6, 16], [12, 8]];

  function step1(b) {
    var html = '<h1 class="q">언제 이용하세요?</h1>' +
      '<p class="q-sub">생활 패턴에 맞는 시간대를 골라 주세요.</p>';
    if (b.kind && !b.slot) {
      html += '<p class="note-line">' + IL.icon('info') + esc(kindLabel(b) + (b.lessonCount ? ' + 레슨 ' + b.lessonMin + '분 ' + b.lessonCount + '회' : '')) +
        ' 구성입니다. 시간대를 고르면 가격이 나옵니다.</p>';
    }
    if (b.walk) {
      html += '<p class="note-line">' + IL.icon('info') + '이전 구성이 선택되어 있습니다. 바꿀 단계만 바꾸세요.</p>' +
        keepBtn(b, !!b.slot);
    }
    var unfold = b.unfold; // 방금 고른 시간대만 펼침 모션을 넣는다(다시 그릴 때는 넣지 않는다)
    b.unfold = false;
    html += '<div class="choices col">' + [1, 2, 3].map(function (n) {
      var s = P.SLOTS[n], on = b.slot === n;
      return '<div class="slot-wrap s' + n + (on ? ' open' : '') + '">' +
        '<button class="choice slot s' + n + (on ? ' on' : '') + '" data-act="b-slot" data-v="' + n + '" aria-expanded="' + on + '">' +
        '<span class="c-name">' + s.name + '</span><span class="c-time">' + s.range + '</span>' +
        IL.rail({ ranges: [{ from: s.from, to: s.to, cls: 's' + n }] }) +
        '<span class="c-note">' + SLOT_NOTES[n] + '</span>' + CHECK + '</button>' +
        (on ? slotPackages(b, n, unfold) : '') + '</div>';
    }).join('') + '</div>';
    return html;
  }

  // 고른 시간대 카드가 아래로 넓어지며 보여 주는 추천 패키지.
  // 패키지를 고르면 바로 견적으로, '선택 안 함'을 고르면 다음 단계로 간다.
  function slotPackages(b, n, unfold) {
    var on = useSale();
    var picked = b.kind === 'membership' && b.lessonMin === 15 && b.lessonDone;
    var cards = PRESETS.map(function (p) {
      var q = quoteOf({ kind: 'membership', slot: n, months: p[0], lesson: { min: 15, count: p[1] }, locker: null });
      var v = P.view(q, on);
      var sale = on && q.hasAnySale;
      var sel = picked && b.months === p[0] && b.lessonCount === p[1];
      return '<button class="choice pkg' + (sel ? ' on' : '') + '" data-act="b-pkg" data-m="' + p[0] + '" data-c="' + p[1] + '">' +
        '<span class="c-name">' + p[0] + '개월 + 레슨 ' + p[1] + '회</span>' +
        (q.lesson.saving > 0 ? '<em class="tag save">레슨 ' + P.fmt(q.lesson.saving) + '원 절약</em>' : '') +
        '<span class="c-price">' + (sale ? '<s class="was">' + P.fmt(q.total) + '원</s>' : '') + money(v.total, sale ? 'sale' : '') + '</span>' +
        '<span class="c-note">한 달에 ' + P.fmt(v.monthly) + '원</span>' + CHECK + '</button>';
    }).join('');
    var skip = b.kind
      ? '고른 구성 그대로 다음 단계로'
      : '기간과 레슨을 직접 고르기';
    return '<div class="slot-pkgs' + (unfold ? ' unfold' : '') + '" id="slotPkgs"><div class="slot-pkgs-in">' +
      '<h2>추천 패키지로 시작</h2>' +
      '<p class="q-sub">' + esc(pkgPerk()) + '</p>' +
      '<div class="pkg-grid">' + cards + '</div>' +
      '<button class="choice pkg-none" data-act="b-pkg-none">' +
      '<span class="c-name">선택 안 함</span><span class="c-note">' + skip + '</span>' + IL.icon('next') + '</button>' +
      '</div></div>';
  }

  // 패키지 혜택 한 줄: 레슨 가격과 레슨 기간 (15분 레슨 기준 구성)
  function pkgPerk() {
    var note = extraNote();
    return '멤버십 + 15분 레슨 패키지는 레슨이 더 저렴합니다.' + (note ? ' ' + note : '');
  }

  // ---------- STEP 2 기간 ----------
  // 1개월권을 이어서 끊을 때보다 몇 % 저렴한지 (지금 보이는 가격 기준)
  function longRate(slot, months) {
    return months > 1 ? P.repeatOneMonth(slot, months, SB.cfg, useSale()).rate : 0;
  }
  function step2(b) {
    var base = b.slot || 1;
    var tabs = [['membership', '기간 이용권'], ['daily', '일일 이용권'], ['coupon', '횟수 쿠폰']];
    var html = '<h1 class="q">얼마나 이용하세요?</h1>' +
      '<div class="seg" role="tablist">' + tabs.map(function (t) {
        return '<button class="' + (b.tab === t[0] ? 'on' : '') + '" data-act="b-tab" data-v="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>';
    // 순서대로 넘어가는 동안에는 선택지 위에 '그대로 다음 단계' 버튼을 둔다(스크롤 없이 보이게).
    html += keepBtn(b, (b.tab === 'membership' && b.kind === 'membership' && !!b.months && b.months !== 1) ||
      (b.tab === 'coupon' && b.kind === 'coupon' && !!b.coupon));

    if (b.tab === 'membership') {
      if (!b.slot) html += '<p class="note-line">' + IL.icon('info') + '1부 기준 가격입니다. 시간대를 고르면 정확한 가격이 나옵니다.</p>';
      html += '<div class="choices grid2">' + P.MONTHS.map(function (m) {
        var q = quoteOf({ kind: 'membership', slot: base, months: m, lesson: null, locker: null });
        var v = P.view(q, useSale());
        var on = b.kind === 'membership' && b.months === m;
        return '<button class="choice period' + (on ? ' on' : '') + '" data-act="b-months" data-v="' + m + '">' +
          '<span class="c-name">' + m + '개월</span>' +
          (longRate(base, m) > 0 ? '<em class="tag">1개월권보다 ' + longRate(base, m) + '% 저렴</em>' : '<em class="tag none"> </em>') +
          '<span class="c-price">' + cardPrice('mem.' + m + '.' + base) + '</span>' +
          '<span class="c-note">한 달에 ' + P.fmt(v.monthly) + '원</span>' + CHECK + '</button>';
      }).join('') + '</div>';

      if (b.kind === 'membership' && b.months === 1) {
        var r = P.repeatOneMonth(base, 3, SB.cfg, useSale());
        var w = Math.round(r.long / r.repeated * 100);
        html += '<section class="hint">' +
          '<h2>3개월이면 한 달에 ' + P.fmt(r.monthly) + '원입니다</h2>' +
          '<p>1개월권을 3번 끊는 것보다 ' + r.rate + '% 저렴합니다.</p>' +
          '<div class="bars">' +
          '<div class="bar"><span>1개월권 3번</span><i style="width:100%"></i><b>' + P.fmt(r.repeated) + '원</b></div>' +
          '<div class="bar best"><span>3개월권 1번</span><i style="width:' + w + '%"></i><b>' + P.fmt(r.long) + '원</b></div>' +
          '</div>' +
          '<p class="save">3개월 기준 ' + P.fmt(r.saving) + '원을 아낍니다.</p>' +
          '<div class="hint-btns"><button class="btn ghost" data-act="b-next">1개월로 계속</button>' +
          '<button class="btn solid" data-act="b-months" data-v="3">3개월로 바꾸기</button></div></section>';
      }
    } else if (b.tab === 'daily') {
      html += dailyPanel(b, base);
    } else {
      html += '<div class="choices grid2">' + [10, 20].map(function (c) {
        var months = SB.cfg.couponMonths[c];
        var p = itemPrice('coupon.' + c);
        var on = b.kind === 'coupon' && b.coupon === c;
        return '<button class="choice period' + (on ? ' on' : '') + '" data-act="b-coupon" data-v="' + c + '">' +
          '<span class="c-name">' + c + '회 쿠폰</span><em class="tag none"> </em>' +
          '<span class="c-price">' + cardPrice('coupon.' + c) + '</span>' +
          '<span class="c-note">' + months + '개월 안에 ' + c + '번 방문 · 1회 ' + P.fmt(p.shown / c) + '원</span>' + CHECK + '</button>';
      }).join('') + '</div>' +
        '<p class="note-line">' + IL.icon('info') + '방문할 때마다 1회씩 차감되는 횟수권입니다.</p>';
    }
    return html;
  }

  function dailyPanel(b, base) {
    var daily = itemPrice('daily').shown;
    var days = b.days;
    var one = itemPrice('mem.1.' + base).shown;
    var three = quoteOf({ kind: 'membership', slot: base, months: 3, lesson: null, locker: null });
    var threeMonthly = P.view(three, useSale()).monthly;
    var be1 = P.breakevenDays(one, daily), be3 = P.breakevenDays(threeMonthly, daily);
    var cells = '';
    for (var d = 1; d <= 31; d++) {
      cells += '<i class="' + (d <= days ? 'on' : '') + (d === be1 ? ' be' : '') + '">' + d + '</i>';
    }
    var total = daily * days;
    var diff = total - one;
    return '<section class="daily">' +
      '<p class="q-sub">올 때마다 ' + P.fmt(daily) + '원을 내는 이용권입니다. 한 달에 며칠 오실지 넣어 보세요.</p>' +
      '<div class="stepper">' +
      '<button class="round" data-act="b-days" data-d="-1" aria-label="하루 줄이기">' + IL.icon('minus') + '</button>' +
      '<div class="stepper-val"><b>' + days + '</b>일</div>' +
      '<button class="round" data-act="b-days" data-d="1" aria-label="하루 늘리기">' + IL.icon('plus') + '</button>' +
      '<div class="quick">' + [5, 10, 15, 20, 30].map(function (n) {
        return '<button class="' + (days === n ? 'on' : '') + '" data-act="b-days" data-set="' + n + '">' + n + '일</button>';
      }).join('') + '</div></div>' +
      '<div class="cal" aria-hidden="true">' + cells + '</div>' +
      '<p class="cal-note"><i class="be-dot"></i>' + be1 + '일째부터는 1개월권(' + P.SLOTS[base].name + ' ' + P.fmt(one) + '원)이 더 저렴합니다.</p>' +
      '<div class="daily-sum"><div><small>일일 이용 ' + days + '일</small>' + money(total) + '</div>' +
      '<div class="vs">' + (diff > 0
        ? '1개월권보다 <b class="warn">' + P.fmt(diff) + '원 더</b> 듭니다'
        : (diff < 0 ? '1개월권보다 <b>' + P.fmt(-diff) + '원 덜</b> 듭니다' : '1개월권과 같은 금액입니다')) +
      '<br><span>3개월권은 한 달에 ' + be3 + '일 이상 오면 유리합니다</span></div></div>' +
      '<button class="btn solid wide" data-act="b-daily-ok">일일 이용 ' + days + '일로 선택</button></section>';
  }

  // ---------- STEP 3 레슨 ----------
  function step3(b) {
    var known = !!b.kind;
    var eligible = known ? P.isPackageEligible({ kind: b.kind, months: b.months }) : true;
    var mode = eligible ? 'pkg' : 'solo';
    var sub = !known
      ? '3개월 이상 가입 시 패키지 가격입니다.' + (extraNote() ? ' ' + extraNote() : '')
      : (eligible ? '3개월 이상 가입이라 패키지 가격입니다.' + (extraNote() ? ' ' + extraNote() : '')
        : '레슨 단독 가격입니다. 3개월 이상 가입하면 패키지 가격으로 내려갑니다.');

    function from(min) {
      var best = Infinity;
      P.LESSON_COUNTS.forEach(function (c) {
        best = Math.min(best, itemPrice(mode + '.' + min + '.' + c).shown / c);
      });
      return P.fmt(best);
    }
    var none = b.lessonDone && !b.lessonCount;
    var html = '<h1 class="q">레슨 받으세요?</h1><p class="q-sub">' + sub + '</p>' + keepBtn(b, b.lessonDone) +
      '<div class="choices grid3">' +
      '<button class="choice lesson' + (none ? ' on' : '') + '" data-act="b-lesson-min" data-v="0">' +
      '<span class="c-name">안 받음</span><span class="c-note">타석만 이용합니다.</span>' + CHECK + '</button>' +
      [15, 25].map(function (min) {
        return '<button class="choice lesson' + (b.lessonMin === min ? ' on' : '') + '" data-act="b-lesson-min" data-v="' + min + '">' +
          '<span class="c-name">' + min + '분 레슨</span>' +
          '<span class="c-note">' + esc(min === 15 ? SB.cfg.lessonInfo.m15 : SB.cfg.lessonInfo.m25) + '</span>' +
          '<span class="c-from">1회 ' + from(min) + '원부터</span>' + CHECK + '</button>';
      }).join('') + '</div>';

    if (b.lessonMin) {
      html += '<h2 class="q2" id="lessonCounts">' + b.lessonMin + '분 레슨, 몇 회 받으세요?</h2><div class="choices grid2">' +
        P.LESSON_COUNTS.map(function (c) {
          var key = mode + '.' + b.lessonMin + '.' + c;
          var p = itemPrice(key);
          var saving = mode === 'pkg' ? SB.cfg.items['solo.' + b.lessonMin + '.' + c].price - SB.cfg.items[key].price : 0;
          return '<button class="choice period' + (b.lessonCount === c ? ' on' : '') + '" data-act="b-lesson-count" data-v="' + c + '">' +
            '<span class="c-name">' + c + '회</span>' +
            '<span class="tags">' + (saving > 0 ? '<em class="tag save">단독보다 ' + P.fmt(saving) + '원 절약</em>' : '<em class="tag none"> </em>') +
            (mode === 'pkg' ? extraTag(P.packageExtraMonths(c, SB.cfg)) : '') + '</span>' +
            '<span class="c-price">' + cardPrice(key) + '</span>' +
            '<span class="c-note">1회 ' + P.fmt(p.shown / c) + '원 · 유효기간 ' + SB.cfg.validity[mode][c] + '개월</span>' + CHECK + '</button>';
        }).join('') + '</div>';
    }
    html += '<aside class="info">' + IL.icon('info') + '<div><b>레슨은 프로님 근무 시간에 예약합니다</b>' +
      '<p>' + SB.scheduleSummary().split(' / ').map(esc).join('<br>') + '</p>' +
      '<button class="link" data-act="go" data-to="lesson">프로 소개 보기</button></div></aside>';
    return html;
  }

  // ---------- STEP 4 락커 ----------
  function step4(b) {
    if (b.kind === 'daily') {
      return '<h1 class="q">락커 쓰세요?</h1><p class="q-sub">일일 이용권은 락커 없이 이용합니다.</p>' +
        '<button class="btn solid wide" data-act="b-step" data-step="5">견적 보기</button>';
    }
    var months = b.kind === 'membership' ? b.months : (b.kind === 'coupon' ? SB.cfg.couponMonths[b.coupon] : null);
    function card(v, name, note) {
      var on = b.lockerDone && (b.locker || 'none') === v;
      var price = '';
      if (v !== 'none') {
        var p = itemPrice('locker.' + v);
        price = '<span class="c-price">' + cardPrice('locker.' + v) + '<small> / 월</small></span>' +
          '<span class="c-note">' + (months ? months + '개월 이용 시 ' + P.fmt(p.shown * months) + '원' : '이용 개월 수만큼 더해집니다') + '</span>';
      } else price = '<span class="c-note">' + note + '</span>';
      return '<button class="choice locker' + (on ? ' on' : '') + '" data-act="b-locker" data-v="' + v + '">' +
        '<span class="c-name">' + name + '</span>' + price + CHECK + '</button>';
    }
    return '<h1 class="q">락커 쓰세요?</h1>' +
      '<p class="q-sub">요금은 한 달 기준이며 이용 개월 수만큼 더해집니다.</p>' +
      keepBtn(b, b.lockerDone) +
      '<div class="locker-wrap">' + SB.media('facility-locker', 'locker', 'locker-art') +
      '<div class="choices col">' + card('none', '안 씀', '장비를 가지고 다닙니다.') + card('top', '상단 락커') + card('bottom', '하단 락커') + '</div></div>';
  }

  // ---------- 견적표 (스코어카드 모양) ----------
  function sheet(q, rk) {
    var on = useSale();
    var rows = q.lines.map(function (l) {
      var amount = (on && l.hasSale)
        ? '<s>' + P.fmt(l.price) + '</s><b class="sale">' + P.fmt(l.sale) + '</b>'
        : '<b>' + P.fmt(l.price) + '</b>' + (on ? '<em>할인 대상 아님</em>' : '');
      return '<tr><th>' + esc(l.label) + '</th><td>' + esc(l.note) + '</td><td class="r">' + amount + '</td></tr>';
    }).join('');
    var v = P.view(q, on);
    var foot = '<tr class="total"><th>합계</th><td></td><td class="r">' + priceBlock(q, rk) + '</td></tr>' +
      '<tr><th>한 달에 얼마?</th><td>' + (q.sel.kind === 'daily' ? '한 달 ' + q.sel.days + '일 방문 기준' : q.months + '개월로 나눈 금액') + '</td><td class="r"><b>' + P.fmt(v.monthly) + '</b></td></tr>';
    if (q.lesson) {
      foot += '<tr><th>레슨 1회당</th><td>' + q.lesson.min + '분 · ' + (q.lesson.mode === 'pkg' ? '패키지가' : '단독가') + '</td><td class="r"><b>' + P.fmt(v.perSession) + '</b></td></tr>';
    }
    return '<table class="sheet"><thead><tr><th>항목</th><th>내용</th><th class="r">금액 (원)</th></tr></thead>' +
      '<tbody>' + rows + '</tbody><tfoot>' + foot + '</tfoot></table>';
  }

  function tips(q) {
    var out = [], sel = q.sel, on = useSale(), cfg = SB.cfg;
    var daily = itemPrice('daily').shown;
    if (q.lesson && q.lesson.saving > 0) out.push('패키지로 레슨 ' + P.fmt(q.lesson.saving) + '원 절약');
    if (q.lesson && q.lesson.extraMonths > 0) out.push('패키지라 레슨 기간 +' + q.lesson.extraMonths + '개월');
    if (sel.kind === 'membership') {
      var line = q.lines[0];
      var be = P.breakevenDays((on ? line.sale : line.price) / q.months, daily);
      if (sel.months === 1) {
        var r = P.repeatOneMonth(sel.slot, 3, cfg, on);
        out.push('3개월권이면 한 달에 ' + P.fmt(r.monthly) + '원');
      }
      out.push('한 달 ' + be + '일 이상 오면 일일권보다 유리');
    } else if (sel.kind === 'daily') {
      var slot = sel.slot || 1;
      var one = itemPrice('mem.1.' + slot).shown;
      var d = q.lines[0][on ? 'sale' : 'price'] - one;
      if (d > 0) out.push('1개월권(' + P.SLOTS[slot].name + ')보다 ' + P.fmt(d) + '원 비쌈');
      else if (d < 0) out.push('1개월권(' + P.SLOTS[slot].name + ')보다 ' + P.fmt(-d) + '원 저렴');
    }
    return out;
  }

  function step5(b) {
    var sel = selOf(b);
    if (!sel) {
      return '<h1 class="q">견적</h1><p class="q-sub">시간대와 기간을 고르면 견적이 나옵니다.</p>' +
        '<button class="btn solid wide" data-act="b-step" data-step="' + nextStep(b) + '">이어서 고르기</button>';
    }
    var q = quoteOf(sel);
    var t = tips(q);
    return '<h1 class="q">이 구성의 견적입니다</h1>' +
      '<p class="q-sub">단계 버튼으로 바꿀 수 있습니다. 고민되면 비교함에 담아 보세요.</p>' +
      '<div class="sel-chips">' + (sel.kind === 'membership' ? slotChip(sel.slot) : '') + '</div>' +
      sheet(q, 's5-total') +
      (t.length ? '<ul class="tips">' + t.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '');
  }

  // ---------- 하단 요약 바 ----------
  function sumBar(b) {
    var sel = selOf(b), q = sel ? quoteOf(sel) : null;
    var chips = '';
    if (b.slot && b.kind !== 'daily' && b.kind !== 'coupon') chips += '<span class="chip s' + b.slot + '">' + P.SLOTS[b.slot].name + '</span>';
    if (b.kind) chips += '<span class="chip">' + esc(kindLabel(b)) + '</span>';
    if (b.lessonDone) chips += '<span class="chip">레슨 ' + esc(lessonLabel(b)) + '</span>';
    if (b.lockerDone && b.kind !== 'daily') chips += '<span class="chip">락커 ' + esc(lockerLabel(b)) + '</span>';
    var avail = discountAvailable();
    var left = q
      ? '<div class="sum-chips">' + chips + '</div>' + priceBlock(q, 'b-total', 'big') +
        '<div class="sum-month">한 달에 얼마? <b>' + P.fmt(P.view(q, useSale()).monthly) + '원</b></div>'
      : '<div class="sum-chips">' + chips + '</div><div class="sum-empty">선택하면 여기에 합계가 나옵니다</div>';
    var btns = (avail ? '<button class="btn sale" data-act="discount-toggle">' + (useSale() ? '원가 보기' : '할인 적용') + '</button>' : '') +
      '<button class="btn primary" id="addBtn" data-act="b-add"' + (q ? '' : ' disabled') + '>' +
      (b.editing ? '수정 내용 저장' : '비교함에 담기') + '</button>';
    // sum-title은 요약이 옆 칸으로 가는 터치스크린 가로형 배치에서만 보인다.
    return '<footer class="sum"><div class="sum-l"><b class="sum-title">지금 고른 구성</b>' + left + '</div><div class="sum-r">' + btns + '</div></footer>';
  }

  SB.screens.builder = {
    ment: 'builder',
    enter: function (opt) {
      if (opt.fresh) SB.S.b = SB.freshBuilder();
      if (opt.step) SB.S.b.step = opt.step;
    },
    render: function () {
      var b = SB.S.b;
      var body = [step1, step2, step3, step4, step5][b.step - 1](b);
      return {
        html: stepTabs(b) + '<div class="step-body">' + body + '</div>',
        footer: sumBar(b),
        scrollKey: b.step + ':' + b.tab
      };
    }
  };

  function advance() {
    var b = SB.S.b;
    SB.render();
    root.setTimeout(function () {
      if (SB.S.b !== b || SB.S.screen !== 'builder') return;
      b.step = stepAfter(b);
      SB.render();
      if (b.step === 3) SB.sayOnce('lesson');
    }, 380);
  }

  A['b-step'] = function (d) {
    SB.sfx('click');
    SB.S.b.step = +d.step;
    if (SB.S.b.step === 5) SB.S.b.walk = false; // 견적으로 직접 가면 순서대로 넘기기를 끝낸다
    SB.render();
    if (SB.S.b.step === 3) SB.sayOnce('lesson');
  };
  A['b-next'] = function () {
    SB.sfx('click');
    SB.S.b.step = stepAfter(SB.S.b);
    SB.render();
    if (SB.S.b.step === 3) SB.sayOnce('lesson');
  };
  // 시간대를 고르면 그 카드가 아래로 넓어지며 추천 패키지를 보여 준다(다음 단계로 바로 넘어가지 않는다).
  A['b-slot'] = function (d) {
    var b = SB.S.b, v = +d.v;
    SB.sfx('click');
    b.unfold = b.slot !== v;
    b.slot = v;
    SB.sayOnce('slot' + d.v);
    SB.render();
    // 펼침이 끝난 뒤, 내용이 화면 아래로 넘치면 고른 카드를 화면 위쪽으로 올린다.
    root.setTimeout(function () {
      var el = root.document.getElementById('slotPkgs'), main = root.document.getElementById('main');
      if (SB.S.b !== b || !el || !main || !el.scrollIntoView) return;
      if (el.getBoundingClientRect().bottom > main.getBoundingClientRect().bottom) {
        el.parentNode.scrollIntoView({ behavior: SB.reduced ? 'auto' : 'smooth', block: 'start' });
      }
    }, 380);
  };
  // 추천 패키지 선택: 기간과 15분 레슨을 한 번에 정하고 견적으로 간다. 락커는 고른 적이 없으면 '안 씀'으로 둔다.
  A['b-pkg'] = function (d) {
    var b = SB.S.b;
    SB.sfx('click');
    b.kind = 'membership'; b.tab = 'membership'; b.months = +d.m;
    b.lessonMin = 15; b.lessonCount = +d.c; b.lessonDone = true;
    if (!b.lockerDone) { b.locker = null; b.lockerDone = true; }
    b.walk = false;
    SB.render();
    root.setTimeout(function () {
      if (SB.S.b !== b || SB.S.screen !== 'builder') return;
      b.step = 5;
      SB.render();
    }, 380);
  };
  // 선택 안 함: 다음 단계로 넘어가 하나씩 직접 고른다.
  A['b-pkg-none'] = function () {
    var b = SB.S.b;
    SB.sfx('click');
    b.step = stepAfter(b);
    SB.render();
    if (b.step === 3) SB.sayOnce('lesson');
  };
  A['b-tab'] = function (d) { SB.sfx('click'); SB.S.b.tab = d.v; SB.render(); };
  A['b-months'] = function (d) {
    var b = SB.S.b;
    SB.sfx('click');
    b.kind = 'membership'; b.tab = 'membership'; b.months = +d.v;
    if (b.months === 1) {
      SB.render();
      if (!SB.S.heard.oneMonth) {
        SB.S.heard.oneMonth = 1;
        var r = P.repeatOneMonth(b.slot || 1, 3, SB.cfg, useSale());
        // 자막에는 숫자로, 음성에는 읽기 규칙으로 바꾼 문장을 쓴다.
        SB.say('3개월로 가입하시면 한 달에 ' + P.won(r.monthly) + '으로 더 알뜰합니다.',
          { say: '3개월로 가입하시면 한 달에 ' + P.wonSpoken(r.monthly) + '으로 더 알뜰합니다.' });
      }
      return;
    }
    advance();
  };
  A['b-days'] = function (d) {
    var b = SB.S.b;
    SB.sfx('tick');
    b.days = d.set ? +d.set : b.days + (+d.d);
    b.days = Math.max(1, Math.min(31, b.days));
    SB.render();
  };
  A['b-daily-ok'] = function () {
    var b = SB.S.b;
    SB.sfx('click');
    b.kind = 'daily'; b.locker = null; b.lockerDone = true;
    advance();
  };
  A['b-coupon'] = function (d) {
    var b = SB.S.b;
    SB.sfx('click');
    b.kind = 'coupon'; b.coupon = +d.v;
    advance();
  };
  A['b-lesson-min'] = function (d) {
    var b = SB.S.b, v = +d.v;
    SB.sfx('click');
    if (!v) {
      b.lessonMin = null; b.lessonCount = null; b.lessonDone = true;
      advance();
      return;
    }
    if (b.lessonMin !== v) { b.lessonCount = null; b.lessonDone = false; }
    b.lessonMin = v;
    SB.render();
    var el = root.document.getElementById('lessonCounts');
    if (el && el.scrollIntoView) el.scrollIntoView({ behavior: SB.reduced ? 'auto' : 'smooth', block: 'start' });
  };
  A['b-lesson-count'] = function (d) {
    var b = SB.S.b;
    SB.sfx('click');
    b.lessonCount = +d.v; b.lessonDone = true;
    advance();
  };
  A['b-locker'] = function (d) {
    var b = SB.S.b;
    SB.sfx('click');
    b.locker = d.v === 'none' ? null : d.v; b.lockerDone = true;
    advance();
  };

  // ---------- 할인 적용 ----------
  A['discount-toggle'] = function () {
    var S = SB.S;
    if (!discountAvailable()) return;
    S.discountOn = !S.discountOn;
    SB.render();
    if (!S.discountOn) { SB.sfx('click'); return; }
    var q = null, name = '';
    if (S.screen === 'builder') {
      var sel = selOf(S.b);
      q = sel ? quoteOf(sel) : null;
    } else if (S.compare.length) {
      var qs = S.compare.map(function (c) { return quoteOf(c.sel); });
      var cmp = P.compare(qs, true);
      var i = Math.max(0, cmp.diffs.indexOf(0));
      q = qs[i]; name = S.compare[i].name;
    }
    if (q && q.hasAnySale) {
      SB.sfx('sparkle');
      var head = '할인이 적용되었습니다. ' + (name ? name + SB.josa(name, '은', '는') + ' ' : '') + '원가 ';
      SB.say(head + P.won(q.total) + '에서 ' + P.won(q.saleTotal) + '으로, ' + P.won(q.discount) + ' 할인됩니다.',
        { say: head + P.wonSpoken(q.total) + '에서 ' + P.wonSpoken(q.saleTotal) + '으로, ' + P.wonSpoken(q.discount) + ' 할인됩니다.' });
    } else if (q) {
      SB.sfx('click');
      SB.say('이 구성에는 할인 대상 항목이 없습니다.');
    }
  };

  // ---------- 비교함 ----------
  function nextName() {
    var used = SB.S.compare.map(function (c) { return c.name; });
    var names = ['A안', 'B안', 'C안'];
    for (var i = 0; i < names.length; i++) if (used.indexOf(names[i]) < 0) return names[i];
    return (used.length + 1) + '번 안';
  }
  function fly() {
    var from = root.document.getElementById('addBtn'), to = root.document.getElementById('cartBtn');
    if (!from || !to || !root.gsap || SB.reduced) return;
    var a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    var dot = root.document.createElement('div');
    dot.className = 'fly';
    dot.style.left = (a.left + a.width / 2 - 24) + 'px';
    dot.style.top = (a.top + a.height / 2 - 24) + 'px';
    root.document.body.appendChild(dot);
    root.gsap.to(dot, {
      x: b.left + b.width / 2 - (a.left + a.width / 2), y: b.top + b.height / 2 - (a.top + a.height / 2),
      scale: 0.25, opacity: 0.2, duration: 0.55, ease: 'power2.in',
      onComplete: function () { dot.remove(); }
    });
  }
  function countWord(n) { return ['', '한', '두', '세'][n] || String(n); }

  function added(entry) {
    var S = SB.S;
    fly();
    SB.sfx('whoosh');
    SB.render();
    SB.say('비교함에 담았습니다. 지금 ' + countWord(S.compare.length) + ' 개가 담겨 있어요.');
    SB.openModal(
      '<h2>비교함에 담았습니다</h2>' +
      '<p><b>' + esc(entry.name) + '</b> ' + esc(P.describe(entry.sel)) + '</p>' +
      '<p class="dim">지금 ' + S.compare.length + '개가 담겨 있습니다. 최대 3개까지 나란히 비교합니다.</p>' +
      '<div class="modal-btns"><button class="btn ghost" data-act="c-more">다른 구성 더 담기</button>' +
      '<button class="btn primary" data-act="go" data-to="compare">비교함 보기</button></div>');
  }

  A['b-add'] = function () {
    var S = SB.S, b = S.b, sel = selOf(b);
    if (!sel) { SB.toast('시간대와 기간을 먼저 골라 주세요'); return; }
    if (b.editing) {
      var cur = S.compare.filter(function (c) { return c.id === b.editing; })[0];
      b.editing = null;
      if (cur) {
        cur.sel = sel;
        SB.sfx('confirm');
        SB.toast(cur.name + josaText(cur.name) + ' 수정했습니다');
        SB.go('compare');
        return;
      }
    }
    if (S.compare.length >= 3) {
      SB.sfx('warn');
      SB.openModal(
        '<h2>비교함이 가득 찼습니다</h2><p>어떤 안을 이 구성으로 바꿀까요?</p>' +
        '<div class="replace-list">' + S.compare.map(function (c) {
          return '<button class="replace" data-act="c-replace" data-id="' + c.id + '"><b>' + esc(c.name) + '</b><span>' + esc(P.describe(c.sel)) + '</span></button>';
        }).join('') + '</div>' +
        '<div class="modal-btns"><button class="btn ghost" data-act="modal-close">담지 않기</button></div>');
      return;
    }
    var entry = { id: 'c' + Date.now(), name: nextName(), sel: sel };
    S.compare.push(entry);
    added(entry);
  };
  function josaText(name) { return SB.josa(name, '을', '를'); }

  A['c-replace'] = function (d) {
    var S = SB.S, sel = selOf(S.b);
    var cur = S.compare.filter(function (c) { return c.id === d.id; })[0];
    if (!cur || !sel) return;
    cur.sel = sel;
    SB.closeModal();
    added(cur);
  };
  // 다른 구성 더 담기: 이전 선택은 모두 남긴 채 1단계(시간대)로 돌아가 한 단계씩 다시 넘어간다.
  function startAnother() {
    var b = SB.S.b;
    b.editing = null;
    b.step = 1;
    b.walk = true;
    if (b.kind) b.tab = b.kind;
    if (SB.S.screen !== 'builder') SB.go('builder'); else SB.render();
  }
  A['c-more'] = function () {
    SB.closeModal();
    startAnother();
  };
  A['c-edit'] = function (d) {
    var c = SB.S.compare.filter(function (x) { return x.id === d.id; })[0];
    if (!c) return;
    var s = c.sel;
    SB.S.b = {
      step: 5, tab: s.kind, slot: s.slot || null, kind: s.kind, months: s.months || null,
      days: s.days || 30, coupon: s.coupon || null,
      lessonMin: s.lesson ? s.lesson.min : null, lessonCount: s.lesson ? s.lesson.count : null, lessonDone: true,
      locker: s.locker || null, lockerDone: true, editing: c.id
    };
    SB.sfx('click');
    SB.go('builder');
  };
  A['c-del'] = function (d) {
    var S = SB.S;
    S.compare = S.compare.filter(function (x) { return x.id !== d.id; });
    if (S.b.editing === d.id) S.b.editing = null;
    SB.sfx('click');
    SB.render();
  };
  A['c-rename'] = function (d) {
    var c = SB.S.compare.filter(function (x) { return x.id === d.id; })[0];
    if (!c) return;
    SB.openModal(
      '<h2>이름 바꾸기</h2>' +
      '<input class="field" id="renameInput" maxlength="10" value="' + esc(c.name) + '" aria-label="안 이름">' +
      '<div class="modal-btns"><button class="btn ghost" data-act="modal-close">취소</button>' +
      '<button class="btn primary" data-act="c-rename-ok" data-id="' + c.id + '">이름 저장</button></div>');
    var input = root.document.getElementById('renameInput');
    if (input) { input.focus(); input.select(); }
  };
  A['c-rename-ok'] = function (d) {
    var c = SB.S.compare.filter(function (x) { return x.id === d.id; })[0];
    var input = root.document.getElementById('renameInput');
    var name = input ? input.value.trim() : '';
    if (c && name) c.name = name;
    SB.closeModal();
    SB.render();
  };
  A['c-pick'] = function (d) {
    SB.S.pick = d.id;
    SB.sfx('confirm');
    SB.go('quote');
  };
  // 비교함 화면의 '다른 구성 담기'도 같은 방식으로 동작한다.
  A['c-new'] = function () {
    SB.sfx('click');
    if (SB.S.b.kind) { startAnother(); return; }
    SB.S.b = SB.freshBuilder();
    SB.go('builder');
  };

  function periodText(sel) {
    if (sel.kind === 'membership') return sel.months + '개월';
    if (sel.kind === 'daily') return '일일 이용 ' + sel.days + '일';
    return sel.coupon + '회 쿠폰 (' + SB.cfg.couponMonths[sel.coupon] + '개월)';
  }

  SB.screens.compare = {
    render: function () {
      var S = SB.S, list = S.compare;
      if (!list.length) {
        return {
          html: '<div class="empty"><h1 class="q">비교함이 비어 있습니다</h1>' +
            '<p class="q-sub">이용권을 설계한 뒤 비교함에 담으면 최대 3개 구성을 나란히 비교합니다.</p>' +
            '<button class="btn primary wide" data-act="go" data-to="builder">이용권 설계하기</button></div>'
        };
      }
      var on = useSale();
      var qs = list.map(function (c) { return quoteOf(c.sel); });
      var cmp = P.compare(qs, on);
      var avail = discountAvailable();

      function row(cls, label, fn) {
        return '<div class="cl ' + cls + '">' + label + '</div>' + list.map(function (c, i) {
          return '<div class="cc ' + cls + '">' + fn(c, qs[i], i) + '</div>';
        }).join('');
      }

      var grid =
        row('r-name', '', function (c, q, i) {
          return '<button class="cname" data-act="c-rename" data-id="' + c.id + '">' + esc(c.name) + IL.icon('edit') + '</button>' +
            (cmp.cheapest[i] ? '<em class="badge best">가장 저렴해요</em>' : '') +
            (cmp.bestMonthly[i] ? '<em class="badge month">한 달 기준 가장 알뜰해요</em>' : '');
        }) +
        row('r-slot', '시간대', function (c) {
          return c.sel.kind === 'membership' ? slotChip(c.sel.slot) : '<span class="dim">구분 없음</span>';
        }) +
        row('r-period', '기간', function (c) { return '<b>' + esc(periodText(c.sel)) + '</b>'; }) +
        row('r-lesson', '레슨', function (c, q) {
          return q.lesson ? '<b>' + q.lesson.min + '분 ' + q.lesson.count + '회</b><small>' + (q.lesson.mode === 'pkg' ? '패키지가' : '단독가') + ' · 유효 ' + q.lesson.validityMonths + '개월</small>' : '<span class="dim">없음</span>';
        }) +
        row('r-locker', '락커', function (c) {
          return c.sel.locker ? '<b>' + P.LOCKERS[c.sel.locker] + '</b>' : '<span class="dim">안 씀</span>';
        }) +
        row('r-total', '합계', function (c, q) { return priceBlock(q, 'c-total-' + c.id); }) +
        row('r-month', '한 달에<br>얼마?', function (c, q, i) { return '<b>' + P.fmt(cmp.monthlies[i]) + '원</b>'; }) +
        row('r-per', '레슨<br>1회당', function (c, q) {
          var v = P.view(q, on);
          return q.lesson ? '<b>' + P.fmt(v.perSession) + '원</b>' : '<span class="dim">-</span>';
        }) +
        row('r-diff', '최저가<br>대비', function (c, q, i) {
          if (list.length < 2) return '<span class="dim">-</span>';
          return cmp.diffs[i] === 0 ? '<b class="best">최저가</b>' : '<b>+' + P.fmt(cmp.diffs[i]) + '원</b>';
        }) +
        row('r-tips', '참고', function (c, q) {
          var t = tips(q).slice(0, 1);
          return t.length ? '<ul>' + t.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '';
        }) +
        row('r-act', '', function (c) {
          return '<button class="btn primary sm" data-act="c-pick" data-id="' + c.id + '">이 구성으로 결정하기</button>' +
            '<div class="mini"><button data-act="c-edit" data-id="' + c.id + '">' + IL.icon('edit') + '수정</button>' +
            '<button data-act="c-del" data-id="' + c.id + '">' + IL.icon('trash') + '빼기</button></div>';
        });

      return {
        html: '<div class="cmp-head"><div><h1 class="q">비교함</h1>' +
          '<p class="q-sub">' + (list.length < 2 ? '구성을 하나 더 담으면 나란히 비교할 수 있습니다.' : (on ? '할인가 기준으로 비교합니다.' : '원가 기준으로 비교합니다.')) + '</p></div>' +
          (avail ? '<button class="btn sale" data-act="discount-toggle">' + (on ? '원가 보기' : '할인 적용') + '</button>' : '') + '</div>' +
          '<div class="cmp n' + list.length + '" style="--n:' + list.length + '">' + grid + '</div>' +
          (list.length < 3 ? '<button class="btn ghost wide add-more" data-act="c-new">' + IL.icon('plus') + '다른 구성 담기</button>' : ''),
        noCart: true,
        scrollKey: 'cmp'
      };
    },
    after: function () {
      var S = SB.S, list = S.compare;
      if (list.length < 2) return;
      var on = useSale();
      var key = 'cmp:' + list.map(function (c) { return c.id + JSON.stringify(c.sel); }).join('|') + on;
      if (S.heard[key]) return;
      S.heard[key] = 1;
      var qs = list.map(function (c) { return quoteOf(c.sel); });
      var cmp = P.compare(qs, on);
      var order = cmp.totals.map(function (t, i) { return i; }).sort(function (a, b) { return cmp.totals[a] - cmp.totals[b]; });
      var a = order[0], b = order[1];
      var diff = cmp.totals[b] - cmp.totals[a];
      if (!diff) return;
      SB.sfx('ding');
      var who = list[a].name + SB.josa(list[a].name, '이', '가') + ' ' + list[b].name + '보다 ';
      var tail = ' 저렴합니다.' + ((!qs[a].lesson && qs[b].lesson) ? ' 다만 레슨은 포함되어 있지 않습니다.' : '');
      SB.say(who + P.won(diff) + tail, { say: who + P.wonSpoken(diff) + tail });
    }
  };

  // ---------- 견적 요약 ----------
  SB.screens.quote = {
    render: function () {
      var S = SB.S;
      var c = S.compare.filter(function (x) { return x.id === S.pick; })[0];
      if (!c) return { html: '<div class="empty"><h1 class="q">선택한 구성이 없습니다</h1><button class="btn primary wide" data-act="go" data-to="compare">비교함으로</button></div>' };
      var q = quoteOf(c.sel);
      var today = new Date();
      var info = [];
      if (c.sel.kind === 'membership') info.push(['이용 시간', P.SLOTS[c.sel.slot].name + ' ' + P.SLOTS[c.sel.slot].range]);
      info.push(['기간', periodText(c.sel)]);
      if (q.lesson) {
        info.push(['레슨', q.lesson.min + '분 ' + q.lesson.count + '회, 유효기간 ' + q.lesson.validityMonths + '개월']);
        info.push(['레슨 가능 시간', SB.scheduleSummary()]);
      }
      return {
        html: '<div class="quote">' +
          '<p class="quote-date">' + today.getFullYear() + '. ' + (today.getMonth() + 1) + '. ' + today.getDate() + '. 견적</p>' +
          '<h1 class="q">' + esc(c.name) + josaText(c.name) + ' 골랐습니다</h1>' +
          '<p class="q-sub">이 화면을 직원에게 보여 주세요. 접수를 도와드립니다.</p>' +
          '<dl class="facts">' + info.map(function (x) { return '<div><dt>' + x[0] + '</dt><dd>' + esc(x[1]) + '</dd></div>'; }).join('') + '</dl>' +
          sheet(q, 'q-total') +
          '<p class="pledge">' + esc(SB.cfg.texts.pledge) + '</p>' +
          '<div class="quote-btns"><button class="btn ghost" data-act="back">비교함으로 돌아가기</button>' +
          '<button class="btn primary" data-act="finish">상담 마치기</button></div></div>',
        noCart: true
      };
    }
  };
  A.finish = function () {
    SB.openModal(
      '<h2>상담을 마칠까요?</h2><p>비교함과 고른 내용을 지우고 처음 화면으로 돌아갑니다.</p>' +
      '<div class="modal-btns"><button class="btn ghost" data-act="modal-close">계속 보기</button>' +
      '<button class="btn primary" data-act="finish-yes">상담 마치기</button></div>');
  };
  A['finish-yes'] = function () { SB.resetSession(true); };

  // 터치스크린의 가격판에서 가격을 누르면 그 시간대·기간으로 이용권 설계를 연다.
  // 레슨·락커처럼 이미 고른 내용은 그대로 두고, 아직 안 고른 첫 단계로 간다.
  SB.pickMembership = function (slot, months) {
    if (!P.SLOTS[slot] || P.MONTHS.indexOf(months) < 0) return false;
    if (SB.S.screen === 'admin') return false; // 관리자가 값을 고치는 중에는 화면을 바꾸지 않는다
    var b = SB.S.b;
    b.editing = null; b.walk = false;
    b.slot = slot; b.kind = 'membership'; b.tab = 'membership'; b.months = months;
    b.step = nextStep(b);
    root.SBVoice.unlock();
    SB.keepAwake();
    SB.keepAlive();
    if (root.SBIntro) root.SBIntro.stop();
    SB.sfx('click');
    if (SB.S.screen === 'builder') SB.render();
    else SB.go('builder', { replace: SB.S.screen === 'start' || SB.S.screen === 'intro' });
    return true;
  };

  SB.builder = { selOf: selOf, discountAvailable: discountAvailable, useSale: useSale };
})(typeof self !== 'undefined' ? self : this);
