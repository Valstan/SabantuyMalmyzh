/**
 * Наполнение познавательной игры-«угадайки» выверенными вопросами (директива
 * brain 2026-06-18). Запуск:
 *
 *   corepack pnpm -C web payload run src/seed/seedQuiz.ts
 *
 * Создаёт вопросы коллекции quiz-questions (ru + tt, опубликованные). Идемпотентно
 * по полю `key`: существующие вопросы пропускаются. Перезалить обновлённые тексты —
 * SEED_FORCE=1 (удаляет и пересоздаёт по ключу; правки организаторов в /admin
 * затрутся, поэтому только для выкатки контента).
 *
 * ⚠️ ФАКТЫ. Игра образовательная → каждый факт проверяем и снабжён ИСТОЧНИКОМ
 * (поле `source`). Источники (проверены 2026-06-18):
 *   • Сабантуй — ru.wikipedia.org/wiki/Сабантуй
 *   • Традиции/состязания — culture.ru «Сабантуй»
 *   • Малмыж (река, основание, князь Болтуш, название) — ru.wikipedia.org/wiki/Малмыж
 *   • Река Вятка (длина, приток Камы) — ru.wikipedia.org/wiki/Вятка_(река)
 *   • Малмыжский район (народы) — tatarica.org, раздел «Малмыжский район»
 *
 * ⚠️⚠️ ТАТАРСКИЙ — ЧЕРНОВИК (не носитель), как и остальной tt-контент сайта (I11).
 * Требует вычитки носителем; правится здесь или в /admin (ru/tt-селектор).
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- seed-утилита: Payload data untyped */
import config from '@payload-config'
import { getPayload } from 'payload'

// ─── Источники (общие для ru/tt; поле source не локализуется) ─────────────────
const S_SAB = 'https://ru.wikipedia.org/wiki/Сабантуй'
const S_CULT = 'https://www.culture.ru/s/vopros/sabantuy/'
const S_MAL = 'https://ru.wikipedia.org/wiki/Малмыж'
const S_VYAT = 'https://ru.wikipedia.org/wiki/Вятка_(река)'
const S_RAY = 'https://tatarica.org/ru/razdely/rossijskaya-federaciya/kirovskaya-oblast/malmyzhskij-rajon'

type QDef = {
  key: string
  theme: string
  format?: string
  difficulty: string
  source: string
  order: number
  ru: { prompt: string; options: string[]; correct: number; explanation: string; hint?: string }
  // tt.options — в том же порядке, что и ru.options (correct берётся из ru).
  tt: { prompt: string; options: string[]; explanation: string; hint?: string }
}

const QUESTIONS: QDef[] = [
  {
    key: 'sabantuy-meaning',
    theme: 'sabantuy',
    format: 'translate',
    difficulty: 'easy',
    source: S_SAB,
    order: 1,
    ru: {
      prompt: 'Что в переводе означает слово «Сабантуй»?',
      options: ['Праздник плуга', 'Праздник урожая', 'Праздник весны', 'Праздник огня'],
      correct: 0,
      explanation:
        '«Сабан» — старинный плуг, «туй» — праздник, торжество. Сабантуй — праздник окончания весенних полевых работ у татар и башкир.',
      hint: 'Праздник связан с земледелием и весенним севом.',
    },
    tt: {
      prompt: '«Сабантуй» сүзе нәрсә аңлата?',
      options: ['Сабан туе', 'Уңыш бәйрәме', 'Яз бәйрәме', 'Ут бәйрәме'],
      explanation:
        '«Сабан» — борынгы сука, «туй» — бәйрәм, тантана. Сабантуй — язгы кыр эшләрен тәмамлау бәйрәме.',
      hint: 'Бәйрәм игенчелек һәм язгы чәчү белән бәйле.',
    },
  },
  {
    key: 'sabantuy-maydan',
    theme: 'sabantuy',
    difficulty: 'easy',
    source: S_SAB,
    order: 2,
    ru: {
      prompt: 'Как называется площадь, где проходят главные состязания Сабантуя?',
      options: ['Майдан', 'Базар', 'Сабан', 'Аул'],
      correct: 0,
      explanation: 'Майдан — место, где разворачиваются состязания: борьба, скачки, игры и забавы.',
    },
    tt: {
      prompt: 'Сабантуйның төп ярышлары узган мәйдан ничек атала?',
      options: ['Мәйдан', 'Базар', 'Сабан', 'Авыл'],
      explanation: 'Мәйдан — көрәш, ат чабышы, уеннар узган урын.',
    },
  },
  {
    key: 'sabantuy-batyr',
    theme: 'sabantuy',
    difficulty: 'easy',
    source: S_CULT,
    order: 3,
    ru: {
      prompt: 'Как называют победителя главной борьбы көрәш на Сабантуе?',
      options: ['Батыр', 'Хан', 'Мурза', 'Аксакал'],
      correct: 0,
      explanation: 'Победитель борьбы на поясах көрәш получает звание батыра — богатыря праздника.',
    },
    tt: {
      prompt: 'Сабантуйда көрәш җиңүчесен ничек атыйлар?',
      options: ['Батыр', 'Хан', 'Морза', 'Аксакал'],
      explanation: 'Билбау көрәше җиңүчесе батыр исемен ала — бәйрәмнең батыры.',
    },
  },
  {
    key: 'sabantuy-ram',
    theme: 'sabantuy',
    difficulty: 'medium',
    source: S_CULT,
    order: 4,
    ru: {
      prompt: 'Какой приз традиционно получал батыр — победитель борьбы көрәш?',
      options: ['Живого барана', 'Коня', 'Мешок муки', 'Золотую монету'],
      correct: 0,
      explanation:
        'Победитель часто вскидывал барана на плечи — чтобы ещё раз показать свою силу.',
      hint: 'Этого приза батыр взваливал себе на плечи.',
    },
    tt: {
      prompt: 'Көрәш җиңүчесе батырга гадәттә нинди бүләк бирелгән?',
      options: ['Тере сарык', 'Ат', 'Он капчыгы', 'Алтын тәңкә'],
      explanation: 'Җиңүче еш кына сарыкны җилкәсенә күтәргән — көчен тагын бер күрсәтер өчен.',
      hint: 'Батыр бу бүләкне җилкәсенә күтәргән.',
    },
  },
  {
    key: 'sabantuy-koresh-towel',
    theme: 'sabantuy',
    difficulty: 'medium',
    source: S_CULT,
    order: 5,
    ru: {
      prompt: 'С помощью чего борцы көрәш пытаются повалить друг друга?',
      options: ['Полотенца или кушака', 'Только рук', 'Палки', 'Аркана'],
      correct: 0,
      explanation:
        'Куреш — борьба на полотенцах: соперники держат друг друга за кушак (полотенце) и стараются повалить на землю.',
    },
    tt: {
      prompt: 'Көрәшчеләр бер-берсен нәрсә ярдәмендә егарга тырыша?',
      options: ['Сөлге яки билбау', 'Бары куллар', 'Таяк', 'Аркан'],
      explanation: 'Көрәш — сөлге көрәше: көрәшчеләр бер-берсен билбаудан тотып җиргә егарга тырыша.',
    },
  },
  {
    key: 'sabantuy-pole',
    theme: 'sabantuy',
    difficulty: 'medium',
    source: S_CULT,
    order: 6,
    ru: {
      prompt: 'Что традиционно устанавливали на вершине высокого гладкого столба?',
      options: ['Клетку с петухом', 'Флаг', 'Каравай', 'Колокол'],
      correct: 0,
      explanation:
        'На скользкий столб взбирались за призом — например, за клеткой с петухом, установленной на самой вершине.',
      hint: 'Столб был гладким и скользким, а приз — живым.',
    },
    tt: {
      prompt: 'Биек шома багананың түбәсенә гадәттә нәрсә куйганнар?',
      options: ['Әтәчле читлек', 'Байрак', 'Икмәк', 'Кыңгырау'],
      explanation: 'Шома баганага бүләк өчен менгәннәр — мәсәлән, иң түбәдәге әтәчле читлек өчен.',
      hint: 'Багана шома иде, ә бүләк — тере.',
    },
  },
  {
    key: 'sabantuy-pot',
    theme: 'sabantuy',
    difficulty: 'medium',
    source: S_CULT,
    order: 7,
    ru: {
      prompt: 'Что на Сабантуе нужно разбить палкой с завязанными глазами?',
      options: ['Горшок', 'Орех', 'Бочку', 'Бревно'],
      correct: 0,
      explanation: 'Одно из весёлых состязаний — с завязанными глазами палкой разбить глиняный горшок.',
    },
    tt: {
      prompt: 'Сабантуйда күзне бәйләп таяк белән нәрсәне ватарга кирәк?',
      options: ['Чүлмәкне', 'Чикләвекне', 'Мичкәне', 'Бүрәнәне'],
      explanation: 'Күңелле ярышларның берсе — күзне бәйләп таяк белән балчык чүлмәкне вату.',
    },
  },
  {
    key: 'sabantuy-egg-spoon',
    theme: 'sabantuy',
    difficulty: 'medium',
    source: S_CULT,
    order: 8,
    ru: {
      prompt: 'В беге с яйцом на ложке ложку нужно было удержать…',
      options: ['Зубами', 'В руке', 'На голове', 'За поясом'],
      correct: 0,
      explanation: 'Классическая забава Сабантуя — бег с яйцом на ложке, которую держат зубами.',
    },
    tt: {
      prompt: 'Кашыктагы йомырка белән йөгерүдә кашыкны ничек тотарга кирәк иде?',
      options: ['Теш белән', 'Кулда', 'Башта', 'Билдә'],
      explanation: 'Сабантуйның гадәти уены — теш белән тотылган кашыктагы йомырка белән йөгерү.',
    },
  },
  {
    key: 'sabantuy-ibn-fadlan',
    theme: 'sabantuy',
    difficulty: 'hard',
    source: S_SAB,
    order: 9,
    ru: {
      prompt: 'По распространённой версии, какой арабский путешественник упомянул праздник ещё в 921 году?',
      options: ['Ибн Фадлан', 'Ибн Баттута', 'Аль-Бируни', 'Ибн Сина'],
      correct: 0,
      explanation:
        'Ибн Фадлан прибыл в Волжскую Булгарию послом из Багдада в 921–922 годах и описал местные обычаи.',
      hint: 'Он был послом багдадского халифа в Волжской Булгарии.',
    },
    tt: {
      prompt: 'Таралган версия буенча, нинди гарәп сәяхәтчесе бәйрәмне әле 921 елда телгә алган?',
      options: ['Ибне Фадлан', 'Ибне Баттута', 'Әл-Бируни', 'Ибне Сина'],
      explanation: 'Ибне Фадлан 921–922 елларда Багдадтан илче булып Идел Болгарына килгән һәм җирле гадәтләрне язып калдырган.',
      hint: 'Ул Багдад хәлифенең Идел Болгарындагы илчесе булган.',
    },
  },
  {
    key: 'sabantuy-origin-plough',
    theme: 'sabantuy',
    format: 'trueMyth',
    difficulty: 'medium',
    source: S_SAB,
    order: 10,
    ru: {
      prompt: 'Правда или миф: изначально Сабантуй был связан с земледелием и плугом.',
      options: ['Правда', 'Миф'],
      correct: 0,
      explanation:
        'Правда. Истоки праздника — в аграрном культе: обряд должен был задобрить силы плодородия ради хорошего урожая.',
    },
    tt: {
      prompt: 'Дөресме яки ялганмы: башта Сабантуй игенчелек һәм сабан белән бәйле булган.',
      options: ['Дөрес', 'Ялган'],
      explanation:
        'Дөрес. Бәйрәмнең тамырлары — игенчелек культында: йола уңыш өчен уңдырышлылык көчләрен риза итәргә тиеш булган.',
    },
  },
  {
    key: 'malmyzh-river',
    theme: 'geography',
    difficulty: 'medium',
    source: S_MAL,
    order: 11,
    ru: {
      prompt: 'На какой реке стоит город Малмыж?',
      options: ['Шошма', 'Вятка', 'Кама', 'Волга'],
      correct: 0,
      explanation:
        'Малмыж расположен на реке Шошме недалеко от места её впадения в Вятку, в 294 км от Кирова.',
      hint: 'Эта небольшая река вскоре впадает в Вятку.',
    },
    tt: {
      prompt: 'Малмыж шәһәре нинди елга буенда урнашкан?',
      options: ['Шошма', 'Вятка', 'Кама', 'Идел'],
      explanation:
        'Малмыж Шошма елгасы буенда, аның Вяткага койган җиренә якын, Кировтан 294 км ераклыкта урнашкан.',
      hint: 'Бу кечкенә елга тиздән Вяткага коя.',
    },
  },
  {
    key: 'vyatka-tributary',
    theme: 'geography',
    difficulty: 'medium',
    source: S_VYAT,
    order: 12,
    ru: {
      prompt: 'Притоком какой большой реки является Вятка?',
      options: ['Камы', 'Волги', 'Белой', 'Оки'],
      correct: 0,
      explanation: 'Вятка длиной 1314 км — крупнейший правый приток Камы (бассейн Волги).',
    },
    tt: {
      prompt: 'Вятка кайсы зур елганың кушылдыгы?',
      options: ['Кама', 'Идел', 'Агыйдел', 'Ока'],
      explanation: 'Озынлыгы 1314 км булган Вятка — Каманың иң зур уң кушылдыгы (Идел бассейны).',
    },
  },
  {
    key: 'malmyzh-founders',
    theme: 'history',
    difficulty: 'medium',
    source: S_MAL,
    order: 13,
    ru: {
      prompt: 'Какой народ основал древнее укреплённое поселение на месте Малмыжа?',
      options: ['Марийцы', 'Татары', 'Удмурты', 'Чуваши'],
      correct: 0,
      explanation:
        'Изначально здесь было марийское (черемисское) поселение — резиденция князей Малмыжского княжества.',
    },
    tt: {
      prompt: 'Малмыж урынындагы борынгы ныгытылган авылны кайсы халык нигезләгән?',
      options: ['Марилар', 'Татарлар', 'Удмуртлар', 'Чувашлар'],
      explanation: 'Башта монда мари (черемис) авылы булган — Малмыж кенәзлеге кенәзләренең урыны.',
    },
  },
  {
    key: 'malmyzh-name',
    theme: 'history',
    format: 'translate',
    difficulty: 'hard',
    source: S_MAL,
    order: 14,
    ru: {
      prompt: 'Что, по распространённой версии, означает название «Малмыж» с марийского языка?',
      options: ['Место отдыха, ночлег', 'Большая река', 'Святая гора', 'Торговый путь'],
      correct: 0,
      explanation: 'Название происходит от марийского «Малымаш» — ночлег, место отдыха.',
    },
    tt: {
      prompt: 'Таралган версия буенча, «Малмыж» атамасы мари теленнән нәрсә аңлата?',
      options: ['Ял итү урыны, кунак', 'Зур елга', 'Изге тау', 'Сәүдә юлы'],
      explanation: 'Атама мари «Малымаш» сүзеннән килә — кунак, ял итү урыны.',
    },
  },
  {
    key: 'malmyzh-boltush',
    theme: 'history',
    difficulty: 'hard',
    source: S_MAL,
    order: 15,
    ru: {
      prompt: 'Как звали марийского князя, с гибелью которого связана легенда о горе под Малмыжом?',
      options: ['Болтуш', 'Чумбылат', 'Мамич-Бердей', 'Акпарс'],
      correct: 0,
      explanation:
        'По преданию, при взятии города пушечным ядром был убит марийский князь Болтуш; гора близ Малмыжа носит связанное с ним имя.',
      hint: 'Его имя носит гора близ города.',
    },
    tt: {
      prompt: 'Малмыж янындагы тау турындагы риваять кайсы мари кенәзенең һәлакәте белән бәйле?',
      options: ['Болтуш', 'Чумбылат', 'Мамыч-Бәрдәй', 'Акпарс'],
      explanation:
        'Риваять буенча, шәһәрне алганда туп ядрәсе белән мари кенәзе Болтуш үтерелгән; Малмыж янындагы тау аның исемен йөртә.',
      hint: 'Шәһәр янындагы тау аның исемен йөртә.',
    },
  },
  {
    key: 'malmyzh-peoples',
    theme: 'people',
    difficulty: 'easy',
    source: S_RAY,
    order: 16,
    ru: {
      prompt: 'Какие народы издавна живут бок о бок в Малмыжском крае?',
      options: [
        'Татары, марийцы, удмурты и русские',
        'Только татары',
        'Только русские',
        'Чуваши и мордва',
      ],
      correct: 0,
      explanation:
        'Малмыжский край многонационален; Сабантуй здесь давно стал общим праздником дружбы народов.',
    },
    tt: {
      prompt: 'Малмыж төбәгендә күптәннән кайсы халыклар янәшә яши?',
      options: [
        'Татарлар, марилар, удмуртлар һәм руслар',
        'Бары татарлар',
        'Бары руслар',
        'Чувашлар һәм мордвалар',
      ],
      explanation:
        'Малмыж төбәге күпмилләтле; Сабантуй монда күптән халыклар дуслыгының уртак бәйрәменә әйләнгән.',
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
    // SEED_FORCE: удаляем и пересоздаём (проще, чем сопоставлять id строк массива).
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
      theme: def.theme,
      format: def.format ?? 'choice',
      difficulty: def.difficulty,
      source: def.source,
      order: def.order,
      prompt: def.ru.prompt,
      explanation: def.ru.explanation,
      hint: def.ru.hint,
      options: def.ru.options.map((text, i) => ({ text, correct: i === def.ru.correct })),
      _status: 'published',
    } as any,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })) as any

  // 2) Доливаем перевод tt по тем же строкам (correct не локализуется — повторяем
  //    то же значение, чтобы не сбросить его при записи базовой таблицы).
  const ruOptions: any[] = Array.isArray(doc.options) ? doc.options : []
  await payload.update({
    collection: 'quiz-questions',
    id: doc.id,
    locale: 'tt',
    data: {
      prompt: def.tt.prompt,
      explanation: def.tt.explanation,
      hint: def.tt.hint,
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
