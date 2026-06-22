export const weekColors = [
    'bg-red-500',
    'bg-yellow-500',
    'bg-green-400',
    'bg-blue-400',
    'bg-purple-400',
    'bg-pink-400',
    'bg-cyan-400',
]

export const WEEKDAY_COLOR_MULTI = 'multi'
export const WEEKDAY_COLOR_NEUTRAL = 'neutral'

export const WEEKDAY_COLOR_MODE_OPTIONS = [
    { value: WEEKDAY_COLOR_MULTI, label: 'Varios colores' },
    { value: WEEKDAY_COLOR_NEUTRAL, label: 'Neutro' },
]

export function normalizeWeekdayColorMode(mode) {
    return mode === WEEKDAY_COLOR_NEUTRAL ? WEEKDAY_COLOR_NEUTRAL : WEEKDAY_COLOR_MULTI
}

/** Barra lateral / punto de color por día de la semana. */
export function weekColorForWeekday(weekday, mode = WEEKDAY_COLOR_MULTI) {
    if (normalizeWeekdayColorMode(mode) === WEEKDAY_COLOR_NEUTRAL) {
        return 'bg-[#EDE6D6] dark:bg-[#6F5B2A]/45'
    }
    return weekColors[Number(weekday) % 7] || weekColors[0]
}

/** Badge con texto (rutina): en neutro evita texto blanco sobre fondo claro. */
export function weekdayBadgeClass(weekday, mode = WEEKDAY_COLOR_MULTI) {
    if (normalizeWeekdayColorMode(mode) === WEEKDAY_COLOR_NEUTRAL) {
        return 'bg-[#F0EBE0] text-[#6F5B2A] dark:bg-[#6F5B2A]/50 dark:text-[#E5DECF]'
    }
    return `${weekColorForWeekday(weekday, mode)} text-white`
}
