'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { BRAND_LOGO_SRC, BRAND_NAME } from '@/lib/branding'
import { themeTokens } from '@/app/(app)/ClientThemeContext'

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Inicio', icon: 'M3 12l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z' },
    {
        href: '/cuerpo',
        label: 'Cuerpo',
        icon: 'M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25',
    },
    { href: '/rutina', label: 'Rutina', icon: 'M8 6h10M8 12h10M8 18h10M4 6h.01M4 12h.01M4 18h.01' },
    { href: '/tienda-cliente', label: 'Tienda', icon: 'M5 8l1 12h12l1-12H5zm2-3h10l1 3H6l1-3z' },
    {
        href: '/perfil',
        label: 'Perfil',
        icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0',
    },
]

function NavIcon({ d, className = 'h-[18px] w-[18px]' }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
        </svg>
    )
}

export function ClientSidebar({ user, darkMode, setDarkMode, onLogout }) {
    const pathname = usePathname()
    const t = darkMode ? themeTokens.dark : themeTokens.light
    const initial = (user?.name || 'C').charAt(0).toUpperCase()

    return (
        <aside
            className={`hidden w-[240px] shrink-0 flex-col border-r desktop:flex ${
                darkMode ? 'border-gray-700/80 bg-[#161d2b]' : 'border-[#E5DECF] bg-[#FAFAF8]'
            }`}
        >
            {/* Marca */}
            <div
                className={`border-b px-4 py-4 ${
                    darkMode ? 'border-gray-700/80' : 'border-[#E5DECF]'
                }`}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <Image
                        src={BRAND_LOGO_SRC}
                        alt={BRAND_NAME}
                        width={36}
                        height={36}
                        className="h-9 w-9 shrink-0 object-contain"
                    />
                    <div className="min-w-0">
                        <p className={`truncate text-sm font-bold leading-tight ${t.textMain}`}>{BRAND_NAME}</p>
                        <p className={`text-[11px] ${t.textSub}`}>Panel cliente</p>
                    </div>
                </div>
            </div>

            {/* Usuario + acciones */}
            <div
                className={`border-b px-4 py-3.5 ${
                    darkMode ? 'border-gray-700/80' : 'border-[#E5DECF]'
                }`}
            >
                <div className="flex items-center gap-3">
                    <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            darkMode
                                ? 'bg-[#B7962D]/25 text-[#D6B45B] ring-1 ring-[#B7962D]/40'
                                : 'bg-[#B7962D]/15 text-[#8A6F2A] ring-1 ring-[#C9A84C]/50'
                        }`}
                    >
                        {initial}
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-semibold ${t.textMain}`}>{user?.name || 'Cliente'}</p>
                        <p className={`truncate text-[11px] ${t.textSub}`}>{user?.email}</p>
                    </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setDarkMode(v => !v)}
                        title={darkMode ? 'Modo claro' : 'Modo oscuro'}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                            darkMode
                                ? 'border-gray-600 bg-gray-800/60 text-gray-300 hover:bg-gray-800'
                                : 'border-[#E5DECF] bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        <NavIcon
                            d={
                                darkMode
                                    ? 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
                                    : 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'
                            }
                            className="h-4 w-4"
                        />
                        {darkMode ? 'Claro' : 'Oscuro'}
                    </button>
                    <button
                        type="button"
                        onClick={onLogout}
                        title="Cerrar sesión"
                        className={`flex items-center justify-center rounded-lg border px-2.5 py-1.5 transition ${
                            darkMode
                                ? 'border-red-900/50 bg-red-950/40 text-red-300 hover:bg-red-950/70'
                                : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                    >
                        <NavIcon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Navegación */}
            <nav className="flex flex-1 flex-col px-3 py-4">
                <p
                    className={`mb-2 px-2 text-[10px] font-bold uppercase tracking-widest ${
                        darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}
                >
                    Menú
                </p>
                <ul className="space-y-0.5">
                    {NAV_ITEMS.map(item => {
                        const active = pathname === item.href
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                                        active
                                            ? darkMode
                                                ? 'bg-[#B7962D]/20 text-[#E8D08A]'
                                                : 'bg-[#B7962D]/12 text-[#7A6420]'
                                            : `${t.textSub} hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ${darkMode ? 'hover:text-gray-200' : 'hover:text-gray-800'}`
                                    }`}
                                >
                                    {active ? (
                                        <span
                                            className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full ${
                                                darkMode ? 'bg-[#D6B45B]' : 'bg-[#B7962D]'
                                            }`}
                                        />
                                    ) : null}
                                    <span
                                        className={`ml-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${
                                            active
                                                ? darkMode
                                                    ? 'bg-[#B7962D]/35 text-[#F0D78C]'
                                                    : 'bg-[#B7962D]/20 text-[#8A6F2A]'
                                                : darkMode
                                                  ? 'bg-gray-800/80 text-gray-400 group-hover:text-gray-300'
                                                  : 'bg-gray-100 text-gray-500 group-hover:text-gray-700'
                                        }`}
                                    >
                                        <NavIcon d={item.icon} />
                                    </span>
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>
        </aside>
    )
}

export { NAV_ITEMS, NavIcon }
