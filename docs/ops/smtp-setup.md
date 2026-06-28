# SMTP — отправка писем (заявки + подписка на анонс)

Сайт шлёт два типа писем через внешний SMTP-relay:

- **Уведомление организатору** о новой заявке на участие (`Registrations` → хук
  `notifyOrganizer` → на `ORGANIZER_EMAIL`).
- **Письмо-подтверждение подписчику** (идея I6, `Subscribers` → хук
  `confirmSubscription` → на email подписчика).

**Код полностью готов.** Настройка — чисто операционная: задать пароль приложения в
секрете GitHub → запустить разовый воркфлоу → проверить доставку. До этого письма
пишутся в консоль сервиса (degraded), сборка/типы зелёные без секретов.

## Как это устроено в коде

- [`web/src/payload.config.ts`](../../web/src/payload.config.ts) — подключает
  `nodemailerAdapter` **только если задан `SMTP_HOST`**. Пусто → адаптера нет, Payload
  пишет письма в лог сервиса (WARN «No email adapter»), сборка/типы зелёные без секретов.
- [`web/src/hooks/notifyOrganizer.ts`](../../web/src/hooks/notifyOrganizer.ts) и
  [`confirmSubscription.ts`](../../web/src/hooks/confirmSubscription.ts) — шлют через
  `payload.sendEmail` (best-effort: ошибка отправки логируется, но НЕ роняет
  создание заявки/подписки — посетитель не получит 500 из-за проблем с почтой).
- Письма — обычный текст; ссылки (если появятся) строятся от `NEXT_PUBLIC_SERVER_URL`
  (на проде = боевой HTTPS-домен, уже задан).

## Почему Яндекс и почему так просто

Ящик владельца **`valstan@valstan.ru`** уже на Яндексе — проверено по DNS:
`valstan.ru` MX = `mx.yandex.ru`, SPF = `v=spf1 redirect=_spf.yandex.net`. Значит
домен подключён к Яндекс-почте, DKIM/SPF Яндекс ведёт сам, доставляемость в рунет
(mail.ru/yandex/gmail) хорошая. Ничего заводить не нужно — берём существующий ящик
напрямую (это «Вариант A0» из runbook проекта «Тренер футбольный»).

> **152-ФЗ:** relay видит email посетителя (ПДн). Яндекс — **российский** сервис,
> ПДн остаются в РФ, без трансграничной передачи (ст. 12). Зарубежные relay
> (Resend/SendGrid и т.п.) для прод-данных не используем.

## Переменные (`/etc/sabantuy/sabantuy.env`, #008)

| Переменная | Значение | Секрет? |
|---|---|---|
| `SMTP_HOST` | `smtp.yandex.ru` (включает адаптер) | нет |
| `SMTP_PORT` | `465` | нет |
| `SMTP_SECURE` | `true` (implicit TLS для 465) | нет |
| `SMTP_USER` | `valstan@valstan.ru` | нет |
| `SMTP_PASS` | **пароль приложения Яндекса** | **да → GitHub Secret** |
| `SMTP_FROM_ADDRESS` | `valstan@valstan.ru` (= USER, иначе relay отклонит) | нет |
| `SMTP_FROM_NAME` | `"Сабантуй Малмыж"` (получатель видит имя) | нет |
| `ORGANIZER_EMAIL` | `valstan@valstan.ru` (куда падают заявки) | нет |

> **Грабля env-файла (trener, 2026-06-27):** значения с пробелом (`SMTP_FROM_NAME`)
> **в кавычках**: `SMTP_FROM_NAME="Сабантуй Малмыж"`. systemd `EnvironmentFile=`
> читает и без кавычек, но любой `source` env-файла сломается на word-splitting
> (`Малмыж: command not found`). Воркфлоу уже пишет значение в кавычках.

## Шаг владельца (owner-gated) — один пароль приложения

Обычный пароль аккаунта Яндекс по SMTP не пустит при включённой 2FA — нужен
**пароль приложения**:

1. [id.yandex.ru](https://id.yandex.ru) → **Безопасность** → **Пароли приложений**.
2. Создать пароль для **«Почта»** (тип IMAP/SMTP). Яндекс покажет его **один раз**.
3. Положить его в **секрет GitHub репозитория** (не в чат, не в файл):
   GitHub → репозиторий → **Settings → Secrets and variables → Actions →
   New repository secret** → имя **`SMTP_PASS`**, значение = пароль приложения.

> Если в ящике отключён доступ по протоколам — включить:
> Яндекс.Почта → Настройки → «Почтовые программы» → разрешить IMAP/SMTP.

## Применение на проде — разовый воркфлоу

После того как `SMTP_PASS` лежит в секретах GitHub, запустить:

```bash
gh workflow run apply-smtp-secrets.yml --ref main
gh run watch
```

Воркфлоу [`apply-smtp-secrets.yml`](../../.github/workflows/apply-smtp-secrets.yml) по
SSH (изолированный ключ #001) дописывает блок `SMTP_*` + `ORGANIZER_EMAIL` в
`/etc/sabantuy/sabantuy.env`, перезапускает сервис и проверяет: 8 строк на месте,
сервис активен, главная отвечает 200. **Секрет в чат/репо не попадает** (GitHub
маскирует в логах). Идемпотентно — повторный запуск пересинхронит блок.

> SMTP_* — **рантайм-переменные** (читаются процессом при старте), не бейкаются в
> сборку → пересборка/редеплой не нужны, достаточно env-файла + рестарта (как ключи S3).

## Проверка доставки (e2e)

Реальное письмо проще всего вызвать подпиской на анонс — хук `confirmSubscription`
пришлёт подтверждение на указанный email:

```bash
curl -sS -X POST https://xn--80aaac1aqpgcf4bqn1j.xn--p1ai/api/subscribers \
  -H 'Content-Type: application/json' \
  -d '{"email":"valstan@valstan.ru","name":"Тест","consent":true}'
```

Ожидаемо: ответ `201` (создан подписчик) → за секунды письмо «Вы подписались на
анонс Сабантуя в Малмыже» в ящике `valstan@valstan.ru`. Если письма нет — смотреть
лог сервиса:

```bash
ssh sabantuy 'sudo journalctl -u sabantuy -n 80 --no-pager | grep -iE "smtp|email|subscriber|registration"'
```

После проверки **удалить тестового подписчика** в `/admin → Подписчики (анонс)`
(или повторный POST с тем же email вернёт 400 — `email` уникален).

Проверка заявки организатору: отправить тестовую заявку формой на сайте (или через
`/api/registrations` с валидным `event`) → письмо «Новая заявка на участие» падает
на `ORGANIZER_EMAIL`. Тестовую заявку тоже удалить в `/admin → Заявки`.

## Troubleshooting

| Симптом в логах | Причина | Лечение |
|---|---|---|
| `Invalid login` / `535` | неверный пароль | нужен **пароль приложения** Яндекса, не пароль аккаунта; пересоздать и обновить `SMTP_PASS` |
| `5.7.1 … not allowed` / relay denied | from-адрес не на домене ящика | `SMTP_FROM_ADDRESS` должен совпадать с `SMTP_USER` (= `valstan@valstan.ru`) |
| письма в спам | прогрев репутации / DKIM | Яндекс подписывает DKIM сам; проверить на mail-tester.com, дать репутации прогреться |
| `self signed certificate` / TLS | порт/secure | для Яндекса порт `465` + `SMTP_SECURE=true` |
| `ECONNREFUSED` / таймаут | исходящий 465 закрыт | разрешить исходящий 465 с бокса |
| письма в консоли, не уходят | адаптер не подключён | `SMTP_HOST` не задан в env — перезапустить воркфлоу |

## Связанное

- Шаблон переменных — [`web/.env.example`](../../web/.env.example) (блок SMTP).
- Доставка секрета — воркфлоу [`apply-smtp-secrets.yml`](../../.github/workflows/apply-smtp-secrets.yml) (образец — `apply-s3-keys.yml`).
- Образец-донор — `D:\PROGRAMMING\trener\docs\smtp.md` (проект «Тренер футбольный»).
- Секреты вне репо — pool #008; деплой подключает env через systemd `EnvironmentFile=`.
