/*
 * 설정 저장소: 가격·문구·프로 정보를 기기(브라우저) 안에 저장한다.
 * 변경 이력, 이전 값으로 되돌리기, 백업 파일 내보내기·불러오기를 제공한다.
 */
(function (root) {
  'use strict';

  var KEY = 'swingblack.config.v1';
  var HIST = 'swingblack.history.v1';
  var MAX_HISTORY = 20;
  var memory = {}; // 저장소를 쓸 수 없을 때의 임시 보관

  function read(key) {
    try { return root.localStorage.getItem(key); } catch (e) { return memory[key] || null; }
  }
  function write(key, value) {
    try { root.localStorage.setItem(key, value); return true; }
    catch (e) { memory[key] = value; return false; }
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  // 저장된 값에 새 버전의 기본 항목을 채워 넣는다(배열은 저장된 값을 그대로 쓴다).
  function merge(base, saved) {
    if (!isObj(base) || !isObj(saved)) return saved === undefined ? base : saved;
    var out = {};
    Object.keys(base).forEach(function (k) { out[k] = merge(base[k], saved[k]); });
    Object.keys(saved).forEach(function (k) { if (!(k in out)) out[k] = saved[k]; });
    return out;
  }

  function load() {
    var base = root.SBDefaults();
    var raw = read(KEY);
    if (!raw) return base;
    try { return migrate(merge(base, JSON.parse(raw)), base); } catch (e) { return base; }
  }

  // 예전 버전에서 저장한 설정을 새 구조로 맞춘다.
  // 프로 목록 같은 배열은 저장된 값을 통째로 쓰므로, 초기값이 바뀌어도 이미 저장한 기기에는 반영되지 않는다.
  function migrate(cfg, base) {
    var from = +cfg.schema || 1;
    if (from < 2) {
      // v2 (2026-11-10): 최승우 프로를 손지민 프로로 교체
      cfg.pros = (cfg.pros || []).map(function (p) {
        if (p.id !== 'choi-seungwoo') return p;
        return base.pros.filter(function (b) { return b.id === 'son-jimin'; })[0] || p;
      });
    }
    if (from < 3) {
      // v3 (2026-11-10): 패키지 레슨 24회·32회 유효기간을 센터 상품 목록에 맞춘다(4·5개월 → 3·4개월).
      // 예전 초기값 그대로인 경우만 바꾸고, 직원이 고친 값은 그대로 둔다.
      var pkg = cfg.validity && cfg.validity.pkg;
      if (pkg) {
        if (+pkg[24] === 4) pkg[24] = 3;
        if (+pkg[32] === 5) pkg[32] = 4;
      }
    }
    if (from < 4) {
      // v4 (2026-11-10): 레슨 설명 문구를 짧게. 예전 초기값 그대로인 문구만 바꾸고, 직원이 고친 문구는 둔다.
      var oldInfo = {
        m15: '핵심만 짚는 집중 레슨입니다. 시간이 부족하면 2회를 이어서 사용할 수도 있습니다.',
        m25: '여유 있게 배우고 싶은 분께 추천합니다. 스윙을 차근차근 교정합니다.',
        payout: '레슨권 매출은 100% 레슨 프로에게 배당됩니다. 그래서 일반 매장보다 경쟁력 있는 가격으로 드립니다.'
      };
      if (cfg.lessonInfo && base.lessonInfo) {
        Object.keys(oldInfo).forEach(function (k) {
          if (cfg.lessonInfo[k] === oldInfo[k]) cfg.lessonInfo[k] = base.lessonInfo[k];
        });
      }
    }
    if (from < 7) {
      // v5 (2026-11-11): 인트로 원고 개정. v6: 8장면의 이용 시간 규칙 문장 수정. v7: 9장면을 둘로 나눠 10장면.
      // 인트로 원고는 관리자 페이지에서 고치지 않으므로 새 원고로 통째로 바꾼다.
      // (바꾸지 않으면 설정을 저장한 적 있는 태블릿은 예전 원고와 새 음성·그림이 어긋난다.)
      cfg.intro = base.intro;
    }
    if (from < 8) {
      // v8 (2026-11-11): 약속 문구 개정(7가지 → 6가지: 2·3번을 합치고 5·7번 문구 변경)과 그에 맞춘 시설 소개 멘트.
      // 예전 초기값 그대로인 경우만 바꾸고, 직원이 고친 문구는 그대로 둔다.
      var oldPromises = [
        '일반 연습장보다 1.5배 이상 넓은 검단 유일의 1인 타석',
        '레슨권 매출 100%를 레슨 프로에게 배당, 일반 매장보다 경쟁력 있는 가격',
        '패키지 상품을 회원이 직접 조합하는 맞춤형 상품',
        '기본 1일 1회 60분, 빈 타석이 2개 이상이면 연장 이용 가능',
        '매일 미화 작업으로 쾌적한 환경',
        '10년을 내다보며 최고의 아카데미를 만드는 노력',
        '매니저 프로님들의 최상의 서비스'
      ];
      if (cfg.texts && JSON.stringify(cfg.texts.promises) === JSON.stringify(oldPromises)) cfg.texts.promises = base.texts.promises;
      var oldFacilityMent = '더스윙블랙은 일곱 가지를 약속드립니다. 넓은 1인 타석부터 최상의 서비스까지, 천천히 살펴보세요.';
      if (cfg.ments && cfg.ments.facility === oldFacilityMent) cfg.ments.facility = base.ments.facility;
    }
    if (from < 9) {
      // v9 (2026-11-11): 터치스크린 구역 순서의 초기값을 띠 배너 → 터치 영역 → 가격표로 바꿨다.
      // 예전 초기값 그대로인 경우만 바꾸고, 직원이 다른 순서로 고친 값은 그대로 둔다.
      if (cfg.kiosk && cfg.kiosk.order === 'prices-site-banner') cfg.kiosk.order = base.kiosk.order;
    }
    cfg.schema = base.schema;
    return cfg;
  }

  function history() {
    try { return JSON.parse(read(HIST) || '[]'); } catch (e) { return []; }
  }

  // 두 설정의 차이를 사람이 읽을 수 있는 목록으로 만든다.
  function diff(before, after) {
    var a = flatten(before), b = flatten(after), out = [];
    var keys = {};
    Object.keys(a).forEach(function (k) { keys[k] = 1; });
    Object.keys(b).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) {
      if (k === 'settings.pinHash') {
        if (a[k] !== b[k]) out.push({ path: k, label: '관리자 PIN', before: '(이전 PIN)', after: '(새 PIN)' });
        return;
      }
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
        out.push({ path: k, label: label(k), before: show(a[k]), after: show(b[k]) });
      }
    });
    return out;
  }

  function flatten(o, prefix, out) {
    out = out || {};
    prefix = prefix || '';
    Object.keys(o).forEach(function (k) {
      var v = o[k], p = prefix ? prefix + '.' + k : k;
      if (isObj(v) && prefix !== 'items') flatten(v, p, out);
      else if (isObj(v)) { out[p + '#price'] = v.price; out[p + '#sale'] = v.sale; }
      else out[p] = v;
    });
    return out;
  }

  function label(path) {
    var m = path.match(/^items\.(.+)#(price|sale)$/);
    if (m) return root.SBPricing.itemLabel(m[1]) + (m[2] === 'price' ? ' 원가' : ' 할인가');
    var names = {
      'schema': '설정 버전', 'discount.on': '할인 적용 버튼', 'discount.start': '할인 시작일', 'discount.end': '할인 종료일',
      'promos': '홍보 문구', 'pros': '프로 정보', 'facility': '시설 소개 카드', 'guide': '이용 안내',
      'texts.promises': '약속 문구', 'texts.trust': '신뢰 지표', 'texts.terms': '이용약관 원문',
      'texts.slogan1': '홈 슬로건 1', 'texts.slogan2': '홈 슬로건 2', 'texts.pledge': '다짐 문구',
      'texts.builderTagline': '이용권 설계 문구', 'texts.brand': '브랜드명', 'texts.branch': '지점명',
      'kiosk.order': '터치스크린 구역 순서', 'kiosk.boardTitle': '터치스크린 가격표 제목',
      'kiosk.boardNote': '터치스크린 가격표 안내 문구', 'kiosk.boardSale': '터치스크린 가격표 할인가 표시',
      'kiosk.bannerCall': '터치스크린 배너 기본 문구', 'kiosk.bannerSec': '터치스크린 배너 넘김 시간(초)',
      'settings.voiceOn': 'AI 보이스 기본값', 'settings.sfxOn': '효과음 기본값',
      'settings.voiceRate': '음성 속도', 'settings.idleSec': '무조작 초기화 시간(초)'
    };
    if (names[path]) return names[path];
    var v = path.match(/^validity\.(solo|pkg)\.(\d+)$/);
    if (v) return '레슨 유효기간 ' + (v[1] === 'solo' ? '단독 ' : '패키지 ') + v[2] + '회';
    var c = path.match(/^couponMonths\.(\d+)$/);
    if (c) return c[1] + '회 쿠폰 유효기간';
    return path;
  }

  function show(v) {
    if (v === null || v === undefined || v === '') return '(없음)';
    if (typeof v === 'number') return root.SBPricing.fmt(v);
    if (typeof v === 'boolean') return v ? '켜짐' : '꺼짐';
    if (Array.isArray(v)) return '목록 ' + v.length + '개';
    return String(v);
  }

  // 저장: 변경 전 값을 이력에 남긴다.
  function save(next, note) {
    var prev = load();
    var changes = diff(prev, next);
    if (!changes.length) return { saved: false, changes: [] };
    var h = history();
    h.unshift({ ts: Date.now(), note: note || '', changes: changes, snapshot: prev });
    if (h.length > MAX_HISTORY) h.length = MAX_HISTORY;
    var ok = write(KEY, JSON.stringify(next));
    write(HIST, JSON.stringify(h));
    return { saved: true, persisted: ok, changes: changes };
  }

  function restore(index) {
    var h = history();
    if (!h[index]) return null;
    var snap = h[index].snapshot;
    save(snap, new Date(h[index].ts).toLocaleString('ko-KR') + ' 이전 값으로 되돌림');
    return snap;
  }

  function exportBackup() {
    return JSON.stringify({
      app: 'swingblack-consult', schema: 1, exportedAt: new Date().toISOString(), config: load()
    }, null, 2);
  }

  function importBackup(text) {
    var data = JSON.parse(text);
    if (!data || data.app !== 'swingblack-consult' || !isObj(data.config) || !isObj(data.config.items)) {
      throw new Error('스윙블랙 상담 앱의 백업 파일이 아닙니다.');
    }
    var next = migrate(merge(root.SBDefaults(), data.config), root.SBDefaults());
    var check = root.SBPricing.validateItems(next.items);
    if (check.errors.length) throw new Error('백업 파일의 가격 값에 오류가 있습니다: ' + check.errors[0]);
    save(next, '백업 파일 불러오기');
    return next;
  }

  function resetAll() {
    save(root.SBDefaults(), '초기값으로 되돌림');
    return load();
  }

  // 기간이 정해진 스위치가 오늘 유효한지 (기간이 끝나면 자동으로 꺼진 것으로 본다)
  function activeToday(sw, today) {
    if (!sw || !sw.on) return false;
    var t = today || localDate(new Date());
    if (sw.start && t < sw.start) return false;
    if (sw.end && t > sw.end) return false;
    return true;
  }
  function localDate(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  function hashPin(pin) {
    var text = 'swingblack:' + pin;
    if (root.crypto && root.crypto.subtle && root.TextEncoder) {
      return root.crypto.subtle.digest('SHA-256', new root.TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ('0' + b.toString(16)).slice(-2);
        }).join('');
      });
    }
    var h = 5381;
    for (var i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return Promise.resolve('x' + (h >>> 0).toString(16));
  }

  root.SBStore = {
    load: load, save: save, history: history, restore: restore, diff: diff,
    exportBackup: exportBackup, importBackup: importBackup, resetAll: resetAll,
    activeToday: activeToday, localDate: localDate, hashPin: hashPin, clone: clone
  };
})(typeof self !== 'undefined' ? self : this);
