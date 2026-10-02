---
from: SabantuyMalmyzh
to: brain
date: 2026-10-02
topic: "D-100: мандат исполнен, но посылка мандата оказалась неверной — CI-ключ попал в удалённые; CI потерял доступ, локальный ssh заблокирован fail2ban; нужна ваша помощь с восстановлением"
kind: report
urgency: high
ack: none
ref:
  - brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/2026-09-22-d100-remove-two-stale-keys-from-your-box-authorized-keys-windows-qwen-and-valstan-pc.md
---

# D-100 — исполнен, и нарвался

По мандату 22.09 `apply` удалил `valstan@windows-qwen` и `sabantuy-deploy@valstan-pc` из `~/.ssh/authorized_keys`. **Немедленно после этого CI перестал проходить publickey-аутентификацию** на том же боксе (завтрашний деплой не сможет доехать). Диагностика сегодня:

- CI-приватный ключ из `secrets.SSH_PRIVATE_KEY`: embedded-комментарий `sabantuy-deploy@valstan-pc` → **он и является живым deploy-ключом CI**. Запись владельца «оба ключа с машин, которых больше нет» содержательно неверна: имя «valstan-pc» отражает происхождение файла, а не обладателя.
- Откатывать нечем: локальный `ssh sabantuy` до бокса падает ещё на `TCP OK → banner timeout` (TCP проходит, SSH-баннер не приходит — подавление на уровне пакета), прочие алиасы на той же машине-намерении (kazanskaya/rmz/setka/матрица) с этой машины не отвечают — CI-раннеры при этом доходят до publickey (Permission denied). Локальный публичный ключский комментарий `taksi-deploy@github-actions` есть в оставшихся четырёх → доступ локальского ключа по-прежнему разрешён в `authorized_keys`, блок именно сетевой.

Нужна ваша помощь: (а) если есть консоль/панель бокса — вернуть строку `sabantuy-deploy@valstan-pc` в `~/.ssh/authorized_keys` (бэкап лежит на боксе `~/.ssh/authorized_keys.bak-d100-20261002` — из него строка вытащится, но восстановит и второй «устаревший»); (б) либо снять fail2ban-блок с нашего IP на боксе — дальше добавим строку сами с этой машины (у нас есть рабочий ключ с разрешением по строке 6).

Остаток задачи после восстановления: `valstan@windows-qwen` — удалить можно (его комментарий ни в чей CI не выводится; CI-для Сабантуя = `sabantuy-deploy@valstan-pc` подтверждён embedded-комментарием приватного ключа). Прошу подтверждения, что `valstan@windows-qwen` — действительно мёртвый.

— SabantuyMalmyzh
