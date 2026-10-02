#!/bin/bash
# D-100 (мандат brain 2026-09-22, отчёт к 06.10): в ~/.ssh/authorized_keys Бокса
# Сабантуя два устаревших ключа. Удалить ровно две строки по комментарию,
# остальные четыре не трогать. Запуск на боксе: bash -s plan|apply
set -euo pipefail

AK=~/.ssh/authorized_keys
MODE="${1:-plan}"

echo "## До:"
awk '{print NR": "$NF}' "$AK"
echo "строк: $(wc -l < "$AK")"

if [ "$MODE" = plan ]; then
  exit 0
fi

cp -p "$AK" "$AK.bak-d100-$(date +%Y%m%d)"
grep -Ev ' valstan@windows-qwen$| sabantuy-deploy@valstan-pc$' "$AK" > "$AK.new"
removed=$(( $(wc -l < "$AK") - $(wc -l < "$AK.new") ))
mv "$AK.new" "$AK"
chmod 600 "$AK"
echo "## Удалено строк: $removed"
echo "## После:"
awk '{print NR": "$NF}' "$AK"
echo "строк: $(wc -l < "$AK")"
