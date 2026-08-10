/**
 * Видимый информер посещаемости Яндекс.Метрики в подвале (решение владельца
 * 2026-08-09, D-017: цифру видно на самом сайте, а не только в кабинете).
 * Пришёл на смену бейджу LiveInternet — единственный счётчик экосистемы
 * теперь Метрика (D-025).
 *
 * Картинку отдаёт informer.yandex.ru по номеру нашего счётчика; она рисуется
 * ТОЛЬКО если в кабинете счётчика включён информер. Поэтому отдельный флаг:
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

  // Формат информера: <тип>_<стиль>_<фон>_<текст>_<стрелка>_<показатель>.
  // 3_1 — компактный горизонтальный; uniques — посетители (а не хиты).
  const src = `https://informer.yandex.ru/informer/${id}/3_1_FFFFFFFF_EFEFEFFF_0_uniques`

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
          loading="lazy"
        />
      </a>
    </div>
  )
}
