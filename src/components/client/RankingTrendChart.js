'use client'

import { useMemo, useState } from 'react'

const CHART_WIDTH = 680
const CHART_HEIGHT = 280
const PADDING_X = 40
const PADDING_TOP = 24
const PADDING_BOTTOM = 40
const PLOT_HEIGHT = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM

const LINE_PALETTE = [
    '#B7962D',
    '#3B82F6',
    '#EF4444',
    '#10B981',
    '#8B5CF6',
    '#F59E0B',
    '#EC4899',
    '#06B6D4',
    '#84CC16',
    '#F97316',
]

function xForIndex(idx, total) {
    if (total <= 1) return CHART_WIDTH / 2
    return PADDING_X + (idx * (CHART_WIDTH - PADDING_X * 2)) / (total - 1)
}

export default function RankingTrendChart({ weekdays = [], series = [], darkMode = false }) {
    const [tooltip, setTooltip] = useState(null)

    const lines = useMemo(() => {
        const totalDays = weekdays.length || 7
        return (series || []).slice(0, 10).map((user, userIdx) => {
            const points = (user.points || []).map((point, idx) => {
                const value = Math.max(0, Math.min(100, Number(point.value || 0)))
                const x = xForIndex(idx, totalDays)
                const y = PADDING_TOP + (1 - value / 100) * PLOT_HEIGHT
                return {
                    ...point,
                    value,
                    x,
                    y,
                    leftPct: (x / CHART_WIDTH) * 100,
                    topPct: (y / CHART_HEIGHT) * 100,
                }
            })
            const path = points
                .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
                .join(' ')

            return {
                id: user.id ?? userIdx,
                rank: user.rank ?? userIdx + 1,
                name: user.name || `Usuario ${userIdx + 1}`,
                score: user.score ?? 0,
                color: LINE_PALETTE[userIdx % LINE_PALETTE.length],
                points,
                path,
            }
        })
    }, [series, weekdays.length])

    const showTooltip = payload => {
        setTooltip(payload)
    }

    if (lines.length === 0) {
        return (
            <div
                className={`rounded-xl p-6 text-center text-sm ${
                    darkMode ? 'bg-gray-900/50 text-gray-400' : 'bg-[#FBF8F2] text-gray-600'
                }`}
            >
                Aún no hay usuarios en el ranking semanal.
            </div>
        )
    }

    return (
        <div className={`rounded-xl p-3 ${darkMode ? 'bg-gray-900/50' : 'bg-[#FBF8F2]'}`}>
            <div className="relative h-72 w-full">
                <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-full w-full">
                    {[0, 25, 50, 75, 100].map(v => {
                        const y = PADDING_TOP + (1 - v / 100) * PLOT_HEIGHT
                        return (
                            <g key={`grid-${v}`}>
                                <line
                                    x1={PADDING_X}
                                    y1={y}
                                    x2={CHART_WIDTH - PADDING_X}
                                    y2={y}
                                    stroke={darkMode ? '#374151' : '#D1D5DB'}
                                    strokeWidth="1"
                                />
                                <text
                                    x={8}
                                    y={y + 4}
                                    fill={darkMode ? '#9CA3AF' : '#6B7280'}
                                    style={{ fontSize: 10, fontWeight: 700 }}
                                >
                                    {v}%
                                </text>
                            </g>
                        )
                    })}

                    {lines.map(line => (
                        <g key={`line-${line.id}`} opacity={tooltip && tooltip.lineId !== line.id ? 0.35 : 1}>
                            <path
                                d={line.path}
                                fill="none"
                                stroke={line.color}
                                strokeWidth={lines.length > 6 ? 2 : 2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {line.points.map(point => (
                                <g key={`pt-${line.id}-${point.weekday}`}>
                                    <circle
                                        cx={point.x}
                                        cy={point.y}
                                        r={14}
                                        fill="transparent"
                                        className="cursor-pointer"
                                        onMouseEnter={() =>
                                            showTooltip({
                                                lineId: line.id,
                                                rank: line.rank,
                                                name: line.name,
                                                label: point.label,
                                                value: point.value,
                                                color: line.color,
                                                leftPct: point.leftPct,
                                                topPct: point.topPct,
                                            })
                                        }
                                        onMouseLeave={() => setTooltip(null)}
                                    />
                                    <circle
                                        cx={point.x}
                                        cy={point.y}
                                        r={point.value > 0 ? 4.5 : 3}
                                        fill={line.color}
                                        stroke={darkMode ? '#111827' : '#fff'}
                                        strokeWidth="1.5"
                                        pointerEvents="none"
                                    />
                                </g>
                            ))}
                        </g>
                    ))}

                    {weekdays.map((d, idx) => (
                        <text
                            key={`wk-${d.weekday}`}
                            x={xForIndex(idx, weekdays.length)}
                            y={CHART_HEIGHT - 10}
                            textAnchor="middle"
                            fill={darkMode ? '#D1D5DB' : '#4B5563'}
                            style={{ fontSize: 11, fontWeight: 700 }}
                        >
                            {d.label}
                        </text>
                    ))}
                </svg>

                {tooltip ? (
                    <div
                        className={`pointer-events-none absolute z-20 min-w-[140px] rounded-lg border px-3 py-2 shadow-lg ${
                            darkMode
                                ? 'border-gray-600 bg-gray-800 text-gray-100'
                                : 'border-[#E5DECF] bg-white text-gray-900'
                        }`}
                        style={{
                            left: `${tooltip.leftPct}%`,
                            top: `${tooltip.topPct}%`,
                            transform: 'translate(-50%, calc(-100% - 12px))',
                        }}
                    >
                        <p className="text-[11px] font-black" style={{ color: tooltip.color }}>
                            #{tooltip.rank} · Top 10
                        </p>
                        <p className="truncate text-sm font-bold">{tooltip.name}</p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {tooltip.label}: {tooltip.value}%
                        </p>
                    </div>
                ) : null}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {lines.map(line => (
                    <div
                        key={`legend-${line.id}`}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 transition ${
                            darkMode ? 'border-gray-700 bg-gray-900/40' : 'border-[#E5DECF] bg-white'
                        } ${tooltip?.lineId === line.id ? 'ring-2 ring-[#B7962D]/60' : ''}`}
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: line.color }}
                            />
                            <p className="truncate text-xs font-bold">#{line.rank} {line.name}</p>
                        </div>
                        <span
                            className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${
                                darkMode ? 'bg-[#6F5B2A]/45 text-[#E5C978]' : 'bg-[#F8F5EF] text-[#8A6F2A]'
                            }`}
                        >
                            {line.score}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}
