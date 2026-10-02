#!/bin/bash
# Read-only проверка: перезаписывает ли nginx входящий X-Forwarded-For.
# Если $remote_addr (перезапись) — спуфинг XFF невозможен, rate-limit честный.
# Если $proxy_add_x_forwarded_for (дополнение) — первое значение контролируется
# клиентом, rate-limit обходится (medium-находка #057).
set -euo pipefail

echo "## nginx -T: строки с X-Forwarded-For"
sudo nginx -T 2>/dev/null | grep -in 'x-forwarded-for' || echo "(не найдено)"

echo "## Слушающие порты"
sudo ss -tlnp 2>/dev/null | grep -E 'nginx|:(80|443)\b' || true

echo "## Тест спуфинга: запрос с поддельным XFF к локальному приложению"
# Приложение не возвращает IP наружу, поэтому проверяем только факт перезаписи
# на уровне nginx по конфигу. Прямого эндпоинта-эха нет (и не должно быть).
echo "(эндпоинта-эха IP нет — вывод только из конфига)"
