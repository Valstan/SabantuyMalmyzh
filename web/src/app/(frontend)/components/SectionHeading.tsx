import React from 'react'

/**
 * Единый орнаментированный заголовок секции: надзаголовок-eyebrow (с золотыми
 * усиками) + заголовок с золотым мазком-подчёркиванием (.heading-brush).
 * Серверный компонент. Используется на всех страницах.
 */
export function SectionHeading({
  eyebrow,
  title,
  as = 'h2',
  align = 'left',
  tulip = false,
}: {
  eyebrow?: string
  title: string
  as?: 'h1' | 'h2' | 'h3'
  align?: 'left' | 'center'
  tulip?: boolean
}) {
  const Tag = as
  return (
    <header style={align === 'center' ? { textAlign: 'center' } : undefined}>
      {eyebrow && <p className={`eyebrow${tulip ? ' has-tulip' : ''}`}>{eyebrow}</p>}
      <Tag className={`heading-brush${align === 'center' ? ' center' : ''}`}>{title}</Tag>
    </header>
  )
}
