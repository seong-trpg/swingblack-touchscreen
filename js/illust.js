/*
 * 일러스트·아이콘 (SVG, 평면 벡터 2~3톤)과 24시간 눈금 막대.
 * 색은 CSS 클래스로 입힌다: sg/fg 골드 선/면, sb/fb 블루 선/면, sw/fw 밝은 선/면,
 * fp 패널 면, fd 어두운 면, fs 실루엣 면, sd 어두운 선, td/tw 글자.
 */
(function (root) {
  'use strict';

  function wrap(body, vb) {
    return '<svg class="il" viewBox="' + (vb || '0 0 120 120') + '" aria-hidden="true">' + body + '</svg>';
  }

  var art = {
    clock24: '<circle class="fp" cx="60" cy="60" r="46"/><circle class="sg" cx="60" cy="60" r="46"/>' +
      '<path class="sb" d="M60 22v8M60 90v8M22 60h8M90 60h8"/>' +
      '<path class="sw" d="M60 60V36M60 60l17 10"/><circle class="fg" cx="60" cy="60" r="4"/>' +
      '<rect class="fg" x="68" y="78" width="44" height="24" rx="12"/><text class="td" x="90" y="95" text-anchor="middle" font-size="14" font-weight="800">24H</text>',

    bays: '<rect class="fp" x="10" y="26" width="100" height="68" rx="8"/>' +
      [0, 1, 2, 3, 4, 5].map(function (i) {
        return '<rect class="' + (i % 2 ? 'fb' : 'fg') + '" x="' + (18 + i * 15) + '" y="36" width="10" height="20" rx="2" opacity=".9"/>' +
          '<rect class="' + (i % 2 ? 'fg' : 'fb') + '" x="' + (18 + i * 15) + '" y="64" width="10" height="20" rx="2" opacity=".9"/>';
      }).join(''),

    bay: '<rect class="fp" x="14" y="18" width="92" height="84" rx="8"/><rect class="sg" x="14" y="18" width="92" height="84" rx="8"/>' +
      '<rect class="fb" x="26" y="28" width="68" height="34" rx="4" opacity=".35"/><path class="sb" d="M34 54q26-30 52-8"/>' +
      '<rect class="fg" x="40" y="78" width="40" height="12" rx="3" opacity=".8"/><circle class="fw" cx="60" cy="74" r="4"/>' +
      '<path class="sw" d="M20 66h10M90 66h10" stroke-dasharray="2 3"/>',

    gc3: '<rect class="fp" x="16" y="56" width="44" height="34" rx="6"/><rect class="sg" x="16" y="56" width="44" height="34" rx="6"/>' +
      '<circle class="fb" cx="30" cy="73" r="6"/><circle class="fb" cx="46" cy="73" r="6" opacity=".6"/>' +
      '<path class="sb" d="M64 80Q84 22 108 30" stroke-dasharray="3 4"/><circle class="fw" cx="108" cy="30" r="5"/>' +
      '<path class="sg" d="M12 96h96"/>',

    partition: '<path class="sg" d="M12 96h96"/>' +
      '<rect class="fb" x="24" y="24" width="6" height="72" rx="2"/><rect class="fb" x="57" y="24" width="6" height="72" rx="2"/><rect class="fb" x="90" y="24" width="6" height="72" rx="2"/>' +
      '<rect class="fp" x="34" y="60" width="19" height="30" rx="3"/><rect class="fp" x="67" y="60" width="19" height="30" rx="3"/>' +
      '<circle class="fw" cx="43.5" cy="52" r="4"/><circle class="fw" cx="76.5" cy="52" r="4"/>' +
      '<path class="sg" d="M20 24h80"/>',

    putting: '<ellipse class="fp" cx="60" cy="78" rx="50" ry="24"/><ellipse class="sb" cx="60" cy="78" rx="50" ry="24"/>' +
      '<ellipse class="fd" cx="78" cy="76" rx="8" ry="3.5"/><path class="sw" d="M78 76V28"/><path class="fg" d="M78 28l22 8-22 8z"/>' +
      '<circle class="fw" cx="38" cy="84" r="5"/><path class="sg" d="M45 83q14-6 24-6" stroke-dasharray="2 4"/>',

    bunker: '<path class="fp" d="M8 92q20-40 52-30t52-10v44H8z"/>' +
      '<path class="fg" d="M26 90q14-18 34-14t30 14q-32 10-64 0z" opacity=".75"/>' +
      '<path class="sw" d="M92 60V24"/><path class="fb" d="M92 24l18 7-18 7z"/><circle class="fw" cx="52" cy="84" r="4"/>' +
      '<path class="sb" d="M8 92q20-40 52-30t52-10"/>',

    fitting: '<rect class="fp" x="22" y="20" width="76" height="84" rx="8"/><rect class="sg" x="22" y="20" width="76" height="84" rx="8"/>' +
      '<path class="sw" d="M60 40a6 6 0 1 1 6 6l-6 4"/><path class="sb" d="M60 50L32 68h56z"/>' +
      '<path class="sg" d="M40 80h40M46 90h28"/>',

    parking: '<rect class="fp" x="20" y="16" width="80" height="80" rx="14"/><rect class="sb" x="20" y="16" width="80" height="80" rx="14"/>' +
      '<path class="sw" d="M46 78V34h18a13 13 0 0 1 0 26H46" stroke-width="7"/>' +
      '<rect class="fg" x="58" y="82" width="56" height="26" rx="13"/><text class="td" x="86" y="100" text-anchor="middle" font-size="13" font-weight="800">2시간</text>',

    clean: '<path class="fg" d="M60 16l7 22 22 7-22 7-7 22-7-22-22-7 22-7z"/>' +
      '<path class="fb" d="M94 62l4 11 11 4-11 4-4 11-4-11-11-4 11-4z"/><path class="fw" d="M30 76l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/>',

    cafe: '<path class="fp" d="M28 48h54v26a22 22 0 0 1-22 22h-10a22 22 0 0 1-22-22z"/><path class="sg" d="M28 48h54v26a22 22 0 0 1-22 22h-10a22 22 0 0 1-22-22z"/>' +
      '<path class="sg" d="M82 56h8a10 10 0 0 1 0 20h-8"/><path class="sb" d="M44 36q-6-8 0-16M58 36q-6-8 0-16M72 36q-6-8 0-16"/>',

    lesson: '<path class="sw" d="M30 24l44 62" stroke-width="5"/><path class="fg" d="M70 82l16 2 6 14-22-4z"/>' +
      '<circle class="fw" cx="42" cy="94" r="7"/><path class="sb" d="M22 100h76"/>' +
      '<path class="sb" d="M84 30a16 16 0 1 1-2 0M83 34v12l8 5"/>',

    locker: '<rect class="fp" x="24" y="14" width="72" height="92" rx="6"/><rect class="sg" x="24" y="14" width="72" height="92" rx="6"/>' +
      '<path class="sg" d="M24 60h72M60 14v92"/><path class="sb" d="M50 34v8M70 34v8M50 78v8M70 78v8" stroke-width="4"/>',

    ticket: '<path class="fp" d="M14 38h92v14a10 10 0 0 0 0 20v14H14V72a10 10 0 0 0 0-20z"/><path class="sg" d="M14 38h92v14a10 10 0 0 0 0 20v14H14V72a10 10 0 0 0 0-20z"/>' +
      '<path class="sb" d="M74 44v36" stroke-dasharray="4 5"/><path class="sw" d="M30 54h30M30 68h20"/>',

    guide: '<rect class="fp" x="24" y="14" width="72" height="92" rx="8"/><rect class="sg" x="24" y="14" width="72" height="92" rx="8"/>' +
      '<path class="sw" d="M38 38h44M38 56h44M38 74h28"/><circle class="fb" cx="84" cy="88" r="14"/><path class="sd" d="M78 88l5 5 8-10"/>',

    // 프로 사진 자리: 얼굴 없는 실루엣
    silhouette: '<rect class="fp" x="0" y="0" width="120" height="160"/>' +
      '<circle class="fs" cx="60" cy="58" r="24"/><path class="fs" d="M14 160a46 50 0 0 1 92 0z"/>' +
      '<path class="sg" d="M88 30l-52 96" stroke-width="3" opacity=".45"/>'
  };

  var ui = {
    back: '<path d="M15 5l-7 7 7 7"/>',
    cart: '<path d="M4 6h3l2 10h9l2-7H8"/><circle cx="10" cy="19.5" r="1.2"/><circle cx="17" cy="19.5" r="1.2"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
    mute: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>',
    reset: '<path d="M5 12a7 7 0 1 0 2.2-5.1"/><path d="M5 4v4h4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    edit: '<path d="M5 19l1-4L16 5l3 3L9 18z"/>',
    trash: '<path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/>',
    replay: '<path d="M19 12a7 7 0 1 1-2.2-5.1"/><path d="M19 4v4h-4"/>',
    play: '<path d="M8 5.2v13.6l11-6.8z"/>',
    pause: '<rect x="6.6" y="5.2" width="3.6" height="13.6" rx="0.9"/><rect x="13.8" y="5.2" width="3.6" height="13.6" rx="0.9"/>',
    next: '<path d="M9 5l7 7-7 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.4"/>'
  };

  /*
   * 24시간 눈금 막대. 앱 전체의 시그니처 요소다.
   * opt = { ranges:[{from,to,cls}], now:시(소수), compact:Boolean, marks:[시,...] }
   */
  function rail(opt) {
    opt = opt || {};
    var fills = (opt.ranges || []).map(function (r) {
      var left = r.from / 24 * 100, width = (r.to - r.from) / 24 * 100;
      return '<i class="rail-fill ' + (r.cls || '') + '" style="left:' + left + '%;width:' + width + '%"></i>';
    }).join('');
    var now = typeof opt.now === 'number'
      ? '<i class="rail-now" style="left:' + (opt.now / 24 * 100) + '%"></i>' : '';
    var marks = opt.marks || [0, 6, 12, 18, 24];
    var ticks = opt.compact ? '' : '<div class="rail-ticks">' + marks.map(function (h) {
      return '<span style="left:' + (h / 24 * 100) + '%">' + (h < 10 ? '0' + h : h) + '</span>';
    }).join('') + '</div>';
    return '<div class="rail' + (opt.compact ? ' rail-compact' : '') + '"><div class="rail-track">' + fills + now + '</div>' + ticks + '</div>';
  }

  root.SBIllust = {
    art: function (name, vb) { return wrap(art[name] || art.ticket, name === 'silhouette' ? '0 0 120 160' : vb); },
    icon: function (name) {
      return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">' + (ui[name] || '') + '</svg>';
    },
    rail: rail
  };
})(typeof self !== 'undefined' ? self : this);
