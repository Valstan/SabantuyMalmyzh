# Карточка №3 — декор-волна 2 (промты для владельца)

> Схема (IMAGE_PIPELINE.md): владелец генерит в любой нейросети → кладёт в
> `design/incoming/` (или в чат) → Claude бракует/принимает → оптимизирует sharp'ом
> → встраивает. **Текст на сайт пишем кодом** — на картинках текста быть не должно.

## Общие правила генерации (повтор)

- **Максимальное разрешение** сервиса (≥1600px по длинной стороне; для широких шапок 2000+).
- **Без текста и букв** на картинке (нейросеть пишет кириллицу/арабицу с ошибками).
- **Без крупных узнаваемых лиц** — люди со спины, в толпе, силуэтами.
- Для **вырезаемого декора** (орнаменты, виньетки): просить **однотонный плоский фон**
  (например «on a flat solid cream background» / «on plain white background») или
  **прозрачный PNG**, если сервис умеет — так я аккуратно вырежу элемент.
- Сохранять JPG/PNG макс. качества — сжимаю на своей стороне.

---

## Группа A — Фото-шапки страниц (фотореализм, широкие 21:9)

Замена медальона на настоящее фото у двух оставшихся страниц без фото.
Стилевой хвост (добавить в конец каждого промта):

> `festive summer atmosphere, warm sunlight, rich emerald green and golden yellow palette with subtle red accents, Tatar folk festival aesthetic, tulip ornament motifs, high detail, professional photography, no text, no watermarks`

### A1 — `page-faq.jpg` (страница «Частые вопросы», 21:9)
**EN:** Wide welcoming entrance to an open-air Tatar summer festival: visitors seen from
behind streaming through a decorated gate of birch poles and colorful bunting into a sunny
green festival field, festive flags, distant tents and crowd, inviting and informative mood.
**RU (смысл):** Широкий приветливый вход на летний праздник под открытым небом: гости со
спины идут через украшенные ворота с флажками-гирляндами на солнечную зелёную поляну,
вдали шатры и толпа. Настроение — «добро пожаловать».

### A2 — `page-kontakty.jpg` (страница «Контакты», 21:9)
**EN:** Scenic panorama of a small provincial Russian town on the bank of a wide calm river
(Vyatka), summer, green hills, wooden and brick rooftops, a church and a mosque among the
trees, blue sky — a warm sense of place (the town of Malmyzh).
**RU (смысл):** Панорама маленького русского городка на берегу широкой спокойной реки
(Вятка), лето, зелёные холмы, крыши, церковь и мечеть среди деревьев — образ места (Малмыж).

---

## Группа B — Рисованный декор (плоская фолк-иллюстрация / татарский орнамент)

Чтобы было «не только фото, но и рисунки». Стиль — **плоская фолк-иллюстрация в татарском
орнаментальном ключе**, зелёно-золотая гамма (красный — мелким акцентом, не заливкой).
Стилевой хвост:

> `flat folk-art illustration, Tatar national ornament aesthetic, emerald green and gold dominant with small crimson accents, clean vector-like shapes, tulip and islimi (vegetal) motifs, symmetrical, no text, no watermarks`

### B1 — `decor-border-strip.png` (горизонтальная орнамент-лента, ~2400×400, фон однотонный)
**EN:** A long horizontal decorative border strip of symmetrical Tatar floral ornament —
interlacing tulips, leaves and islimi vegetal scrolls, gold on a flat cream background,
seamless left-to-right, ornamental divider.
**RU:** Длинная горизонтальная орнамент-лента: симметричный татарский цветочный орнамент
(тюльпаны, листья, ислими), золото на плоском кремовом фоне, бесшовно по горизонтали.
**Куда:** разделители секций / рамки карточек / подвал.

### B2 — `decor-corners.png` (лист из 4 угловых виньеток, квадрат, фон однотонный)
**EN:** Four ornamental corner vignettes arranged in the four corners of a square, mirror-
symmetrical Tatar tulip-and-vine ornament, gold and emerald on a flat white background,
each corner isolated for cutting.
**RU:** Четыре угловые виньетки по углам квадрата, зеркально-симметричный татарский орнамент
(тюльпан + вьюнок), золото и изумруд на плоском белом фоне — каждый угол отдельно для вырезки.
**Куда:** рамки-обрамления героя/карточек, «парадные» уголки.

### B3 — `decor-pattern-tile.png` (бесшовная плитка, квадрат 1024, tileable)
**EN:** A seamless tileable pattern of small Tatar tulip and geometric folk motifs, very
subtle, low-contrast tone-on-tone emerald green, repeats edge-to-edge, background texture.
**RU:** Бесшовный повторяющийся паттерн из мелких татарских тюльпанов и геометрии, очень
деликатный, тон-в-тон изумрудный, стыкуется по краям — фактура фона.
**Куда:** ненавязчивый фон секций (тоньше нынешних SVG-узоров).

### B4 — `illust-festival-panorama.jpg` (рисованная панорама праздника, 16:9, 2000+)
**EN:** Flat folk-art illustrated panorama of a Sabantuy festival on a green meadow: a
decorated prize pole, a köräsh wrestling circle, a steaming cauldron, dancing folk figures
(stylized, no faces), bunting and tulips, warm naive style, emerald-green and gold palette.
**RU:** Рисованная (плоская фолк-арт) панорама Сабантуя на зелёной поляне: столб с призом,
круг борьбы көрәш, дымящийся казан, танцующие фигуры (стилизованно, без лиц), флажки и
тюльпаны, тёплый наивный стиль, изумрудно-золотая гамма.
**Куда:** альтернативная «рисованная» шапка/фон секции — для разнообразия рядом с фото.

---

## Группа C — Орнаментальная панель (privacy / о фестивале)

### C1 — `decor-shamail-panel.png` (вертикальная/квадратная декоративная панель, фон однотонный)
**EN:** Ornamental decorative panel in the spirit of a Tatar shamail — a symmetrical framed
composition of floral and geometric Tatar ornament, arches and tulips, gold and deep green,
on a flat solid background, purely decorative, **absolutely no text or letters**.
**RU:** Декоративная панель в духе татарского шамаиля — симметричная обрамлённая композиция
из цветочного и геометрического орнамента, арки и тюльпаны, золото и тёмно-зелёный, плоский
фон, **строго без текста и букв**.
**Куда:** шапка «Правовой информации»/«О фестивале» вместо фото (там фото неуместно).

---

## Что я сделаю с присланным

- **A1/A2** → `process-decor.mjs` (кадр 21:9, webp/jpg, lg+960) → `pageDecor.photo` →
  чистая фото-шапка (как у остальных страниц).
- **B1/B2/C1** → вырежу элементы (sharp: кроп + удаление однотонного фона) → новые
  декор-компоненты (орнамент-разделитель, угловые рамки, панель).
- **B3** → проверю бесшовность → деликатный фон секций (CSS).
- **B4** → широкий кадр → фон секции на главной (рисованный акцент рядом с фото).

> Любой кадр можно прислать «с запасом» (несколько вариантов) — выберу лучший, остальное в `spare/`.
