'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from '@/lib/axios'
import { useDarkModePreference } from '@/hooks/useDarkModePreference'
import {
    formatShortDate,
    normalizeWeekdayColorMode,
    weekColorForWeekday,
    WEEKDAY_COLOR_MODE_OPTIONS,
    WEEKDAY_COLOR_NEUTRAL,
} from '@/lib/weekdayUi'
import {
    SEX_PRESET,
    SEX_PRESET_OPTIONS,
    parseSex,
    serializeSex,
} from '@/lib/sexProfile'

function emptyRow() {
    return { nombre: '', reps: '', video: '' }
}

function sessionDraftFromCliente(c, date) {
    const session = (c.sessions || []).find(s => s.date === date)
    return {
        focus: session?.focus || '',
        coach_comments: session?.coach_comments || '',
        rows: session?.rows?.length ? session.rows.map(r => ({ ...r })) : [emptyRow()],
    }
}

export default function AdminClientesPage() {
    const { darkMode } = useDarkModePreference()
    const [clientes, setClientes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [message, setMessage] = useState('')
    const [expandedClient, setExpandedClient] = useState(null)
    const [activeSessionDate, setActiveSessionDate] = useState({})
    const [drafts, setDrafts] = useState({})
    const [saving, setSaving] = useState(null)
    const [openSexPickerFor, setOpenSexPickerFor] = useState(null)

    const panel = darkMode
        ? 'rounded-2xl border-2 border-[#6F5B2A]/40 bg-gray-800 shadow-xl overflow-hidden'
        : 'rounded-2xl border-2 border-[#E5DECF]/90 bg-white shadow-xl overflow-hidden'
    const panelHead = darkMode
        ? 'bg-[#B7962D]/25 border-b-2 border-[#C9A84C]/40 px-5 py-4'
        : 'bg-[#F8F5EF] border-b-2 border-[#E5C978] px-5 py-4'
    const inputClass = darkMode
        ? 'w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white'
        : 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900'
    const sexTriggerClass = darkMode
        ? 'w-full rounded-xl border border-[#A88A2B]/60 bg-gray-900 px-3 py-2.5 text-left text-sm text-white shadow-sm transition hover:border-[#D6B45B] focus:outline-none focus:ring-2 focus:ring-[#B7962D]/30'
        : 'w-full rounded-xl border border-[#D8C087] bg-[#FBF8F2] px-3 py-2.5 text-left text-sm text-gray-900 shadow-sm transition hover:border-[#B7962D] focus:outline-none focus:ring-2 focus:ring-[#B7962D]/20'
    const sexMenuClass = darkMode
        ? 'absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[#8A6F2A] bg-gray-900 shadow-xl'
        : 'absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-[#D8C087] bg-white shadow-xl'

    const load = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const { data } = await axios.get('/admin/clientes')
            setClientes(data?.data || [])
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudieron cargar clientes.')
            setClientes([])
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const patchCliente = (id, updater) => {
        setClientes(prev => prev.map(c => (c.id === id ? updater(c) : c)))
    }

    const openSession = (c, date) => {
        const key = `${c.id}:${date}`
        setActiveSessionDate(prev => ({ ...prev, [c.id]: prev[c.id] === date ? null : date }))
        setDrafts(prev => ({
            ...prev,
            [key]: sessionDraftFromCliente(c, date),
        }))
    }

    const updateDraft = (clientId, date, updater) => {
        const key = `${clientId}:${date}`
        setDrafts(prev => ({
            ...prev,
            [key]: updater(prev[key] || sessionDraftFromCliente({ sessions: [] }, date)),
        }))
    }

    const saveProfile = async c => {
        setSaving(`profile-${c.id}`)
        setMessage('')
        setError('')
        try {
            await axios.put(`/admin/clientes/${c.id}/profile`, {
                weight_kg: c.profile?.weight_kg ?? null,
                height_cm: c.profile?.height_cm ?? null,
                sex: c.profile?.sex ?? null,
                measures: c.profile?.measures ?? null,
                age: c.profile?.age ?? null,
                metabolic_age: c.profile?.metabolic_age ?? null,
                weekday_color_mode: normalizeWeekdayColorMode(c.profile?.weekday_color_mode),
            })
            setMessage(`Datos físicos guardados para ${c.name}.`)
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudo guardar el perfil.')
        } finally {
            setSaving(null)
        }
    }

    const saveWeekdayColorMode = async (c, mode) => {
        const normalized = normalizeWeekdayColorMode(mode)
        const prev = normalizeWeekdayColorMode(c.profile?.weekday_color_mode)
        if (normalized === prev) return

        patchCliente(c.id, old => ({
            ...old,
            profile: { ...(old.profile || {}), weekday_color_mode: normalized },
        }))

        setSaving(`color-mode-${c.id}`)
        setMessage('')
        setError('')
        try {
            await axios.put(`/admin/clientes/${c.id}/profile`, {
                weekday_color_mode: normalized,
            })
            setMessage(
                normalized === WEEKDAY_COLOR_NEUTRAL
                    ? `Colores neutros activados para ${c.name}.`
                    : `Colores variados activados para ${c.name}.`,
            )
        } catch (e) {
            patchCliente(c.id, old => ({
                ...old,
                profile: { ...(old.profile || {}), weekday_color_mode: prev },
            }))
            setError(e?.response?.data?.message || 'No se pudo guardar la preferencia de colores.')
        } finally {
            setSaving(null)
        }
    }

    const saveSession = async (c, date) => {
        const key = `${c.id}:${date}`
        const draft = drafts[key]
        if (!draft) return
        setSaving(`session-${c.id}-${date}`)
        setMessage('')
        setError('')
        try {
            const rows = (draft.rows || []).filter(r => (r.nombre || '').trim())
            await axios.put(`/admin/clientes/${c.id}/routine-session/${date}`, {
                focus: draft.focus || '',
                coach_comments: draft.coach_comments || '',
                rows: rows.map(r => ({
                    nombre: r.nombre.trim(),
                    reps: r.reps || '',
                    video: r.video || '',
                })),
            })
            setMessage(`Rutina del ${formatShortDate(new Date(`${date}T12:00:00`))} guardada.`)
            await load()
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudo guardar la rutina.')
        } finally {
            setSaving(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className={panel}>
                <div className={panelHead}>
                    <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                        Clientes con plan activo
                    </h1>
                    <p className={`mt-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Edita perfil físico y asigna rutina por cada fecha pagada.
                    </p>
                </div>
            </div>

            {message ? (
                <div className="rounded-lg border border-[#E5DECF] bg-[#FBF8F2] px-4 py-3 text-sm text-[#8A6F2A] dark:border-[#8A6F2A] dark:bg-[#6F5B2A]/30 dark:text-[#E5DECF]">
                    {message}
                </div>
            ) : null}
            {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
                    {error}
                </div>
            ) : null}

            {loading ? (
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cargando clientes…</p>
            ) : clientes.length === 0 ? (
                <div className={`rounded-2xl border-2 border-dashed p-10 text-center ${panel}`}>
                    <p className={`font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        No hay clientes con plan activo
                    </p>
                    <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Cuando un cliente pague un plan, aparecerá aquí.
                    </p>
                </div>
            ) : (
                <div className="space-y-5">
                    {clientes.map(c => {
                        const slots = c.subscription?.paid_day_slots || []
                        const colorMode = normalizeWeekdayColorMode(c.profile?.weekday_color_mode)
                        const savingColorMode = saving === `color-mode-${c.id}`
                        const isOpen = expandedClient === c.id
                        const selectedDate = activeSessionDate[c.id]
                        const draftKey = selectedDate ? `${c.id}:${selectedDate}` : null
                        const draft = draftKey ? drafts[draftKey] : null

                        return (
                            <article key={c.id} className={panel}>
                                <div className={`p-5 ${panelHead}`}>
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h2 className={`text-xl font-black ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                                {c.name} {c.last_name || ''}
                                            </h2>
                                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {c.email}
                                            </p>
                                            <p className={`mt-1 text-sm font-semibold ${darkMode ? 'text-[#E5C978]' : 'text-[#A88A2B]'}`}>
                                                {c.subscription?.plan_name}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedClient(prev => (prev === c.id ? null : c.id))
                                            }
                                            className="rounded-xl bg-[#B7962D] px-4 py-2 text-sm font-bold text-white hover:bg-[#A88A2B]"
                                        >
                                            {isOpen ? 'Cerrar' : 'Gestionar'}
                                        </button>
                                    </div>
                                </div>

                                {isOpen ? (
                                    <div className="space-y-6 p-5">
                                        <section>
                                            <h3 className={`mb-3 text-sm font-bold uppercase tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                Datos físicos (se reflejan en perfil del cliente)
                                            </h3>
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                {[
                                                    ['weight_kg', 'Peso (kg)'],
                                                    ['height_cm', 'Estatura (cm)'],
                                                    ['measures', 'Medidas'],
                                                    ['age', 'Edad'],
                                                    ['metabolic_age', 'Edad metabólica'],
                                                ].map(([key, label]) => (
                                                    <label key={key} className="block">
                                                        <span className={`mb-1 block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            {label}
                                                        </span>
                                                        <input
                                                            type={key === 'measures' ? 'text' : 'number'}
                                                            value={c.profile?.[key] ?? ''}
                                                            onChange={e =>
                                                                patchCliente(c.id, old => ({
                                                                    ...old,
                                                                    profile: {
                                                                        ...(old.profile || {}),
                                                                        [key]: e.target.value,
                                                                    },
                                                                }))
                                                            }
                                                            className={inputClass}
                                                        />
                                                    </label>
                                                ))}
                                                {(() => {
                                                    const { preset, other } = parseSex(c.profile?.sex)
                                                    return (
                                                        <>
                                                            <label className="block">
                                                                <span className={`mb-1 block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                    Sexo
                                                                </span>
                                                                <div className="relative">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setOpenSexPickerFor(prev =>
                                                                                prev === c.id ? null : c.id,
                                                                            )
                                                                        }
                                                                        className={sexTriggerClass}
                                                                    >
                                                                        <span className="block pr-6">
                                                                            {preset || 'Seleccionar...'}
                                                                        </span>
                                                                        <span
                                                                            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
                                                                                darkMode
                                                                                    ? 'text-[#D6B45B]'
                                                                                    : 'text-[#A88A2B]'
                                                                            }`}
                                                                            aria-hidden
                                                                        >
                                                                            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                                                <path
                                                                                    fillRule="evenodd"
                                                                                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                                                                    clipRule="evenodd"
                                                                                />
                                                                            </svg>
                                                                        </span>
                                                                    </button>
                                                                    {openSexPickerFor === c.id ? (
                                                                        <div className={sexMenuClass}>
                                                                            <button
                                                                                type="button"
                                                                                className={`block w-full px-3 py-2 text-left text-sm ${
                                                                                    darkMode
                                                                                        ? 'text-gray-200 hover:bg-[#6F5B2A]/45'
                                                                                        : 'text-gray-800 hover:bg-[#FBF8F2]'
                                                                                }`}
                                                                                onClick={() => {
                                                                                    patchCliente(c.id, old => ({
                                                                                        ...old,
                                                                                        profile: {
                                                                                            ...(old.profile || {}),
                                                                                            sex: null,
                                                                                        },
                                                                                    }))
                                                                                    setOpenSexPickerFor(null)
                                                                                }}
                                                                            >
                                                                                Seleccionar...
                                                                            </button>
                                                                            {SEX_PRESET_OPTIONS.map(option => (
                                                                                <button
                                                                                    key={option}
                                                                                    type="button"
                                                                                    className={`block w-full px-3 py-2 text-left text-sm ${
                                                                                        option === preset
                                                                                            ? darkMode
                                                                                                ? 'bg-[#B7962D]/25 text-[#E5C978]'
                                                                                                : 'bg-[#F8F5EF] text-[#8A6F2A]'
                                                                                            : darkMode
                                                                                              ? 'text-gray-200 hover:bg-[#6F5B2A]/45'
                                                                                              : 'text-gray-800 hover:bg-[#FBF8F2]'
                                                                                    }`}
                                                                                    onClick={() => {
                                                                                        const nextOther =
                                                                                            option === SEX_PRESET.OTROS
                                                                                                ? other
                                                                                                : ''
                                                                                        patchCliente(c.id, old => ({
                                                                                            ...old,
                                                                                            profile: {
                                                                                                ...(old.profile || {}),
                                                                                                sex: serializeSex(
                                                                                                    option,
                                                                                                    nextOther,
                                                                                                ),
                                                                                            },
                                                                                        }))
                                                                                        setOpenSexPickerFor(null)
                                                                                    }}
                                                                                >
                                                                                    {option}
                                                                                </button>
                                                                            ))}
                                                                        </div>
                                                                    ) : null}
                                                                </div>
                                                            </label>
                                                            {preset === SEX_PRESET.OTROS ? (
                                                                <label className="block sm:col-span-2">
                                                                    <span className={`mb-1 block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                        Especificar sexo
                                                                    </span>
                                                                    <input
                                                                        type="text"
                                                                        value={other}
                                                                        placeholder="Ej. No binario, Prefiero no decir…"
                                                                        onChange={e =>
                                                                            patchCliente(c.id, old => ({
                                                                                ...old,
                                                                                profile: {
                                                                                    ...(old.profile || {}),
                                                                                    sex: serializeSex(SEX_PRESET.OTROS, e.target.value),
                                                                                },
                                                                            }))
                                                                        }
                                                                        className={inputClass}
                                                                    />
                                                                </label>
                                                            ) : null}
                                                        </>
                                                    )
                                                })()}
                                            </div>
                                            <button
                                                type="button"
                                                disabled={saving === `profile-${c.id}`}
                                                onClick={() => saveProfile(c)}
                                                className="mt-4 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 dark:bg-[#A88A2B]"
                                            >
                                                {saving === `profile-${c.id}` ? 'Guardando…' : 'Guardar perfil'}
                                            </button>
                                        </section>

                                        <section className={`rounded-xl border p-4 ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-[#F8F5EF] bg-[#FBF8F2]/40'}`}>
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0 flex-1">
                                                    <h3 className={`text-sm font-bold uppercase tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                                        Fechas pagadas — elige una para editar rutina
                                                    </h3>
                                                    <p className={`mt-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                                        Cómo verá este cliente los colores de sus días
                                                    </p>
                                                </div>
                                                <div
                                                    className={`shrink-0 rounded-xl border p-1 ${
                                                        darkMode
                                                            ? 'border-gray-600 bg-gray-800'
                                                            : 'border-[#E5DECF] bg-white'
                                                    }`}
                                                    role="group"
                                                    aria-label="Estilo de colores por día"
                                                >
                                                    {WEEKDAY_COLOR_MODE_OPTIONS.map(opt => {
                                                        const active = colorMode === opt.value
                                                        return (
                                                            <button
                                                                key={opt.value}
                                                                type="button"
                                                                disabled={savingColorMode}
                                                                onClick={() => saveWeekdayColorMode(c, opt.value)}
                                                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                                                                    active
                                                                        ? 'bg-[#B7962D] text-white shadow-sm'
                                                                        : darkMode
                                                                          ? 'text-gray-300 hover:bg-gray-700'
                                                                          : 'text-gray-600 hover:bg-[#F8F5EF]'
                                                                } disabled:opacity-50`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            {slots.length === 0 ? (
                                                <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    Este cliente no tiene fechas pagadas registradas.
                                                </p>
                                            ) : (
                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {slots.map(slot => {
                                                        const bar = weekColorForWeekday(slot.weekday, colorMode)
                                                        const on = selectedDate === slot.date
                                                        return (
                                                            <button
                                                                key={slot.date}
                                                                type="button"
                                                                onClick={() => openSession(c, slot.date)}
                                                                className={`rounded-xl border-2 px-3 py-2 text-left text-xs font-bold transition-all ${
                                                                    on
                                                                        ? 'border-[#C9A84C] bg-[#B7962D] text-white'
                                                                        : darkMode
                                                                          ? 'border-gray-600 bg-gray-800 text-gray-200 hover:border-[#B7962D]'
                                                                          : 'border-[#E5DECF] bg-white text-gray-800 hover:border-[#D6B45B]'
                                                                }`}
                                                            >
                                                                <span className={`mr-2 inline-block h-2 w-2 rounded-full ${bar}`} />
                                                                {slot.weekday_short || slot.weekday_label}{' '}
                                                                ·{' '}
                                                                {formatShortDate(
                                                                    new Date(`${slot.date}T12:00:00`),
                                                                )}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            {selectedDate && draft ? (
                                                <div className={`mt-5 rounded-xl border p-4 ${darkMode ? 'border-gray-600 bg-gray-800' : 'border-white bg-white shadow-sm'}`}>
                                                    <p className={`mb-4 text-sm font-bold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                                                        Rutina —{' '}
                                                        {formatShortDate(new Date(`${selectedDate}T12:00:00`))}
                                                    </p>
                                                    <label className="block">
                                                        <span className={`mb-1 block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            Parte del cuerpo / enfoque del día
                                                        </span>
                                                        <input
                                                            value={draft.focus}
                                                            onChange={e =>
                                                                updateDraft(c.id, selectedDate, d => ({
                                                                    ...d,
                                                                    focus: e.target.value,
                                                                }))
                                                            }
                                                            className={inputClass}
                                                            placeholder="Ej. Piernas, core, espalda…"
                                                        />
                                                    </label>
                                                    <label className="mt-3 block">
                                                        <span className={`mb-1 block text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                            Comentarios para el cliente
                                                        </span>
                                                        <textarea
                                                            rows={3}
                                                            value={draft.coach_comments}
                                                            onChange={e =>
                                                                updateDraft(c.id, selectedDate, d => ({
                                                                    ...d,
                                                                    coach_comments: e.target.value,
                                                                }))
                                                            }
                                                            className={inputClass}
                                                            placeholder="Indicaciones, precauciones, motivación…"
                                                        />
                                                    </label>
                                                    <div className="mt-4">
                                                        <div className="mb-2 flex items-center justify-between">
                                                            <span className={`text-xs font-bold uppercase ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                Ejercicios
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateDraft(c.id, selectedDate, d => ({
                                                                        ...d,
                                                                        rows: [...(d.rows || []), emptyRow()],
                                                                    }))
                                                                }
                                                                className="text-xs font-bold text-[#B7962D]"
                                                            >
                                                                + Agregar ejercicio
                                                            </button>
                                                        </div>
                                                        <div className="space-y-2">
                                                            {(draft.rows || []).map((row, idx) => (
                                                                <div
                                                                    key={idx}
                                                                    className={`grid gap-2 rounded-lg border p-3 sm:grid-cols-12 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                                                                >
                                                                    <input
                                                                        placeholder="Ejercicio"
                                                                        value={row.nombre}
                                                                        onChange={e =>
                                                                            updateDraft(c.id, selectedDate, d => {
                                                                                const rows = [...d.rows]
                                                                                rows[idx] = { ...rows[idx], nombre: e.target.value }
                                                                                return { ...d, rows }
                                                                            })
                                                                        }
                                                                        className={`sm:col-span-4 ${inputClass}`}
                                                                    />
                                                                    <input
                                                                        placeholder="Series / reps"
                                                                        value={row.reps}
                                                                        onChange={e =>
                                                                            updateDraft(c.id, selectedDate, d => {
                                                                                const rows = [...d.rows]
                                                                                rows[idx] = { ...rows[idx], reps: e.target.value }
                                                                                return { ...d, rows }
                                                                            })
                                                                        }
                                                                        className={`sm:col-span-3 ${inputClass}`}
                                                                    />
                                                                    <input
                                                                        placeholder="URL YouTube"
                                                                        value={row.video}
                                                                        onChange={e =>
                                                                            updateDraft(c.id, selectedDate, d => {
                                                                                const rows = [...d.rows]
                                                                                rows[idx] = { ...rows[idx], video: e.target.value }
                                                                                return { ...d, rows }
                                                                            })
                                                                        }
                                                                        className={`sm:col-span-4 ${inputClass}`}
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            updateDraft(c.id, selectedDate, d => ({
                                                                                ...d,
                                                                                rows: d.rows.filter((_, i) => i !== idx),
                                                                            }))
                                                                        }
                                                                        className="text-xs font-bold text-red-500 sm:col-span-1"
                                                                    >
                                                                        Quitar
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        disabled={saving === `session-${c.id}-${selectedDate}`}
                                                        onClick={() => saveSession(c, selectedDate)}
                                                        className="mt-4 rounded-xl bg-[#B7962D] px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
                                                    >
                                                        {saving === `session-${c.id}-${selectedDate}`
                                                            ? 'Guardando…'
                                                            : 'Guardar rutina del día'}
                                                    </button>
                                                </div>
                                            ) : null}
                                        </section>
                                    </div>
                                ) : null}
                            </article>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
