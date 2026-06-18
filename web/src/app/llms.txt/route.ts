import { FESTIVAL_DATE, FESTIVAL_PLACE, FESTIVAL_REGION } from '../../lib/festival'
import { getCultureSections } from '../../lib/cultureSections'
import { abs, SITE_NAME, SITE_URL } from '../../lib/site'

/**
 * /llms.txt — карта сайта для ИИ-краулеров (стандарт llmstxt.org). Даёт
 * нейросетям выверенную сводку фактов + ссылки на ключевые страницы, чтобы они
 * точно цитировали праздник (когда/где/что) в ответах чатов.
 *
 * В корне app/ (НЕ в route-group (frontend)) — как robots/sitemap, иначе Next
 * может не сгенерить (грабля route-group, PR #6). text/plain, ISR 1 день.
 */
export const revalidate = 86400

export function GET(): Response {
  const culture = getCultureSections('ru')
    .map((s) => `- [${s.title}](${abs(s.href)}): ${s.text}`)
    .join('\n')

  const body = `# ${SITE_NAME}

> Официальный сайт народного праздника «Сабантуй» в Малмыже (${FESTIVAL_REGION}, Россия) — праздник труда, силы и дружбы народов (русских, татар, марийцев, удмуртов). Программа, галерея, история, традиции и игра-викторина. Сайт двуязычный: русский и татарский.

## Факты о празднике
- Праздник: Сабантуй в Малмыже
- Дата: 4 июля 2026 (${FESTIVAL_DATE})
- Место: ${FESTIVAL_PLACE}, ${FESTIVAL_REGION}, Россия
- Состязания: борьба көрәш на поясах, конные скачки, столб с призом, национальная кухня, концерт
- Языки сайта: русский (основной), татарский (раздел /tt)

## Ключевые страницы
- [Главная и программа](${SITE_URL}/): расписание праздника и обратный отсчёт
- [О фестивале](${abs('/o-sabantuy')}): что такое Сабантуй в Малмыже
${culture}
- [Галерея](${abs('/gallery')}): фотоотчёты с праздника
- [Карта фестиваля](${abs('/map')}): план территории и площадки
- [Игра-викторина](${abs('/igra')}): познавательная игра про край и праздник
- [Контакты](${abs('/kontakty')})

## Татарская версия
- [Татарча / Tatar version](${abs('/tt')})
`

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  })
}
