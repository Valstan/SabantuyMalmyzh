import Script from 'next/script'

/**
 * Видимый счётчик-бейдж LiveInternet (88×120: показывает число просмотров и
 * посетителей, ссылка ведёт на публичную статистику LI — это и есть «раскрутка»
 * через рейтинг Рунета). Тип счётчика `t29.6`, размеры и id — из сниппета
 * владельца (привязка к сайту — по домену в кабинете LI, не секрет: счётчик и
 * так виден всем в HTML). Скрипт после загрузки подставляет src картинки →
 * регистрирует визит и подтягивает бейдж с числами. Грузится отложенно.
 *
 * Включается флагом NEXT_PUBLIC_LIVEINTERNET=1 (как и невидимая аналитика). Рендерим
 * в подвале (SiteChrome), потому что это видимый элемент, а не фоновый трекер.
 */
const ENABLED =
  process.env.NEXT_PUBLIC_LIVEINTERNET === '1' || process.env.NEXT_PUBLIC_LIVEINTERNET === 'true'
const LI_ID = 'licnt304D'
const LI_TYPE = 't29.6' // тип/стиль счётчика из кабинета владельца

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
          title="LiveInternet: показано число просмотров и посетителей"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAEALAAAAAABAAEAAAIBTAA7"
          alt=""
        />
      </a>
      <Script id="liveinternet" strategy="afterInteractive">
        {`(function(d,s){try{var u=encodeURIComponent,el=d.getElementById("${LI_ID}");if(!el)return;
el.src="https://counter.yadro.ru/hit?${LI_TYPE};r"+u(d.referrer)+((typeof(s)=="undefined")?"":";s"+s.width+"*"+s.height+"*"+(s.colorDepth?s.colorDepth:s.pixelDepth))+";u"+u(d.URL)+";h"+u(d.title.substring(0,150))+";"+Math.random();}catch(e){}})(document,screen);`}
      </Script>
    </div>
  )
}
