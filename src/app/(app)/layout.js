'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/auth'
import Link from 'next/link'
import { ClientSidebar, NAV_ITEMS, NavIcon } from '@/components/client/ClientSidebar'
import { useDarkModePreference } from '@/hooks/useDarkModePreference'
import { ClientThemeProvider, themeTokens } from './ClientThemeContext'

const AppLayout = ({ children }) => {
    const router = useRouter()
    const pathname = usePathname()
    const { user, logout } = useAuth({ middleware: 'auth' })
    const [checkedSession, setCheckedSession] = useState(false)
    const { darkMode, setDarkMode } = useDarkModePreference()

    useEffect(() => {
        if (typeof window === 'undefined') return
        const hasToken = !!localStorage.getItem('auth_token')
        if (!hasToken) {
            router.replace('/login')
            return
        }
        setCheckedSession(true)
    }, [router])

    if (!checkedSession || !user) {
        return <div className="flex min-h-screen items-center justify-center p-6 text-sm text-gray-500">Cargando...</div>
    }

    const t = darkMode ? themeTokens.dark : themeTokens.light

    return (
        <ClientThemeProvider value={{ darkMode, setDarkMode }}>
            <div className={`min-h-screen transition-colors desktop:flex ${t.page}`}>
                <ClientSidebar
                    user={user}
                    darkMode={darkMode}
                    setDarkMode={setDarkMode}
                    onLogout={logout}
                />

                <div className="flex min-h-screen min-w-0 flex-1 flex-col pb-[4.5rem] desktop:pb-0">
                    <header
                        className={`sticky top-0 z-20 border-b backdrop-blur ${
                            darkMode ? 'border-gray-700/80 bg-[#1F2937]/95' : 'border-[#E5DECF] bg-white/95'
                        }`}
                    >
                        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6 desktop:px-8">
                            <div className="min-w-0 desktop:hidden">
                                <p className={`text-xs ${t.textSub}`}>Hola</p>
                                <p className={`truncate text-sm font-semibold ${t.textMain}`}>
                                    {user?.name || 'Cliente'}
                                </p>
                            </div>
                            <p className={`hidden text-sm font-semibold desktop:block ${t.textMain}`}>
                                {NAV_ITEMS.find(i => i.href === pathname)?.label || 'Panel'}
                            </p>
                            <div className="flex items-center gap-2 desktop:hidden">
                                <button
                                    type="button"
                                    onClick={() => setDarkMode(v => !v)}
                                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${darkMode ? 'bg-[#B7962D]' : 'bg-gray-300'}`}
                                    aria-label="Cambiar tema"
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${darkMode ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="rounded-lg bg-red-500/90 px-3 py-1.5 text-xs font-semibold text-white"
                                >
                                    Salir
                                </button>
                            </div>
                        </div>
                    </header>

                    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-6 desktop:px-8 desktop:py-8">
                        {children}
                    </main>

                    {/* Barra inferior — móvil */}
                    <nav
                        className={`fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur desktop:hidden ${
                            darkMode ? 'border-gray-700/80 bg-[#1F2937]/98' : 'border-[#E5DECF] bg-[#F9F7F2]/98'
                        }`}
                    >
                        <div className="mx-auto flex max-w-lg justify-around px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 sm:max-w-xl">
                            {NAV_ITEMS.map(item => {
                                const active = pathname === item.href
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1 ${
                                            active ? t.accent : t.textSub
                                        }`}
                                    >
                                        <span
                                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
                                                active
                                                    ? 'bg-[#B7962D] text-white shadow-sm'
                                                    : darkMode
                                                      ? 'bg-gray-800/80 text-gray-400'
                                                      : 'bg-white text-gray-500 shadow-sm'
                                            }`}
                                        >
                                            <NavIcon d={item.icon} className="h-[18px] w-[18px]" />
                                        </span>
                                        <span className="max-w-full truncate text-[10px] font-semibold">
                                            {item.label}
                                        </span>
                                    </Link>
                                )
                            })}
                        </div>
                    </nav>
                </div>
            </div>
        </ClientThemeProvider>
    )
}

export default AppLayout
