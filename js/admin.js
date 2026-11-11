/*
 * 관리자 페이지: 로고를 길게 눌러 PIN으로 들어온다.
 * 가격·할인가, 할인·홍보 스위치, 레슨 유효기간, 프로 정보, 문구, 이미지 상태, 이력·백업, 설정.
 * 수정은 초안(draft)에만 하고, 저장할 때 검증과 미리보기를 거쳐 SBStore.save로 남긴다.
 */
(function (root) {
  'use strict';

  var SB = root.SBApp, P = root.SBPricing, Store = root.SBStore, IL = root.SBIllust;
  var esc = SB.esc, A = SB.actions, doc = root.document;

  var ad = { tab: 'prices', draft: null, checked: {} };
  var TABS = [
    ['prices', '가격·할인가'], ['switch', '할인·홍보'], ['validity', '레슨 유효기간'], ['pros', '프로 정보'],
    ['texts', '문구'], ['kiosk', '터치스크린'], ['images', '이미지 상태'], ['history', '이력·백업'], ['settings', '설정']
  ];
  var GROUPS = [
    ['멤버십', function (k) { return k.indexOf('mem.') === 0; }],
    ['일일 이용권·쿠폰', function (k) { return k === 'daily' || k.indexOf('coupon.') === 0; }],
    ['레슨 단독', function (k) { return k.indexOf('solo.') === 0; }],
    ['패키지 레슨 (3개월 이상 멤버십과 함께)', function (k) { return k.indexOf('pkg.') === 0; }],
    ['락커 (월 요금)', function (k) { return k.indexOf('locker.') === 0; }]
  ];

  function dirty() { return ad.draft ? Store.diff(SB.cfg, ad.draft) : []; }
  function num(v) {
    var s = String(v === null || v === undefined ? '' : v).replace(/[,\s원]/g, '');
    if (s === '') return null;
    var n = Number(s);
    return isFinite(n) ? n : NaN;
  }
  function val(v) { return v === null || v === undefined || (typeof v === 'number' && isNaN(v)) ? '' : v; }

  // 경로("a/0/b")로 초안 값을 읽고 쓴다.
  function getPath(path) {
    return path.split('/').reduce(function (o, k) { return o === undefined || o === null ? o : o[k]; }, ad.draft);
  }
  function setPath(path, value) {
    var keys = path.split('/'), o = ad.draft;
    for (var i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = value;
  }

  function field(label, path, opt) {
    opt = opt || {};
    var v = getPath(path);
    var input;
    if (opt.type === 'area' || opt.type === 'lines') {
      input = '<textarea class="field" rows="' + (opt.rows || 3) + '" data-bind="' + path + '" data-t="' + opt.type + '">' +
        esc(opt.type === 'lines' ? (v || []).join('\n') : val(v)) + '</textarea>';
    } else {
      input = '<input class="field" type="' + (opt.type === 'num' ? 'text' : (opt.type || 'text')) + '"' +
        (opt.type === 'num' ? ' inputmode="numeric"' : '') + ' data-bind="' + path + '" data-t="' + (opt.type || 'text') + '" value="' + esc(val(v)) + '">';
    }
    return '<label class="fl"><span>' + label + '</span>' + input + (opt.help ? '<small>' + opt.help + '</small>' : '') + '</label>';
  }
  function toggle(label, path) {
    return '<label class="tg"><input type="checkbox" data-bind="' + path + '" data-t="bool"' + (getPath(path) ? ' checked' : '') + '><i></i><span>' + label + '</span></label>';
  }

  function diffText(it) {
    if (typeof it.price !== 'number' || isNaN(it.price)) return '<span class="bad">원가를 넣어 주세요</span>';
    if (it.sale === null || it.sale === undefined) return '<span class="dim">할인 없음</span>';
    if (isNaN(it.sale)) return '<span class="bad">숫자만 넣어 주세요</span>';
    if (it.sale > it.price) return '<span class="bad">원가보다 큽니다</span>';
    if (it.sale === it.price) return '<span class="dim">원가와 같음</span>';
    var d = it.price - it.sale;
    return '<span class="ok">-' + P.fmt(d) + '원 · ' + (Math.round(d / it.price * 1000) / 10) + '%</span>';
  }

  // ---------- 탭: 가격·할인가 ----------
  function tabPrices() {
    var items = ad.draft.items, keys = Object.keys(items);
    var html = '<p class="ad-help">원가는 고객에게 처음 보이는 가격입니다. 3개월 이상 멤버십 가격에는 10% 할인이 이미 들어 있습니다. ' +
      '할인가는 할인 적용 버튼을 눌렀을 때 보이는 가격이며, 비워 두면 그 항목은 할인이 없습니다.</p>' +
      '<div class="bulk"><b>일괄 입력</b><span>선택한 항목에</span>' +
      '<input class="field sm" id="bulkPct" inputmode="numeric" value="10" aria-label="할인율"><span>% 할인</span>' +
      '<label class="ck"><input type="checkbox" id="bulkRound" checked>천 원 단위 반올림</label>' +
      '<button class="btn solid sm" data-act="ad-bulk">할인가 채우기</button>' +
      '<button class="btn ghost sm" data-act="ad-bulk-clear">선택 항목 할인가 지우기</button></div>';
    GROUPS.forEach(function (g, gi) {
      var list = keys.filter(g[1]);
      html += '<section class="ad-group"><h3>' + g[0] + '<button class="link" data-act="ad-check-group" data-g="' + gi + '">모두 선택</button></h3>' +
        '<div class="ptable"><div class="ph"><span></span><span>항목</span><span>원가</span><span>할인가</span><span>할인</span></div>' +
        list.map(function (k) {
          var it = items[k];
          return '<div class="pr" data-row="' + k + '">' +
            '<label class="ck"><input type="checkbox" data-check="' + k + '"' + (ad.checked[k] ? ' checked' : '') + ' aria-label="선택"></label>' +
            '<span class="pl">' + esc(P.itemLabel(k)) + '</span>' +
            '<input class="field" inputmode="numeric" data-item="' + k + '" data-f="price" value="' + esc(val(it.price)) + '" aria-label="원가">' +
            '<input class="field" inputmode="numeric" data-item="' + k + '" data-f="sale" value="' + esc(val(it.sale)) + '" placeholder="없음" aria-label="할인가">' +
            '<span class="pd">' + diffText(it) + '</span></div>';
        }).join('') + '</div></section>';
    });
    return html;
  }

  // ---------- 탭: 할인·홍보 스위치 ----------
  function periodFields(base) {
    return '<div class="row2">' + field('시작일 (선택)', base + '/start', { type: 'date' }) + field('종료일 (선택)', base + '/end', { type: 'date' }) + '</div>';
  }
  function tabSwitch() {
    var d = ad.draft;
    var live = Store.activeToday(d.discount);
    var hasSale = P.hasAnySaleItem(d.items);
    var html = '<section class="ad-group"><h3>할인 적용 버튼</h3>' +
      '<p class="ad-help">켜면 이용권 설계와 비교함에 할인 적용 버튼이 나타납니다. 기간을 정하면 종료일 다음 날부터 자동으로 숨겨집니다.</p>' +
      toggle('할인 적용 버튼 보이기', 'discount/on') + periodFields('discount') +
      '<p class="ad-state ' + (live ? 'on' : '') + '">' + (live ? '저장하면 오늘 고객 화면에 버튼이 보입니다.' : '저장하면 오늘 고객 화면에 버튼이 보이지 않습니다.') + '</p>' +
      (d.discount.on && !hasSale ? '<p class="ad-warn">할인가가 입력된 항목이 없습니다. 가격·할인가 탭에서 할인가를 먼저 넣어 주세요.</p>' : '') +
      '</section><section class="ad-group"><h3>홍보 문구</h3>' +
      '<p class="ad-help">이벤트처럼 기간이 정해진 문구를 홈 화면에 띄웁니다. 터치스크린에서는 같은 문구가 이벤트 배너에 크게 나옵니다. 이벤트가 없을 때는 꺼 두세요.</p>';
    d.promos.forEach(function (p, i) {
      html += '<div class="ad-card">' + field('문구', 'promos/' + i + '/text') +
        field('설명 한 줄 (선택, 터치스크린 배너에만 보임)', 'promos/' + i + '/detail') +
        toggle('홈 화면과 터치스크린 배너에 보이기', 'promos/' + i + '/on') +
        periodFields('promos/' + i) +
        '<button class="link danger" data-act="ad-del" data-list="promos" data-i="' + i + '">' + IL.icon('trash') + '이 문구 삭제</button></div>';
    });
    return html + '<button class="btn ghost sm" data-act="ad-add-promo">' + IL.icon('plus') + '홍보 문구 추가</button></section>';
  }

  // ---------- 탭: 레슨 유효기간 ----------
  function tabValidity() {
    function row(kind, title) {
      return '<section class="ad-group"><h3>' + title + '</h3><div class="row4">' + P.LESSON_COUNTS.map(function (c) {
        return field(c + '회 (개월)', 'validity/' + kind + '/' + c, { type: 'num' });
      }).join('') + '</div></section>';
    }
    return '<p class="ad-help">레슨권을 쓸 수 있는 기간입니다. 초기값은 패키지 8회·16회만 단독보다 1개월 깁니다. 패키지가 더 긴 횟수는 고객 화면에 혜택으로 표시됩니다.</p>' +
      row('solo', '레슨 단독') + row('pkg', '패키지 레슨') +
      '<button class="btn ghost sm" data-act="ad-validity-rule">패키지를 단독 + 1개월로 맞추기</button>' +
      '<section class="ad-group"><h3>쿠폰 유효기간</h3><div class="row4">' +
      field('10회 쿠폰 (개월)', 'couponMonths/10', { type: 'num' }) + field('20회 쿠폰 (개월)', 'couponMonths/20', { type: 'num' }) + '</div></section>';
  }

  // ---------- 탭: 프로 정보 ----------
  function tabPros() {
    var html = '<p class="ad-help">근무 시간과 휴무 요일을 바꾸면 레슨 선택 화면의 안내와 요일별 레슨 가능 시간에 바로 반영됩니다. ' +
      '약력은 한 줄에 하나씩 적고, 줄 순서가 화면 순서입니다.</p>';
    ad.draft.pros.forEach(function (p, i) {
      var base = 'pros/' + i;
      var has = !!SB.photo(p.asset);
      html += '<div class="ad-card"><div class="ad-card-h"><b>' + esc(p.name || '새 프로') + ' 프로</b><div>' +
        '<button class="link" data-act="ad-move" data-i="' + i + '" data-d="-1"' + (i === 0 ? ' disabled' : '') + '>위로</button>' +
        '<button class="link" data-act="ad-move" data-i="' + i + '" data-d="1"' + (i === ad.draft.pros.length - 1 ? ' disabled' : '') + '>아래로</button>' +
        '<button class="link danger" data-act="ad-del" data-list="pros" data-i="' + i + '">' + IL.icon('trash') + '삭제</button></div></div>' +
        '<div class="row2">' + field('이름', base + '/name') + field('배지 (예: KPGA)', base + '/badge') + '</div>' +
        '<div class="row2">' + field('근무 시작', base + '/start', { type: 'time' }) + field('근무 종료', base + '/end', { type: 'time' }) + '</div>' +
        '<div class="fl"><span>휴무 요일</span><div class="days">' + [1, 2, 3, 4, 5, 6, 0].map(function (d) {
          return '<label class="ck"><input type="checkbox" data-off="' + i + '" data-day="' + d + '"' + ((p.off || []).indexOf(d) >= 0 ? ' checked' : '') + '>' + SB.DAY_NAMES[d] + '</label>';
        }).join('') + '</div></div>' +
        field('사진 이름', base + '/asset', { help: has ? '실제 사진을 쓰고 있습니다.' : '사진 파일이 없어 얼굴 없는 실루엣을 보여 줍니다. 사진은 assets/images/pros 폴더에 넣습니다.' }) +
        field('대회 성적 (한 줄에 하나)', base + '/awards', { type: 'lines', rows: 5 }) +
        field('경력 (한 줄에 하나)', base + '/career', { type: 'lines', rows: 7 }) + '</div>';
    });
    return html + '<button class="btn ghost sm" data-act="ad-add-pro">' + IL.icon('plus') + '프로 추가</button>';
  }

  // ---------- 탭: 문구 ----------
  function tabTexts() {
    var d = ad.draft;
    var html = '<section class="ad-group"><h3>브랜드와 홈 화면</h3>' +
      '<div class="row2">' + field('브랜드명', 'texts/brand') + field('지점명', 'texts/branch') + '</div>' +
      field('홈 슬로건 1', 'texts/slogan1') + field('홈 슬로건 2', 'texts/slogan2') +
      field('이용권 설계 문구', 'texts/builderTagline') + field('다짐 문구', 'texts/pledge') + '</section>' +
      '<section class="ad-group"><h3>' + d.texts.promises.length + '가지 약속</h3>' + d.texts.promises.map(function (p, i) {
        return field((i + 1) + '번', 'texts/promises/' + i);
      }).join('') + '</section>' +
      '<section class="ad-group"><h3>신뢰 지표</h3><p class="ad-help">1위, 최고 같은 표현은 조사 기관과 시기 등 근거 자료를 보관한 범위에서만 쓰세요.</p>' +
      d.texts.trust.map(function (t, i) {
        return '<div class="row3">' + field('큰 글자', 'texts/trust/' + i + '/big') + field('설명', 'texts/trust/' + i + '/label') + toggle('보이기', 'texts/trust/' + i + '/on') + '</div>';
      }).join('') + '</section>' +
      '<section class="ad-group"><h3>시설 소개 카드</h3>' + d.facility.map(function (f, i) {
        return '<div class="ad-card">' + toggle('보이기', 'facility/' + i + '/on') + field('제목', 'facility/' + i + '/title') + field('설명', 'facility/' + i + '/desc', { type: 'area', rows: 2 }) + '</div>';
      }).join('') + '</section>' +
      '<section class="ad-group"><h3>레슨 설명</h3>' + field('15분 레슨', 'lessonInfo/m15', { type: 'area', rows: 2 }) +
      field('25분 레슨', 'lessonInfo/m25', { type: 'area', rows: 2 }) + field('레슨 프로 배당 안내', 'lessonInfo/payout', { type: 'area', rows: 2 }) + '</section>' +
      '<section class="ad-group"><h3>이용 안내</h3>' + d.guide.map(function (g, i) {
        return '<div class="ad-card">' + field('제목', 'guide/' + i + '/title') + field('내용', 'guide/' + i + '/body', { type: 'area', rows: 2 }) +
          '<button class="link danger" data-act="ad-del" data-list="guide" data-i="' + i + '">' + IL.icon('trash') + '삭제</button></div>';
      }).join('') + '<button class="btn ghost sm" data-act="ad-add-guide">' + IL.icon('plus') + '안내 항목 추가</button></section>' +
      '<section class="ad-group"><h3>이용약관 원문</h3>' +
      field('약관 전문 (넣으면 이용 안내에 전문 보기 버튼이 생깁니다)', 'texts/terms', { type: 'area', rows: 8 }) + '</section>';
    return html;
  }

  // ---------- 탭: 터치스크린 (세로 대형 화면, kiosk.html) ----------
  var ZONE_NAMES = { prices: '가격표', site: '상담 사이트(터치 영역)', banner: '띠 배너' };
  var ZONE_ORDERS = ['banner-site-prices', 'prices-site-banner', 'site-banner-prices', 'site-prices-banner', 'prices-banner-site', 'banner-prices-site'];
  function orderLabel(o) {
    return o.split('-').map(function (z) { return ZONE_NAMES[z]; }).join(' → ');
  }
  function tabKiosk() {
    var cur = ad.draft.kiosk.order;
    return '<p class="ad-help">세로로 세운 대형 터치스크린(kiosk.html)에만 쓰이는 설정입니다. 태블릿 화면은 바뀌지 않습니다.</p>' +
      '<section class="ad-group"><h3>구역 순서</h3>' +
      '<label class="fl"><span>위에서부터</span><select class="field" data-bind="kiosk/order" data-t="text">' +
      ZONE_ORDERS.map(function (o) {
        return '<option value="' + o + '"' + (o === cur ? ' selected' : '') + '>' + orderLabel(o) + '</option>';
      }).join('') + '</select>' +
      '<small>구역 높이는 띠 배너, 상담 사이트, 가격표가 각각 정해져 있습니다. 순서를 바꾸면 손으로 누르는 상담 사이트의 높이가 달라집니다.</small></label></section>' +
      '<section class="ad-group"><h3>가격표</h3>' +
      field('제목', 'kiosk/boardTitle') + field('안내 문구', 'kiosk/boardNote') +
      toggle('할인 기간에 가격표에도 할인가 보이기', 'kiosk/boardSale') +
      '<p class="ad-help">꺼 두면 가격표에는 항상 원가만 보입니다. 켜면 할인·홍보 탭의 할인 적용 버튼이 켜져 있는 기간에, 할인가를 넣은 항목만 할인가로 보입니다.</p></section>' +
      '<section class="ad-group"><h3>띠 배너</h3>' +
      '<p class="ad-help">배너 그림 파일(이미지 상태 탭의 터치스크린 배너)이 있으면 그 그림을, 없으면 할인·홍보 탭에서 켠 홍보 문구를 보여 줍니다. 둘 다 없으면 아래 기본 문구가 나옵니다.</p>' +
      field('이벤트가 없을 때 보이는 문구', 'kiosk/bannerCall') +
      field('배너가 넘어가는 시간 (초)', 'kiosk/bannerSec', { type: 'num' }) + '</section>';
  }

  // ---------- 탭: 이미지 상태 ----------
  function tabImages() {
    var m = SB.assets.manifest, keys = Object.keys(m);
    if (!keys.length) return '<p class="ad-help">이미지 목록(assets/images/assets.json)을 읽지 못했습니다.</p>';
    var missing = keys.filter(function (k) { return m[k].required && !SB.assets.ok[k]; });
    return '<p class="ad-help">실제 사진 파일을 assets/images 폴더에 정해진 이름으로 넣으면 그 사진으로 바뀝니다. 파일이 없으면 일러스트나 실루엣을 보여 줍니다.</p>' +
      (missing.length ? '<p class="ad-warn">필수 이미지 ' + missing.length + '개가 아직 임시 상태입니다. 배포 전에 실제 사진으로 바꿔 주세요.</p>'
        : '<p class="ad-state on">필수 이미지가 모두 준비되었습니다.</p>') +
      '<div class="itable">' + keys.map(function (k) {
        var a = m[k], ok = SB.assets.ok[k];
        return '<div class="ir"><span class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '실제 사진' : '임시') + '</span>' +
          '<div><b>' + esc(a.label) + (a.required ? ' <em>필수</em>' : '') + '</b><small>' + esc(a.path) + ' · ' + esc(a.spec) + '</small><small>쓰는 화면: ' + esc(a.screens) + '</small></div></div>';
      }).join('') + '</div>';
  }

  // ---------- 탭: 이력·백업 ----------
  function tabHistory() {
    var h = Store.history();
    return '<section class="ad-group"><h3>백업</h3>' +
      '<p class="ad-help">설정은 이 태블릿의 브라우저 안에만 저장됩니다. 브라우저 데이터를 지우면 값이 사라지므로, 저장한 뒤에는 백업 파일을 내보내 보관하세요.</p>' +
      '<div class="ad-btns"><button class="btn solid sm" data-act="ad-export">백업 파일 내보내기</button>' +
      '<label class="btn ghost sm">백업 파일 불러오기<input type="file" id="importFile" accept=".json,application/json" hidden></label>' +
      '<button class="btn ghost sm danger" data-act="ad-reset">초기값으로 되돌리기</button></div></section>' +
      '<section class="ad-group"><h3>변경 이력 (최근 ' + h.length + '건)</h3>' +
      (h.length ? h.map(function (e, i) {
        return '<div class="ad-card"><div class="ad-card-h"><b>' + new Date(e.ts).toLocaleString('ko-KR') + '</b>' +
          '<button class="link" data-act="ad-restore" data-i="' + i + '">이 변경 전으로 되돌리기</button></div>' +
          (e.note ? '<p class="dim">' + esc(e.note) + '</p>' : '') +
          '<ul class="chg">' + e.changes.slice(0, 12).map(function (c) {
            return '<li><span>' + esc(c.label) + '</span><s>' + esc(c.before) + '</s><b>' + esc(c.after) + '</b></li>';
          }).join('') + (e.changes.length > 12 ? '<li class="dim">외 ' + (e.changes.length - 12) + '건</li>' : '') + '</ul></div>';
      }).join('') : '<p class="dim">아직 변경 이력이 없습니다.</p>') + '</section>';
  }

  // ---------- 탭: 설정 ----------
  function tabSettings() {
    return '<section class="ad-group"><h3>소리</h3>' + toggle('AI 보이스 기본으로 켜기', 'settings/voiceOn') + toggle('효과음 기본으로 켜기', 'settings/sfxOn') +
      field('음성 속도 (0.7 ~ 1.2, 기본 0.92)', 'settings/voiceRate', { type: 'num' }) +
      '<p class="ad-help">직원이 직접 설명할 때는 AI 보이스를 꺼 두면 설명과 겹치지 않습니다. 자막은 계속 보입니다.</p></section>' +
      '<section class="ad-group"><h3>무조작 초기화</h3>' +
      field('조작이 없으면 처음 화면으로 돌아가는 시간 (초, 0이면 끔)', 'settings/idleSec', { type: 'num' }) +
      '<p class="ad-help">앞 고객의 비교함과 할인 적용 상태가 다음 고객에게 보이지 않도록 지웁니다.</p></section>' +
      '<section class="ad-group"><h3>관리자 PIN</h3><div class="row2">' +
      '<label class="fl"><span>새 PIN (숫자 4~8자리)</span><input class="field" id="newPin1" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></label>' +
      '<label class="fl"><span>새 PIN 다시 입력</span><input class="field" id="newPin2" type="password" inputmode="numeric" maxlength="8" autocomplete="off"></label></div>' +
      '<button class="btn ghost sm" data-act="ad-pin">PIN 바꾸기</button></section>';
  }

  var TAB_FN = { prices: tabPrices, switch: tabSwitch, validity: tabValidity, pros: tabPros, texts: tabTexts, kiosk: tabKiosk, images: tabImages, history: tabHistory, settings: tabSettings };

  SB.screens.admin = {
    enter: function () {
      if (!ad.draft) ad.draft = Store.clone(SB.cfg);
    },
    render: function () {
      if (!ad.draft) ad.draft = Store.clone(SB.cfg);
      var n = dirty().length;
      return {
        noCart: true,
        noCaption: true,
        scrollKey: ad.tab,
        html: '<div class="admin"><div class="ad-title"><h1 class="q">관리자</h1>' +
          '<button class="btn ghost sm" data-act="ad-exit">고객 화면으로 나가기</button></div>' +
          '<nav class="ad-tabs">' + TABS.map(function (t) {
            return '<button class="' + (ad.tab === t[0] ? 'on' : '') + '" data-act="ad-tab" data-v="' + t[0] + '">' + t[1] + '</button>';
          }).join('') + '</nav><div class="ad-body">' + TAB_FN[ad.tab]() + '</div></div>',
        footer: '<footer class="sum ad-foot"><div class="sum-l"><div class="sum-empty" id="adDirty">' +
          (n ? '저장하지 않은 변경 ' + n + '건' : '변경 내용이 없습니다') + '</div></div>' +
          '<div class="sum-r"><button class="btn ghost" data-act="ad-discard"' + (n ? '' : ' disabled') + '>변경 취소</button>' +
          '<button class="btn primary" data-act="ad-save"' + (n ? '' : ' disabled') + '>저장</button></div></footer>'
      };
    }
  };

  function refreshFoot() {
    var n = dirty().length;
    var label = doc.getElementById('adDirty');
    if (label) label.textContent = n ? '저장하지 않은 변경 ' + n + '건' : '변경 내용이 없습니다';
    Array.prototype.forEach.call(doc.querySelectorAll('.ad-foot button'), function (b) { b.disabled = !n; });
  }

  // ---------- 입력 반영 ----------
  function onInput(ev) {
    if (SB.S.screen !== 'admin' || !ad.draft) return;
    var el = ev.target, ds = el.dataset;
    if (!ds) return;
    if (ds.item) {
      var it = ad.draft.items[ds.item];
      var n = num(el.value);
      it[ds.f] = n;
      var cell = el.parentNode.querySelector('.pd');
      if (cell) cell.innerHTML = diffText(it);
    } else if (ds.check) {
      ad.checked[ds.check] = el.checked;
      return;
    } else if (ds.off !== undefined) {
      var pro = ad.draft.pros[+ds.off], day = +ds.day;
      pro.off = (pro.off || []).filter(function (d) { return d !== day; });
      if (el.checked) pro.off.push(day);
      pro.off.sort();
    } else if (ds.bind) {
      var v;
      if (ds.t === 'bool') v = el.checked;
      else if (ds.t === 'num') { v = num(el.value); if (v === null || isNaN(v)) v = 0; }
      else if (ds.t === 'lines') v = el.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      else v = el.value;
      setPath(ds.bind, v);
      if (ev.type === 'change' && (ds.t === 'bool' || ds.t === 'date') && ad.tab === 'switch') { SB.render(); return; }
    } else return;
    refreshFoot();
  }
  doc.addEventListener('input', onInput);
  doc.addEventListener('change', function (ev) {
    if (ev.target && ev.target.id === 'importFile') { importFile(ev.target); return; }
    onInput(ev);
  });

  // ---------- 진입: 로고 길게 누르기 + PIN ----------
  A['admin-open'] = function () {
    if (SB.S.screen === 'admin' || SB.S.screen === 'start' || SB.S.screen === 'intro') return;
    var first = !SB.cfg.settings.pinHash;
    SB.openModal(
      '<h2>' + (first ? '관리자 PIN 정하기' : '관리자 PIN') + '</h2>' +
      '<p>' + (first ? '처음 들어오셨습니다. 앞으로 쓸 PIN을 숫자 4~8자리로 정해 주세요.' : 'PIN을 입력해 주세요.') + '</p>' +
      '<input class="field pin" id="pinInput" type="password" inputmode="numeric" maxlength="8" autocomplete="off" aria-label="PIN">' +
      (first ? '<input class="field pin" id="pinInput2" type="password" inputmode="numeric" maxlength="8" autocomplete="off" aria-label="PIN 다시 입력" placeholder="다시 입력">' : '') +
      '<p class="bad" id="pinMsg"></p>' +
      '<div class="modal-btns"><button class="btn ghost" data-act="modal-close">취소</button>' +
      '<button class="btn primary" data-act="pin-ok">' + (first ? 'PIN 저장하고 들어가기' : '들어가기') + '</button></div>');
    var input = doc.getElementById('pinInput');
    if (input) input.focus();
  };
  function pinValid(p) { return /^\d{4,8}$/.test(p); }
  A['pin-ok'] = function () {
    var a = doc.getElementById('pinInput'), b = doc.getElementById('pinInput2'), msg = doc.getElementById('pinMsg');
    var pin = a ? a.value : '';
    var first = !SB.cfg.settings.pinHash;
    if (!pinValid(pin)) { msg.textContent = '숫자 4~8자리로 입력해 주세요.'; return; }
    if (first && b && b.value !== pin) { msg.textContent = '두 PIN이 서로 다릅니다.'; return; }
    Store.hashPin(pin).then(function (hash) {
      if (first) {
        var next = Store.clone(SB.cfg);
        next.settings.pinHash = hash;
        Store.save(next, '관리자 PIN 설정');
        SB.reloadCfg();
      } else if (hash !== SB.cfg.settings.pinHash) {
        SB.sfx('warn');
        msg.textContent = 'PIN이 맞지 않습니다.';
        a.value = '';
        return;
      }
      ad.draft = Store.clone(SB.cfg);
      ad.tab = 'prices';
      ad.checked = {};
      SB.go('admin');
    });
  };
  doc.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target && (ev.target.id === 'pinInput' || ev.target.id === 'pinInput2')) A['pin-ok']();
  });

  // ---------- 탭과 목록 조작 ----------
  A['ad-tab'] = function (d) { ad.tab = d.v; SB.render(); };
  A['ad-check-group'] = function (d) {
    var keys = Object.keys(ad.draft.items).filter(GROUPS[+d.g][1]);
    var all = keys.every(function (k) { return ad.checked[k]; });
    keys.forEach(function (k) { ad.checked[k] = !all; });
    SB.render();
  };
  function checkedKeys() { return Object.keys(ad.checked).filter(function (k) { return ad.checked[k]; }); }
  A['ad-bulk'] = function () {
    var keys = checkedKeys();
    var pct = num(doc.getElementById('bulkPct').value);
    var round = doc.getElementById('bulkRound').checked;
    if (!keys.length) { SB.toast('할인가를 채울 항목을 먼저 선택해 주세요'); return; }
    if (pct === null || isNaN(pct) || pct <= 0 || pct >= 100) { SB.toast('할인율은 1~99 사이로 넣어 주세요'); return; }
    keys.forEach(function (k) {
      var it = ad.draft.items[k];
      if (typeof it.price === 'number' && !isNaN(it.price)) it.sale = P.bulkSale(it.price, pct, round);
    });
    SB.toast(keys.length + '개 항목에 ' + pct + '% 할인가를 채웠습니다');
    SB.render();
  };
  A['ad-bulk-clear'] = function () {
    var keys = checkedKeys();
    if (!keys.length) { SB.toast('항목을 먼저 선택해 주세요'); return; }
    keys.forEach(function (k) { ad.draft.items[k].sale = null; });
    SB.render();
  };
  A['ad-validity-rule'] = function () {
    P.LESSON_COUNTS.forEach(function (c) { ad.draft.validity.pkg[c] = (+ad.draft.validity.solo[c] || 0) + 1; });
    SB.render();
  };
  A['ad-add-promo'] = function () {
    ad.draft.promos.push({ id: 'p' + Date.now(), text: '', detail: '', on: false, start: '', end: '' });
    SB.render();
  };
  A['ad-add-guide'] = function () { ad.draft.guide.push({ title: '', body: '' }); SB.render(); };
  A['ad-add-pro'] = function () {
    var id = 'pro-' + Date.now();
    ad.draft.pros.push({ id: id, name: '', badge: '', asset: '', start: '09:00', end: '18:00', off: [], awards: [], career: [] });
    SB.render();
  };
  A['ad-del'] = function (d) { ad.draft[d.list].splice(+d.i, 1); SB.render(); };
  A['ad-move'] = function (d) {
    var i = +d.i, j = i + (+d.d), list = ad.draft.pros;
    if (j < 0 || j >= list.length) return;
    var t = list[i]; list[i] = list[j]; list[j] = t;
    SB.render();
  };

  // ---------- 저장: 검증 → 미리보기 → 저장 ----------
  function validate() {
    var d = ad.draft;
    var res = P.validateItems(d.items);
    var errors = res.errors.slice(), warnings = res.warnings.slice();
    Object.keys(d.items).forEach(function (k) {
      var it = d.items[k];
      if (typeof it.sale === 'number' && isNaN(it.sale)) errors.push(P.itemLabel(k) + ': 할인가에 숫자만 넣어 주세요.');
    });
    d.pros.forEach(function (p) {
      if (!p.name) errors.push('프로 이름이 비어 있습니다.');
      if (SB.toMin(p.start) >= SB.toMin(p.end)) errors.push((p.name || '프로') + ': 근무 시작이 종료보다 빨라야 합니다.');
    });
    ['solo', 'pkg'].forEach(function (kind) {
      P.LESSON_COUNTS.forEach(function (c) {
        if (!(d.validity[kind][c] >= 1)) errors.push('레슨 유효기간은 1개월 이상이어야 합니다.');
      });
    });
    [10, 20].forEach(function (c) { if (!(d.couponMonths[c] >= 1)) errors.push(c + '회 쿠폰 유효기간은 1개월 이상이어야 합니다.'); });
    if (d.discount.start && d.discount.end && d.discount.start > d.discount.end) errors.push('할인 시작일이 종료일보다 늦습니다.');
    if (d.discount.on && !P.hasAnySaleItem(d.items)) warnings.push('할인 적용 버튼을 켰지만 할인가가 입력된 항목이 없습니다.');
    if (d.settings.voiceRate < 0.7 || d.settings.voiceRate > 1.2) errors.push('음성 속도는 0.7에서 1.2 사이로 넣어 주세요.');
    if (ZONE_ORDERS.indexOf(d.kiosk.order) < 0) errors.push('터치스크린 구역 순서를 다시 골라 주세요.');
    if (!(d.kiosk.bannerSec >= 3)) errors.push('터치스크린 배너가 넘어가는 시간은 3초 이상으로 넣어 주세요.');
    return { errors: errors.filter(function (e, i, a) { return a.indexOf(e) === i; }), warnings: warnings };
  }

  // 바뀐 가격을 고객 화면 표기로 보여 준다.
  function pricePreview() {
    var before = SB.cfg.items, after = ad.draft.items;
    var keys = Object.keys(after).filter(function (k) {
      return !before[k] || before[k].price !== after[k].price || before[k].sale !== after[k].sale;
    });
    if (!keys.length) return '';
    return '<h3>고객 화면에는 이렇게 보입니다</h3><div class="pv">' + keys.slice(0, 8).map(function (k) {
      var it = after[k];
      var sale = typeof it.sale === 'number' && it.sale < it.price;
      return '<div class="pv-row"><span>' + esc(P.itemLabel(k)) + '</span>' +
        '<div><small>할인 적용 전</small><b>' + P.fmt(it.price) + '원</b></div>' +
        '<div><small>할인 적용 후</small>' + (sale
          ? '<s>' + P.fmt(it.price) + '원</s><b class="sale">' + P.fmt(it.sale) + '원</b>'
          : '<b>' + P.fmt(it.price) + '원</b><em>할인 대상 아님</em>') + '</div></div>';
    }).join('') + (keys.length > 8 ? '<p class="dim">외 ' + (keys.length - 8) + '개 항목</p>' : '') + '</div>';
  }

  A['ad-save'] = function () {
    var v = validate();
    if (v.errors.length) {
      SB.sfx('warn');
      SB.openModal('<h2>저장할 수 없습니다</h2><p>아래 내용을 고친 뒤 다시 저장해 주세요.</p>' +
        '<ul class="errs">' + v.errors.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>' +
        '<div class="modal-btns"><button class="btn primary" data-act="modal-close">확인</button></div>', 'tall');
      return;
    }
    var changes = dirty();
    if (!changes.length) { SB.toast('변경 내용이 없습니다'); return; }
    SB.openModal('<h2>저장 전 확인</h2>' +
      (v.warnings.length ? '<ul class="errs warn">' + v.warnings.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>' : '') +
      pricePreview() +
      '<h3>변경 ' + changes.length + '건</h3><ul class="chg">' + changes.slice(0, 20).map(function (c) {
        return '<li><span>' + esc(c.label) + '</span><s>' + esc(c.before) + '</s><b>' + esc(c.after) + '</b></li>';
      }).join('') + (changes.length > 20 ? '<li class="dim">외 ' + (changes.length - 20) + '건</li>' : '') + '</ul>' +
      '<div class="modal-btns"><button class="btn ghost" data-act="modal-close">더 고치기</button>' +
      '<button class="btn primary" data-act="ad-save-yes">저장</button></div>', 'tall');
  };
  A['ad-save-yes'] = function () {
    var res = Store.save(ad.draft, '');
    SB.reloadCfg();
    ad.draft = Store.clone(SB.cfg);
    SB.S.discountOn = false;
    SB.sfx('confirm');
    SB.render();
    SB.openModal('<h2>저장했습니다</h2>' +
      (res.persisted === false ? '<p class="bad">이 브라우저는 저장소를 쓸 수 없어 앱을 닫으면 값이 사라집니다.</p>' : '') +
      '<p>설정은 이 태블릿 안에만 저장됩니다. 브라우저 데이터를 지우면 사라지므로 백업 파일을 내보내 보관해 주세요.</p>' +
      '<div class="modal-btns"><button class="btn ghost" data-act="modal-close">나중에</button>' +
      '<button class="btn primary" data-act="ad-export">백업 파일 내보내기</button></div>');
  };
  A['ad-discard'] = function () {
    ad.draft = Store.clone(SB.cfg);
    ad.checked = {};
    SB.render();
    SB.toast('변경을 취소했습니다');
  };

  // ---------- 백업, 되돌리기 ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  A['ad-export'] = function () {
    SB.closeModal();
    var d = new Date();
    var name = 'swingblack-backup-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + '.json';
    var blob = new root.Blob([Store.exportBackup()], { type: 'application/json' });
    var url = root.URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url; a.download = name;
    doc.body.appendChild(a); a.click(); a.remove();
    root.setTimeout(function () { root.URL.revokeObjectURL(url); }, 2000);
    SB.toast('백업 파일을 내보냈습니다: ' + name, 4000);
  };
  function importFile(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new root.FileReader();
    reader.onload = function () {
      try {
        Store.importBackup(String(reader.result));
        SB.reloadCfg();
        ad.draft = Store.clone(SB.cfg);
        SB.sfx('confirm');
        SB.render();
        SB.toast('백업 파일을 불러왔습니다');
      } catch (e) {
        SB.sfx('warn');
        SB.openModal('<h2>불러올 수 없습니다</h2><p>' + esc(e.message || '파일 형식이 올바르지 않습니다.') + '</p>' +
          '<p class="dim">기존 설정은 바뀌지 않았습니다.</p><div class="modal-btns"><button class="btn primary" data-act="modal-close">확인</button></div>');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }
  A['ad-restore'] = function (d) {
    var e = Store.history()[+d.i];
    if (!e) return;
    SB.openModal('<h2>이 변경 전으로 되돌릴까요?</h2><p>' + new Date(e.ts).toLocaleString('ko-KR') + '에 저장하기 전의 값으로 돌아갑니다. 되돌린 것도 이력에 남습니다.</p>' +
      '<div class="modal-btns"><button class="btn ghost" data-act="modal-close">취소</button>' +
      '<button class="btn primary" data-act="ad-restore-yes" data-i="' + d.i + '">되돌리기</button></div>');
  };
  A['ad-restore-yes'] = function (d) {
    Store.restore(+d.i);
    SB.reloadCfg();
    ad.draft = Store.clone(SB.cfg);
    SB.closeModal();
    SB.sfx('confirm');
    SB.render();
    SB.toast('이전 값으로 되돌렸습니다');
  };
  A['ad-reset'] = function () {
    SB.openModal('<h2>초기값으로 되돌릴까요?</h2><p>가격, 문구, 프로 정보가 모두 처음 값으로 돌아갑니다. PIN도 지워져 다음에 들어올 때 새로 정합니다. 변경 이력에는 남습니다.</p>' +
      '<div class="modal-btns"><button class="btn ghost" data-act="modal-close">취소</button>' +
      '<button class="btn primary" data-act="ad-reset-yes">초기값으로 되돌리기</button></div>');
  };
  A['ad-reset-yes'] = function () {
    Store.resetAll();
    SB.reloadCfg();
    ad.draft = Store.clone(SB.cfg);
    SB.closeModal();
    SB.render();
    SB.toast('초기값으로 되돌렸습니다');
  };

  A['ad-pin'] = function () {
    var a = doc.getElementById('newPin1').value, b = doc.getElementById('newPin2').value;
    if (!pinValid(a)) { SB.toast('PIN은 숫자 4~8자리로 입력해 주세요'); return; }
    if (a !== b) { SB.toast('두 PIN이 서로 다릅니다'); return; }
    Store.hashPin(a).then(function (hash) {
      var next = Store.clone(SB.cfg);
      next.settings.pinHash = hash;
      Store.save(next, '관리자 PIN 변경');
      SB.reloadCfg();
      ad.draft.settings.pinHash = hash;
      SB.sfx('confirm');
      SB.render();
      SB.toast('PIN을 바꿨습니다');
    });
  };

  // ---------- 나가기: 저장하지 않은 변경이 있으면 묻는다 ----------
  function leave(then) {
    if (SB.S.screen !== 'admin' || !dirty().length) { ad.draft = null; then(); return; }
    SB.openModal('<h2>저장하지 않은 변경이 있습니다</h2><p>나가면 고친 내용이 사라집니다.</p>' +
      '<div class="modal-btns"><button class="btn ghost" data-act="modal-close">계속 고치기</button>' +
      '<button class="btn primary" data-act="ad-leave-yes">저장하지 않고 나가기</button></div>');
    pendingLeave = then;
  }
  var pendingLeave = null;
  A['ad-leave-yes'] = function () {
    var then = pendingLeave;
    pendingLeave = null;
    ad.draft = null;
    SB.closeModal();
    if (then) then();
  };
  A['ad-exit'] = function () { leave(function () { SB.go('home', { replace: true }); }); };
  var origBack = A.back, origRestart = A.restart;
  A.back = function (d, el, ev) {
    if (SB.S.screen === 'admin') { A['ad-exit'](); return; }
    origBack(d, el, ev);
  };
  A.restart = function (d, el, ev) {
    if (SB.S.screen === 'admin') { A['ad-exit'](); return; }
    origRestart(d, el, ev);
  };
})(typeof self !== 'undefined' ? self : this);
