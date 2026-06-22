'use client'

import {createContext, useContext} from 'react'

const ClientThemeContext = createContext({
    darkMode: true,
    setDarkMode: () => {},
})

export function ClientThemeProvider({value, children}) {
    return (
        <ClientThemeContext.Provider value={value}>
            {children}
        </ClientThemeContext.Provider>
    )
}

export function useClientTheme() {
    return useContext(ClientThemeContext)
}

export const themeTokens = {
    light: {
        page: 'bg-[#F2EFE8] text-gray-900',
        card: 'bg-white border border-[#E5DECF] shadow-[0_6px_18px_rgba(0,0,0,0.06)]',
        cardMuted: 'bg-[#F8F5EF] border border-[#E5DECF]',
        textMain: 'text-gray-900',
        textSub: 'text-gray-600',
        accent: 'text-[#A88A2B]',
        accentBg: 'bg-[#B7962D]',
        accentSoft: 'bg-[#C9A84C]',
        header: 'from-[#9B8242] via-[#A88A2B] to-[#D8C087]',
    },
    dark: {
        page: 'bg-[#111827] text-gray-100',
        card: 'bg-[#1F2937] border border-[#374151] shadow-[0_8px_18px_rgba(0,0,0,0.35)]',
        cardMuted: 'bg-[#111827] border border-[#374151]',
        textMain: 'text-gray-100',
        textSub: 'text-gray-400',
        accent: 'text-[#D6B45B]',
        accentBg: 'bg-[#B7962D]',
        accentSoft: 'bg-[#8A6F2A]',
        header: 'from-[#6F5B2A] via-[#8C742F] to-[#A88A3F]',
    },
}

export { weekColors, weekColorForWeekday } from '@/lib/weekdayColorMode'

