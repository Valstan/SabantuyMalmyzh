/**
 * Извлечение простого текста из Payload-Lexical (для тизера «О фестивале»).
 * Обходит root.children[] (paragraph/heading → text-узлы). Без зависимостей.
 */
type LexNode = {
  type?: string
  text?: string
  children?: LexNode[]
  root?: LexNode
}

function isObj(v: unknown): v is LexNode {
  return typeof v === 'object' && v !== null
}

export function lexicalToPlainText(node: unknown): string {
  if (!isObj(node)) return ''
  if (typeof node.text === 'string') return node.text
  const kids = node.root?.children ?? node.children ?? []
  return kids
    .map((k) => {
      const text = lexicalToPlainText(k)
      const block = isObj(k) && (k.type === 'paragraph' || k.type === 'heading')
      return block ? text + '\n' : text
    })
    .join('')
}

export function excerpt(content: unknown, max = 280): string {
  const txt = lexicalToPlainText(content).replace(/\s+/g, ' ').trim()
  if (txt.length <= max) return txt
  const cut = txt.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + '…'
}
