/**
 * Рендерит Schema.org JSON-LD как <script type="application/ld+json">.
 * Серверный компонент — попадает в SSR-HTML, ноль JS для браузера.
 *
 * Принимает один объект или массив; экранируем «<» в JSON, чтобы строка внутри
 * данных не закрыла тег раньше времени (XSS-safe инъекция).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
