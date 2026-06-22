'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import axios from '@/lib/axios'
import ClientPageHeader from '@/components/client/ClientPageHeader'
import RankingTrendChart from '@/components/client/RankingTrendChart'
import { normalizeWeekdayColorMode, weekColorForWeekday } from '@/lib/weekdayUi'
import { themeTokens, useClientTheme } from '../ClientThemeContext'

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export default function DashboardPage() {
    const [home, setHome] = useState(null)
    const [routineItems, setRoutineItems] = useState([])
    const [loading, setLoading] = useState(true)
    const { darkMode } = useClientTheme()
    const t = darkMode ? themeTokens.dark : themeTokens.light

    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                const [{ data: homeRes }, { data: routineRes }] = await Promise.all([
                    axios.get('/client/home'),
                    axios.get('/client/routine'),
                ])
                if (!mounted) return
                setHome(homeRes?.data || null)
                setRoutineItems(routineRes?.data?.items || [])
            } finally {
                if (mounted) setLoading(false)
            }
        })()
        return () => {
            mounted = false
        }
    }, [])

    const weekItems = (routineItems || []).slice(0, 7).map(item => ({
        weekday: item.weekday,
        weekdayLabel: dayNames[item.weekday] || item.weekday_label || `Día ${item.weekday}`,
        date: item.date,
        status: item.is_paid ? 'Entrenamiento' : 'Descanso',
    }))
    const rankingTop10 = [...(home?.ranking || [])]
        .sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0))
        .slice(0, 10)
    const trendWeekdays = home?.ranking_trends?.weekdays || []
    const trendSeries = home?.ranking_trends?.series || []
    const weekdayColorMode = normalizeWeekdayColorMode(home?.profile?.weekday_color_mode)

    if (loading) return <p className="text-sm text-gray-500">Cargando...</p>

    return (
        <div className="space-y-6 lg:space-y-8">
            <ClientPageHeader title="Tu panel">
                <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-4 py-1.5 text-sm font-bold text-gray-700">Resumen</span>
                    <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold text-white">Ranking</span>
                </div>
            </ClientPageHeader>

            {home?.active_plan ? (
                <section className={`rounded-2xl p-5 sm:p-6 ${t.card}`}>
                    <p className={`text-sm font-semibold ${t.textSub}`}>Plan actual</p>
                    <h3 className="text-2xl font-black sm:text-3xl">{home.active_plan.plan_name}</h3>
                    <p className={`mt-1 text-sm ${t.textSub}`}>
                        {home.active_plan.days_per_week} día(s) por semana
                    </p>
                    {(home.active_plan.paid_day_slots || []).length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {home.active_plan.paid_day_slots.map(slot => (
                                <li
                                    key={`${slot.weekday}-${slot.date}`}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${t.cardMuted}`}
                                >
                                    {slot.label || slot.label_short} ·{' '}
                                    {slot.date
                                        ? new Date(`${slot.date}T12:00:00`).toLocaleDateString('es-MX', {
                                              weekday: 'short',
                                              day: 'numeric',
                                              month: 'short',
                                          })
                                        : '—'}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className={`mt-2 text-xs ${t.textSub}`}>Sin días pagados registrados.</p>
                    )}
                </section>
            ) : null}

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { title: 'Activo', value: `${home?.metrics?.active_percent || 0}%`, sub: 'semana' },
                    { title: 'Meta', value: `${home?.metrics?.meta_percent || 0}%`, sub: 'progreso' },
                ].map(card => (
                    <div
                        key={card.title}
                        className={`rounded-2xl bg-gradient-to-br p-5 sm:col-span-1 lg:col-span-2 ${
                            darkMode ? 'from-[#8A6F2A] to-[#4C442F]' : 'from-[#D9C37F] to-[#B89A58]'
                        }`}
                    >
                        <p className="text-sm text-white/90">{card.title}</p>
                        <p className="mt-1 text-3xl font-black text-white sm:text-4xl">{card.value}</p>
                        <p className="text-sm text-white/80">{card.sub}</p>
                    </div>
                ))}
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
                <section className={`rounded-2xl p-5 sm:p-6 ${t.card}`}>
                    <h2 className={`text-2xl font-black sm:text-3xl ${t.textMain}`}>Ranking semanal</h2>
                    <p className={`text-sm ${t.textSub}`}>Cada línea representa a un usuario del top 10</p>
                    <div className="mt-4 space-y-2">
                        <RankingTrendChart
                            weekdays={trendWeekdays}
                            series={trendSeries}
                            darkMode={darkMode}
                        />
                        {rankingTop10.map((entry, idx) => (
                            <div key={entry.id} className={`flex items-center justify-between rounded-xl p-3 ${t.cardMuted}`}>
                                <p className="font-semibold">
                                    {idx + 1}. {entry.name}
                                </p>
                                <p className={`text-lg font-black sm:text-xl ${t.accent}`}>{entry.score}%</p>
                            </div>
                        ))}
                        {(home?.ranking || []).length === 0 ? (
                            <div className={`rounded-xl p-3 text-sm ${t.cardMuted} ${t.textSub}`}>
                                Aún no hay datos de ranking semanal.
                            </div>
                        ) : null}
                    </div>
                </section>

                <section>
                    <h2 className={`text-2xl font-black sm:text-3xl ${t.textMain}`}>Tu semana</h2>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {weekItems.map(day => (
                            <Link
                                key={`${day.date}-${day.weekday}`}
                                href={`/rutina?date=${day.date}`}
                                className={`flex items-center justify-between rounded-xl p-4 transition hover:scale-[1.01] ${t.card}`}
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <span
                                        className={`h-10 w-1 shrink-0 rounded-full ${weekColorForWeekday(day.weekday, weekdayColorMode)}`}
                                    />
                                    <div className="min-w-0">
                                        <p className="truncate text-base font-bold sm:text-lg">{day.weekdayLabel}</p>
                                        <p className={`text-xs ${t.textSub}`}>
                                            {new Date(`${day.date}T12:00:00`).toLocaleDateString('es-MX', {
                                                day: 'numeric',
                                                month: 'short',
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <span className={`shrink-0 text-sm ${t.textSub}`}>{day.status}</span>
                            </Link>
                        ))}
                        {weekItems.length === 0 ? (
                            <div className={`rounded-xl p-4 text-sm ${t.cardMuted} ${t.textSub}`}>
                                Aún no hay días de rutina para mostrar.
                            </div>
                        ) : null}
                    </div>
                </section>
            </div>
        </div>
    )
}
