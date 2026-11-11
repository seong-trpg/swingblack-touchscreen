/*
 * 오프라인 캐시(서비스 워커).
 * 앱 파일을 고치면 아래 VERSION을 올린다. 올리지 않으면 태블릿이 예전 화면을 보여 줄 수 있다.
 * 온라인일 때는 새 파일을 먼저 받고, 인터넷이 끊기면 저장해 둔 파일로 동작한다.
 */
const VERSION = 'swingblack-v22';
// 캐시 이름에 이 사이트의 주소를 붙인다. 탭용과 터치스크린용 사이트가 같은 github.io 주소 아래에 있어
// 저장 공간을 함께 쓰므로, 서로의 저장분을 지우지 않게 하기 위함이다.
const SITE = '|' + self.registration.scope;
const CACHE = VERSION + SITE;
// 실제 사진: assets/images/ 에 실제로 있는 파일만 적는다.
const PHOTOS = [
  'pros/song-wonmin.webp', 'pros/song-wonmin-full.webp', 'pros/son-jimin.webp', 'pros/son-jimin-full.webp'
].map((p) => 'assets/images/' + p);
// 음성 파일: assets/audio/voice/ 에 실제로 있는 파일만 적는다(없는 파일을 적으면 설치가 실패한다).
const VOICE = [
  'intro1', 'intro2', 'intro3', 'intro4', 'intro5', 'intro6', 'intro7', 'intro8', 'intro9', 'intro10',
  'builder', 'slot1', 'slot2', 'slot3', 'lesson', 'facility', 'pros', 'guide'
].map((id) => 'assets/audio/voice/' + id + '.mp3');
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/pricing.js', 'js/defaults.js', 'js/store.js', 'js/voice.js', 'js/illust.js',
  'js/core.js', 'js/intro.js', 'js/screens.js', 'js/builder.js', 'js/admin.js', 'js/main.js',
  'vendor/gsap.min.js', 'vendor/howler.core.min.js', 'vendor/fonts/PretendardVariable.woff2',
  'assets/images/assets.json',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png'
].concat(VOICE, PHOTOS);

// 사이트에 따라 있을 수도 없을 수도 있는 파일(없어도 설치가 실패하지 않게 따로 받는다).
// 탭용 사이트에는 터치스크린 파일이 없고, 터치스크린용 사이트에서는 상담 앱이 app.html이다(tools/build-dist.js).
const OPTIONAL = ['kiosk.html', 'app.html', 'kiosk.webmanifest', 'css/kiosk.css', 'js/kiosk.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE).then(() => Promise.all(OPTIONAL.map((u) => cache.add(u).catch(() => {})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      // 이 사이트의 예전 저장분과, 사이트 구분이 없던 예전 이름의 저장분만 지운다.
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && (k.endsWith(SITE) || k.indexOf('|') < 0)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fromNetwork(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    fetch(request).then((res) => { clearTimeout(timer); resolve(res); }, (err) => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fromNetwork(req, 3500).then((res) => {
      // 정상 응답만 저장한다(없는 사진의 404는 저장하지 않는다).
      if (res.ok && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
      }
      return res;
    }).catch(() =>
      caches.match(req, { ignoreSearch: true }).then((hit) => {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      })
    )
  );
});
