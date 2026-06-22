'use client'

import { themeTokens, useClientTheme } from '@/app/(app)/ClientThemeContext'

export default function ClientPageHeader({ title, subtitle, children }) {
    const { darkMode } = useClientTheme()
    const t = darkMode ? themeTokens.dark : themeTokens.light

    return (
        <section className={`rounded-3xl bg-gradient-to-r p-6 sm:p-8 ${t.header}`}>
            {subtitle ? (
                <p className="text-sm font-semibold text-white/90 sm:text-base">{subtitle}</p>
            ) : null}
            <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl lg:text-5xl">{title}</h1>
            {children ? <div className="mt-4">{children}</div> : null}
        </section>
    )
}
