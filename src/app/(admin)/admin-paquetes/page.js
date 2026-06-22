'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from '@/lib/axios'
import { useDarkModePreference } from '@/hooks/useDarkModePreference'

const emptyForm = {
    name: '',
    description: '',
    price_per_day: '',
    is_specialized: false,
    is_active: true,
}

function fieldClass(darkMode, hasValue = true) {
    return darkMode
        ? `w-full rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              hasValue
                  ? 'border-gray-600 bg-gray-900 text-white placeholder:text-gray-500'
                  : 'border-gray-600 bg-gray-900/80 text-white'
          }`
        : `w-full rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              hasValue
                  ? 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
                  : 'border-gray-200 bg-gray-50 text-gray-900'
          }`
}

function FlashMessage({ type, message, darkMode, onClose }) {
    if (!message) return null
    const styles =
        type === 'error'
            ? darkMode
                ? 'border-red-800/80 bg-red-950/50 text-red-200'
                : 'border-red-200 bg-red-50 text-red-800'
            : darkMode
              ? 'border-[#A88A2B]/80 bg-[#6F5B2A]/40 text-[#E5DECF]'
              : 'border-[#E5DECF] bg-[#FBF8F2] text-[#8A6F2A]'

    return (
        <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${styles}`}>
            <p>{message}</p>
            {onClose ? (
                <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 text-xs font-semibold opacity-70 hover:opacity-100"
                >
                    Cerrar
                </button>
            ) : null}
        </div>
    )
}

function PlanBadges({ plan, darkMode }) {
    return (
        <div className="flex flex-wrap gap-2">
            <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                    plan.is_active
                        ? darkMode
                            ? 'bg-[#6F5B2A]/50 text-[#E5C978] ring-1 ring-[#B7962D]/50'
                            : 'bg-[#F8F5EF] text-[#8A6F2A]'
                        : darkMode
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-100 text-gray-500'
                }`}
            >
                {plan.is_active ? 'Activo' : 'Inactivo'}
            </span>
            <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                    plan.is_specialized
                        ? darkMode
                            ? 'bg-amber-900/40 text-amber-300 ring-1 ring-amber-600/40'
                            : 'bg-amber-100 text-amber-800'
                        : darkMode
                          ? 'bg-blue-900/35 text-blue-300 ring-1 ring-blue-700/40'
                          : 'bg-blue-50 text-blue-800'
                }`}
            >
                {plan.is_specialized ? 'Especializado' : 'Plan base'}
            </span>
        </div>
    )
}

function EditPlanModal({ plan, darkMode, saving, onClose, onChange, onSave }) {
    if (!plan) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <div
                className={`max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border-2 shadow-2xl ${
                    darkMode ? 'border-gray-600 bg-gray-800' : 'border-[#E5DECF] bg-white'
                }`}
                role="dialog"
                aria-labelledby="edit-plan-title"
            >
                <div
                    className={`sticky top-0 border-b px-5 py-4 ${
                        darkMode ? 'border-gray-700 bg-gray-800' : 'border-[#F8F5EF] bg-[#FBF8F2]/80'
                    }`}
                >
                    <h2
                        id="edit-plan-title"
                        className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}
                    >
                        Editar paquete
                    </h2>
                    <p className={`mt-0.5 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Los cambios se reflejan en la tienda del cliente.
                    </p>
                </div>
                <div className="space-y-4 px-5 py-4">
                    <div>
                        <label className={`mb-1 block text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Nombre
                        </label>
                        <input
                            value={plan.name}
                            onChange={e => onChange({ name: e.target.value })}
                            className={fieldClass(darkMode, !!plan.name)}
                        />
                    </div>
                    <div>
                        <label className={`mb-1 block text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Precio por día (MXN)
                        </label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={plan.price_per_day}
                            onChange={e => onChange({ price_per_day: e.target.value })}
                            className={fieldClass(darkMode, !!plan.price_per_day)}
                        />
                    </div>
                    <div>
                        <label className={`mb-1 block text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            Descripción
                        </label>
                        <textarea
                            rows={3}
                            value={plan.description || ''}
                            onChange={e => onChange({ description: e.target.value })}
                            className={fieldClass(darkMode)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <label className={`flex cursor-pointer items-center gap-2 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            <input
                                type="checkbox"
                                checked={!!plan.is_active}
                                onChange={e => onChange({ is_active: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-400 text-[#B7962D]"
                            />
                            Visible en tienda (activo)
                        </label>
                        <label className={`flex cursor-pointer items-center gap-2 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                            <input
                                type="checkbox"
                                checked={!!plan.is_specialized}
                                onChange={e => onChange({ is_specialized: e.target.checked })}
                                className="h-4 w-4 rounded border-gray-400 text-[#B7962D]"
                            />
                            Paquete especializado
                        </label>
                    </div>
                </div>
                <div
                    className={`flex flex-wrap justify-end gap-2 border-t px-5 py-4 ${
                        darkMode ? 'border-gray-700' : 'border-gray-100'
                    }`}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                            darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={saving || !plan.name?.trim()}
                        onClick={onSave}
                        className="rounded-lg bg-[#B7962D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C9A84C] disabled:opacity-50"
                    >
                        {saving ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function AdminPaquetesPage() {
    const { darkMode } = useDarkModePreference()
    const [plans, setPlans] = useState([])
    const [form, setForm] = useState(emptyForm)
    const [editingPlan, setEditingPlan] = useState(null)
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState('success')
    const [loading, setLoading] = useState(true)
    const [creating, setCreating] = useState(false)
    const [savingEdit, setSavingEdit] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(true)

    const panelShell = darkMode
        ? 'rounded-2xl overflow-hidden border-2 border-[#6F5B2A]/40 bg-gray-800 shadow-xl'
        : 'rounded-2xl overflow-hidden border-2 border-[#E5DECF]/90 bg-white shadow-xl'
    const panelHead = darkMode
        ? 'bg-[#B7962D]/25 border-b-2 border-[#C9A84C]/40'
        : 'bg-[#F8F5EF] border-b-2 border-[#E5C978]'

    const notify = (text, type = 'success') => {
        setMessage(text)
        setMessageType(type)
    }

    const loadPlans = useCallback(async () => {
        setLoading(true)
        try {
            const { data } = await axios.get('/admin/planes')
            setPlans(data?.data || [])
        } catch {
            notify('No se pudieron cargar los paquetes.', 'error')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadPlans()
    }, [loadPlans])

    const stats = useMemo(() => {
        const active = plans.filter(p => p.is_active).length
        const specialized = plans.filter(p => p.is_specialized).length
        return { total: plans.length, active, specialized, base: plans.length - specialized }
    }, [plans])

    const createPlan = async e => {
        e.preventDefault()
        setCreating(true)
        notify('')
        try {
            await axios.post('/admin/planes', {
                ...form,
                price_per_day: Number(form.price_per_day),
            })
            setForm(emptyForm)
            notify('Paquete creado correctamente.')
            await loadPlans()
        } catch (err) {
            notify(err?.response?.data?.message || 'No se pudo crear el paquete.', 'error')
        } finally {
            setCreating(false)
        }
    }

    const saveEdit = async () => {
        if (!editingPlan) return
        setSavingEdit(true)
        notify('')
        try {
            await axios.put(`/admin/planes/${editingPlan.id}`, {
                name: editingPlan.name,
                description: editingPlan.description,
                price_per_day: Number(editingPlan.price_per_day),
                is_active: !!editingPlan.is_active,
                is_specialized: !!editingPlan.is_specialized,
            })
            setEditingPlan(null)
            notify('Paquete actualizado.')
            await loadPlans()
        } catch (err) {
            notify(err?.response?.data?.message || 'No se pudo actualizar.', 'error')
        } finally {
            setSavingEdit(false)
        }
    }

    const removePlan = async plan => {
        if (!window.confirm(`¿Eliminar el paquete "${plan.name}"? Esta acción no se puede deshacer.`)) return
        notify('')
        try {
            await axios.delete(`/admin/planes/${plan.id}`)
            notify('Paquete eliminado.')
            await loadPlans()
        } catch (err) {
            notify(err?.response?.data?.message || 'No se pudo eliminar.', 'error')
        }
    }

    const openEdit = plan => {
        setEditingPlan({ ...plan })
    }

    return (
        <div className="space-y-6">
            <div className={panelShell}>
                <div className={`px-5 py-4 ${panelHead}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <h1 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                Gestión de paquetes
                            </h1>
                            <p className={`mt-1 max-w-xl text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                Crea y administra los planes que los clientes compran en la tienda. Los paquetes
                                especializados tienen precio por día más alto y menos días sugeridos por semana.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span
                                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                                    darkMode
                                        ? 'bg-gray-700/80 text-gray-200 border border-gray-600'
                                        : 'bg-white text-gray-800 border border-[#E5DECF]'
                                }`}
                            >
                                Total: {stats.total}
                            </span>
                            <span
                                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                                    darkMode
                                        ? 'bg-[#6F5B2A]/40 text-[#E5C978] border border-[#A88A2B]/60'
                                        : 'bg-[#FBF8F2] text-[#A88A2B] border border-[#E5DECF]'
                                }`}
                            >
                                Activos: {stats.active}
                            </span>
                            <span
                                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                                    darkMode
                                        ? 'bg-blue-900/35 text-blue-300 border border-blue-800/50'
                                        : 'bg-blue-50 text-blue-800 border border-blue-200'
                                }`}
                            >
                                Base: {stats.base}
                            </span>
                            <span
                                className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                                    darkMode
                                        ? 'bg-amber-900/35 text-amber-300 border border-amber-800/50'
                                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                            >
                                Especializados: {stats.specialized}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <FlashMessage
                type={messageType}
                message={message}
                darkMode={darkMode}
                onClose={() => setMessage('')}
            />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,340px)_1fr]">
                <section
                    className={`h-fit rounded-2xl border-2 xl:sticky xl:top-4 ${
                        darkMode ? 'border-gray-700 bg-gray-800' : 'border-[#F8F5EF] bg-white shadow-md'
                    }`}
                >
                    <button
                        type="button"
                        onClick={() => setShowCreateForm(v => !v)}
                        className={`flex w-full items-center justify-between gap-2 border-b px-4 py-3 text-left ${
                            darkMode ? 'border-gray-700' : 'border-[#FBF8F2]'
                        }`}
                    >
                        <span className={`font-bold ${darkMode ? 'text-[#E5C978]' : 'text-[#A88A2B]'}`}>
                            + Nuevo paquete
                        </span>
                        <span className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {showCreateForm ? '−' : '+'}
                        </span>
                    </button>
                    {showCreateForm ? (
                        <form onSubmit={createPlan} className="space-y-4 p-4">
                            <div>
                                <label className={`mb-1 block text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Nombre
                                </label>
                                <input
                                    value={form.name}
                                    onChange={e => setForm(v => ({ ...v, name: e.target.value }))}
                                    className={fieldClass(darkMode, !!form.name)}
                                    placeholder="Ej. Plan fuerza"
                                    required
                                />
                            </div>
                            <div>
                                <label className={`mb-1 block text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Precio por día (MXN)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.price_per_day}
                                    onChange={e => setForm(v => ({ ...v, price_per_day: e.target.value }))}
                                    className={fieldClass(darkMode, !!form.price_per_day)}
                                    placeholder="250"
                                    required
                                />
                            </div>
                            <div>
                                <label className={`mb-1 block text-xs font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Descripción
                                </label>
                                <textarea
                                    rows={3}
                                    value={form.description}
                                    onChange={e => setForm(v => ({ ...v, description: e.target.value }))}
                                    className={fieldClass(darkMode)}
                                    placeholder="Qué incluye este plan…"
                                />
                            </div>
                            <div className="space-y-2 rounded-lg border border-dashed p-3 dark:border-gray-600">
                                <label className={`flex cursor-pointer items-center gap-2 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    <input
                                        type="checkbox"
                                        checked={form.is_active}
                                        onChange={e => setForm(v => ({ ...v, is_active: e.target.checked }))}
                                        className="h-4 w-4 rounded text-[#B7962D]"
                                    />
                                    Publicar en tienda (activo)
                                </label>
                                <label className={`flex cursor-pointer items-center gap-2 text-sm ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    <input
                                        type="checkbox"
                                        checked={form.is_specialized}
                                        onChange={e => setForm(v => ({ ...v, is_specialized: e.target.checked }))}
                                        className="h-4 w-4 rounded text-[#B7962D]"
                                    />
                                    Paquete especializado
                                </label>
                                <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                    Los especializados aparecen en la sección &quot;Paquetes&quot; de la tienda.
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={creating}
                                className="w-full rounded-lg bg-[#B7962D] py-2.5 text-sm font-bold text-white hover:bg-[#C9A84C] disabled:opacity-50"
                            >
                                {creating ? 'Creando…' : 'Crear paquete'}
                            </button>
                        </form>
                    ) : null}
                </section>

                <section className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                            Paquetes publicados
                        </h2>
                        <button
                            type="button"
                            onClick={loadPlans}
                            className={`text-xs font-semibold underline-offset-2 hover:underline ${
                                darkMode ? 'text-[#D6B45B]' : 'text-[#A88A2B]'
                            }`}
                        >
                            Actualizar lista
                        </button>
                    </div>

                    {loading ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                            {[1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className={`h-36 animate-pulse rounded-xl ${darkMode ? 'bg-gray-700/50' : 'bg-gray-100'}`}
                                />
                            ))}
                        </div>
                    ) : plans.length === 0 ? (
                        <div
                            className={`rounded-xl border-2 border-dashed px-6 py-12 text-center ${
                                darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-200 text-gray-500'
                            }`}
                        >
                            <p className="font-medium">Aún no hay paquetes.</p>
                            <p className="mt-1 text-sm">Crea el primero con el formulario de la izquierda.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                            {plans.map(plan => (
                                <article
                                    key={plan.id}
                                    className={`flex flex-col rounded-xl border-2 p-4 transition-shadow hover:shadow-md ${
                                        darkMode
                                            ? 'border-gray-700 bg-gray-800/90 hover:border-[#8A6F2A]/60'
                                            : 'border-gray-100 bg-white hover:border-[#E5DECF]'
                                    } ${!plan.is_active ? 'opacity-75' : ''}`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className={`text-lg font-bold leading-tight ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                            {plan.name}
                                        </h3>
                                        <p className={`shrink-0 text-lg font-black ${darkMode ? 'text-[#D6B45B]' : 'text-[#B7962D]'}`}>
                                            ${Number(plan.price_per_day).toLocaleString('es-MX')}
                                            <span className={`block text-right text-[10px] font-semibold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                                / día
                                            </span>
                                        </p>
                                    </div>
                                    <div className="mt-2">
                                        <PlanBadges plan={plan} darkMode={darkMode} />
                                    </div>
                                    {plan.description ? (
                                        <p className={`mt-3 flex-1 text-sm leading-relaxed line-clamp-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {plan.description}
                                        </p>
                                    ) : (
                                        <p className={`mt-3 flex-1 text-sm italic ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                            Sin descripción
                                        </p>
                                    )}
                                    <div className="mt-4 flex gap-2 border-t pt-3 dark:border-gray-700">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(plan)}
                                            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                                                darkMode
                                                    ? 'bg-[#6F5B2A]/50 text-[#E5C978] ring-1 ring-[#A88A2B]/50 hover:bg-[#6F5B2A]/70'
                                                    : 'bg-[#FBF8F2] text-[#8A6F2A] hover:bg-[#F8F5EF]'
                                            }`}
                                        >
                                            Editar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => removePlan(plan)}
                                            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                                                darkMode
                                                    ? 'bg-red-950/50 text-red-300 ring-1 ring-red-900/50 hover:bg-red-950/80'
                                                    : 'bg-red-50 text-red-700 hover:bg-red-100'
                                            }`}
                                        >
                                            Eliminar
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <EditPlanModal
                plan={editingPlan}
                darkMode={darkMode}
                saving={savingEdit}
                onClose={() => setEditingPlan(null)}
                onChange={patch => setEditingPlan(p => ({ ...p, ...patch }))}
                onSave={saveEdit}
            />
        </div>
    )
}
