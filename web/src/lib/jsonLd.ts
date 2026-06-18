import { FESTIVAL_COUNTRY, FESTIVAL_DATE, FESTIVAL_PLACE, FESTIVAL_REGION } from './festival'
import type { Locale } from './i18n'
import { abs, SITE_DESC, SITE_NAME, SITE_URL } from './site'

/**
 * Построители Schema.org JSON-LD (структурированная разметка).
 *
 * Зачем: и для Google rich-results, и — главное сегодня — для цитирования сайта в
 * ответах нейросетей (ChatGPT/Perplexity/Gemini): машиночитаемые факты (что за
 * праздник, когда, где, что происходит) LLM извлекает без догадок. Всё рендерится
 * на СЕРВЕРЕ как <script type="application/ld+json"> — ноль веса для браузера.
 *
 * Источник фактов о празднике — lib/site.ts + lib/festival.ts (единый источник
 * правды, чтобы дата/место не разъезжались между разметкой и контентом).
 */

type Json = Record<string, unknown>

const locTag = (locale: Locale) => (locale === 'tt' ? 'tt-RU' : 'ru-RU')

// WebSite — корневая сущность сайта (имя, язык). Перечисляет обе локали.
export function websiteJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: SITE_DESC,
    inLanguage: [locTag('ru'), locTag('tt')],
    publisher: { '@id': `${SITE_URL}/#organization` },
  }
}

// Organization — кто стоит за сайтом (организатор праздника).
export function organizationJsonLd(): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: abs('/icons/icon-512.png'),
    description: SITE_DESC,
    areaServed: `${FESTIVAL_PLACE}, ${FESTIVAL_REGION}, ${FESTIVAL_COUNTRY}`,
  }
}

// Event — сам праздник: дата, место, организатор. Критично для ответа ИИ
// «когда/где Сабантуй в Малмыже» и для Google event-сниппета.
export function eventJsonLd(locale: Locale = 'ru'): Json {
  const ru = locale === 'ru'
  return {
    '@context': 'https://schema.org',
    '@type': 'Festival',
    name: ru ? 'Сабантуй в Малмыже' : 'Малмыждә Сабантуй',
    description: ru
      ? 'Народный праздник окончания весенних полевых работ — труда, силы и дружбы народов. Борьба көрәш, конные скачки, столб с призом, национальная кухня, концерт.'
      : 'Яз кыр эшләре тәмамлануга багышланган халык бәйрәме — хезмәт, көч һәм халыклар дуслыгы. Көрәш, ат чабышы, призлы баган, милли аш-су, концерт.',
    startDate: FESTIVAL_DATE,
    endDate: FESTIVAL_DATE,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    inLanguage: locTag(locale),
    image: [abs('/og.jpg')],
    url: abs(locale === 'tt' ? '/tt' : '/'),
    location: {
      '@type': 'Place',
      name: FESTIVAL_PLACE,
      address: {
        '@type': 'PostalAddress',
        addressLocality: FESTIVAL_PLACE,
        addressRegion: FESTIVAL_REGION,
        addressCountry: 'RU',
      },
    },
    organizer: { '@id': `${SITE_URL}/#organization` },
  }
}

// FAQPage — выверенные вопрос-ответы про праздник. Золото для GEO: ИИ берёт
// готовые Q&A и цитирует. Факты сверены с контентом сайта (даты/состязания/народы).
type Qa = { q: string; a: string }

const FAQ_RU: Qa[] = [
  {
    q: 'Что такое Сабантуй в Малмыже?',
    a: 'Сабантуй — народный праздник окончания весенних полевых работ. В Малмыже (Кировская область) это межнациональное торжество труда, силы и дружбы народов — русских, татар, марийцев и удмуртов.',
  },
  {
    q: 'Когда пройдёт Сабантуй в Малмыже в 2026 году?',
    a: 'Праздник состоится 4 июля 2026 года в Малмыже Кировской области.',
  },
  {
    q: 'Что происходит на празднике?',
    a: 'Борьба көрәш на поясах за титул батыра, конные скачки, лазание на столб за призом, национальная кухня (чак-чак, эчпочмак, плов из казана), концерт и народные пляски, забавы для детей.',
  },
  {
    q: 'Какие народы участвуют в Сабантуе в Малмыже?',
    a: 'Сабантуй в Малмыже — праздник дружбы народов: в нём участвуют русские, татары, марийцы и удмурты, живущие на малмыжской земле.',
  },
]

const FAQ_TT: Qa[] = [
  {
    q: 'Малмыждә Сабантуй нәрсә ул?',
    a: 'Сабантуй — яз кыр эшләре тәмамлануга багышланган халык бәйрәме. Малмыжда (Киров өлкәсе) бу — хезмәт, көч һәм халыклар дуслыгы бәйрәме: руслар, татарлар, марилар һәм удмуртлар.',
  },
  {
    q: '2026 елда Малмыждә Сабантуй кайчан була?',
    a: 'Бәйрәм 2026 елның 4 июлендә Киров өлкәсе Малмыж шәһәрендә була.',
  },
  {
    q: 'Бәйрәмдә нәрсә була?',
    a: 'Батыр исеме өчен билбау көрәше, ат чабышы, призлы баганга менү, милли аш-су (чәкчәк, өчпочмак), концерт һәм халык биюләре, балалар өчен уеннар.',
  },
  {
    q: 'Малмыждә Сабантуйда нинди халыклар катнаша?',
    a: 'Малмыждә Сабантуй — халыклар дуслыгы бәйрәме: анда малмыж җирендә яшәүче руслар, татарлар, марилар һәм удмуртлар катнаша.',
  },
]

export function faqJsonLd(locale: Locale = 'ru'): Json {
  const items = locale === 'tt' ? FAQ_TT : FAQ_RU
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locTag(locale),
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  }
}

// BreadcrumbList — путь до страницы (Главная → …). Помогает и Google, и ИИ
// понять структуру сайта.
export function breadcrumbJsonLd(items: { name: string; path: string }[]): Json {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  }
}
