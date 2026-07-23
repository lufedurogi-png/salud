'use client'

import { getPaginationWindow } from '@/lib/pagination'

/**
 * Paginador estilo « ‹ 1 2 … N › » con texto "Página X de Y · Z registros".
 */
export default function PaginationBar({
    page,
    totalPages,
    totalItems,
    onChange,
    darkMode = false,
    perPageLabel,
}) {
    if (totalPages <= 1 && totalItems <= 0) return null

    const { windowPages, showEllipsis, showLastPage } = getPaginationWindow(page, totalPages)
    const muted = darkMode
        ? 'border-gray-600 bg-gray-800 text-gray-500'
        : 'border-gray-200 bg-gray-50 text-gray-400'
    const idle = darkMode
        ? 'border-gray-600 bg-gray-800 text-gray-200 hover:border-[#B7962D]'
        : 'border-gray-300 bg-white text-gray-800 hover:border-[#B7962D]'
    const active = 'border-[#B7962D] bg-[#B7962D] text-white'

    const btn = (label, target, opts = {}) => {
        const disabled = Boolean(opts.disabled)
        const isActive = Boolean(opts.active)
        return (
            <button
                key={`${label}-${target ?? 'x'}`}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && target != null && onChange(target)}
                className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold transition-colors ${
                    disabled ? muted : isActive ? active : idle
                }`}
                aria-label={opts.aria}
                title={opts.aria}
            >
                {label}
            </button>
        )
    }

    return (
        <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center justify-center gap-1.5">
                {btn('«', 1, { disabled: page <= 1, aria: 'Primera página' })}
                {btn('‹', page - 1, { disabled: page <= 1, aria: 'Anterior' })}
                {windowPages.map(num => btn(String(num), num, { active: num === page, aria: `Página ${num}` }))}
                {showEllipsis ? (
                    <span className={`px-1 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>…</span>
                ) : null}
                {showLastPage && totalPages > 7 ? btn(String(totalPages), totalPages) : null}
                {btn('›', page + 1, { disabled: page >= totalPages, aria: 'Siguiente' })}
                {btn('»', totalPages, { disabled: page >= totalPages, aria: 'Última página' })}
            </div>
            <p className={`text-center text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Página {page} de {Math.max(1, totalPages)}
                {totalItems != null ? ` · ${totalItems} registro${totalItems !== 1 ? 's' : ''}` : ''}
                {perPageLabel ? ` · ${perPageLabel}` : ''}
            </p>
        </div>
    )
}
