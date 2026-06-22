'use client'

import { useCallback, useEffect, useState } from 'react'
import axios from '@/lib/axios'
import { useDarkModePreference } from '@/hooks/useDarkModePreference'
import { adminMainCardClass, adminPanelClass, adminPanelHeadClass } from '@/lib/adminUi'

export default function AdminDescuentosTiendaPage() {
    const { darkMode } = useDarkModePreference()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [selected, setSelected] = useState(null)
    const [percent, setPercent] = useState(0)
    const [notes, setNotes] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const panel = adminPanelClass(darkMode)
    const panelHead = adminPanelHeadClass(darkMode, 'px-5 py-4 sm:px-6')
    const card = adminMainCardClass(darkMode)
    const textMain = darkMode ? 'text-gray-100' : 'text-gray-900'
    const textSub = darkMode ? 'text-gray-400' : 'text-gray-600'
    const inputClass = darkMode
        ? 'w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2.5 text-sm text-white placeholder:text-gray-500'
        : 'w-full rounded-xl border border-[#E5DECF] bg-white px-3 py-2.5 text-sm text-gray-900'

    const searchClients = useCallback(async (q) => {
        const term = q.trim()
        if (term.length < 2) {
            setResults([])
            return
        }
        setSearching(true)
        try {
            const { data } = await axios.get('/admin/store-discounts/search', { params: { q: term } })
            setResults(data?.data || [])
        } catch {
            setResults([])
        } finally {
            setSearching(false)
        }
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => searchClients(query), 300)
        return () => clearTimeout(timer)
    }, [query, searchClients])

    const loadClient = async userId => {
        setError('')
        setMessage('')
        try {
            const { data } = await axios.get(`/admin/store-discounts/${userId}`)
            const payload = data?.data
            setSelected(payload)
            const d = payload?.discount
            setPercent(d?.discount_percent ?? 0)
            setNotes(d?.notes || '')
            setIsActive(d?.is_active ?? true)
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudo cargar el cliente.')
        }
    }

    const saveDiscount = async () => {
        if (!selected?.user?.id) return
        setSaving(true)
        setError('')
        setMessage('')
        try {
            const { data } = await axios.put(`/admin/store-discounts/${selected.user.id}`, {
                discount_percent: Number(percent),
                plan_id: null,
                notes: notes.trim() || null,
                is_active: isActive,
            })
            setMessage(data?.message || 'Descuento guardado.')
            await loadClient(selected.user.id)
            if (query.trim().length >= 2) searchClients(query)
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudo guardar.')
        } finally {
            setSaving(false)
        }
    }

    const removeDiscount = async () => {
        if (!selected?.user?.id) return
        if (!window.confirm('¿Quitar el descuento de este cliente?')) return
        setSaving(true)
        setError('')
        try {
            await axios.delete(`/admin/store-discounts/${selected.user.id}`)
            setMessage('Descuento eliminado.')
            setPercent(0)
            setNotes('')
            await loadClient(selected.user.id)
            if (query.trim().length >= 2) searchClients(query)
        } catch (e) {
            setError(e?.response?.data?.message || 'No se pudo eliminar.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className={`text-2xl font-black sm:text-3xl ${textMain}`}>Descuentos en tienda</h1>
                <p className={`mt-1 text-sm ${textSub}`}>
                    Asigna descuento o compra gratis a clientes (familia, amigos, promociones).
                </p>
            </header>

            {message ? (
                <div className="rounded-xl border border-[#E5DECF] bg-[#FBF8F2] px-4 py-3 text-sm text-[#8A6F2A] dark:border-[#8A6F2A] dark:bg-[#6F5B2A]/30 dark:text-[#E5DECF]">
                    {message}
                </div>
            ) : null}
            {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                    {error}
                </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[minmax(280px,360px)_1fr]">
                <section className={panel}>
                    <div className={panelHead}>
                        <h2 className="text-lg font-black text-[#B7962D] dark:text-[#E5C978]">Buscar cliente</h2>
                        <p className={`mt-1 text-xs ${textSub}`}>Nombre, correo o alias</p>
                    </div>
                    <div className="p-5">
                        <input
                            type="search"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Escribe al menos 2 caracteres…"
                            className={inputClass}
                        />
                        <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
                            {searching ? (
                                <p className={`text-sm ${textSub}`}>Buscando…</p>
                            ) : results.length === 0 ? (
                                <p className={`text-sm ${textSub}`}>
                                    {query.trim().length < 2
                                        ? 'Empieza a escribir para ver clientes.'
                                        : 'Sin resultados.'}
                                </p>
                            ) : (
                                results.map(client => (
                                    <button
                                        key={client.id}
                                        type="button"
                                        onClick={() => loadClient(client.id)}
                                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                                            selected?.user?.id === client.id
                                                ? 'border-[#B7962D] bg-[#F8F5EF] dark:border-[#C9A84C] dark:bg-[#6F5B2A]/25'
                                                : darkMode
                                                  ? 'border-gray-700 bg-gray-900/50 hover:border-[#B7962D]/60'
                                                  : 'border-[#E5DECF] bg-white hover:border-[#D6B45B]'
                                        }`}
                                    >
                                        <p className={`font-bold ${textMain}`}>{client.display_name}</p>
                                        <p className={`text-xs ${textSub}`}>{client.email}</p>
                                        {client.discount ? (
                                            <span className="mt-2 inline-block rounded-full bg-[#B7962D]/15 px-2 py-0.5 text-[11px] font-bold text-[#8A6F2A] dark:text-[#E5C978]">
                                                {client.discount.is_free
                                                    ? 'Gratis'
                                                    : `${client.discount.discount_percent}%`}
                                            </span>
                                        ) : null}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                <section className={card}>
                    {!selected?.user ? (
                        <div className={`py-16 text-center ${textSub}`}>
                            <p className="text-lg font-bold">Selecciona un cliente</p>
                            <p className="mt-2 text-sm">Configura su descuento en la tienda de planes.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <p className={`text-xs font-bold uppercase tracking-wide text-[#B7962D] dark:text-[#E5C978]`}>
                                    Cliente seleccionado
                                </p>
                                <h2 className={`mt-1 text-2xl font-black ${textMain}`}>
                                    {selected.user.display_name}
                                </h2>
                                <p className={`text-sm ${textSub}`}>{selected.user.email}</p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="block sm:col-span-2">
                                    <span className={`mb-2 block text-sm font-semibold ${textSub}`}>
                                        Descuento (%)
                                    </span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={percent}
                                        onChange={e => setPercent(Number(e.target.value))}
                                        className="w-full accent-[#B7962D]"
                                    />
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={percent}
                                            onChange={e =>
                                                setPercent(
                                                    Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                                                )
                                            }
                                            className={`w-24 rounded-lg border px-2 py-1.5 text-center font-bold ${inputClass}`}
                                        />
                                        <span className={`text-sm font-bold ${textMain}`}>
                                            {percent >= 100
                                                ? 'Compra gratis en tienda'
                                                : percent > 0
                                                  ? `Pagará ${100 - percent}% del precio`
                                                  : 'Sin descuento'}
                                        </span>
                                    </div>
                                </label>

                                <p
                                    className={`sm:col-span-2 rounded-xl border px-3 py-2 text-xs ${
                                        darkMode
                                            ? 'border-[#8A6F2A]/50 bg-[#6F5B2A]/20 text-[#E5DECF]'
                                            : 'border-[#E5DECF] bg-[#FBF8F2] text-[#6B5B3E]'
                                    }`}
                                >
                                    El descuento aplica a <strong>cualquier plan o día extra</strong> que compre
                                    este cliente en la tienda.
                                </p>

                                <label className="flex items-end gap-3 pb-1 sm:col-span-2">
                                    <input
                                        id="discount-active"
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={e => setIsActive(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-400 accent-[#B7962D]"
                                    />
                                    <span className={`text-sm font-semibold ${textMain}`}>Descuento activo</span>
                                </label>

                                <label className="block sm:col-span-2">
                                    <span className={`mb-1 block text-sm font-semibold ${textSub}`}>Notas internas</span>
                                    <textarea
                                        rows={2}
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Ej. Familiar del entrenador"
                                        className={inputClass}
                                    />
                                </label>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={saveDiscount}
                                    className="rounded-xl bg-[#B7962D] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#A88A2B] disabled:opacity-50"
                                >
                                    {saving ? 'Guardando…' : 'Guardar descuento'}
                                </button>
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => setPercent(100)}
                                    className={`rounded-xl border px-4 py-2.5 text-sm font-bold ${
                                        darkMode
                                            ? 'border-[#C9A84C] text-[#E5C978] hover:bg-[#6F5B2A]/30'
                                            : 'border-[#D8C087] text-[#8A6F2A] hover:bg-[#F8F5EF]'
                                    }`}
                                >
                                    Marcar como gratis (100%)
                                </button>
                                {selected.discount ? (
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={removeDiscount}
                                        className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                                    >
                                        Quitar descuento
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    )
}
