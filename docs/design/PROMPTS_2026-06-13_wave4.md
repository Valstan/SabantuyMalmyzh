# Карточка №4 — картинки для карточек «Что вас ждёт», расписания и подвала

> Схема прежняя: генеришь → кладёшь в `design/incoming/` → встраиваю. **Без текста и
> крупных лиц на картинке.** Максимальное разрешение.

## Группа A — карточки «Что вас ждёт / Праздник для всей семьи» (6 шт)

Фото-обложки на 6 карточек активностей (как у культ-хаба). **Квадрат 1:1** (удобно
кадрировать под любую ширину карточки). Хвост промта (фотореализм):

> `festive summer atmosphere, warm sunlight, emerald green and golden palette with subtle red accents, Tatar folk festival aesthetic, high detail, professional photography, no text, no watermarks, no close-up faces`

| Файл | Что (EN prompt core) | RU-смысл |
|---|---|---|
| `feat-koresh.jpg` | Two Tatar belt-wrestlers (köräş) gripping each other's cloth sashes in a grassy arena ring, seen from a respectful distance, blurred festive crowd behind | Көрәш — двое борцов на поясах в круге, толпа размыта позади |
| `feat-horse.jpg` | Folk horse race at a summer festival, riders galloping across a green meadow, dust, festive banners in the distance | Конные скачки — наездники несутся по лугу |
| `feat-pole.jpg` | Tall decorated greasy climbing pole with a prize on top against blue sky, festival field below, people watching from afar | Столб с призом на фоне неба |
| `feat-cuisine.jpg` | Tatar festive food spread — chak-chak, öchpochmak, plov in a cauldron — on a folk-patterned cloth, appetizing close-up | Кухня — чак-чак, эчпочмак, плов из казана |
| `feat-concert.jpg` | Folk dancers in colorful Tatar and Russian costumes performing on an open-air festival stage, dynamic, seen from the side | Концерт и танцы — артисты на сцене |
| `feat-kids.jpg` | Children's play meadow at a folk festival — painted wooden rocking horses, swings, balloons, bunting, on green grass | Детям — детская поляна, лошадки, шары |

## Группа B — миниатюры расписания (по категориям)

Карточки расписания получат маленькую миниатюру по **категории**. 4 из 5 категорий
закрывают картинки группы A (Спорт→köräş/horse, Концерт→concert, Кухня→cuisine,
Детям→kids). Нужна **одна** дополнительная — «Церемония»:

| Файл | EN prompt core | RU-смысл |
|---|---|---|
| `cat-ceremony.jpg` | Festive opening ceremony of a folk festival — a flag being raised on a decorated stage, bunting, gathered crowd from behind, celebratory mood (1:1) | Церемония — поднятие флага, открытие, толпа со спины |

## Группа C — силуэт города Малмыжа для подвала

То самое «как будто город внизу» — сделаем настоящий декоративный **силуэт** в подвал
(тонкой лентой над копирайтом). **Очень широкий горизонтальный** кадр (панорама,
4:1 и шире — если сервис не умеет, бери самую широкую). Стиль — **плоский силуэт**:

> `flat single-color silhouette, clean simple vector shapes, no gradient, no inner detail, no text, on a plain solid white background (high contrast), very wide horizontal panorama`

| Файл | EN prompt core | RU-смысл |
|---|---|---|
| `footer-skyline.png` (или .jpg) | Panoramic silhouette skyline of a small provincial Russian town on a river: an Orthodox church with a bell tower and onion dome, a mosque with a minaret, low wooden houses and rooftops, a few trees, a water line — as one flat dark silhouette on a plain white background, very wide | Силуэт Малмыжа на Вятке: церковь с колокольней, мечеть с минаретом, крыши, деревья — единым тёмным силуэтом на белом фоне, очень широкий |

> Силуэт на **белом фоне** одним тёмным цветом — так я чисто вырежу его в прозрачный
> PNG и перекрашу под зелёно-золото подвала.

## Что я сделаю с присланным

- **A (6)** → квадрат-кроп → фото-обложки карточек «Что вас ждёт» (раскладка как у культ-хаба).
- **A + B** → маленькая миниатюра по категории на карточках расписания.
- **C** → вырежу силуэт (sharp: белый фон → прозрачность), перекрашу, поставлю лентой в подвал над копирайтом (на всех страницах).

> Можно по нескольку вариантов на слот — выберу лучший, остальное в `spare/`.
