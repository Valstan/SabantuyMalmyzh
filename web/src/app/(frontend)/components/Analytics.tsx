import Script from 'next/script'

/**
 * Счётчики посещаемости — Яндекс.Метрика + LiveInternet (выбор владельца).
 *
 * Оба грузятся ОТЛОЖЕННО (next/script), вне критического пути → на скорость
 * страницы практически не влияют. Включаются через env (id Метрики / флаг LI):
 * пусто → не рендерится ничего. Так в dev и до настройки прода трафик не пачкается.
 *
 *   NEXT_PUBLIC_YANDEX_METRICA_ID — номер счётчика Метрики (только цифры)
 *   NEXT_PUBLIC_LIVEINTERNET=1     — включить счётчик LiveInternet
 *
 * NEXT_PUBLIC_* бейкаются в бандл при сборке → задаются как vars в CI
 * (deploy-prod.yml), владелец заводит счётчики и вставляет id один раз.
 */
const METRICA_ID = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID
const LIVEINTERNET = process.env.NEXT_PUBLIC_LIVEINTERNET === '1' || process.env.NEXT_PUBLIC_LIVEINTERNET === 'true'

export const analyticsEnabled = (!!METRICA_ID && /^\d+$/.test(METRICA_ID)) || LIVEINTERNET

export function Analytics() {
  const metrica = METRICA_ID && /^\d+$/.test(METRICA_ID) ? METRICA_ID : null

  return (
    <>
      {metrica && (
        <>
          <Script id="yandex-metrika" strategy="afterInteractive">
            {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,"script","https://mc.yandex.ru/metrika/tag.js?id=${metrica}","ym");
ym(${metrica},"init",{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",accurateTrackBounce:true,trackLinks:true});`}
          </Script>
          <noscript>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://mc.yandex.ru/watch/${metrica}`}
                style={{ position: 'absolute', left: '-9999px' }}
                alt=""
              />
            </div>
          </noscript>
        </>
      )}

      {LIVEINTERNET && (
        <Script id="liveinternet" strategy="lazyOnload">
          {`(function(){try{var u=encodeURIComponent,s=(typeof screen=="undefined")?"":";s"+screen.width+"*"+screen.height+"*"+(screen.colorDepth||screen.pixelDepth);
new Image().src="//counter.yadro.ru/hit?t52.6;r"+u(document.referrer)+s+";u"+u(document.URL)+";h"+u(document.title.substring(0,150))+";"+Math.random();}catch(e){}})();`}
        </Script>
      )}
    </>
  )
}
