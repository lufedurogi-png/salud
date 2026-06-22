'use client'

import {
    WEEKDAYS,
    formatShortDate,
    todayIso,
    weekdayDateInWeek,
    weeksOfMonth,
} from '@/lib/weekdays'

/**
 * Selector por semanas del mes: botones Semana 1…4 y, al expandir, fechas por día.
 * mode "plan": solo weekdays ya elegidos arriba.
 * mode "extra": todos los días con fecha libre (no en bookedDates).
 */
export default function MonthWeekDatePicker({
    darkMode,
    t,
    expandedWeek,
    onToggleWeek,
    selectedWeekdayTypes = [],
    slots = [],
    onToggleDate,
    mode = 'plan',
    bookedDates = new Set(),
    summaryCount = 0,
}) {
    const weeks = weeksOfMonth()
    const today = todayIso()

    const chipClass = on =>
        on
            ? darkMode
                ? 'border-[#B7962D] bg-amber-950/50 text-amber-100'
                : 'border-[#C9A84C] bg-[#FDF8EE] text-[#5C4A1F]'
            : darkMode
              ? 'border-gray-600 text-gray-400 hover:border-gray-500'
              : 'border-[#E5DECF] text-gray-600 hover:border-[#C9A84C]/50'

    const weekBtnClass = (active, disabled) => {
        if (disabled) {
            return darkMode
                ? 'border-gray-700 bg-gray-800/40 text-gray-600 cursor-not-allowed'
                : 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
        }
        if (active) {
            return darkMode
                ? 'border-[#B7962D] bg-amber-950/40 text-amber-100'
                : 'border-[#C9A84C] bg-[#FDF8EE] text-[#5C4A1F]'
        }
        return darkMode
            ? 'border-gray-600 bg-gray-800/60 text-gray-300 hover:border-[#B7962D]'
            : 'border-[#E5DECF] bg-white text-gray-700 hover:border-[#C9A84C]'
    }

    const weekdaysToShow =
        mode === 'extra' ? WEEKDAYS : WEEKDAYS.filter(d => selectedWeekdayTypes.includes(d.id))

    const chipsForWeek = week => {
        const items = []
        for (const { id, short } of weekdaysToShow) {
            const date = weekdayDateInWeek(id, week.start, week.end)
            if (!date || date < today) continue
            if (mode === 'extra' && bookedDates.has(date)) continue

            const on =
                mode === 'extra'
                    ? slots.some(s => s.weekday === id && s.date === date)
                    : slots.some(s => s.weekday === id && s.date === date)

            items.push({ weekday: id, short, date, on })
        }
        return items
    }

    if (weeks.length === 0) {
        return (
            <p className={`mt-2 text-xs ${t.textSub}`}>
                No quedan semanas disponibles este mes.
            </p>
        )
    }

    return (
        <div className="mt-3">
            <p className={`text-[10px] font-bold uppercase tracking-wide ${t.textSub}`}>
                Fechas del mes
            </p>
            <p className={`mt-0.5 text-[11px] ${t.textSub}`}>
                Elige una semana para ver y marcar los días con su fecha.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
                {weeks.map(week => {
                    const open = expandedWeek === week.number
                    const hasChips = chipsForWeek(week).length > 0
                    return (
                        <button
                            key={week.number}
                            type="button"
                            disabled={!hasChips && mode === 'plan' && selectedWeekdayTypes.length > 0}
                            onClick={() => onToggleWeek(week.number)}
                            className={`shrink-0 rounded-xl border-2 px-2.5 py-2 text-left text-[10px] font-bold transition-all sm:px-3 ${weekBtnClass(open, false)}`}
                        >
                            <span className="block">{week.title}</span>
                            <span className="mt-0.5 block font-normal opacity-80">({week.subtitle})</span>
                        </button>
                    )
                })}
            </div>
            {expandedWeek != null ? (
                (() => {
                    const week = weeks.find(w => w.number === expandedWeek)
                    if (!week) return null
                    const chips = chipsForWeek(week)
                    if (chips.length === 0) {
                        return (
                            <p className={`mt-3 text-xs ${t.textSub}`}>
                                {mode === 'plan' && selectedWeekdayTypes.length === 0
                                    ? 'Primero elige los tipos de día arriba.'
                                    : 'No hay fechas disponibles en esta semana.'}
                            </p>
                        )
                    }
                    return (
                        <div
                            className={`mt-3 rounded-xl border p-3 ${
                                darkMode ? 'border-gray-600 bg-gray-800/40' : 'border-[#E5DECF] bg-white/80'
                            }`}
                        >
                            <p className={`mb-2 text-[10px] font-semibold uppercase ${t.textSub}`}>
                                {week.title} · {week.subtitle}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {chips.map(({ weekday, short, date, on }) => (
                                    <button
                                        key={date}
                                        type="button"
                                        onClick={() => onToggleDate(weekday, date)}
                                        className={`min-w-[4.5rem] rounded-xl border-2 px-2 py-2 text-center transition-colors ${chipClass(on)}`}
                                    >
                                        <span className="block text-xs font-black">{short}</span>
                                        <span className="mt-0.5 block text-[10px] font-medium">
                                            {formatShortDate(new Date(`${date}T12:00:00`))}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )
                })()
            ) : null}
            {summaryCount > 0 ? (
                <p className={`mt-2 text-xs font-semibold ${t.accent}`}>
                    {summaryCount} fecha{summaryCount !== 1 ? 's' : ''} seleccionada
                    {summaryCount !== 1 ? 's' : ''} este mes
                </p>
            ) : null}
        </div>
    )
}
