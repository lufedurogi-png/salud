'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from '@/lib/axios'
import RankingTrendChart from '@/components/client/RankingTrendChart'
import { useDarkModePreference } from '@/hooks/useDarkModePreference'
import { adminMainCardClass, adminPanelClass, adminPanelHeadClass, ADMIN_GOLD } from '@/lib/adminUi'

function formatMesLabel(mes) {
    if (!mes) return '—'
    const [year, month] = String(mes).split('-')
    if (!year || !month) return mes
    const date = new Date(Number(year), Number(month) - 1, 1)
    if (Number.isNaN(date.getTime())) return mes
    return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
}

function rankBadgeClass(rank, darkMode) {
    if (rank === 1) {
        return darkMode
            ? 'bg-gradient-to-br from-[#D6B45B] to-[#8A6F2A] text-gray-900'
            : 'bg-gradient-to-br from-[#E5C978] to-[#B7962D] text-white'
    }
    if (rank <= 3) {
        return darkMode ? 'bg-[#6F5B2A]/50 text-[#E5C978]' : 'bg-[#F8F5EF] text-[#8A6F2A]'
    }
    return darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
}

export default function AdminHome() {
    const { darkMode } = useDarkModePreference()
    const [actividad, setActividad] = useState([])
    const [ranking, setRanking] = useState([])
    const [rankingTrends, setRankingTrends] = useState({ weekdays: [], series: [] })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let mounted = true
        ;(async () => {
            try {
                const [actividadRes, rankingRes] = await Promise.all([
                    axios.get('/admin/stats/actividad-usuarios'),
                    axios.get('/admin/stats/ranking'),
                ])
                if (!mounted) return
                setActividad(actividadRes?.data?.data || [])
                setRanking(rankingRes?.data?.data || [])
                setRankingTrends(rankingRes?.data?.ranking_trends || { weekdays: [], series: [] })
            } catch (e) {
                if (!mounted) return
                setError(e?.response?.data?.message || 'No se pudo cargar admin-home.')
            } finally {
                if (mounted) setLoading(false)
            }
        })()
        return () => {
            mounted = false
        }
    }, [])

    const actividadStats = useMemo(() => {
        const totalRegistros = actividad.reduce((sum, row) => sum + Number(row.registros || 0), 0)
        const totalLogins = actividad.reduce((sum, row) => sum + Number(row.logins || 0), 0)
        const maxValor = Math.max(
            1,
            ...actividad.flatMap(row => [Number(row.registros || 0), Number(row.logins || 0)])
        )
        return { totalRegistros, totalLogins, maxValor }
    }, [actividad])

    const rankingTop10 = [...ranking]
        .sort((a, b) => Number(b?.score || 0) - Number(a?.score || 0))
        .slice(0, 10)

    const panel = adminPanelClass(darkMode)
    const panelHead = adminPanelHeadClass(darkMode, 'px-5 py-4 sm:px-6')
    const card = adminMainCardClass(darkMode)
    const textMain = darkMode ? 'text-gray-100' : 'text-gray-900'
    const textSub = darkMode ? 'text-gray-400' : 'text-gray-600'
    const rowMuted = darkMode
        ? 'border-gray-700 bg-gray-900/40'
        : 'border-[#E5DECF] bg-[#FBF8F2]'

    return (
        <div className="space-y-8">
            <header>
                <h1 className={`text-2xl font-black sm:text-3xl ${textMain}`}>Panel de inicio</h1>
                <p className={`mt-1 text-sm ${textSub}`}>
                    Resumen de actividad y ranking semanal de clientes
                </p>
            </header>

            {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                </div>
            ) : null}

            <section className={panel}>
                <div className={panelHead}>
                    <h2 className="text-xl font-black text-[#B7962D] dark:text-[#E5C978] sm:text-2xl">
                        Actividad de usuarios
                    </h2>
                    <p className={`mt-1 text-sm ${textSub}`}>
                        Registros nuevos e inicios de sesión por mes
                    </p>
                </div>

                <div className="p-5 sm:p-6">
                    {loading ? (
                        <p className={`text-sm ${textSub}`}>Cargando actividad...</p>
                    ) : actividad.length === 0 ? (
                        <div className={`rounded-xl border px-4 py-8 text-center text-sm ${rowMuted} ${textSub}`}>
                            Aún no hay datos de actividad registrados.
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {[
                                    {
                                        label: 'Registros totales',
                                        value: actividadStats.totalRegistros,
                                        accent: ADMIN_GOLD.primary,
                                    },
                                    {
                                        label: 'Inicios de sesión',
                                        value: actividadStats.totalLogins,
                                        accent: '#3B82F6',
                                    },
                                    {
                                        label: 'Meses con datos',
                                        value: actividad.length,
                                        accent: '#10B981',
                                    },
                                ].map(item => (
                                    <div
                                        key={item.label}
                                        className={`rounded-xl border p-4 ${rowMuted}`}
                                    >
                                        <p className={`text-xs font-semibold uppercase tracking-wide ${textSub}`}>
                                            {item.label}
                                        </p>
                                        <p
                                            className="mt-1 text-3xl font-black tabular-nums"
                                            style={{ color: item.accent }}
                                        >
                                            {item.value}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 space-y-3">
                                <div className={`hidden gap-4 px-1 text-xs font-bold uppercase tracking-wide sm:grid sm:grid-cols-[140px_1fr_1fr] ${textSub}`}>
                                    <span>Mes</span>
                                    <span>Registros</span>
                                    <span>Inicios de sesión</span>
                                </div>

                                {[...actividad].reverse().map(row => {
                                    const registros = Number(row.registros || 0)
                                    const logins = Number(row.logins || 0)
                                    const regPct = (registros / actividadStats.maxValor) * 100
                                    const loginPct = (logins / actividadStats.maxValor) * 100

                                    return (
                                        <div
                                            key={row.mes}
                                            className={`rounded-xl border p-4 ${rowMuted}`}
                                        >
                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                <p className={`font-bold capitalize ${textMain}`}>
                                                    {formatMesLabel(row.mes)}
                                                </p>
                                                <span className={`text-xs ${textSub}`}>{row.mes}</span>
                                            </div>

                                            <div className="space-y-3">
                                                <div>
                                                    <div className="mb-1 flex items-center justify-between text-xs">
                                                        <span className={textSub}>Registros</span>
                                                        <span className="font-bold text-[#B7962D] dark:text-[#E5C978]">
                                                            {registros}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={`h-2.5 overflow-hidden rounded-full ${
                                                            darkMode ? 'bg-gray-700' : 'bg-gray-200'
                                                        }`}
                                                    >
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-[#B7962D] to-[#D6B45B] transition-all"
                                                            style={{ width: `${regPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="mb-1 flex items-center justify-between text-xs">
                                                        <span className={textSub}>Inicios de sesión</span>
                                                        <span className="font-bold text-blue-600 dark:text-blue-400">
                                                            {logins}
                                                        </span>
                                                    </div>
                                                    <div
                                                        className={`h-2.5 overflow-hidden rounded-full ${
                                                            darkMode ? 'bg-gray-700' : 'bg-gray-200'
                                                        }`}
                                                    >
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                                                            style={{ width: `${loginPct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </section>

            <section className={card}>
                <h2 className={`text-2xl font-black sm:text-3xl ${textMain}`}>Ranking de clientes</h2>
                <p className={`mt-1 text-sm ${textSub}`}>
                    Top 10 de la semana · cada línea es un cliente
                </p>

                {loading ? (
                    <p className={`mt-4 text-sm ${textSub}`}>Cargando ranking...</p>
                ) : (
                    <div className="mt-5 space-y-4">
                        <RankingTrendChart
                            weekdays={rankingTrends.weekdays || []}
                            series={rankingTrends.series || []}
                            darkMode={darkMode}
                        />

                        {rankingTop10.length > 0 ? (
                            <div className="space-y-2">
                                {rankingTop10.map((entry, idx) => {
                                    const rank = idx + 1
                                    return (
                                        <div
                                            key={entry.id}
                                            className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${rowMuted}`}
                                        >
                                            <span
                                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${rankBadgeClass(rank, darkMode)}`}
                                            >
                                                {rank}
                                            </span>
                                            <p className={`min-w-0 flex-1 truncate font-semibold ${textMain}`}>
                                                {entry.name}
                                            </p>
                                            <p className="shrink-0 text-lg font-black text-[#B7962D] dark:text-[#E5C978]">
                                                {entry.score}%
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className={`rounded-xl border px-4 py-6 text-center text-sm ${rowMuted} ${textSub}`}>
                                Aún no hay datos de ranking semanal.
                            </div>
                        )}
                    </div>
                )}
            </section>
        </div>
    )
}
