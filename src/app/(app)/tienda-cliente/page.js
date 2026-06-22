'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import axios from '@/lib/axios'
import ClientPageHeader from '@/components/client/ClientPageHeader'
import MonthWeekDatePicker from '@/components/client/MonthWeekDatePicker'
import {
    WEEKDAYS,
    datesForWeekdayInMonth,
    defaultSlotsForCount,
    formatShortDate,
    syncSlotsToWeekdayCount,
    todayIso,
    uniqueWeekdaysFromSlots,
    weekdayDateInWeek,
    weeksOfMonth,
} from '@/lib/weekdays'
import { computeStorePricing } from '@/lib/storePricing'
import { themeTokens, useClientTheme } from '../ClientThemeContext'

const PAYMENT_OPTIONS = [
    { code: 'paypal', label: 'PayPal', img: '/Imagenes/PayPal.png' },
    { code: 'mercadopago', label: 'Mercado Pago', img: '/Imagenes/mercado%20pago.png' },
    { code: 'tarjeta', label: 'Tarjeta', img: '/Imagenes/icons_metodosdepago.png' },
]

function StoreBanner({ message, type, darkMode, t, onClose }) {
    if (!message) return null
    const isError = type === 'error'
    return (
        <div
            className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
                isError
                    ? darkMode
                        ? 'border-red-900/60 bg-red-950/40 text-red-200'
                        : 'border-red-200 bg-red-50 text-red-800'
                    : darkMode
                      ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-200'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
        >
            <p>{message}</p>
            {onClose ? (
                <button type="button" onClick={onClose} className="shrink-0 text-xs font-bold opacity-70">
                    ×
                </button>
            ) : null}
        </div>
    )
}

export default function TiendaClientePage() {
    const [plans, setPlans] = useState([])
    const [flags, setFlags] = useState({})
    const [daysByPlan, setDaysByPlan] = useState({})
    const [slotsByPlan, setSlotsByPlan] = useState({})
    const [activePlan, setActivePlan] = useState(null)
    const [extraSlots, setExtraSlots] = useState([])
    const [expandedWeekByPlan, setExpandedWeekByPlan] = useState({})
    const [expandedExtraWeek, setExpandedExtraWeek] = useState(null)
    const [checkoutMode, setCheckoutMode] = useState('plan')
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [checkoutOpen, setCheckoutOpen] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [loadingPlans, setLoadingPlans] = useState(true)
    const [message, setMessage] = useState('')
    const [messageType, setMessageType] = useState('success')
    const [activeMethod, setActiveMethod] = useState(null)
    const [storeDiscount, setStoreDiscount] = useState(null)
    const { darkMode } = useClientTheme()
    const t = darkMode ? themeTokens.dark : themeTokens.light

    const notify = (text, type = 'success') => {
        setMessage(text)
        setMessageType(type)
    }

    useEffect(() => {
        setLoadingPlans(true)
        const loadPlans = axios.get('/client/store/plans')
        const loadFlags = axios.get('/metodos-pago')
        const loadHome = axios.get('/client/home').catch(() => ({ data: { data: {} } }))
        const loadDiscount = axios.get('/client/store/discount').catch(() => ({ data: { data: null } }))

        Promise.all([loadPlans, loadFlags, loadHome, loadDiscount])
            .then(([plansRes, flagsRes, homeRes, discountRes]) => {
                const loaded = plansRes?.data?.data || []
                setPlans(loaded)
                setFlags(flagsRes?.data?.data?.flags || {})
                setActivePlan(homeRes?.data?.data?.active_plan || null)
                setStoreDiscount(discountRes?.data?.data || null)
                const initialDays = Object.fromEntries(
                    loaded.map(p => [p.id, p.is_specialized ? 2 : 3]),
                )
                setDaysByPlan(initialDays)
                setSlotsByPlan(
                    Object.fromEntries(
                        loaded.map(p => [
                            p.id,
                            defaultSlotsForCount(initialDays[p.id] ?? (p.is_specialized ? 2 : 3)),
                        ]),
                    ),
                )
            })
            .catch(() => {
                setPlans([])
                setFlags({})
                notify('No se pudieron cargar los planes.', 'error')
            })
            .finally(() => setLoadingPlans(false))
    }, [])

    const reloadActivePlan = useCallback(async () => {
        try {
            const { data } = await axios.get('/client/home')
            setActivePlan(data?.data?.active_plan || null)
            setExtraSlots([])
        } catch {
            /* ignore */
        }
    }, [])

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const gateway = params.get('gateway')
        const token = params.get('token')
        const paymentId = params.get('payment_id')
        const prefId = params.get('preference_id')
        const status = params.get('status')

        const isAddDays = params.get('add_days') === '1'

        if (gateway === 'paypal' && token) {
            setProcessing(true)
            axios
                .post('/client/store/paypal/capture', { order_id: token })
                .then(async () => {
                    await reloadActivePlan()
                })
                .catch(() => notify('No se pudo confirmar el pago con PayPal.', 'error'))
                .finally(() => setProcessing(false))
        }

        if (gateway === 'mercadopago' && paymentId) {
            setProcessing(true)
            axios
                .post('/client/store/mercadopago/confirm', {
                    payment_id: paymentId,
                    preference_id: prefId || undefined,
                })
                .then(async () => {
                    await reloadActivePlan()
                })
                .catch(() => notify('No se pudo confirmar el pago con Mercado Pago.', 'error'))
                .finally(() => setProcessing(false))
        }

        if (status === 'cancel') {
            notify('El pago fue cancelado.', 'error')
        }
    }, [reloadActivePlan])

    const selectedDays = selectedPlan ? daysByPlan[selectedPlan.id] || (selectedPlan.is_specialized ? 2 : 3) : 0
    const selectedSlots = selectedPlan ? slotsByPlan[selectedPlan.id] || [] : []
    const selectedWeekdayTypes = uniqueWeekdaysFromSlots(selectedSlots)
    const selectedSubtotal = selectedPlan
        ? selectedSlots.length * Number(selectedPlan.price_per_day)
        : 0
    const selectedPricing = useMemo(
        () => computeStorePricing(selectedSubtotal, storeDiscount),
        [selectedSubtotal, storeDiscount],
    )
    const selectedTotal = selectedPricing.total
    const selectionReady =
        selectedWeekdayTypes.length >= selectedDays &&
        selectedSlots.length >= selectedDays &&
        selectedDays > 0

    const extraSubtotal = extraSlots.length * Number(activePlan?.price_per_day || 0)
    const extraPricing = useMemo(
        () => computeStorePricing(extraSubtotal, storeDiscount),
        [extraSubtotal, storeDiscount],
    )
    const extraDaysTotal = extraPricing.total

    const bookedDatesSet = useMemo(
        () => new Set((activePlan?.paid_day_slots || []).map(s => s.date)),
        [activePlan],
    )

    const hasExtraDatesAvailable = useMemo(() => {
        if (!activePlan) return false
        for (const week of weeksOfMonth()) {
            for (const { id } of WEEKDAYS) {
                const date = weekdayDateInWeek(id, week.start, week.end)
                if (date && !bookedDatesSet.has(date)) return true
            }
        }
        return false
    }, [activePlan, bookedDatesSet])

    const slotsPreview = useMemo(
        () =>
            selectedSlots.map(slot => {
                const meta = WEEKDAYS.find(d => d.id === slot.weekday)
                const date = new Date(`${slot.date}T12:00:00`)
                return {
                    weekday: slot.weekday,
                    name: meta?.name ?? '',
                    short: meta?.short ?? '',
                    dateLabel: formatShortDate(date),
                }
            }),
        [selectedSlots],
    )

    const checkoutPricing = checkoutMode === 'extra' ? extraPricing : selectedPricing

    const availablePaymentOptions = useMemo(
        () => PAYMENT_OPTIONS.filter(({ code }) => flags[code] !== false),
        [flags],
    )

    const checkoutShowsFreeOnly = checkoutOpen && checkoutPricing.isFree

    const resetCheckout = () => {
        setCheckoutOpen(false)
        setSelectedPlan(null)
        setActiveMethod(null)
        setCheckoutMode('plan')
    }

    const closeCheckout = () => {
        if (processing) return
        resetCheckout()
    }

    const startCheckout = async method => {
        if (processing) return
        if (checkoutMode === 'plan' && (!selectedPlan || !selectionReady)) return
        if (checkoutMode === 'extra' && extraSlots.length === 0) return

        setProcessing(true)
        setActiveMethod(method)
        notify('')
        try {
            const base = `${window.location.origin}/tienda-cliente`
            const returnUrl = `${base}?gateway=${method}${checkoutMode === 'extra' ? '&add_days=1' : ''}`
            const cancelUrl = `${base}?status=cancel`
            const body =
                checkoutMode === 'extra'
                    ? {
                          paid_day_slots: extraSlots,
                          method,
                          return_url: returnUrl,
                          cancel_url: cancelUrl,
                      }
                    : {
                          plan_id: selectedPlan.id,
                          days_per_week: selectedDays,
                          paid_day_slots: selectedSlots,
                          method,
                          return_url: returnUrl,
                          cancel_url: cancelUrl,
                      }
            const endpoint =
                checkoutMode === 'extra' ? '/client/store/add-days' : '/client/store/checkout'
            const { data } = await axios.post(endpoint, body)

            const payload = data?.data || {}
            if (payload.status === 'redirect' && payload.redirect_url) {
                window.location.href = payload.redirect_url
                return
            }

            if (payload.status === 'paid') {
                await reloadActivePlan()
                notify(
                    method === 'gratis'
                        ? 'Plan activado sin costo. ¡Disfruta tu beneficio!'
                        : 'Pago confirmado correctamente.',
                    'success',
                )
            }
            resetCheckout()
        } catch (e) {
            notify(e?.response?.data?.message || 'No se pudo iniciar el pago.', 'error')
        } finally {
            setProcessing(false)
            setActiveMethod(null)
        }
    }

    const updateDays = (planId, delta, isSpecialized) => {
        setDaysByPlan(prev => {
            const current = prev[planId] || (isSpecialized ? 2 : 3)
            const next = Math.min(7, Math.max(1, current + delta))
            setSlotsByPlan(slotsPrev => ({
                ...slotsPrev,
                [planId]: syncSlotsToWeekdayCount(slotsPrev[planId] || [], next),
            }))
            return { ...prev, [planId]: next }
        })
    }

    const handleToggleWeekday = (planId, weekday) => {
        const maxTypes = daysByPlan[planId] || 3
        setSlotsByPlan(prev => {
            const slots = prev[planId] || []
            const hasWeekday = slots.some(s => s.weekday === weekday)
            if (hasWeekday) {
                return { ...prev, [planId]: slots.filter(s => s.weekday !== weekday) }
            }
            if (uniqueWeekdaysFromSlots(slots).length >= maxTypes) {
                return prev
            }
            const dates = datesForWeekdayInMonth(weekday)
            if (!dates[0]) return prev
            return { ...prev, [planId]: [...slots, { weekday, date: dates[0] }] }
        })
    }

    const toggleMonthDate = (planId, weekday, date) => {
        setSlotsByPlan(prev => {
            const slots = prev[planId] || []
            const exists = slots.some(s => s.weekday === weekday && s.date === date)
            if (exists) {
                const next = slots.filter(s => !(s.weekday === weekday && s.date === date))
                return { ...prev, [planId]: next }
            }
            return { ...prev, [planId]: [...slots, { weekday, date }] }
        })
    }

    const toggleExtraSlot = (weekday, date) => {
        setExtraSlots(prev => {
            const exists = prev.some(s => s.weekday === weekday && s.date === date)
            if (exists) return prev.filter(s => !(s.weekday === weekday && s.date === date))
            return [...prev, { weekday, date }]
        })
    }

    const openExtraDaysCheckout = () => {
        if (extraSlots.length === 0) {
            notify('Elige al menos una fecha adicional.', 'error')
            return
        }
        setCheckoutMode('extra')
        setSelectedPlan(null)
        setCheckoutOpen(true)
    }

    const togglePlanWeek = (planId, weekNum) => {
        setExpandedWeekByPlan(prev => ({
            ...prev,
            [planId]: prev[planId] === weekNum ? null : weekNum,
        }))
    }

    const DaySelector = ({ planId, maxDays, compact = false }) => {
        const slots = slotsByPlan[planId] || []
        const selectedTypes = uniqueWeekdaysFromSlots(slots)

        return (
            <div className={compact ? 'mt-3' : 'mt-4 border-t pt-4'}>
                <p className={`text-xs font-bold uppercase tracking-wide ${t.textSub}`}>
                    ¿Qué días entrenas?
                </p>
                <p className={`mt-0.5 text-[11px] ${t.textSub}`}>
                    Elige {maxDays} tipo(s) de día. Luego abre una semana y marca las fechas.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                    {WEEKDAYS.map(({ id, short, name }) => {
                        const isOn = selectedTypes.includes(id)
                        const firstSlot = slots.find(s => s.weekday === id)
                        const labelDate = firstSlot
                            ? formatShortDate(new Date(`${firstSlot.date}T12:00:00`))
                            : name
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => handleToggleWeekday(planId, id)}
                                className={`min-w-[4.25rem] rounded-xl border-2 px-2 py-2 text-center transition-all ${
                                    isOn
                                        ? darkMode
                                            ? 'border-[#B7962D] bg-amber-950/40 text-amber-100'
                                            : 'border-[#C9A84C] bg-[#FDF8EE] text-[#5C4A1F]'
                                        : darkMode
                                          ? 'border-gray-600 bg-gray-800/60 text-gray-400 hover:border-gray-500'
                                          : 'border-[#E5DECF] bg-white text-gray-500 hover:border-[#C9A84C]/60'
                                }`}
                            >
                                <span className="block text-xs font-black">{short}</span>
                                <span className="mt-0.5 block text-[10px] font-medium opacity-80">
                                    {isOn ? labelDate : name}
                                </span>
                            </button>
                        )
                    })}
                </div>
                {selectedTypes.length < maxDays ? (
                    <p className={`mt-2 text-xs ${darkMode ? 'text-amber-300' : 'text-amber-700'}`}>
                        Activa {maxDays - selectedTypes.length} tipo
                        {maxDays - selectedTypes.length !== 1 ? 's' : ''} de día más.
                    </p>
                ) : null}
                {selectedTypes.length > 0 ? (
                    <MonthWeekDatePicker
                        darkMode={darkMode}
                        t={t}
                        expandedWeek={expandedWeekByPlan[planId] ?? null}
                        onToggleWeek={weekNum => togglePlanWeek(planId, weekNum)}
                        selectedWeekdayTypes={selectedTypes}
                        slots={slots}
                        onToggleDate={(weekday, date) => toggleMonthDate(planId, weekday, date)}
                        mode="plan"
                        summaryCount={slots.length}
                    />
                ) : null}
            </div>
        )
    }

    const basePlan = plans.find(p => !p.is_specialized)
    const packagePlans = plans.filter(p => p.is_specialized)

    const catalogPlans = useMemo(() => {
        const hidePlan = planId => {
            if (!activePlan || Number(activePlan.plan_id) !== Number(planId)) return false
            const today = todayIso()
            if (activePlan.ends_at && activePlan.ends_at < today) return false
            return (activePlan.paid_day_slots || []).length > 0
        }

        const items = []
        if (basePlan && !hidePlan(basePlan.id)) {
            items.push({ plan: basePlan, variant: 'base' })
        }
        packagePlans.forEach(plan => {
            if (!hidePlan(plan.id)) {
                items.push({ plan, variant: 'package' })
            }
        })
        return { items, hidePlan }
    }, [basePlan, packagePlans, activePlan])

    const visibleCatalog = catalogPlans.items
    const isPlanHiddenInStore = catalogPlans.hidePlan

    const planCard = (plan, variant = 'base') => {
        const days = daysByPlan[plan.id] || (variant === 'base' ? 3 : 2)
        const slots = slotsByPlan[plan.id] || []
        const types = uniqueWeekdaysFromSlots(slots)
        const subtotal = slots.length * Number(plan.price_per_day)
        const pricing = computeStorePricing(subtotal, storeDiscount)
        const total = pricing.total
        const canBuy = types.length >= days && slots.length >= days

        return (
            <div
                key={plan.id}
                className={`flex h-full flex-col rounded-2xl border-2 p-5 transition-shadow hover:shadow-lg sm:p-6 ${
                    variant === 'package'
                        ? darkMode
                            ? 'border-[#8A6F2A]/80 bg-[#1a2332]'
                            : 'border-[#C9A84C] bg-[#FDFBF7]'
                        : `${t.card} border-transparent`
                }`}
            >
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        {variant === 'package' ? (
                            <span
                                className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                    darkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-800'
                                }`}
                            >
                                Especializado
                            </span>
                        ) : (
                            <span
                                className={`mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                    darkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-800'
                                }`}
                            >
                                Plan base
                            </span>
                        )}
                        <h3 className={`text-xl font-black sm:text-2xl ${t.textMain}`}>{plan.name}</h3>
                        <p className={`mt-2 text-sm leading-relaxed ${t.textSub}`}>
                            {plan.description || 'Sin descripción'}
                        </p>
                    </div>
                    <div className={`shrink-0 rounded-xl px-3 py-2 text-right ${t.cardMuted}`}>
                        <p className={`text-xs font-semibold uppercase ${t.textSub}`}>Precio</p>
                        <p className={`text-xl font-black ${t.accent}`}>
                            ${Number(plan.price_per_day).toLocaleString('es-MX')}
                        </p>
                        <p className={`text-[10px] ${t.textSub}`}>MXN / día</p>
                    </div>
                </div>

                <div className={`mt-5 flex flex-1 flex-col rounded-xl p-4 ${t.cardMuted}`}>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className={`text-xs font-bold uppercase tracking-wide ${t.textSub}`}>
                                Días por semana
                            </p>
                            <p className={`mt-0.5 text-xs ${t.textSub}`}>Ajusta según tu disponibilidad</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => updateDays(plan.id, -1, variant === 'package')}
                                className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl font-bold ${
                                    darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800 shadow-sm'
                                }`}
                                aria-label="Menos días"
                            >
                                −
                            </button>
                            <span className={`min-w-[2rem] text-center text-2xl font-black ${t.textMain}`}>
                                {days}
                            </span>
                            <button
                                type="button"
                                onClick={() => updateDays(plan.id, 1, variant === 'package')}
                                className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl font-bold ${
                                    darkMode ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-800 shadow-sm'
                                }`}
                                aria-label="Más días"
                            >
                                +
                            </button>
                        </div>
                    </div>
                    <DaySelector planId={plan.id} maxDays={days} compact />
                    <p
                        className={`mt-auto border-t pt-3 text-lg font-black ${t.accent} ${darkMode ? 'border-gray-700' : 'border-[#E5DECF]'}`}
                    >
                        {pricing.hasDiscount ? (
                            <span className={`mr-2 text-sm font-semibold line-through opacity-60 ${t.textSub}`}>
                                ${subtotal.toLocaleString('es-MX')}
                            </span>
                        ) : null}
                        Total estimado:{' '}
                        {pricing.isFree ? (
                            <span className="text-emerald-600 dark:text-emerald-400">Gratis</span>
                        ) : (
                            <>${total.toLocaleString('es-MX')} MXN</>
                        )}
                        <span className={`ml-1 text-xs font-normal ${t.textSub}`}>/ semana</span>
                    </p>
                </div>

                <button
                    type="button"
                    disabled={processing || !canBuy}
                    onClick={() => {
                        if (!canBuy) {
                            notify(
                                `Elige al menos ${days} tipo(s) de día y una fecha por cada uno.`,
                                'error',
                            )
                            return
                        }
                        setCheckoutMode('plan')
                        setSelectedPlan(plan)
                        setCheckoutOpen(true)
                    }}
                    className={`mt-5 w-full rounded-xl py-3.5 text-sm font-black transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 ${
                        variant === 'base'
                            ? `text-white shadow-md ${t.accentBg}`
                            : darkMode
                              ? 'bg-[#8A6F2A] text-white shadow-md hover:bg-[#9a7d32]'
                              : 'bg-[#B7962D] text-white shadow-md hover:bg-[#a38828]'
                    }`}
                >
                    Comprar plan
                </button>
            </div>
        )
    }

    const loadingSkeleton = (
        <div className="grid gap-6 lg:grid-cols-2">
            <div className={`h-64 animate-pulse rounded-2xl ${t.cardMuted}`} />
            <div className={`h-64 animate-pulse rounded-2xl ${t.cardMuted}`} />
        </div>
    )

    return (
        <div className="space-y-6 lg:space-y-8">
            <ClientPageHeader
                title="Tienda"
                subtitle="Elige tu plan de entrenamiento y completa el pago de forma segura"
            />

            <StoreBanner
                message={message}
                type={messageType}
                darkMode={darkMode}
                t={t}
                onClose={() => setMessage('')}
            />

            {activePlan ? (
                <section className={`rounded-2xl border-2 p-5 sm:p-6 ${t.card}`}>
                    <p className={`text-xs font-bold uppercase tracking-wide ${t.textSub}`}>Tu plan activo</p>
                    <h2 className={`mt-1 text-xl font-black ${t.textMain}`}>{activePlan.plan_name}</h2>
                    <p className={`mt-1 text-sm ${t.textSub}`}>
                        {activePlan.days_per_week} día(s) por semana · vigencia hasta{' '}
                        {activePlan.ends_at || '—'}
                    </p>
                    {(activePlan.paid_day_slots || []).length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {activePlan.paid_day_slots.map(slot => (
                                <li
                                    key={`${slot.weekday}-${slot.date}`}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${t.cardMuted}`}
                                >
                                    {slot.label || slot.label_short} ·{' '}
                                    {slot.date
                                        ? new Date(`${slot.date}T12:00:00`).toLocaleDateString('es-MX', {
                                              day: 'numeric',
                                              month: 'short',
                                          })
                                        : '—'}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                    {hasExtraDatesAvailable ? (
                        <div className={`mt-4 rounded-xl p-4 ${t.cardMuted}`}>
                            <p className={`text-sm font-bold ${t.textMain}`}>Agregar fechas extra</p>
                            <p className={`mt-1 text-xs ${t.textSub}`}>
                                Abre una semana y elige fechas que aún no tengas (
                                ${Number(activePlan.price_per_day || 0).toLocaleString('es-MX')} MXN / fecha).
                            </p>
                            <MonthWeekDatePicker
                                darkMode={darkMode}
                                t={t}
                                expandedWeek={expandedExtraWeek}
                                onToggleWeek={weekNum =>
                                    setExpandedExtraWeek(prev => (prev === weekNum ? null : weekNum))
                                }
                                slots={extraSlots}
                                onToggleDate={toggleExtraSlot}
                                mode="extra"
                                bookedDates={bookedDatesSet}
                                summaryCount={extraSlots.length}
                            />
                            <p className={`mt-3 text-sm font-bold ${t.accent}`}>
                                Total extra: ${extraDaysTotal.toLocaleString('es-MX')} MXN
                            </p>
                            <button
                                type="button"
                                disabled={processing || extraSlots.length === 0}
                                onClick={openExtraDaysCheckout}
                                className={`mt-3 rounded-xl px-4 py-2.5 text-sm font-black text-white ${t.accentBg} disabled:opacity-50`}
                            >
                                Pagar días adicionales
                            </button>
                        </div>
                    ) : (
                        <p className={`mt-3 text-xs ${t.textSub}`}>
                            Ya tienes todos los días de la semana cubiertos en tu plan.
                        </p>
                    )}
                </section>
            ) : null}

            {processing && !checkoutOpen ? (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium ${t.cardMuted}`}>
                    Procesando pago…
                </div>
            ) : null}

            {loadingPlans ? (
                loadingSkeleton
            ) : visibleCatalog.length === 0 ? (
                <div className={`rounded-2xl border-2 border-dashed px-6 py-16 text-center ${t.card}`}>
                    {activePlan && (activePlan.paid_day_slots || []).length > 0 ? (
                        <>
                            <p className={`text-lg font-bold ${t.textMain}`}>
                                No hay otros planes para comprar ahora
                            </p>
                            <p className={`mt-2 text-sm ${t.textSub}`}>
                                Ya tienes vigente <strong>{activePlan.plan_name}</strong>. Cuando
                                terminen tus fechas pagadas o la vigencia del plan, volverá a
                                aparecer aquí para renovar.
                            </p>
                        </>
                    ) : (
                        <>
                            <p className={`text-lg font-bold ${t.textMain}`}>No hay planes disponibles</p>
                            <p className={`mt-2 text-sm ${t.textSub}`}>
                                Vuelve más tarde o contacta a tu entrenador.
                            </p>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8">
                        {visibleCatalog.map(({ plan, variant }) => (
                            <div key={plan.id} className="flex min-h-0 h-full">
                                {planCard(plan, variant)}
                            </div>
                        ))}
                    </div>
                    {basePlan && isPlanHiddenInStore(basePlan.id) ? null : !basePlan ? (
                        <p
                            className={`rounded-xl border border-dashed px-4 py-3 text-center text-sm ${t.card} ${t.textSub}`}
                        >
                            No hay plan base activo en este momento.
                        </p>
                    ) : null}
                    {packagePlans.length === 0 && basePlan && !isPlanHiddenInStore(basePlan.id) ? (
                        <p className={`text-center text-sm ${t.textSub}`}>
                            No hay paquetes especializados disponibles por ahora.
                        </p>
                    ) : null}
                </div>
            )}

            {checkoutOpen && (selectedPlan || checkoutMode === 'extra') ? (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1F3A]/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="checkout-title"
                    onClick={closeCheckout}
                >
                    <div
                        className={`max-h-[92vh] w-full max-w-lg overflow-hidden rounded-t-3xl shadow-2xl sm:rounded-3xl ${
                            darkMode ? 'bg-[#111827] ring-1 ring-white/10' : 'bg-white ring-1 ring-black/5'
                        }`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div
                            className={`relative overflow-hidden px-6 pb-5 pt-6 ${
                                darkMode
                                    ? 'bg-gradient-to-br from-[#1e293b] to-[#111827]'
                                    : 'bg-gradient-to-br from-[#FDFBF7] to-white'
                            }`}
                        >
                            <div
                                className={`absolute inset-x-0 top-0 h-1 ${
                                    darkMode ? 'bg-[#B7962D]' : 'bg-gradient-to-r from-[#C9A84C] to-[#B7962D]'
                                }`}
                            />
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p
                                        className={`text-[10px] font-bold uppercase tracking-widest ${
                                            darkMode ? 'text-amber-400/90' : 'text-[#8A6F2A]'
                                        }`}
                                    >
                                        Checkout
                                    </p>
                                    <h3
                                        id="checkout-title"
                                        className={`mt-1 text-2xl font-black tracking-tight ${t.textMain}`}
                                    >
                                        Confirmar compra
                                    </h3>
                                    <p className={`mt-2 truncate text-sm font-medium ${t.textSub}`}>
                                        {checkoutMode === 'extra'
                                            ? `${activePlan?.plan_name || 'Plan'} — días extra`
                                            : selectedPlan?.name}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeCheckout}
                                    disabled={processing}
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg transition-colors disabled:opacity-40 ${
                                        darkMode
                                            ? 'bg-white/10 text-gray-300 hover:bg-white/15'
                                            : 'bg-black/5 text-gray-600 hover:bg-black/10'
                                    }`}
                                    aria-label="Cerrar"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[calc(92vh-8rem)] overflow-y-auto px-6 py-5">
                            <div
                                className={`overflow-hidden rounded-2xl border ${
                                    darkMode ? 'border-gray-700/80' : 'border-[#E5DECF]'
                                }`}
                            >
                                <div
                                    className={`px-4 py-3 text-xs font-bold uppercase tracking-wide ${
                                        darkMode ? 'bg-gray-800/80 text-gray-400' : 'bg-[#F5F0E6] text-[#6B5B3E]'
                                    }`}
                                >
                                    Resumen del pedido
                                </div>
                                <dl className={`divide-y text-sm ${darkMode ? 'divide-gray-700/80' : 'divide-[#E5DECF]'}`}>
                                    {checkoutMode === 'plan' ? (
                                        <div className="flex items-center justify-between gap-3 px-4 py-3">
                                            <dt className={t.textSub}>Días por semana</dt>
                                            <dd className={`font-bold tabular-nums ${t.textMain}`}>
                                                {selectedDays}
                                            </dd>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-3 px-4 py-3">
                                            <dt className={t.textSub}>Fechas adicionales</dt>
                                            <dd className={`font-bold tabular-nums ${t.textMain}`}>
                                                {extraSlots.length}
                                            </dd>
                                        </div>
                                    )}
                                    <div className="px-4 py-3">
                                        <dt className={`mb-2 ${t.textSub}`}>Días seleccionados</dt>
                                        <dd className="flex flex-wrap gap-2">
                                            {(checkoutMode === 'extra'
                                                ? extraSlots.map(slot => {
                                                      const meta = WEEKDAYS.find(d => d.id === slot.weekday)
                                                      return {
                                                          weekday: slot.weekday,
                                                          name: meta?.name,
                                                          dateLabel: formatShortDate(
                                                              new Date(`${slot.date}T12:00:00`),
                                                          ),
                                                      }
                                                  })
                                                : slotsPreview
                                            ).map(slot => (
                                                <span
                                                    key={slot.weekday}
                                                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${t.cardMuted}`}
                                                >
                                                    {slot.name} · {slot.dateLabel}
                                                </span>
                                            ))}
                                        </dd>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 px-4 py-3">
                                        <dt className={t.textSub}>Precio por día</dt>
                                        <dd className={`font-bold tabular-nums ${t.textMain}`}>
                                            $
                                            {Number(
                                                checkoutMode === 'extra'
                                                    ? activePlan?.price_per_day
                                                    : selectedPlan?.price_per_day,
                                            ).toLocaleString('es-MX')}{' '}
                                            MXN
                                        </dd>
                                    </div>
                                    {checkoutPricing.hasDiscount ? (
                                        <>
                                            <div className="flex items-center justify-between gap-3 px-4 py-3">
                                                <dt className={t.textSub}>Subtotal</dt>
                                                <dd className={`font-bold tabular-nums ${t.textMain}`}>
                                                    ${checkoutPricing.subtotal.toLocaleString('es-MX')} MXN
                                                </dd>
                                            </div>
                                            <div className="flex items-center justify-between gap-3 px-4 py-3">
                                                <dt className={t.textSub}>
                                                    Descuento ({checkoutPricing.discountPercent}%)
                                                </dt>
                                                <dd className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                                    −${checkoutPricing.discountAmount.toLocaleString('es-MX')} MXN
                                                </dd>
                                            </div>
                                        </>
                                    ) : null}
                                    <div
                                        className={`flex items-center justify-between gap-3 px-4 py-4 ${
                                            darkMode ? 'bg-amber-950/20' : 'bg-[#FDF8EE]'
                                        }`}
                                    >
                                        <dt className={`text-base font-bold ${t.textMain}`}>
                                            {checkoutPricing.isFree ? 'Total' : 'Total a pagar'}
                                        </dt>
                                        <dd className={`text-2xl font-black tabular-nums ${t.accent}`}>
                                            {checkoutPricing.isFree ? (
                                                <span className="text-emerald-600 dark:text-emerald-400">Gratis</span>
                                            ) : (
                                                <>
                                                    ${checkoutPricing.total.toLocaleString('es-MX')}
                                                    <span className={`ml-1 text-xs font-semibold ${t.textSub}`}>
                                                        MXN
                                                    </span>
                                                </>
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="mt-6">
                                <p className={`mb-3 text-xs font-bold uppercase tracking-wide ${t.textSub}`}>
                                    Elige cómo pagar
                                </p>
                                {checkoutShowsFreeOnly ? (
                                    <div className="grid gap-2.5">
                                        <p
                                            className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ${
                                                darkMode
                                                    ? 'bg-emerald-950/30 text-emerald-200'
                                                    : 'bg-emerald-50 text-emerald-800'
                                            }`}
                                        >
                                            {storeDiscount?.label || 'Tienes un beneficio de compra gratis'}
                                        </p>
                                        <button
                                            type="button"
                                            disabled={processing}
                                            onClick={() => startCheckout('gratis')}
                                            className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 px-4 py-4 text-lg font-black transition disabled:opacity-45 ${
                                                activeMethod === 'gratis'
                                                    ? 'border-emerald-500 bg-emerald-500 text-white'
                                                    : darkMode
                                                      ? 'border-emerald-600 bg-emerald-900/40 text-emerald-100 hover:bg-emerald-900/60'
                                                      : 'border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                            }`}
                                        >
                                            {activeMethod === 'gratis' ? (
                                                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                            ) : null}
                                            Gratis
                                        </button>
                                    </div>
                                ) : availablePaymentOptions.length === 0 ? (
                                    <p
                                        className={`rounded-2xl border px-4 py-3 text-center text-sm ${
                                            darkMode
                                                ? 'border-amber-700/50 bg-amber-950/20 text-amber-200'
                                                : 'border-amber-200 bg-amber-50 text-amber-900'
                                        }`}
                                    >
                                        No hay métodos de pago disponibles en este momento.
                                    </p>
                                ) : (
                                    <div className="grid gap-2.5">
                                        {availablePaymentOptions.map(({ code, label, img }) => {
                                            const isLoading = activeMethod === code
                                            return (
                                                <button
                                                    key={code}
                                                    type="button"
                                                    disabled={processing}
                                                    onClick={() => startCheckout(code)}
                                                    className={`group flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-3.5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
                                                        isLoading
                                                            ? darkMode
                                                                ? 'border-[#B7962D] bg-amber-950/30'
                                                                : 'border-[#C9A84C] bg-[#FDF8EE]'
                                                            : darkMode
                                                              ? 'border-gray-600/80 bg-gray-800/50 hover:border-[#B7962D] hover:bg-gray-800'
                                                              : 'border-[#E5DECF] bg-white hover:border-[#C9A84C] hover:shadow-md'
                                                    }`}
                                                >
                                                    <span
                                                        className={`flex h-11 w-16 shrink-0 items-center justify-center rounded-xl ${
                                                            darkMode ? 'bg-gray-900/80' : 'bg-[#F5F0E6]'
                                                        }`}
                                                    >
                                                        <Image
                                                            src={img}
                                                            alt=""
                                                            width={64}
                                                            height={32}
                                                            className="max-h-8 w-auto object-contain"
                                                        />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className={`block font-bold ${t.textMain}`}>
                                                            {label}
                                                        </span>
                                                        <span className={`mt-0.5 block text-xs ${t.textSub}`}>
                                                            {isLoading ? 'Procesando…' : 'Pago seguro'}
                                                        </span>
                                                    </span>
                                                    <span
                                                        className={`shrink-0 text-lg transition-transform group-hover:translate-x-0.5 ${
                                                            isLoading ? 'animate-pulse opacity-60' : 'opacity-40'
                                                        } ${t.textSub}`}
                                                        aria-hidden
                                                    >
                                                        →
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div
                            className={`border-t px-6 py-4 ${
                                darkMode ? 'border-gray-700/80 bg-gray-900/40' : 'border-[#E5DECF] bg-[#FAFAF8]'
                            }`}
                        >
                            <button
                                type="button"
                                onClick={closeCheckout}
                                disabled={processing}
                                className={`w-full rounded-xl border-2 py-3 text-sm font-bold transition-colors disabled:opacity-50 ${
                                    darkMode
                                        ? 'border-gray-600 text-gray-300 hover:bg-gray-800'
                                        : 'border-[#E5DECF] text-gray-700 hover:bg-white'
                                }`}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
