'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import axios from '@/lib/axios'
import Input from '@/components/Input'
import Label from '@/components/Label'
import { getPaginationWindow } from '@/lib/pagination'
import { useDebounce } from '@/hooks/useDebounce'
import { adminPageIconWrapClass, adminTitleAccentBarClass } from '@/lib/adminUi'

const PER_PAGE_OPTIONS = [5, 10, 25, 50, 100]

const METODO_PAGO_FILTRO_OPTIONS = [
    { value: 'todos', label: 'Todos' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'MercadoPago', label: 'Mercado Pago' },
    { value: 'Transferencia', label: 'Transferencia' },
    { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Efectivo', label: 'Efectivo' },
]

/** Valores alineados con BD / PruebaPedidoController */
const ESTATUS_PEDIDO_DEF = [
    { value: 'pendiente', label: 'Pendiente' },
    { value: 'en_proceso', label: 'En proceso' },
    { value: 'enviado', label: 'Enviado' },
    { value: 'completado', label: 'Completado' },
    { value: 'cancelado', label: 'Cancelado' },
]

const ESTATUS_PEDIDO_FILTRO = [{ value: 'todos', label: 'Todos' }, ...ESTATUS_PEDIDO_DEF]

const ESTATUS_KEYS = new Set(ESTATUS_PEDIDO_DEF.map((o) => o.value))

function normalizeEstatusKey(raw) {
    const k = String(raw || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
    return ESTATUS_KEYS.has(k) ? k : 'pendiente'
}

function estatusLabel(raw) {
    const k = normalizeEstatusKey(raw)
    return ESTATUS_PEDIDO_DEF.find((o) => o.value === k)?.label ?? raw ?? '—'
}

function CalendarGlyph({ className = 'h-3.5 w-3.5 shrink-0' }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
    )
}

function PagoBadge({ estado, darkMode }) {
    const e = String(estado || '').toLowerCase()
    const base = 'inline-flex px-2 py-0.5 rounded-md text-xs font-medium border'
    if (e === 'pagado') {
        return (
            <span className={`${base} ${darkMode ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                Pagado
            </span>
        )
    }
    if (e === 'reembolsado') {
        return (
            <span className={`${base} ${darkMode ? 'bg-violet-500/15 text-violet-300 border-violet-500/40' : 'bg-violet-50 text-violet-800 border-violet-200'}`}>
                Reembolsado
            </span>
        )
    }
    return (
        <span className={`${base} ${darkMode ? 'bg-amber-500/15 text-amber-300 border-amber-500/40' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
            Pendiente
        </span>
    )
}

export default function AdminPedidosPage() {
    const [darkMode, setDarkMode] = useState(true)
    const [fechaDesde, setFechaDesde] = useState('')
    const [fechaHasta, setFechaHasta] = useState('')
    const [pagoFiltro, setPagoFiltro] = useState('todos')
    const [metodoPagoFiltro, setMetodoPagoFiltro] = useState('todos')
    const [estatusFiltro, setEstatusFiltro] = useState('todos')
    const [folioBusqueda, setFolioBusqueda] = useState('')
    const [clienteBusqueda, setClienteBusqueda] = useState('')
    const debouncedCliente = useDebounce(clienteBusqueda, 400)
    const [registrosPorPagina, setRegistrosPorPagina] = useState(10)
    const [paginaActual, setPaginaActual] = useState(1)

    const [pedidosData, setPedidosData] = useState({
        pedidos: [],
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
    })
    const [loadingPedidos, setLoadingPedidos] = useState(true)
    const [downloadingPdfId, setDownloadingPdfId] = useState(null)
    const [detallePedidoId, setDetallePedidoId] = useState(null)
    const [detallePedido, setDetallePedido] = useState(null)
    const [updatingEstatusId, setUpdatingEstatusId] = useState(null)
    const [feedback, setFeedback] = useState(null)

    const filterSelectClass = darkMode
        ? 'w-full px-4 py-2.5 rounded-lg bg-gray-700/80 border border-gray-600 text-white focus:ring-2 focus:ring-emerald-500/40 min-w-[140px]'
        : 'w-full px-4 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-900 focus:ring-2 focus:ring-emerald-500/30 min-w-[140px]'

    const filterLabelClass = darkMode ? 'text-gray-400 block mb-1.5 text-sm font-medium' : 'text-gray-600 block mb-1.5 text-sm font-medium'

    const tableBorderClass = darkMode ? 'border-gray-600' : 'border-gray-200'
    const cellTextClass = darkMode ? 'text-gray-200' : 'text-gray-800'
    const cellMutedClass = darkMode ? 'text-gray-500' : 'text-gray-600'

    const headTitleClass = darkMode ? 'text-sm font-bold text-gray-100 text-center mb-2.5' : 'text-sm font-bold text-slate-800 text-center mb-2.5'
    /** Misma tipografía que el título de columna (p. ej. Fecha), para etiquetas Desde / Hasta */
    const headDateRangeLabelClass = darkMode ? 'text-sm font-bold text-gray-100' : 'text-sm font-bold text-slate-800'
    const headInputClass = (active) =>
        `w-full min-w-0 text-xs !px-2 !py-1.5 !rounded-md !shadow-none focus:!outline-none focus:!ring-1 focus:!ring-emerald-500/50 focus:!border-emerald-500 ${
            darkMode
                ? active
                    ? '!bg-gray-900 !border-emerald-600/60 !text-gray-100'
                    : '!bg-gray-900/90 !border-gray-500 !text-gray-100'
                : active
                  ? '!bg-white !border-emerald-400 !text-gray-900'
                  : '!bg-white !border-gray-300 !text-gray-900'
        }`
    const headSelectClass = (active) =>
        `w-full min-w-0 text-xs !px-2 !py-1.5 !rounded-md !shadow-none focus:!outline-none focus:!ring-1 focus:!ring-emerald-500/50 focus:!border-emerald-500 ${
            darkMode
                ? active
                    ? '!bg-gray-900 !border-emerald-600/60 !text-gray-100'
                    : '!bg-gray-900/90 !border-gray-500 !text-gray-100'
                : active
                  ? '!bg-white !border-emerald-400 !text-gray-900'
                  : '!bg-white !border-gray-300 !text-gray-900'
        }`

    useEffect(() => {
        setDarkMode(JSON.parse(localStorage.getItem('darkMode') ?? 'true'))
    }, [])
    useEffect(() => {
        const onDarkModeChange = (e) => setDarkMode(!!e.detail)
        window.addEventListener('darkModeChange', onDarkModeChange)
        return () => window.removeEventListener('darkModeChange', onDarkModeChange)
    }, [])

    const fetchPedidos = useCallback(
        async (silent = false) => {
            if (!silent) setLoadingPedidos(true)
            try {
                const params = new URLSearchParams()
                if (fechaDesde) params.set('fecha_desde', fechaDesde)
                if (fechaHasta) params.set('fecha_hasta', fechaHasta)
                if (pagoFiltro !== 'todos') params.set('pago', pagoFiltro)
                if (metodoPagoFiltro !== 'todos') params.set('metodo_pago', metodoPagoFiltro)
                if (estatusFiltro !== 'todos') params.set('estatus', estatusFiltro)
                if (folioBusqueda.trim()) params.set('folio', folioBusqueda.trim())
                if (debouncedCliente.trim()) params.set('cliente', debouncedCliente.trim())
                params.set('per_page', registrosPorPagina)
                params.set('page', paginaActual)
                const { data } = await axios.get(`/admin/pedidos?${params}`)
                if (data?.success && data?.data) {
                    setPedidosData({
                        pedidos: data.data.pedidos || [],
                        total: data.data.total ?? 0,
                        per_page: data.data.per_page ?? 10,
                        current_page: data.data.current_page ?? 1,
                        last_page: data.data.last_page ?? 1,
                    })
                }
            } catch {
                setPedidosData({ pedidos: [], total: 0, per_page: 10, current_page: 1, last_page: 1 })
            } finally {
                if (!silent) setLoadingPedidos(false)
            }
        },
        [fechaDesde, fechaHasta, pagoFiltro, metodoPagoFiltro, estatusFiltro, folioBusqueda, debouncedCliente, registrosPorPagina, paginaActual]
    )

    useEffect(() => {
        fetchPedidos()
    }, [fetchPedidos])

    useEffect(() => {
        setPaginaActual(1)
    }, [fechaDesde, fechaHasta, pagoFiltro, metodoPagoFiltro, estatusFiltro, folioBusqueda, debouncedCliente, registrosPorPagina])

    useEffect(() => {
        if (detallePedidoId == null) {
            setDetallePedido(null)
            return
        }
        axios
            .get(`/admin/pedidos/${detallePedidoId}`)
            .then(({ data }) => {
                if (data?.success && data?.data) setDetallePedido(data.data)
                else setDetallePedido(null)
            })
            .catch(() => setDetallePedido(null))
    }, [detallePedidoId])

    const handleDescargarPdf = async (id, folio) => {
        setDownloadingPdfId(id)
        try {
            const { data } = await axios.get(`/admin/pedidos/${id}/pdf`, { responseType: 'blob' })
            const url = URL.createObjectURL(new Blob([data]))
            const a = document.createElement('a')
            a.href = url
            a.download = `pedido-${folio}.pdf`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            /* noop */
        } finally {
            setDownloadingPdfId(null)
        }
    }

    const handleEstatusChange = async (pedidoId, nuevoEstatus) => {
        setUpdatingEstatusId(pedidoId)
        setFeedback(null)
        try {
            const { data } = await axios.patch(`/admin/pedidos/${pedidoId}/estatus`, { estatus_pedido: nuevoEstatus })
            if (data?.success) {
                setPedidosData((prev) => ({
                    ...prev,
                    pedidos: prev.pedidos.map((p) => (p.id === pedidoId ? { ...p, estatus_pedido: nuevoEstatus } : p)),
                }))
                setDetallePedido((d) => (d && d.id === pedidoId ? { ...d, estatus_pedido: nuevoEstatus } : d))
                setFeedback({ type: 'success', text: 'Estatus actualizado' })
            } else {
                setFeedback({ type: 'error', text: data?.message || 'No se pudo actualizar' })
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.errors?.estatus_pedido?.[0] || 'Error al actualizar estatus'
            setFeedback({ type: 'error', text: msg })
            await fetchPedidos(true)
        } finally {
            setUpdatingEstatusId(null)
            setTimeout(() => setFeedback(null), 4000)
        }
    }

    const { pedidos, total, current_page, last_page } = pedidosData

    const rowSelectClass = darkMode
        ? 'w-full max-w-[200px] px-2 py-1.5 text-sm rounded-lg border bg-gray-700 border-gray-600 text-white focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50'
        : 'w-full max-w-[200px] px-2 py-1.5 text-sm rounded-lg border bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50'

    return (
        <div className="space-y-8">
            {feedback && (
                <div
                    className={`fixed top-20 right-6 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
                        feedback.type === 'success'
                            ? darkMode
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : darkMode
                              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                              : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                    role="alert"
                >
                    {feedback.text}
                </div>
            )}

            <div className="flex items-center gap-4">
                <span className={adminPageIconWrapClass(darkMode)}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                        />
                    </svg>
                </span>
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Estado de pedidos</h1>
                    <div className={adminTitleAccentBarClass(darkMode)} aria-hidden />
                    <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Consulta, filtra y actualiza el estatus de los pedidos.
                    </p>
                </div>
            </div>

            <div className={`rounded-xl overflow-hidden border shadow-xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className={`px-5 py-4 ${darkMode ? 'bg-emerald-600/25 border-b border-emerald-500/30' : 'bg-emerald-50 border-b border-emerald-200'}`}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <span
                                className={`flex h-9 w-9 items-center justify-center rounded-lg ${darkMode ? 'bg-emerald-500/30 text-emerald-300' : 'bg-emerald-100 text-emerald-600'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </span>
                            <h2 className={`text-lg font-bold ${darkMode ? 'text-emerald-200' : 'text-emerald-800'}`}>Listado de pedidos</h2>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Label className={`${filterLabelClass} !mb-0 whitespace-nowrap`}>Mostrar</Label>
                                <select
                                    value={registrosPorPagina}
                                    onChange={(e) => setRegistrosPorPagina(Number(e.target.value))}
                                    className={filterSelectClass}
                                >
                                    {PER_PAGE_OPTIONS.map((n) => (
                                        <option key={n} value={n}>
                                            {n}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {!loadingPedidos && (
                                <span className={`text-sm font-medium px-3 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                                    {total} pedido{total !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className={`w-full text-sm border-collapse min-w-[1020px] ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        <thead>
                            <tr className={darkMode ? `border-b-2 ${tableBorderClass} bg-gray-700/55` : `border-b-2 ${tableBorderClass} bg-gray-100`}>
                                <th className={`align-top px-2 py-3.5 border-r ${tableBorderClass} w-[1%] min-w-[200px] max-w-[280px]`}>
                                    <div className={headTitleClass}>Fecha</div>
                                    <div className="grid grid-cols-2 gap-x-2 w-full min-w-0">
                                        <div className="min-w-0">
                                            <div className={`mb-1 flex items-center gap-1 justify-start ${headDateRangeLabelClass}`}>
                                                <span>Desde</span>
                                                <CalendarGlyph className={darkMode ? 'h-4 w-4 shrink-0 text-gray-300' : 'h-4 w-4 shrink-0 text-slate-600'} />
                                            </div>
                                            <Input
                                                type="date"
                                                value={fechaDesde}
                                                onChange={(e) => setFechaDesde(e.target.value)}
                                                className={`${headInputClass(!!fechaDesde)} max-w-full ${darkMode ? 'admin-date-input-dark' : ''} ${fechaDesde ? 'admin-date-input-filled' : ''}`}
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`mb-1 flex items-center gap-1 justify-end ${headDateRangeLabelClass}`}>
                                                <span>Hasta</span>
                                                <CalendarGlyph className={darkMode ? 'h-4 w-4 shrink-0 text-gray-300' : 'h-4 w-4 shrink-0 text-slate-600'} />
                                            </div>
                                            <Input
                                                type="date"
                                                value={fechaHasta}
                                                onChange={(e) => setFechaHasta(e.target.value)}
                                                className={`${headInputClass(!!fechaHasta)} max-w-full ${darkMode ? 'admin-date-input-dark' : ''} ${fechaHasta ? 'admin-date-input-filled' : ''}`}
                                            />
                                        </div>
                                    </div>
                                </th>
                                <th className={`align-top px-3 py-3.5 border-r ${tableBorderClass} min-w-[108px]`}>
                                    <div className={headTitleClass}>Folio</div>
                                    <Input
                                        type="text"
                                        placeholder="Buscar…"
                                        value={folioBusqueda}
                                        onChange={(e) => setFolioBusqueda(e.target.value)}
                                        className={headInputClass(!!folioBusqueda.trim())}
                                    />
                                </th>
                                <th className={`align-top px-3 py-3.5 border-r ${tableBorderClass} min-w-[148px]`}>
                                    <div className={headTitleClass}>Cliente</div>
                                    <Input
                                        type="text"
                                        placeholder="Nombre o email"
                                        value={clienteBusqueda}
                                        onChange={(e) => setClienteBusqueda(e.target.value)}
                                        className={headInputClass(!!clienteBusqueda.trim())}
                                    />
                                </th>
                                <th className={`align-top px-3 py-3.5 border-r ${tableBorderClass} w-[76px]`}>
                                    <div className={headTitleClass}>Monto</div>
                                </th>
                                <th className={`align-top px-3 py-3.5 border-r ${tableBorderClass} min-w-[128px]`}>
                                    <div className={headTitleClass}>Método pago</div>
                                    <select
                                        value={metodoPagoFiltro}
                                        onChange={(e) => setMetodoPagoFiltro(e.target.value)}
                                        className={`mt-1 ${headSelectClass(metodoPagoFiltro !== 'todos')} ${darkMode ? 'admin-native-select-dark' : 'admin-native-select-light'}`}
                                    >
                                        {METODO_PAGO_FILTRO_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </th>
                                <th className={`align-top px-3 py-3.5 border-r ${tableBorderClass} min-w-[118px]`}>
                                    <div className={headTitleClass}>Pago</div>
                                    <select
                                        value={pagoFiltro}
                                        onChange={(e) => setPagoFiltro(e.target.value)}
                                        className={`mt-1 ${headSelectClass(pagoFiltro !== 'todos')} ${darkMode ? 'admin-native-select-dark' : 'admin-native-select-light'}`}
                                    >
                                        <option value="todos">Todos</option>
                                        <option value="pagado">Pagado</option>
                                        <option value="pendiente">Pendiente</option>
                                        <option value="reembolsado">Reembolsado</option>
                                    </select>
                                </th>
                                <th className={`align-top px-3 py-3.5 border-r ${tableBorderClass} min-w-[168px]`}>
                                    <div className={headTitleClass}>Estatus</div>
                                    <select
                                        value={estatusFiltro}
                                        onChange={(e) => setEstatusFiltro(e.target.value)}
                                        className={`mt-1 ${headSelectClass(estatusFiltro !== 'todos')} ${darkMode ? 'admin-native-select-dark' : 'admin-native-select-light'}`}
                                    >
                                        {ESTATUS_PEDIDO_FILTRO.map((o) => (
                                            <option key={o.value} value={o.value}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </th>
                                <th className={`align-top px-3 py-3.5`}>
                                    <div className={headTitleClass}>Acciones</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingPedidos ? (
                                <tr>
                                    <td colSpan={8} className={`px-4 py-12 text-center ${cellMutedClass}`}>
                                        <div className="flex flex-col items-center gap-3">
                                            <svg className="animate-spin h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Cargando pedidos…
                                        </div>
                                    </td>
                                </tr>
                            ) : pedidos.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={`px-4 py-12 text-center ${cellMutedClass}`}>
                                        No hay pedidos con los filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                pedidos.map((pedido, i) => (
                                    <tr
                                        key={pedido.id}
                                        className={`border-b transition-colors ${darkMode ? `hover:bg-gray-700/25 ${tableBorderClass}` : `hover:bg-gray-50 ${tableBorderClass}`} ${
                                            i % 2 === 1 ? (darkMode ? 'bg-gray-800/40' : 'bg-gray-50/80') : ''
                                        }`}
                                    >
                                        <td className={`py-3 px-4 border-r ${tableBorderClass} ${cellTextClass}`}>{pedido.fecha}</td>
                                        <td className={`py-3 px-4 border-r ${tableBorderClass} font-medium ${cellTextClass}`}>{pedido.folio}</td>
                                        <td className={`py-3 px-4 border-r ${tableBorderClass} ${cellTextClass}`}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{pedido.user_name || '—'}</span>
                                                {pedido.user_email && <span className={`text-xs ${cellMutedClass}`}>{pedido.user_email}</span>}
                                            </div>
                                        </td>
                                        <td className={`py-3 px-4 border-r ${tableBorderClass} font-semibold text-emerald-500`}>
                                            $ {Number(pedido.monto).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className={`py-3 px-4 border-r ${tableBorderClass} ${cellTextClass}`}>{pedido.metodo_pago}</td>
                                        <td className={`py-3 px-4 border-r ${tableBorderClass}`}>
                                            <PagoBadge estado={pedido.estado_pago} darkMode={darkMode} />
                                        </td>
                                        <td className={`py-3 px-4 border-r ${tableBorderClass} align-middle`}>
                                            <select
                                                value={normalizeEstatusKey(pedido.estatus_pedido)}
                                                disabled={updatingEstatusId === pedido.id}
                                                onChange={(e) => handleEstatusChange(pedido.id, e.target.value)}
                                                className={rowSelectClass}
                                                aria-label={`Cambiar estatus del pedido ${pedido.folio}`}
                                            >
                                                {ESTATUS_PEDIDO_DEF.map((o) => (
                                                    <option key={o.value} value={o.value}>
                                                        {o.label}
                                                    </option>
                                                ))}
                                            </select>
                                            {updatingEstatusId === pedido.id && (
                                                <span className={`ml-2 text-xs ${cellMutedClass} align-middle`}>Guardando…</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDescargarPdf(pedido.id, pedido.folio)}
                                                    disabled={!!downloadingPdfId}
                                                    className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition-colors disabled:opacity-50"
                                                    title="Descargar PDF"
                                                >
                                                    <Image src="/Imagenes/icon_descarga.webp" alt="PDF" width={18} height={18} className="brightness-0 invert opacity-90" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDetallePedidoId(pedido.id)}
                                                    className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition-colors"
                                                    title="Ver detalle"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                                        />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {last_page >= 1 &&
                    (() => {
                        const totalP = Math.max(1, last_page)
                        const { windowPages, showEllipsis, showLastPage } = getPaginationWindow(current_page, totalP)
                        return (
                            <div className={`px-5 py-4 flex flex-wrap items-center justify-between gap-4 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                <p className={`text-sm ${cellMutedClass}`}>
                                    Página {current_page} de {totalP}
                                </p>
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPaginaActual(1)}
                                        disabled={current_page === 1}
                                        className={`min-w-[2.5rem] h-10 px-3 rounded-lg text-sm font-semibold disabled:opacity-50 ${
                                            darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        ««
                                    </button>
                                    {windowPages.map((num) => (
                                        <button
                                            key={num}
                                            type="button"
                                            onClick={() => setPaginaActual(num)}
                                            className={`min-w-[2.5rem] h-10 px-3 rounded-lg text-sm font-semibold ${
                                                num === current_page ? 'bg-emerald-600 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    {showEllipsis && <span className={`px-2 ${cellMutedClass}`}>…</span>}
                                    {showLastPage && totalP > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => setPaginaActual(totalP)}
                                            className={`min-w-[2.5rem] h-10 px-3 rounded-lg text-sm font-semibold ${
                                                current_page === totalP ? 'bg-emerald-600 text-white' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                            }`}
                                        >
                                            {totalP}
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setPaginaActual(totalP)}
                                        disabled={current_page === totalP}
                                        className={`min-w-[2.5rem] h-10 px-3 rounded-lg text-sm font-semibold disabled:opacity-50 ${
                                            darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        »»
                                    </button>
                                </div>
                            </div>
                        )
                    })()}
            </div>

            {detallePedidoId != null && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={() => setDetallePedidoId(null)} aria-hidden />
                    <div
                        className={`fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:max-w-xl w-full rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
                            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                        }`}
                    >
                        <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-emerald-600/20 border-b border-emerald-500/30">
                            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Pedido {detallePedido?.folio ?? '…'}</h3>
                            <button
                                type="button"
                                onClick={() => setDetallePedidoId(null)}
                                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                                aria-label="Cerrar"
                            >
                                <span className="text-xl leading-none">×</span>
                            </button>
                        </div>
                        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
                            {!detallePedido ? (
                                <div className="flex items-center justify-center py-12">
                                    <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Cargando…</p>
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {(detallePedido.user_name || detallePedido.user_email) && (
                                        <div className={`rounded-xl p-4 ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-100 border border-gray-200'}`}>
                                            <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cliente</p>
                                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{detallePedido.user_name || '—'}</p>
                                            {detallePedido.user_email && (
                                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{detallePedido.user_email}</p>
                                            )}
                                        </div>
                                    )}
                                    <div className={`grid grid-cols-2 gap-3 rounded-xl p-4 ${darkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-100 border border-gray-200'}`}>
                                        <div>
                                            <p className={`text-xs font-medium uppercase tracking-wider mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fecha</p>
                                            <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{detallePedido.fecha}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-medium uppercase tracking-wider mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Monto</p>
                                            <p className="font-semibold text-emerald-500">$ {Number(detallePedido.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-medium uppercase tracking-wider mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Método de pago</p>
                                            <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{detallePedido.metodo_pago}</p>
                                        </div>
                                        <div>
                                            <p className={`text-xs font-medium uppercase tracking-wider mb-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Estado</p>
                                            <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                {detallePedido.estado_pago} · {estatusLabel(detallePedido.estatus_pedido)}
                                            </p>
                                        </div>
                                    </div>
                                    <div>
                                        <Label className={filterLabelClass}>Cambiar estatus del pedido</Label>
                                        <select
                                            value={normalizeEstatusKey(detallePedido.estatus_pedido)}
                                            disabled={updatingEstatusId === detallePedido.id}
                                            onChange={(e) => handleEstatusChange(detallePedido.id, e.target.value)}
                                            className={filterSelectClass}
                                        >
                                            {ESTATUS_PEDIDO_DEF.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <p className={`font-semibold mb-2 text-sm uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Productos</p>
                                        <div className={`rounded-xl border overflow-hidden ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                                            <table className="w-full text-sm">
                                                <thead className={darkMode ? 'bg-gray-700/80' : 'bg-gray-100'}>
                                                    <tr>
                                                        <th className={`px-3 py-2.5 text-left text-xs font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Producto</th>
                                                        <th className={`px-3 py-2.5 text-center w-16 text-xs font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Cant.</th>
                                                        <th className={`px-3 py-2.5 text-right w-24 text-xs font-semibold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Subtotal</th>
                                                    </tr>
                                                </thead>
                                                <tbody className={darkMode ? 'divide-y divide-gray-600' : 'divide-y divide-gray-200'}>
                                                    {(detallePedido.items || []).map((it, idx) => (
                                                        <tr key={idx} className={darkMode ? 'bg-gray-800/50' : 'bg-white'}>
                                                            <td className={`px-3 py-2.5 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{it.nombre_producto}</td>
                                                            <td className={`px-3 py-2.5 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{it.cantidad}</td>
                                                            <td className="px-3 py-2.5 text-right font-medium text-emerald-500">
                                                                $ {Number(it.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleDescargarPdf(detallePedido.id ?? detallePedidoId, detallePedido.folio)
                                            setDetallePedidoId(null)
                                        }}
                                        className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 inline-flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Image src="/Imagenes/icon_descarga.webp" alt="" width={20} height={20} className="brightness-0 invert" />
                                        Descargar PDF
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
