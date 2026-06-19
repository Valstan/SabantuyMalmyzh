import Script from 'next/script'

/**
 * Видимый счётчик-бейдж LiveInternet (88×120: «показано количество просмотров и
 * посетителей», ссылка на публичную статистику LI = раскрутка через рейтинг Рунета).
 * Код воспроизводит сниппет из кабинета владельца **1:1** (тип `t29.6`, id `licntECC9`).
 * Скрипт после гидрации подставляет src картинки → регистрирует визит и подтягивает
 * бейдж с числами.
 *
 * ⚠️ Кодировка параметров — legacy `escape()`, РОВНО как в официальном коде LI.
 * НЕ заменять на encodeURIComponent. Наш домен — IDN `сабантуймалмыж.рф`: в браузере
 * `document.URL` приходит кириллицей, и `escape()` кодирует её в `%uXXXX` — формат,
 * который бэкенд LI сопоставляет с зарегистрированным доменом. `encodeURIComponent`
 * даёт UTF-8 `%XX`; LI не распознаёт домен и отдаёт невидимый трекинг-пиксель вместо
 * бейджа (ровно этот регресс приехал в PR #115 — счётчик считал визиты, но картинки
 * не было). Серверный fetch проверить это не может: `/hit` отдаёт бейдж только живому
 * браузеру в контексте страницы — диагностика только в браузере на боевом домене.
 *
 * Включается флагом NEXT_PUBLIC_LIVEINTERNET=1 (как и невидимая аналитика). Рендерим
 * в подвале (SiteChrome), потому что это видимый элемент, а не фоновый трекер.
 */
const ENABLED =
  process.env.NEXT_PUBLIC_LIVEINTERNET === '1' || process.env.NEXT_PUBLIC_LIVEINTERNET === 'true'
const LI_ID = 'licntECC9' // из сниппета владельца (локальный DOM-handle, в URL хита не уходит)

export function LiveInternetCounter() {
  if (!ENABLED) return null
  return (
    <div className="li-counter">
      <a
        href="https://www.liveinternet.ru/click"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Статистика посещаемости LiveInternet"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          id={LI_ID}
          width={88}
          height={120}
          style={{ border: 0 }}
          title="LiveInternet: показано количество просмотров и посетителей"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAIBTAA7"
          alt=""
        />
      </a>
      <Script id="liveinternet" strategy="afterInteractive">
        {`(function(d,s){try{var el=d.getElementById("${LI_ID}");if(!el)return;
el.src="https://counter.yadro.ru/hit?t29.6;r"+escape(d.referrer)+((typeof(s)=="undefined")?"":";s"+s.width+"*"+s.height+"*"+(s.colorDepth?s.colorDepth:s.pixelDepth))+";u"+escape(d.URL)+";h"+escape(d.title.substring(0,150))+";"+Math.random();}catch(e){}})(document,screen);`}
      </Script>
    </div>
  )
}
