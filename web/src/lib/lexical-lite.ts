/**
 * Лёгкая конвертация richText (Lexical) ↔ HTML для on-site редактора.
 *
 * Поддерживает: абзацы, заголовки (h2/h3), жирный, курсив, ссылки, списки
 * (маркир./нумер.), переносы строк, горизонтальную черту И **inline-картинки**
 * (upload-узлы media). Этого хватает для ~95% правок «на ходу».
 *
 * Сложные узлы (block / relationship / quote и пр.) считаем «неподдержанными»:
 * редактор тела тогда не предлагается, правка идёт через /admin (hasUnsupportedNodes) —
 * НЕ теряем сложный контент.
 *
 * Калька с GONBA (components/InlineEdit/lexical-lite.ts) + наша поддержка upload.
 * Используется только в браузере (DOMParser) из client-компонента редактора.
 */

const FORMAT_BOLD = 1
const FORMAT_ITALIC = 2

type LexNode = { type?: string; [k: string]: unknown }
type LexRoot = { root?: { children?: LexNode[]; [k: string]: unknown } }

/** Блочные типы верхнего уровня, которые умеет редактор (включая upload). */
const SUPPORTED_TOP_TYPES = new Set([
  'paragraph',
  'heading',
  'list',
  'horizontalrule',
  'linebreak',
  'upload',
])

/** Случайный 24-символьный hex (id узла Lexical, как BSON ObjectID). */
export function newNodeId(): string {
  const bytes = new Uint8Array(12)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** true, если контент содержит узлы верхнего уровня, которые редактор не умеет. */
export function hasUnsupportedNodes(state: unknown): boolean {
  const root = (state as LexRoot)?.root
  if (!root || !Array.isArray(root.children)) return false
  return root.children.some((n) => {
    const t = typeof n?.type === 'string' ? n.type : ''
    // block/relationship — сложные узлы, оставляем админке. upload теперь умеем.
    if (t === 'block' || t === 'relationship') return true
    return !SUPPORTED_TOP_TYPES.has(t)
  })
}

export function isEmptyLexical(state: unknown): boolean {
  const root = (state as LexRoot)?.root
  return !root || !Array.isArray(root.children) || root.children.length === 0
}

// ---------------------------------------------------------------------------
// Lexical → HTML (загрузка существующего контента в contentEditable)
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;')
}

/** id media-связи независимо от depth (id или объект {id}). */
function mediaIdOf(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'object') {
    const id = (v as { id?: unknown }).id
    return id == null ? null : String(id)
  }
  return String(v)
}

function inlineToHtml(children: unknown): string {
  if (!Array.isArray(children)) return ''
  let out = ''
  for (const raw of children as LexNode[]) {
    const type = raw?.type
    if (type === 'text') {
      const text = escapeHtml(String(raw.text ?? ''))
      const fmt = typeof raw.format === 'number' ? raw.format : 0
      let html = text
      if (fmt & FORMAT_BOLD) html = `<strong>${html}</strong>`
      if (fmt & FORMAT_ITALIC) html = `<em>${html}</em>`
      out += html
    } else if (type === 'linebreak') {
      out += '<br>'
    } else if (type === 'link' || type === 'autolink') {
      const fields = (raw.fields as { url?: string } | undefined) ?? {}
      const url = escapeAttr(String(fields.url ?? '#'))
      out += `<a href="${url}">${inlineToHtml(raw.children)}</a>`
    }
  }
  return out
}

/** Плейсхолдер upload-узла: зеркалит DOM-экспорт Payload (data-lexical-upload-id).
 *  Контент грузим с depth≥1, поэтому value — populated-объект media с реальным url
 *  (раздача по имени файла; по id отдаёт 500). Для src берём value.url. */
function uploadToHtml(node: LexNode): string {
  const v = node.value
  const mediaId = mediaIdOf(v)
  if (!mediaId) return ''
  const relationTo = typeof node.relationTo === 'string' ? node.relationTo : 'media'
  const nodeId = typeof node.id === 'string' ? node.id : ''
  const fmt = typeof node.format === 'string' ? node.format : ''
  const obj = v && typeof v === 'object' ? (v as { url?: unknown; alt?: unknown }) : null
  const url = obj && typeof obj.url === 'string' ? obj.url : `/api/media/file/${mediaId}`
  const alt = obj ? escapeAttr(String(obj.alt ?? '')) : ''
  const align = fmt === 'left' || fmt === 'center' || fmt === 'right' ? ` align-${fmt}` : ''
  return (
    `<img data-lexical-upload-id="${escapeAttr(mediaId)}" ` +
    `data-lexical-upload-relation-to="${escapeAttr(relationTo)}" ` +
    `data-lexical-node-id="${escapeAttr(nodeId)}" ` +
    `data-lexical-format="${escapeAttr(fmt)}" ` +
    `src="${escapeAttr(url)}" alt="${alt}" class="edit-inline-img${align}" />`
  )
}

/** Сериализует Lexical-состояние в HTML для редактируемой области. */
export function lexicalToHtml(state: unknown): string {
  const root = (state as LexRoot)?.root
  if (!root || !Array.isArray(root.children)) return ''
  let out = ''
  for (const node of root.children) {
    const type = node?.type
    if (type === 'paragraph') {
      const inner = inlineToHtml(node.children)
      out += inner ? `<p>${inner}</p>` : '<p><br></p>'
    } else if (type === 'heading') {
      const tag = node.tag === 'h3' ? 'h3' : 'h2'
      out += `<${tag}>${inlineToHtml(node.children)}</${tag}>`
    } else if (type === 'list') {
      const tag = node.tag === 'ol' || node.listType === 'number' ? 'ol' : 'ul'
      const items = Array.isArray(node.children) ? (node.children as LexNode[]) : []
      const lis = items.map((li) => `<li>${inlineToHtml(li.children)}</li>`).join('')
      out += `<${tag}>${lis}</${tag}>`
    } else if (type === 'horizontalrule') {
      out += '<hr>'
    } else if (type === 'upload') {
      out += uploadToHtml(node)
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// HTML → Lexical (сохранение отредактированного contentEditable)
// ---------------------------------------------------------------------------

function textNode(text: string, format: number): LexNode {
  return { type: 'text', detail: 0, format, mode: 'normal', style: '', text, version: 1 }
}

function serializeInline(el: Node, inheritedFormat: number): LexNode[] {
  const result: LexNode[] = []
  el.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? ''
      if (text.length > 0) result.push(textNode(text, inheritedFormat))
      return
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return
    const e = child as HTMLElement
    const tag = e.tagName.toLowerCase()
    if (tag === 'br') {
      result.push({ type: 'linebreak', version: 1 })
      return
    }
    if (tag === 'strong' || tag === 'b') {
      result.push(...serializeInline(e, inheritedFormat | FORMAT_BOLD))
      return
    }
    if (tag === 'em' || tag === 'i') {
      result.push(...serializeInline(e, inheritedFormat | FORMAT_ITALIC))
      return
    }
    if (tag === 'a') {
      const url = e.getAttribute('href') || '#'
      result.push({
        type: 'link',
        fields: { linkType: 'custom', newTab: false, url },
        children: serializeInline(e, inheritedFormat),
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 2,
      })
      return
    }
    // Прочие inline-обёртки (span и т.п.) — раскрываем содержимое.
    result.push(...serializeInline(e, inheritedFormat))
  })
  return result
}

function paragraphNode(children: LexNode[]): LexNode {
  return {
    type: 'paragraph',
    children,
    direction: 'ltr',
    format: '',
    indent: 0,
    textFormat: 0,
    version: 1,
  }
}

function listNode(tag: 'ul' | 'ol', el: HTMLElement): LexNode {
  const items: LexNode[] = []
  let value = 1
  el.querySelectorAll(':scope > li').forEach((li) => {
    items.push({
      type: 'listitem',
      value: value++,
      children: serializeInline(li, 0),
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    })
  })
  return {
    type: 'list',
    listType: tag === 'ol' ? 'number' : 'bullet',
    start: 1,
    tag,
    children: items,
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  }
}

/** Upload-узел Payload (точная форма по UploadNode.exportJSON, version:3). */
function uploadNodeFrom(img: HTMLElement): LexNode | null {
  const mediaId = img.getAttribute('data-lexical-upload-id')
  if (!mediaId) return null
  // PK media — целочисленный (postgres serial): value должен быть числом, иначе
  // Payload отвергает («not a valid upload ID»). Нечисловой id (mongo) — строкой.
  const value: string | number = /^\d+$/.test(mediaId) ? Number(mediaId) : mediaId
  return {
    type: 'upload',
    version: 3,
    relationTo: img.getAttribute('data-lexical-upload-relation-to') || 'media',
    value,
    id: img.getAttribute('data-lexical-node-id') || newNodeId(),
    fields: {},
    format: img.getAttribute('data-lexical-format') || '',
  }
}

/** Достаёт upload-`<img>` из элемента, если он его единственное содержимое. */
function loneUploadImg(el: HTMLElement): HTMLElement | null {
  if (el.tagName.toLowerCase() === 'img' && el.hasAttribute('data-lexical-upload-id')) return el
  const imgs = el.querySelectorAll('img[data-lexical-upload-id]')
  if (imgs.length === 1 && (el.textContent ?? '').trim() === '') return imgs[0] as HTMLElement
  return null
}

/** Разбирает HTML из contentEditable в Lexical-состояние. */
export function htmlToLexical(html: string): { root: LexNode } {
  const children: LexNode[] = []
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const body = doc.body

  const pushParagraphFromInline = (node: Node) => {
    children.push(paragraphNode(serializeInline(node, 0)))
  }

  body.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent ?? '').trim()
      if (text) children.push(paragraphNode([textNode(text, 0)]))
      return
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return
    const e = child as HTMLElement
    const tag = e.tagName.toLowerCase()

    // upload-картинка (как самостоятельный блок или единственное содержимое обёртки)
    const upImg = loneUploadImg(e)
    if (upImg) {
      const node = uploadNodeFrom(upImg)
      if (node) children.push(node)
      return
    }

    if (tag === 'p' || tag === 'div') {
      pushParagraphFromInline(e)
    } else if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4') {
      children.push({
        type: 'heading',
        tag: tag === 'h3' || tag === 'h4' ? 'h3' : 'h2',
        children: serializeInline(e, 0),
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      })
    } else if (tag === 'ul') {
      children.push(listNode('ul', e))
    } else if (tag === 'ol') {
      children.push(listNode('ol', e))
    } else if (tag === 'hr') {
      children.push({ type: 'horizontalrule', version: 1 })
    } else if (tag === 'br') {
      children.push(paragraphNode([]))
    } else {
      // Неизвестный блок — сохраняем как абзац с его текстом, чтобы не терять.
      pushParagraphFromInline(e)
    }
  })

  if (children.length === 0) children.push(paragraphNode([]))

  return {
    root: { type: 'root', children, direction: 'ltr', format: '', indent: 0, version: 1 },
  }
}
