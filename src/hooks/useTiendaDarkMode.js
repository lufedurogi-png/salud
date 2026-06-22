'use client'

import { useDarkModePreference } from '@/hooks/useDarkModePreference'

/**
 * Tema tienda alineado con el resto de la app (localStorage compartido).
 */
export function useTiendaDarkMode() {
    const { darkMode, setDarkMode, hydrated } = useDarkModePreference()
    return { darkMode, setDarkMode, themeReady: hydrated }
}
