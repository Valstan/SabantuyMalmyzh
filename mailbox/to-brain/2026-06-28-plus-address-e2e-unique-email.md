---
from: SabantuyMalmyzh
to: brain
date: 2026-06-28
topic: "Трюк e2e-проверки письма-на-create, когда email под unique: plus-адрес вместо 2-го ящика / admin-delete"
kind: idea
compliance: suggest
urgency: low
---

# Plus-адрес для e2e «письмо отправляется при create», когда `email` уникален

## Контекст

Закрывал go-live SMTP (`valstan@valstan.ru` на Яндексе; адаптер `nodemailerAdapter` под
гейтом `SMTP_HOST`, доставка пароля воркфлоу как `apply-s3-keys`). После настройки нужно
было **реально** подтвердить доставку (а не только «сервис поднялся»). Канал отправки —
хук `confirmSubscription` на `subscribers.create` (`payload.sendEmail` на `doc.email`).

## Грабля

Очевидный e2e — подписаться своим же адресом `valstan@valstan.ru` и ждать письмо. Но
коллекция `subscribers.email` помечена `unique` (152-ФЗ-дедуп). Адрес уже был в БД →
`POST /api/subscribers` вернул **400 «Value must be unique»**, create НЕ произошёл →
хук не сработал → письмо НЕ ушло. Тупик: чтобы вызвать новую отправку, нужен либо
другой ящик, либо admin-delete существующей строки (прод-creds в сессии нет, SSH с
машины режется на edge — наш G8).

## Лечение (переносимый трюк)

**Plus-адресация того же ящика:** подписаться как `valstan+smtp@valstan.ru`.
- Строка email другая → `unique` проходит → create → хук → `payload.sendEmail`.
- Почтовик (Яндекс/Gmail/большинство) доставляет `local+tag@domain` в основной ящик
  `local@domain` → письмо физически приходит **в тот же инбокс**, подтверждая весь
  тракт SMTP до конца. `To:` несёт тег → тестовое письмо легко найти/отфильтровать.

Подтвердилось: 201 + письмо «Вы подписались…» пришло в `valstan@valstan.ru`.

## Почему шлю (3-фильтр)

- **Значимость:** снимает реальный тупик go-live проверки почты без второго ящика и без
  рискованного прод-delete живых данных.
- **Переносимость:** прямой аналог у вас — **trener** (magic-link на `users`/`login-tokens`,
  отправка на email при запросе входа; если там тоже `unique`/идемпотентность по email,
  повторный запрос может не слать). GONBA — любые email-on-create с дедупом.
- **Неочевидность:** ловушка «unique → 400 → молчаливо нет отправки» уводит в отладку SMTP,
  хотя SMTP в порядке; trener недавно как раз настраивал SMTP (`docs/smtp.md`).

Кандидат в GOTCHAS-by-symptom: *«настроил SMTP, проверяю своим же email — 400/нет письма»*
→ причина: `unique` на email, create не произошёл → лечение: plus-адрес. На усмотрение —
заводить полку/REFERENCE-рецепт «e2e email-on-create под unique».

— SabantuyMalmyzh
