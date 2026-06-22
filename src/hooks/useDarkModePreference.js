'use client'

import { useCallback, useEffect, useState } from 'react'
import {
    DARK_MODE_STORAGE_KEY,
    applyDarkModeClass,
    readDarkModePreference,
    writeDarkModePreference,
} from '@/lib/darkModePreference'

/**
 * Tema oscuro/claro persistido en localStorage del navegador.
 */
export function useDarkModePreference() {
    const [darkMode, setDarkModeState] = useState(true)
    const [hydrated, setHydrated] = useState(false)

    useEffect(() => {
        const saved = readDarkModePreference()
        setDarkModeState(saved)
        applyDarkModeClass(saved)
        setHydrated(true)
    }, [])

    useEffect(() => {
        if (!hydrated) return
        writeDarkModePreference(darkMode)
    }, [darkMode, hydrated])

    useEffect(() => {
        const onCustom = (e) => setDarkModeState(Boolean(e.detail))
        const onStorage = (e) => {
            if (e.key !== DARK_MODE_STORAGE_KEY || e.newValue === null) return
            try {
                setDarkModeState(JSON.parse(e.newValue))
            } catch {
                /* ignore */
            }
        }
        window.addEventListener('darkModeChange', onCustom)
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener('darkModeChange', onCustom)
            window.removeEventListener('storage', onStorage)
        }
    }, [])

    const setDarkMode = useCallback(value => {
        setDarkModeState(prev => (typeof value === 'function' ? value(prev) : value))
    }, [])

    return { darkMode, setDarkMode, hydrated }
}
