import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // Ревизия гейтов #104 (2026-08-10): `react-hooks/rules-of-hooks` приходит из
      // next/core-web-vitals как error — красный прогон подтверждён. А вот
      // `exhaustive-deps` там всего лишь warn, при том что это правило про класс
      // БАГОВ (устаревшее замыкание в эффекте), а не про стиль. Поднимаем до error:
      // на момент правки в кодовой базе ноль нарушений, так что цена нулевая.
      'react-hooks/exhaustive-deps': 'error',
      // Остальные — стилевые, оставлены warn; блокируют они всё равно, потому что
      // скрипт lint гоняется с `--max-warnings 0` (иначе `next lint` отдаёт exit 0
      // при предупреждениях, и «зелёный гейт» перестаёт значить «нарушений нет»).
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^(_|ignore)',
        },
      ],
    },
  },
  {
    ignores: ['.next/'],
  },
]

export default eslintConfig
