import Script from 'next/script'

/**
 * Невидимая аналитика — Яндекс.Метрика (грузится ОТЛОЖЕННО, вне критического
 * пути → на скорость почти не влияет). Включается через env: пусто → не
 * рендерится ничего (в dev и до настройки прода трафик не пачкается).
 *
 *   NEXT_PUBLIC_YANDEX_METRICA_ID — номер счётчика Метрики (только цифры)
 *   NEXT_PUBLIC_LIVEINTERNET=1     — включить видимый бейдж LiveInternet
 *                                    (рендерится отдельно — в подвале, LiveInternetCounter)
 *
 * NEXT_PUBLIC_* бейкаются в бандл при сборке → задаются как vars в CI
 * (deploy-prod.yml), владелец заводит счётчики и вставляет id один раз.
 */
const METRICA_ID = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID
const LIVEINTERNET = process.env.NEXT_PUBLIC_LIVEINTERNET === '1' || process.env.NEXT_PUBLIC_LIVEINTERNET === 'true'

// Включена ли вообще аналитика (для показа плашки согласия). LiveInternet сам
// рендерится в подвале (LiveInternetCounter), но на согласие влияет тоже.
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
    </>
  )
}
