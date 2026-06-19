/**
 * Наполнение игры v2 «Угадай по картинке» (game=kartinki). Запуск:
 *
 *   corepack pnpm -C web payload run src/seed/seedQuizImages.ts
 *
 * Создаёт вопросы quiz-questions с game='kartinki' (ru + tt, опубликованные).
 * Идемпотентно по `key` (префикс `img-`); SEED_FORCE=1 — пересоздать.
 *
 * ⚠️ ФАКТЫ выверены по источникам (проверены 2026-06-19, поле `source`):
 *   • Сабантуй (корэш, батыр/баран, игры) — ru.wikipedia.org/wiki/Сабантуй
 *   • Чак-чак — ru.wikipedia.org/wiki/Чак-чак
 *   • Эчпочмак (өч почмак = три угла; начинка) — ru.wikipedia.org/wiki/Эчпочмак
 *   • Малмыж (на р. Шошма близ Вятки; Богоявленский собор 1802) — ru.wikipedia.org/wiki/Малмыж
 *   • Вятка (приток Камы) — ru.wikipedia.org/wiki/Вятка_(река)
 *   • Калфак (татарский женский головной убор) — ru.wikipedia.org/wiki/Калфак
 *
 * 🖼️ КАРТИНКИ — свободные (Wikimedia Commons, CC0/CC-BY/CC-BY-SA/PD), скачаны и
 * обработаны web/scripts/process-quiz-images.mjs → web/public/quiz/<slug>.{jpg,webp}.
 * Поле `image` = slug, `imageSource` = страница File: на Commons (атрибуция).
 *
 * ⚠️⚠️ ТАТАРСКИЙ — ЧЕРНОВИК (не носитель), как и остальной tt-контент (I11).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- seed-утилита: Payload data untyped */
import config from '@payload-config'
import { getPayload } from 'payload'

// ─── Источники фактов (общие ru/tt; не локализуются) ──────────────────────────
const S_SAB = 'https://ru.wikipedia.org/wiki/Сабантуй'
const S_CHAK = 'https://ru.wikipedia.org/wiki/Чак-чак'
const S_ECH = 'https://ru.wikipedia.org/wiki/Эчпочмак'
const S_MAL = 'https://ru.wikipedia.org/wiki/Малмыж'
const S_VYAT = 'https://ru.wikipedia.org/wiki/Вятка_(река)'
const S_KAL = 'https://ru.wikipedia.org/wiki/Калфак'

// ─── Источники картинок (страницы File: на Commons) ───────────────────────────
const C_KORESH = 'https://commons.wikimedia.org/wiki/File:Kurash_on_Moscow_Sabantuy_of_Moscow_bashkirs.jpg'
const C_CHAK = 'https://commons.wikimedia.org/wiki/File:Chak-chak-made_02.jpg'
const C_ECH = 'https://commons.wikimedia.org/wiki/File:Echpochmak2.jpg'
const C_GAME = 'https://commons.wikimedia.org/wiki/File:%D0%98%D0%B3%D1%80%D0%B0_%D0%BD%D0%B0_%D0%A1%D0%B0%D0%B1%D0%B0%D0%BD%D1%82%D1%83%D0%B5.jpg'
const C_DANCE = 'https://commons.wikimedia.org/wiki/File:Tatar_dance_at_the_Sabantuy_festival,_Kirov.jpg'
const C_MAL = 'https://commons.wikimedia.org/wiki/File:Epiphany_Cathedral_in_Malmyzh,_Kirov_Oblast.jpg'
const C_VYAT = 'https://commons.wikimedia.org/wiki/File:Bridge_over_Vyatka_river._Kirov._Russia._%D0%9C%D0%BE%D1%81%D1%82_%D1%87%D0%B5%D1%80%D0%B5%D0%B7_%D0%92%D1%8F%D1%82%D0%BA%D1%83._%D0%9A%D0%B8%D1%80%D0%BE%D0%B2._%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F_-_panoramio.jpg'
const C_COST = 'https://commons.wikimedia.org/wiki/File:Nafiga_Arapova_in_tatar_costume.jpg'

type QDef = {
  key: string
  theme: string
  difficulty: string
  source: string
  image: string
  imageSource: string
  order: number
  ru: { prompt: string; options: string[]; correct: number; explanation: string }
  tt: { prompt: string; options: string[]; explanation: string }
}

const QUESTIONS: QDef[] = [
  {
    key: 'img-koresh',
    theme: 'sabantuy',
    difficulty: 'easy',
    source: S_SAB,
    image: 'koresh',
    imageSource: C_KORESH,
    order: 1,
    ru: {
      prompt: 'Какое состязание изображено — главное на Сабантуе?',
      options: ['Көрәш — борьба на поясах', 'Бокс', 'Фехтование', 'Шахматы'],
      correct: 0,
      explanation:
        'Көрәш — национальная борьба на кушаках (поясах), сердце Сабантуя. Соперники держат друг друга за полотенце-кушак и стараются положить на лопатки. Победитель получает звание «батыр» и главный приз — барана.',
    },
    tt: {
      prompt: 'Рәсемдә нинди ярыш — Сабантуйның иң мөһиме?',
      options: ['Көрәш — билбау көрәше', 'Бокс', 'Кылыч ярышы', 'Шахмат'],
      explanation:
        'Көрәш — кушак (билбау) көрәше, Сабантуйның йөрәге. Көрәшчеләр бер-берсен сөлге-кушактан тотып, җиңәргә тырыша. Җиңүче «батыр» исемен һәм төп бүләкне — сарыкны ала.',
    },
  },
  {
    key: 'img-chakchak',
    theme: 'other',
    difficulty: 'easy',
    source: S_CHAK,
    image: 'chakchak',
    imageSource: C_CHAK,
    order: 2,
    ru: {
      prompt: 'Какое татарское лакомство на фотографии?',
      options: ['Чак-чак', 'Пахлава', 'Халва', 'Зефир'],
      correct: 0,
      explanation:
        'Чак-чак — татарское национальное лакомство: обжаренные кусочки теста, залитые горячим медовым сиропом. Символ гостеприимства и один из гастрономических символов Татарстана.',
    },
    tt: {
      prompt: 'Фотода нинди татар тәмлүкенче?',
      options: ['Чәкчәк', 'Пахлава', 'Хәлвә', 'Зефир'],
      explanation:
        'Чәкчәк — татар халкының милли тәмлүкенче: майда кыздырылган камыр кисәкләре, кайнар бал сиропы белән коелган. Кунакчыллык һәм Татарстанның ашамлык символларының берсе.',
    },
  },
  {
    key: 'img-echpochmak',
    theme: 'other',
    difficulty: 'medium',
    source: S_ECH,
    image: 'echpochmak',
    imageSource: C_ECH,
    order: 3,
    ru: {
      prompt: 'Как называется этот треугольный татарский пирожок?',
      options: ['Эчпочмак', 'Чебурек', 'Самса', 'Хачапури'],
      correct: 0,
      explanation:
        'Эчпочмак (тат. «өч почмак» — «три угла») — треугольный печёный пирожок с начинкой из сырого картофеля, мяса и лука. Национальное блюдо татарской и башкирской кухни, наряду с чак-чаком — визитная карточка Татарстана.',
    },
    tt: {
      prompt: 'Бу өчпочмаклы татар бәлеше ничек атала?',
      options: ['Өчпочмак', 'Чебурек', 'Самса', 'Хачапури'],
      explanation:
        'Өчпочмак (тат. «өч почмак») — өчпочмаклы пешерелгән бәлеш, эчендә чи бәрәңге, ит һәм суган. Татар һәм башкорт ашханәсенең милли ризыгы, чәкчәк белән бергә — Татарстанның визит карточкасы.',
    },
  },
  {
    key: 'img-sabantuy-game',
    theme: 'sabantuy',
    difficulty: 'medium',
    source: S_SAB,
    image: 'sabantuy-game',
    imageSource: C_GAME,
    order: 4,
    ru: {
      prompt: 'Что делает участница этой игры на Сабантуе?',
      options: [
        'Разбивает горшок палкой с завязанными глазами',
        'Печёт блины',
        'Запускает воздушного змея',
        'Полет грядку',
      ],
      correct: 0,
      explanation:
        'Это весёлая народная игра Сабантуя: с завязанными глазами нужно палкой разбить горшок (чүлмәк). Состязание на ловкость, чутьё и удачу — собирает много зрителей.',
    },
    tt: {
      prompt: 'Сабантуйдагы бу уенда катнашучы нәрсә эшли?',
      options: [
        'Күзе бәйле килеш таяк белән чүлмәк вата',
        'Коймак пешерә',
        'Җил оча торган уенчык җибәрә',
        'Түтәл утый',
      ],
      explanation:
        'Бу — Сабантуйның күңелле халык уены: күзләрне бәйләп, таяк белән чүлмәкне ватарга кирәк. Җитезлек, сиземләү һәм бәхет ярышы — күп тамашачы җыя.',
    },
  },
  {
    key: 'img-sabantuy-dance',
    theme: 'sabantuy',
    difficulty: 'medium',
    source: S_SAB,
    image: 'sabantuy-dance',
    imageSource: C_DANCE,
    order: 5,
    ru: {
      prompt: 'Что это за часть программы Сабантуя?',
      options: [
        'Концерт фольклорного ансамбля',
        'Военный парад',
        'Митинг',
        'Аукцион скота',
      ],
      correct: 0,
      explanation:
        'Кроме состязаний, на Сабантуе всегда проходит большой праздничный концерт: фольклорные коллективы в национальных костюмах поют и танцуют. Этот снимок сделан на Сабантуе в Кировской области.',
    },
    tt: {
      prompt: 'Бу — Сабантуй программасының нинди өлеше?',
      options: [
        'Фольклор ансамбле концерты',
        'Хәрби парад',
        'Митинг',
        'Терлек аукционы',
      ],
      explanation:
        'Ярышлардан тыш, Сабантуйда һәрвакыт зур бәйрәм концерты бара: милли киемдәге фольклор коллективлары җырлый һәм бии. Бу фоторәсем Киров өлкәсендәге Сабантуйда төшерелгән.',
    },
  },
  {
    key: 'img-malmyzh-cathedral',
    theme: 'history',
    difficulty: 'medium',
    source: S_MAL,
    image: 'malmyzh',
    imageSource: C_MAL,
    order: 6,
    ru: {
      prompt: 'В каком городе находится этот Богоявленский собор?',
      options: ['Малмыж', 'Киров', 'Казань', 'Вятские Поляны'],
      correct: 0,
      explanation:
        'Богоявленский собор (1802) — один из старейших храмов города Малмыж Кировской области, где и проходит наш Сабантуй. Город известен с XVI века.',
    },
    tt: {
      prompt: 'Бу Богоявление соборы кайсы шәһәрдә урнашкан?',
      options: ['Малмыж', 'Киров', 'Казан', 'Вятские Поляны'],
      explanation:
        'Богоявление соборы (1802) — Киров өлкәсе Малмыж шәһәренең иң борынгы храмнарының берсе; безнең Сабантуй нәкъ шунда үтә. Шәһәр XVI гасырдан билгеле.',
    },
  },
  {
    key: 'img-vyatka-river',
    theme: 'geography',
    difficulty: 'medium',
    source: S_VYAT,
    image: 'vyatka',
    imageSource: C_VYAT,
    order: 7,
    ru: {
      prompt: 'Как называется главная река края, в бассейне которой стоит Малмыж?',
      options: ['Вятка', 'Волга', 'Дон', 'Нева'],
      correct: 0,
      explanation:
        'Вятка — большая река, давшая название Вятскому краю; впадает в Каму. Малмыж стоит на её притоке — реке Шошме, недалеко от впадения в Вятку.',
    },
    tt: {
      prompt: 'Малмыж урнашкан төбәкнең төп елгасы ничек атала?',
      options: ['Вятка', 'Идел', 'Дон', 'Нева'],
      explanation:
        'Вятка — Вятка төбәгенә исем биргән зур елга; Камага коя. Малмыж аның кушылдыгы — Шошма елгасында, Вяткага койган җиргә якын урнашкан.',
    },
  },
  {
    key: 'img-tatar-kalfak',
    theme: 'people',
    difficulty: 'hard',
    source: S_KAL,
    image: 'tatar-costume',
    imageSource: C_COST,
    order: 8,
    ru: {
      prompt: 'Как называется этот традиционный татарский женский головной убор?',
      options: ['Калфак', 'Кокошник', 'Тюбетейка', 'Папаха'],
      correct: 0,
      explanation:
        'Калфак — нарядный татарский женский головной убор, который надевают с национальным костюмом. (Мужской головной убор у татар — тюбетейка.)',
    },
    tt: {
      prompt: 'Бу татар хатын-кызларының милли баш киеме ничек атала?',
      options: ['Калфак', 'Кокошник', 'Түбәтәй', 'Папаха'],
      explanation:
        'Калфак — милли костюм белән кия торган татар хатын-кызларының бизәкле баш киеме. (Татар ир-атларының баш киеме — түбәтәй.)',
    },
  },
]

// ─── Запуск ───────────────────────────────────────────────────────────────────
const payload = await getPayload({ config })
const log = (...a: unknown[]) => payload.logger.info(a.map(String).join(' '))
const force = process.env.SEED_FORCE === '1'

let created = 0
let skipped = 0

for (const def of QUESTIONS) {
  const existing = await payload.find({
    collection: 'quiz-questions',
    where: { key: { equals: def.key } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.totalDocs > 0) {
    if (!force) {
      log(`= вопрос «${def.key}» уже есть — пропуск`)
      skipped++
      continue
    }
    await payload.delete({
      collection: 'quiz-questions',
      id: existing.docs[0].id,
      overrideAccess: true,
      context: { disableRevalidate: true },
    })
    log(`↻ вопрос «${def.key}» пересоздаётся (SEED_FORCE)`)
  }

  // 1) Создаём в локали ru (default) — варианты получают id строк массива.
  const doc = (await payload.create({
    collection: 'quiz-questions',
    data: {
      key: def.key,
      game: 'kartinki',
      theme: def.theme,
      format: 'choice',
      difficulty: def.difficulty,
      source: def.source,
      image: def.image,
      imageSource: def.imageSource,
      order: def.order,
      prompt: def.ru.prompt,
      explanation: def.ru.explanation,
      options: def.ru.options.map((text, i) => ({ text, correct: i === def.ru.correct })),
      _status: 'published',
    } as any,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })) as any

  // 2) Доливаем перевод tt по тем же строкам (correct не локализуется).
  const ruOptions: any[] = Array.isArray(doc.options) ? doc.options : []
  await payload.update({
    collection: 'quiz-questions',
    id: doc.id,
    locale: 'tt',
    data: {
      prompt: def.tt.prompt,
      explanation: def.tt.explanation,
      options: ruOptions.map((o, i) => ({
        id: o.id,
        text: def.tt.options[i] ?? o.text,
        correct: o.correct,
      })),
      _status: 'published',
    } as any,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })

  log(`✓ вопрос «${def.key}» (ru + tt)`)
  created++
}

log(`Готово. Создано: ${created}, пропущено: ${skipped}, всего в наборе: ${QUESTIONS.length}.`)
process.exit(0)
