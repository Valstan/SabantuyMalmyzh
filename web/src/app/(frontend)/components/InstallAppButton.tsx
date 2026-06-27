'use client'

import { useEffect, useState } from 'react'

import { t, type Locale } from '../../../lib/i18n'
import { Modal } from './edit/Modal'

// Событие установки PWA нет в стандартных DOM-типах — описываем минимально.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Кнопка «Установить приложение» (PWA, идея I10). PWA-обвязка (manifest + sw + иконки)
// уже есть — здесь только заметная точка входа к установке на телефон:
//  • Android/Chrome/Edge: ловим beforeinstallprompt → нативный системный промпт «Установить».
//  • iPhone/Safari: системного события нет → показываем модалку с инструкцией
//    (Поделиться → «На экран „Домой"»).
//  • Уже установлено (standalone) ИЛИ браузер без поддержки и не iOS → ничего не рендерим
//    (кнопка-пустышка хуже её отсутствия).
// Клиентский: первый рендер (и SSR) = null, видимость считаем после mount → без hydration-mismatch.
export function InstallAppButton({ locale }: { locale: Locale }) {
  const [mounted, setMounted] = useState(false)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIos, setIsIos] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [iosHelp, setIosHelp] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Уже открыто как установленное приложение — кнопка не нужна.
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) {
      setInstalled(true)
      return
    }

    const ua = window.navigator.userAgent || ''
    // iPad на iOS 13+ маскируется под Mac — добавляем проверку тача.
    const iosLike =
      /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && 'ontouchend' in document)
    setIsIos(iosLike)

    const onPrompt = (e: Event) => {
      e.preventDefault() // придержим событие — покажем СВОЮ кнопку вместо автоматического баннера
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function onClick() {
    if (deferred) {
      await deferred.prompt()
      await deferred.userChoice.catch(() => undefined)
      setDeferred(null)
      return
    }
    if (isIos) setIosHelp(true)
  }

  // Рендерим только когда есть что предложить: нативный промпт готов ИЛИ это iOS.
  if (!mounted || installed) return null
  if (!deferred && !isIos) return null

  return (
    <div className="install-app">
      <button type="button" className="btn btn-outline install-app__btn" onClick={onClick}>
        📲 {t(locale, 'pwa.install')}
      </button>

      <Modal open={iosHelp} onClose={() => setIosHelp(false)} title={t(locale, 'pwa.iosTitle')}>
        <ol className="install-app__steps">
          <li>{t(locale, 'pwa.iosStep1')}</li>
          <li>{t(locale, 'pwa.iosStep2')}</li>
          <li>{t(locale, 'pwa.iosStep3')}</li>
        </ol>
      </Modal>
    </div>
  )
}
