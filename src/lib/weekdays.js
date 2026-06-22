/** Días de la semana alineados con el API (0 = domingo … 6 = sábado). */
export const WEEKDAYS = [
    { id: 1, short: 'Lun', name: 'Lunes' },
    { id: 2, short: 'Mar', name: 'Martes' },
    { id: 3, short: 'Mié', name: 'Miércoles' },
    { id: 4, short: 'Jue', name: 'Jueves' },
    { id: 5, short: 'Vie', name: 'Viernes' },
    { id: 6, short: 'Sáb', name: 'Sábado' },
    { id: 0, short: 'Dom', name: 'Domingo' },
]

const ORDERED_IDS = WEEKDAYS.map(d => d.id)

export function defaultWeekdays(count) {
    return ORDERED_IDS.slice(0, Math.min(7, Math.max(0, count)))
}

export function weekdayLabel(id) {
    return WEEKDAYS.find(d => d.id === id)?.name ?? String(id)
}

/** Próxima fecha (hoy incluido) para ese weekday en la semana actual o siguiente. */
export function nextDateForWeekday(weekday, fromDate = new Date()) {
    const base = new Date(fromDate)
    base.setHours(12, 0, 0, 0)
    for (let i = 0; i < 14; i++) {
        const d = new Date(base)
        d.setDate(base.getDate() + i)
        if (d.getDay() === weekday) {
            return d
        }
    }
    return base
}

export function formatShortDate(date) {
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

export function syncSelectionToCount(current, targetCount) {
    const selected = [...current]
    if (selected.length > targetCount) {
        return ORDERED_IDS.filter(id => selected.includes(id)).slice(0, targetCount)
    }
    if (selected.length < targetCount) {
        for (const id of ORDERED_IDS) {
            if (selected.length >= targetCount) break
            if (!selected.includes(id)) selected.push(id)
        }
    }
    return ORDERED_IDS.filter(id => selected.includes(id))
}

export function todayIso() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

/** Días de la semana con un slot vigente (fecha >= hoy). */
export function weekdaysWithActiveSlot(slots = []) {
    const today = todayIso()
    return [
        ...new Set(
            slots.filter(s => (s.date || '') >= today).map(s => Number(s.weekday)),
        ),
    ]
}

export function uniqueWeekdaysFromSlots(slots = []) {
    return [...new Set(slots.map(s => Number(s.weekday)))].sort(
        (a, b) => ORDERED_IDS.indexOf(a) - ORDERED_IDS.indexOf(b),
    )
}

/** Semanas del mes (1–7, 8–14, …). Oculta semanas ya pasadas por completo. */
export function weeksOfMonth(refDate = new Date()) {
    const year = refDate.getFullYear()
    const month = refDate.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    const today = todayIso()
    const monthShort = refDate.toLocaleDateString('es-MX', { month: 'short' })
    const weeks = []

    for (let i = 0; i < 4; i++) {
        const startDay = i * 7 + 1
        const endDay = Math.min((i + 1) * 7, lastDay)
        if (startDay > lastDay) break

        const start = toIsoDate(new Date(year, month, startDay, 12, 0, 0, 0))
        const end = toIsoDate(new Date(year, month, endDay, 12, 0, 0, 0))
        if (end < today) continue

        weeks.push({
            number: i + 1,
            start,
            end,
            title: `Semana ${i + 1}`,
            subtitle: `${startDay}–${endDay} ${monthShort}`,
        })
    }

    return weeks
}

/** Fecha de ese weekday dentro del rango de la semana, solo si es hoy o futuro. */
export function weekdayDateInWeek(weekday, startIso, endIso) {
    const today = todayIso()
    const cur = new Date(`${startIso}T12:00:00`)
    const end = new Date(`${endIso}T12:00:00`)

    while (cur <= end) {
        if (cur.getDay() === weekday) {
            const iso = toIsoDate(cur)
            return iso >= today ? iso : null
        }
        cur.setDate(cur.getDate() + 1)
    }

    return null
}

/** Fechas >= hoy de ese weekday en el mes calendario actual. */
export function datesForWeekdayInMonth(weekday, refDate = new Date()) {
    const today = todayIso()
    const year = refDate.getFullYear()
    const month = refDate.getMonth()
    const lastDay = new Date(year, month + 1, 0).getDate()
    const out = []
    for (let day = 1; day <= lastDay; day++) {
        const d = new Date(year, month, day, 12, 0, 0, 0)
        if (d.getDay() !== weekday) continue
        const iso = toIsoDate(d)
        if (iso >= today) out.push(iso)
    }
    return out
}

export function monthLabel(refDate = new Date()) {
    return refDate.toLocaleDateString('es-MX', { month: 'long' })
}

export function defaultSlotsForCount(count, refDate = new Date()) {
    const slots = []
    for (const weekday of defaultWeekdays(count)) {
        const dates = datesForWeekdayInMonth(weekday, refDate)
        if (dates[0]) slots.push({ weekday, date: dates[0] })
    }
    return slots
}

export function syncSlotsToWeekdayCount(slots, targetCount) {
    const unique = uniqueWeekdaysFromSlots(slots)
    const keep = ORDERED_IDS.filter(id => unique.includes(id)).slice(0, targetCount)
    let next = slots.filter(s => keep.includes(s.weekday))
    for (const weekday of ORDERED_IDS) {
        if (keep.length >= targetCount) break
        if (!keep.includes(weekday)) {
            keep.push(weekday)
            const dates = datesForWeekdayInMonth(weekday)
            if (dates[0]) next.push({ weekday, date: dates[0] })
        }
    }
    const finalKeep = keep.slice(0, targetCount)
    return next.filter(s => finalKeep.includes(s.weekday))
}

function toIsoDate(d) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

export function toggleWeekday(selected, weekday, maxCount) {
    if (selected.includes(weekday)) {
        return selected.filter(id => id !== weekday)
    }
    if (selected.length >= maxCount) {
        return selected
    }
    return [...selected, weekday].sort((a, b) => ORDERED_IDS.indexOf(a) - ORDERED_IDS.indexOf(b))
}
