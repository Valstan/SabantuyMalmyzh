import path from 'path'
import { fileURLToPath } from 'url'

import { withPayload } from '@payloadcms/next/withPayload'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const NEXT_PUBLIC_SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || process.env.__NEXT_PRIVATE_ORIGIN || 'http://localhost:3000'

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Прод-VPS (1.5 GiB RAM, без swap) не тянет `next build` (OOM). Сборка едет в CI
  // (GitHub Actions, ubuntu), на сервер кладём готовый standalone-сервер (≈150-300 МБ
  // в рантайме). tracingRoot = web/ — чтобы server.js лёг в корень .next/standalone.
  //
  // ⚠️ standalone-сборка делает outputFileTracing, который МУТИРУЕТ локальный
  // node_modules (удаляет next/dist/client/components/builtin/* → следующая локальная
  // сборка падает «Cannot find module … global-not-found»; CI не страдает — там
  // свежий install на каждую сборку). Поэтому standalone включаем ТОЛЬКО по флагу
  // STANDALONE_BUILD=1 (его ставит deploy-prod.yml). Локальный `next build` — обычный,
  // node_modules не портит → можно собирать повторно без реинстолла.
  output: process.env.STANDALONE_BUILD === '1' ? 'standalone' : undefined,
  outputFileTracingRoot: __dirname,
  images: {
    remotePatterns: [
      ...[NEXT_PUBLIC_SERVER_URL].map((item) => {
        const url = new URL(item)
        return {
          hostname: url.hostname,
          protocol: url.protocol.replace(':', ''),
        }
      }),
      // Внешнее хранилище медиа (план: фото/видео не отдаём с маленького VPS).
      { protocol: 'https', hostname: 'downloader.disk.yandex.ru' },
      { protocol: 'https', hostname: 'disk.yandex.ru' },
    ],
  },
  reactStrictMode: true,
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
