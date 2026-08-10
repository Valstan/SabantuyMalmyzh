/**
 * Видимый информер посещаемости Яндекс.Метрики в подвале (решение владельца
 * 2026-08-09, D-017: цифру видно на самом сайте, а не только в кабинете).
 * Пришёл на смену бейджу LiveInternet — единственный счётчик экосистемы
 * теперь Метрика (D-025).
 *
 * ⚠️ Показ включается В КАБИНЕТЕ: Настройки → Дополнительные настройки →
 * «Код счётчика» → чекбокс **«Информер»** (он же делает статистику по
 * посетителям/визитам/просмотрам публичной). Пока чекбокс снят, informer.yandex.ru
 * отдаёт 200 и валидную картинку 88×31 — но со сплошными нулями, а не ошибку.
 * Проверять надо глазами по картинке, «скрипт отдался» здесь ничего не значит.
 * Поэтому отдельный флаг:
 *
 *   NEXT_PUBLIC_YANDEX_METRICA_ID       — номер счётчика (общий с Analytics)
 *   NEXT_PUBLIC_METRIKA_INFORMER=1      — информер включён в кабинете, показываем
 *
 * Без флага не рендерим ничего: пустая рамка в подвале хуже отсутствия цифры.
 * Флаг ставится Variable'ом репозитория ПОСЛЕ того, как информер включён в
 * кабинете и картинка проверена глазами (NEXT_PUBLIC_* бейкается в бандл →
 * смена значения требует пересборки, а не только рестарта — см. письмо brain
 * 2026-08-02 про ротацию NEXT_PUBLIC_*).
 *
 * ⚠️ Это <img>, а не скрипт: визиты считает основной тег Метрики (Analytics),
 * информер только показывает уже посчитанное. Ставим loading="lazy" —
 * подвал ниже сгиба, на LCP влиять не должен.
 */
const METRICA_ID = process.env.NEXT_PUBLIC_YANDEX_METRICA_ID
const INFORMER_ON =
  process.env.NEXT_PUBLIC_METRIKA_INFORMER === '1' ||
  process.env.NEXT_PUBLIC_METRIKA_INFORMER === 'true'

export function MetrikaInformer({ label }: { label: string }) {
  const id = METRICA_ID && /^\d+$/.test(METRICA_ID) ? METRICA_ID : null
  if (!id || !INFORMER_ON) return null

  // Разметка 1:1 из кабинета счётчика («Код счётчика» → чекбокс «Информер»),
  // а не собранная по документации. Первый заход я URL угадал (`_uniques` вместо
  // `_pageviews`) и, главное, не знал, что показ включается отдельным чекбоксом —
  // без него Метрика отдаёт валидную картинку с нулями, а не ошибку.
  //
  // `class="ym-advanced-informer"` + `data-cid`/`data-lang` — не декорация: по ним
  // тег Метрики находит информер и обновляет цифры на клиенте. Без класса остаётся
  // только статическая картинка. Поэтому `loading="lazy"` здесь НЕ ставим —
  // отложенная загрузка мешает тегу подхватить элемент.
  const src = `https://informer.yandex.ru/informer/${id}/3_1_FFFFFFFF_EFEFEFFF_0_pageviews`

  return (
    <div className="metrika-informer">
      <a
        href={`https://metrika.yandex.ru/stat/?id=${id}&from=informer`}
        target="_blank"
        rel="nofollow noopener noreferrer"
        aria-label={label}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          width={88}
          height={31}
          style={{ border: 0 }}
          alt={label}
          title={label}
          className="ym-advanced-informer"
          data-cid={id}
          data-lang="ru"
        />
      </a>
    </div>
  )
}
