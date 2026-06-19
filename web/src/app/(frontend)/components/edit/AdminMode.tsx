'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// Контекст on-site редактирования: залогинен ли редактор + режим «Просмотр/
// Редактирование». Режим живёт в localStorage (переживает переходы между страницами).
// Калька с GONBA (providers/AdminMode), один-в-один по смыслу.
type EditMode = 'view' | 'manage'

type AdminModeValue = {
  isAdmin: boolean
  mode: EditMode
  setMode: (m: EditMode) => void
  setIsAdmin: (v: boolean) => void
}

const STORAGE_KEY = 'sabantuy-edit-mode'

const AdminModeContext = createContext<AdminModeValue | null>(null)

export const AdminModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdminState] = useState(false)
  const [mode, setModeState] = useState<EditMode>('view')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'view' || stored === 'manage') setModeState(stored)
  }, [])

  const setMode = useCallback((next: EditMode) => {
    setModeState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  const setIsAdmin = useCallback((v: boolean) => {
    setIsAdminState(v)
    // Логаут → принудительно в «Просмотр» (контролы прячем).
    if (!v) {
      setModeState('view')
      window.localStorage.setItem(STORAGE_KEY, 'view')
    }
  }, [])

  const value = useMemo(() => ({ isAdmin, mode, setMode, setIsAdmin }), [isAdmin, mode, setMode, setIsAdmin])

  return <AdminModeContext.Provider value={value}>{children}</AdminModeContext.Provider>
}

export const useAdminMode = (): AdminModeValue => {
  const ctx = useContext(AdminModeContext)
  if (!ctx) throw new Error('useAdminMode must be used within AdminModeProvider')
  return ctx
}
