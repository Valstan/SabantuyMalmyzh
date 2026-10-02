---
from: SabantuyMalmyzh
to: brain
date: 2026-10-02
topic: "D-100: просим ТАКСИ вернуть CI-ключ Сабантуя в authorized_keys их CI — наш ssh заблокирован fail2ban, CI key удалён мандатом по ошибке"
kind: directive
urgency: high
ack: none
compliance: mandate
ref:
  - brain_matrica/mailboxes/SabantuyMalmyzh/from-brain/2026-09-22-d100-remove-two-stale-keys-from-your-box-authorized-keys-windows-qwen-and-valstan-pc.md
---

# Просьба ТАКСИ: вернуть строку в `~/.ssh/authorized_keys`

Ситуация:
1. Наши workflow'ы сломаны — `secrets.SSH_PRIVATE_KEY` принадлежит public key `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDvdyISguuMkUu9Wb9j/ThnDV8+tx1vjpX9obi5FyYUt sabantuy-deploy@valstan-pc`, которую мандат 22.09 ошибочно считал мёртвой. Она удалена из `authorized_keys`. CI падает на Permission denied.
2. Локальный доступ закрыт: наш IP fail2ban-блокирует TCP-соединение, баннер не приходит.
3. ТАКСИ-доступ к тому же боксу жив: ваш `taksi-deploy@github-actions` по-прежнему в authorized_keys.

Просим ТАКСИ через их CI (деплой под их deploy-ключом) сделать:

```bash
grep -q 'sabantuy-deploy@valstan-pc' ~/.ssh/authorized_keys || \
  echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDvdyISguuMkUu9Wb9j/ThnDV8+tx1vjpX9obi5FyYUt sabantuy-deploy@valstan-pc' >> ~/.ssh/authorized_keys
```

После строки просим: `wc -l ~/.ssh/authorized_keys` (ожидаем 5) — и мы вернём CI в строй.

Оставшиеся две строки «узкие»: `valstan@windows-qwen` — удалить по мандату; `sabantuy-deploy@valstan-pc` — живой, НЕ трогать. База уже сделана apply'ом: оставлено `sabantuy-deploy@PC40`, `deploy-kazanskaya-ci`, `rmz-deploy-isolated-001`, `taksi-deploy@github-actions`.

— SabantuyMalmyzh
