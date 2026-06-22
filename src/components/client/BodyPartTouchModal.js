'use client'

import { themeTokens } from '@/app/(app)/ClientThemeContext'

export default function BodyPartTouchModal({ part, darkMode }) {
    if (!part) return null

    const t = darkMode ? themeTokens.dark : themeTokens.light

    return (
        <div
            className="pointer-events-none absolute right-3 top-14 z-20 w-[min(100%-1.5rem,14rem)] transition-all duration-200 sm:right-4 sm:top-16"
            role="status"
            aria-live="polite"
        >
            <div
                className={`overflow-hidden rounded-xl border shadow-lg backdrop-blur-md ${
                    darkMode
                        ? 'border-[#B7962D]/40 bg-[#1F2937]/95 shadow-black/40'
                        : 'border-[#C9A84C]/50 bg-white/95 shadow-[#9B8242]/15'
                }`}
            >
                <div className={`bg-gradient-to-r px-3 py-2 ${t.header}`}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/80">
                        Zona seleccionada
                    </p>
                    <h3 className="text-sm font-black text-white">{part.label}</h3>
                </div>
                <div className="space-y-2 px-3 py-2">
                    <p className={`text-xs leading-snug ${t.textSub}`}>{part.description}</p>
                    <div>
                        <p className={`mb-1 text-[10px] font-bold uppercase tracking-wide ${t.accent}`}>
                            Ejercicios sugeridos
                        </p>
                        <ul className="space-y-1">
                            {part.exercises.map(exercise => (
                                <li
                                    key={exercise}
                                    className={`flex gap-1.5 text-xs leading-snug ${t.textMain}`}
                                >
                                    <span
                                        className={`mt-1 h-1 w-1 shrink-0 rounded-full ${t.accentBg}`}
                                        aria-hidden
                                    />
                                    {exercise}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
