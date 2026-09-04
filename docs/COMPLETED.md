# COMPLETED — что из pool идей уже стоит в проекте

> Ledger сделанного. В канон (`AGENTS.md`) не возвращать: канон — про то, **как** работать,
> а не про то, что сделано. Подробности каждого пункта — в git и в PR.

| Идея | Состояние |
|---|---|
| **#015** server write-authz vs UI edit-gate | ✅ с первого дня (`Registrations`) |
| **#008** секреты вне репо | ✅ в репо только `.env.example`; на проде — env-файл сервиса под `/etc` |
| **#003** SESSION_HANDOFF | ✅ заведён |
| **#009** share-findings reflex | ✅ канал `mailbox/to-brain/` |
| **#001** изолированный SSH-deploy-ключ | ✅ отдельный ключ деплоя, не общий |
| **#011** deploy content-smoke-check | ✅ смоук `/` + `/map` + `/admin` в `deploy-prod.yml` |
| **#027** gate-replaced autonomy | ✅ `.claude/settings.json` + ярусные гейты, см. `AGENTS.md` §PR-only flow |
| **#262** непустой контроль метода | ✅ применяется в аудитах D-038 и в дрейф-пробе `probe-schema.yml` |
| **ADR-0001** медиа во внешнее хранилище | ✅ Object Storage через `@payloadcms/storage-s3` |
