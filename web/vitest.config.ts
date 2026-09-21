import { defineConfig } from 'vitest/config'

// Тесты — на чистую логику без БД и HTTP (приёмник конвейера lib/ingest.ts).
// Рендер страниц и работа с Payload сюда не входят: они требуют БД и
// проверяются смоуком после деплоя.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
