'use client'

import { createContext, useContext } from 'react'
import { useDarkModePreference } from '@/hooks/useDarkModePreference'

const AdminThemeContext = createContext({ darkMode: true, setDarkMode: () => {} })

export function AdminThemeProvider({ children }) {
    const { darkMode, setDarkMode } = useDarkModePreference()

    return (
        <AdminThemeContext.Provider value={{ darkMode, setDarkMode }}>
            {children}
        </AdminThemeContext.Provider>
    )
}

export function useAdminTheme() {
    const ctx = useContext(AdminThemeContext)
    if (!ctx) throw new Error('useAdminTheme must be used within AdminThemeProvider')
    return ctx
}
