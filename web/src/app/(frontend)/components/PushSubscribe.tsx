'use client'

import { useEffect, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'

// ЕДИНАЯ подписка на все push-уведомления сайта: программа («скоро начнётся
// событие»), Новости, Народная лента. Рендерится на главной (программа),
// /novosti и /lenta. Показывается только если браузер умеет Push API и на
// сервере заведены VAPID-ключи + сезонная кампания активна (/api/push/vapid).
// Подписка отключится сама после 7 июля (говорим об этом при подписке);
// отписаться вручную можно в любой момент. На iOS пуши работают из
// УСТАНОВЛЕННОГО приложения (PWA) — вне standalone показываем подсказку.

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function PushSubscribe({ locale }: { locale: Locale }) {
  // state: 'hidden' — нет поддержки/ключей/кампания кончилась; 'ios-install' —
  // iOS вне PWA; 'off' — можно подписаться; 'on' — подписан; 'busy' — запрос.
  const [state, setState] = useState<'hidden' | 'ios-install' | 'off' | 'on' | 'busy'>('hidden')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
      const standalone =
        window.matchMedia?.('(display-mode: standalone)').matches ||
        (navigator as { standalone?: boolean }).standalone === true
      try {
        const res = await fetch('/api/push/vapid')
        const cfg = (await res.json()) as { configured?: boolean }
        if (!cfg.configured || cancelled) return
        if (!('PushManager' in window)) {
          if (isIos && !standalone) setState('ios-install')
          return
        }
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!cancelled) setState(sub ? 'on' : 'off')
      } catch {
        /* сеть/SW — просто не показываем блок */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const subscribe = async () => {
    setError(null)
    setState('busy')
    try {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setError(t(locale, 'push.denied'))
        setState('off')
        return
      }
      const res = await fetch('/api/push/vapid')
      const cfg = (await res.json()) as { configured?: boolean; key?: string }
      if (!cfg.configured || !cfg.key) throw new Error('not configured')
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(cfg.key) as unknown as BufferSource,
      })
      const saved = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON(), locale }),
      })
      if (!saved.ok) throw new Error('save failed')
      setState('on')
    } catch {
      setError(t(locale, 'push.error'))
      setState('off')
    }
  }

  const unsubscribe = async () => {
    setState('busy')
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => undefined)
        await sub.unsubscribe()
      }
      setState('off')
    } catch {
      setState('on')
    }
  }

  if (state === 'hidden') return null

  if (state === 'ios-install') {
    return <p className="push-box push-hint-ios">{t(locale, 'push.iosInstall')}</p>
  }

  return (
    <div className="push-box">
      <div className="push-box-head">
        <span className="push-box-title">🔔 {t(locale, 'push.title')}</span>
        {state === 'on' ? (
          <button type="button" className="push-btn on" onClick={unsubscribe}>
            {t(locale, 'push.unsubscribe')}
          </button>
        ) : (
          <button type="button" className="push-btn" disabled={state === 'busy'} onClick={subscribe}>
            {state === 'busy' ? '…' : t(locale, 'push.subscribe')}
          </button>
        )}
      </div>
      <p className="push-note">{error || (state === 'on' ? t(locale, 'push.active') : t(locale, 'push.lead'))}</p>
    </div>
  )
}
