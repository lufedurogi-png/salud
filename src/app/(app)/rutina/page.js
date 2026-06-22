'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import axios from '@/lib/axios'
import ClientPageHeader from '@/components/client/ClientPageHeader'
import { normalizeWeekdayColorMode, weekColorForWeekday, weekdayBadgeClass } from '@/lib/weekdayUi'
import { themeTokens, useClientTheme } from '../ClientThemeContext'

function formatDateLabel(iso) {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    })
}

export default function RutinaPage() {
    const [items, setItems] = useState([])
    const [monthLabel, setMonthLabel] = useState('')
    const [loading, setLoading] = useState(true)
    const [savingDate, setSavingDate] = useState(null)
    const [highlightDate, setHighlightDate] = useState(null)
    const [weekdayColorMode, setWeekdayColorMode] = useState('multi')
    const { darkMode } = useClientTheme()
    const searchParams = useSearchParams()
    const t = darkMode ? themeTokens.dark : themeTokens.light

    useEffect(() => {
        setLoading(true)
        axios
            .get('/client/routine')
            .then(({ data }) => {
                setItems(data?.data?.items || [])
                setMonthLabel(data?.data?.month || '')
                setWeekdayColorMode(normalizeWeekdayColorMode(data?.data?.weekday_color_mode))
            })
            .catch(() => setItems([]))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        const targetDate = searchParams.get('date')
        if (!targetDate || items.length === 0) return
        setHighlightDate(targetDate)
        const el = document.getElementById(`routine-day-${targetDate}`)
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        const timer = setTimeout(() => setHighlightDate(null), 1800)
        return () => clearTimeout(timer)
    }, [searchParams, items])

    const toggleComplete = async (item) => {
        if (!item.is_paid || savingDate) return
        setSavingDate(item.date)
        try {
            await axios.post(`/client/routine/date/${item.date}/completion`, {
                is_completed: !item.is_completed,
            })
            setItems(prev =>
                prev.map(row =>
                    row.date === item.date ? { ...row, is_completed: !item.is_completed } : row,
                ),
            )
        } finally {
            setSavingDate(null)
        }
    }

    return (
        <div className="space-y-6 lg:space-y-8">
            <ClientPageHeader
                title="Mi rutina"
                subtitle={
                    monthLabel
                        ? `Calendario de ${monthLabel} — días pagados con tu plan y descansos del mes`
                        : 'Tus entrenamientos asignados por el entrenador'
                }
            />

            {loading ? (
                <div className={`rounded-2xl p-8 text-center text-sm ${t.cardMuted}`}>Cargando rutina…</div>
            ) : items.length === 0 ? (
                <div className={`rounded-2xl border-2 border-dashed p-10 text-center ${t.card}`}>
                    <p className={`text-lg font-bold ${t.textMain}`}>Sin fechas este mes</p>
                    <p className={`mt-2 text-sm ${t.textSub}`}>
                        Compra un plan en la tienda para ver tus días de entrenamiento aquí.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {items.map(item => {
                        const barColor = weekColorForWeekday(item.weekday, weekdayColorMode)
                        const badgeClass = weekdayBadgeClass(item.weekday, weekdayColorMode)
                        const isRest = !item.is_paid

                        return (
                            <article
                                key={item.date}
                                id={`routine-day-${item.date}`}
                                className={`overflow-hidden rounded-2xl ${t.card} ${
                                    isRest ? 'opacity-90' : ''
                                } ${highlightDate === item.date ? 'ring-2 ring-[#B7962D] ring-offset-2' : ''}`}
                            >
                                <div className="flex items-stretch">
                                    <span className={`w-1.5 shrink-0 sm:w-2 ${barColor}`} aria-hidden />
                                    <div className="min-w-0 flex-1 p-4 sm:p-5">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-black ${badgeClass}`}
                                                    >
                                                        {item.weekday_short}
                                                    </span>
                                                    <p className={`text-lg font-black capitalize ${t.textMain}`}>
                                                        {formatDateLabel(item.date)}
                                                    </p>
                                                </div>
                                                <p className={`mt-1 text-sm ${t.textSub}`}>
                                                    {isRest
                                                        ? item.status_detail || 'Sin actividad'
                                                        : item.focus
                                                          ? `Enfoque: ${item.focus}`
                                                          : 'Entrenamiento programado'}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end gap-2">
                                                <span
                                                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                                                        isRest
                                                            ? darkMode
                                                                ? 'bg-gray-700 text-gray-300'
                                                                : 'bg-gray-100 text-gray-600'
                                                            : darkMode
                                                              ? 'bg-emerald-900/40 text-emerald-300'
                                                              : 'bg-emerald-50 text-emerald-800'
                                                    }`}
                                                >
                                                    {isRest ? 'Descanso' : item.status}
                                                </span>
                                                {!isRest ? (
                                                    <button
                                                        type="button"
                                                        disabled={savingDate === item.date}
                                                        onClick={() => toggleComplete(item)}
                                                        className={`rounded-xl px-3 py-1.5 text-xs font-black transition-colors disabled:opacity-50 ${
                                                            item.is_completed
                                                                ? 'bg-emerald-500 text-white'
                                                                : darkMode
                                                                  ? 'bg-gray-700 text-gray-200'
                                                                  : 'bg-gray-200 text-gray-800'
                                                        }`}
                                                    >
                                                        {item.is_completed ? 'Completado ✓' : 'Marcar hecho'}
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>

                                        {!isRest && item.coach_comments ? (
                                            <div
                                                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                                                    darkMode
                                                        ? 'border-amber-800/40 bg-amber-950/20 text-amber-100'
                                                        : 'border-amber-200 bg-amber-50/80 text-amber-950'
                                                }`}
                                            >
                                                <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                                                    Comentarios del entrenador
                                                </p>
                                                <p className="mt-1 whitespace-pre-wrap">{item.coach_comments}</p>
                                            </div>
                                        ) : null}

                                        {!isRest && (item.rows || []).length > 0 ? (
                                            <div className="mt-4">
                                                <p
                                                    className={`mb-2 text-xs font-bold uppercase tracking-wide ${t.textSub}`}
                                                >
                                                    Ejercicios
                                                </p>
                                                <div
                                                    className={`overflow-hidden rounded-xl border ${
                                                        darkMode ? 'border-gray-700' : 'border-[#E5DECF]'
                                                    }`}
                                                >
                                                    <table className="w-full min-w-[420px] text-left text-sm">
                                                        <thead>
                                                            <tr
                                                                className={`text-xs font-bold uppercase ${t.cardMuted}`}
                                                            >
                                                                <th className="px-4 py-2.5">Ejercicio</th>
                                                                <th className="px-4 py-2.5">Detalle</th>
                                                                <th className="px-4 py-2.5">Video</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {item.rows.map((row, i) => (
                                                                <tr
                                                                    key={`${row.nombre}-${i}`}
                                                                    className={
                                                                        darkMode
                                                                            ? 'border-t border-gray-700'
                                                                            : 'border-t border-[#E5DECF]'
                                                                    }
                                                                >
                                                                    <td className="px-4 py-3 font-semibold">
                                                                        {row.nombre}
                                                                    </td>
                                                                    <td className={`px-4 py-3 ${t.textSub}`}>
                                                                        {row.reps || '—'}
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {row.video ? (
                                                                            <a
                                                                                href={row.video}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className={`font-semibold ${t.accent} hover:underline`}
                                                                            >
                                                                                YouTube
                                                                            </a>
                                                                        ) : (
                                                                            '—'
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : null}

                                        {!isRest &&
                                        (item.rows || []).length === 0 &&
                                        !item.coach_comments ? (
                                            <p className={`mt-4 text-sm italic ${t.textSub}`}>
                                                Tu entrenador aún no ha cargado la rutina de este día.
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
