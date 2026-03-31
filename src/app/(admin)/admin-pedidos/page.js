'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import axios from '@/lib/axios'
import Input from '@/components/Input'
import Label from '@/components/Label'
import { getPaginationWindow } from '@/lib/pagination'
import { useDebounce } from '@/hooks/useDebounce'
import {
    adminMainCardClass,
    adminTableShellClass,
    adminTableHeadRowClass,
    adminFilterSelectClass,
    adminFilterInputClass,
    adminFilterDateInputClass,
    adminColumnTitleClass,
    adminColumnTitleDotClass,
    adminDateFieldBoxClass,
    adminDateLabelClass,
    adminPageIconWrapClass,
    adminPageTitleClass,
    adminPageSubtitleClass,
    adminTitleAccentBarClass,
    adminToolbarSelectClass,
} from '@/lib/adminUi'

const PER_PAGE_OPTIONS = [5, 10, 25, 50]

const METODO_PAGO_FILTRO_OPTIONS = [
    { value: 'todos', label: 'Todos' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'MercadoPago', label: 'Mercado Pago' },
    { value: 'Transferencia', label: 'Transferencia' },
    { value: 'Tarjeta', label: 'Tarjeta' },
    { value: 'Efectivo', label: 'Efectivo' },
]

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
            // error silencioso o toast
        } finally {
            setDownloadingPdfId(null)
        }
    }

    const { pedidos, total, per_page, current_page, last_page } = pedidosData

    const columnTitle = (label) => (
        <div className={`${adminColumnTitleClass(darkMode)} inline-flex items-center`}>
            <span className={adminColumnTitleDotClass(darkMode)} aria-hidden />
            {label}
        </div>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4">
                <span className={adminPageIconWrapClass(darkMode)}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                </span>
                <div>
                    <h1 className={adminPageTitleClass(darkMode)}>Estado de pedidos</h1>
                    <div className={adminTitleAccentBarClass(darkMode)} aria-hidden />
                    <p className={adminPageSubtitleClass(darkMode)}>
                        Consulta y filtra los pedidos de todos los clientes por estado, fechas y cliente.
                    </p>
                </div>
            </div>

            <div className={adminMainCardClass(darkMode)}>
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b pb-4 border-emerald-500/15 dark:border-emerald-500/20">
                    <div className="flex flex-wrap items-center gap-3">
                        <Label className={darkMode ? 'text-emerald-200/90' : 'text-emerald-800/90'}>Mostrar</Label>
                        <select
                            value={registrosPorPagina}
                            onChange={(e) => setRegistrosPorPagina(Number(e.target.value))}
                            className={adminToolbarSelectClass(darkMode)}
                        >
                            {PER_PAGE_OPTIONS.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                    </div>
                    <span className={`text-sm font-medium ${darkMode ? 'text-emerald-200/70' : 'text-emerald-800/80'}`}>
                        {total} pedido{total !== 1 ? 's' : ''} en total
                    </span>
                </div>

                {/* Tabla con filtros integrados en el encabezado */}
                <div className={adminTableShellClass(darkMode)}>
                    <table className="w-full min-w-[1150px]">
                        <thead>
                            <tr className={adminTableHeadRowClass(darkMode)}>
                                <th className={`px-3 py-3.5 text-left min-w-[260px] sm:min-w-[280px] ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {columnTitle('Fecha')}
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-2">
                                        <div className={adminDateFieldBoxClass(darkMode, !!fechaDesde)}>
                                            <label htmlFor="filtro-fecha-desde" className={adminDateLabelClass(darkMode)}>
                                                A partir de
                                            </label>
                                            <Input
                                                id="filtro-fecha-desde"
                                                type="date"
                                                value={fechaDesde}
                                                onChange={(e) => setFechaDesde(e.target.value)}
                                                className={adminFilterDateInputClass(darkMode, !!fechaDesde, 'mt-0 py-1.5')}
                                            />
                                        </div>
                                        <div className={adminDateFieldBoxClass(darkMode, !!fechaHasta)}>
                                            <label htmlFor="filtro-fecha-hasta" className={adminDateLabelClass(darkMode)}>
                                                Hasta
                                            </label>
                                            <Input
                                                id="filtro-fecha-hasta"
                                                type="date"
                                                value={fechaHasta}
                                                onChange={(e) => setFechaHasta(e.target.value)}
                                                className={adminFilterDateInputClass(darkMode, !!fechaHasta, 'mt-0 py-1.5')}
                                            />
                                        </div>
                                    </div>
                                </th>
                                <th className={`px-3 py-3.5 text-left min-w-[110px] ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {columnTitle('Folio')}
                                    <Input type="text" placeholder="Folio" value={folioBusqueda} onChange={(e) => setFolioBusqueda(e.target.value)} className={adminFilterInputClass(darkMode, !!folioBusqueda.trim())} />
                                </th>
                                <th className={`px-3 py-3.5 text-left min-w-[140px] ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {columnTitle('Cliente')}
                                    <Input type="text" placeholder="Nombre o email" value={clienteBusqueda} onChange={(e) => setClienteBusqueda(e.target.value)} className={adminFilterInputClass(darkMode, !!clienteBusqueda.trim())} />
                                </th>
                                <th className={`px-3 py-3.5 text-left w-[72px] ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {columnTitle('Monto')}
                                </th>
                                <th className={`px-3 py-3.5 text-left min-w-[130px] ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {columnTitle('Método pago')}
                                    <select value={metodoPagoFiltro} onChange={(e) => setMetodoPagoFiltro(e.target.value)} className={adminFilterSelectClass(darkMode, metodoPagoFiltro !== 'todos')}>
                                        {METODO_PAGO_FILTRO_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </th>
                                <th className={`px-3 py-3.5 text-left min-w-[118px] ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {columnTitle('Pago')}
                                    <select value={pagoFiltro} onChange={(e) => setPagoFiltro(e.target.value)} className={adminFilterSelectClass(darkMode, pagoFiltro !== 'todos')}>
                                        <option value="todos">Todos</option>
                                        <option value="pagado">Pagado</option>
                                        <option value="pendiente">Pendiente</option>
                                    </select>
                                </th>
                                <th className={`px-3 py-3.5 text-left min-w-[124px] ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {columnTitle('Estatus')}
                                    <select value={estatusFiltro} onChange={(e) => setEstatusFiltro(e.target.value)} className={adminFilterSelectClass(darkMode, estatusFiltro !== 'todos')}>
                                        <option value="todos">Todos</option>
                                        <option value="completado">Completado</option>
                                        <option value="en_proceso">En proceso</option>
                                        <option value="cancelado">Cancelado</option>
                                    </select>
                                </th>
                                <th className={`px-3 py-3.5 text-left min-w-[88px] ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                    {columnTitle('Acciones')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingPedidos ? (
                                <tr>
                                    <td colSpan={8} className={`px-4 py-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Cargando pedidos…
                                    </td>
                                </tr>
                            ) : pedidos.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={`px-4 py-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        No hay pedidos con los filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                pedidos.map((pedido) => (
                                    <tr
                                        key={pedido.id}
                                        className={`border-b transition-colors ${
                                            darkMode ? 'border-gray-700 hover:bg-gray-700/30' : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {pedido.fecha}
                                        </td>
                                        <td className={`px-4 py-3 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                            {pedido.folio}
                                        </td>
                                        <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{pedido.user_name || '—'}</span>
                                                {pedido.user_email && (
                                                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {pedido.user_email}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-emerald-500">
                                            $ {Number(pedido.monto).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                        <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {pedido.metodo_pago}
                                        </td>
                                        <td className="px-4 py-3">
                                            {(() => {
                                                const estatus = (pedido.estatus_pedido || '').toLowerCase().replace(/\s/g, '_')
                                                if (estatus === 'completado')
                                                    return <div className="w-5 h-5 rounded-full border-2 border-emerald-500 bg-emerald-500/20" title="Completado" />
                                                if (estatus === 'en_proceso')
                                                    return <div className="w-5 h-5 rounded-full border-2 border-amber-500 bg-amber-500/20" title="En proceso" />
                                                if (estatus === 'cancelado')
                                                    return <div className="w-5 h-5 rounded-full border-2 border-red-500 bg-red-500/20" title="Cancelado" />
                                                return <div className="w-5 h-5 rounded-full border-2 border-gray-400 bg-gray-400/20" title={pedido.estatus_pedido || '—'} />
                                            })()}
                                        </td>
                                        <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {pedido.estatus_pedido}
                                        </td>
                                        <td className="px-4 py-3">
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
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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

                {/* Paginación */}
                {last_page >= 1 && (() => {
                    const totalP = Math.max(1, last_page)
                    const { windowPages, showEllipsis, showLastPage } = getPaginationWindow(current_page, totalP)
                    return (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                                            num === current_page
                                                ? 'bg-emerald-600 text-white'
                                                : darkMode
                                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        {num}
                                    </button>
                                ))}
                                {showEllipsis && <span className={`px-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>…</span>}
                                {showLastPage && totalP > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setPaginaActual(totalP)}
                                        className={`min-w-[2.5rem] h-10 px-3 rounded-lg text-sm font-semibold ${
                                            current_page === totalP
                                                ? 'bg-emerald-600 text-white'
                                                : darkMode
                                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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

            {/* Modal detalle pedido */}
            {detallePedidoId != null && (
                <>
                    <div
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        onClick={() => setDetallePedidoId(null)}
                        aria-hidden
                    />
                    <div
                        className={`fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-50 sm:max-w-xl w-full rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col ${
                            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                        }`}
                    >
                        <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-emerald-600/20 border-b border-emerald-500/30">
                            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                Pedido {detallePedido?.folio ?? '…'}
                            </h3>
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
                                            <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{detallePedido.estado_pago} · {detallePedido.estatus_pedido}</p>
                                        </div>
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
                                                    {(detallePedido.items || []).map((it, i) => (
                                                        <tr key={i} className={darkMode ? 'bg-gray-800/50' : 'bg-white'}>
                                                            <td className={`px-3 py-2.5 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{it.nombre_producto}</td>
                                                            <td className={`px-3 py-2.5 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{it.cantidad}</td>
                                                            <td className={`px-3 py-2.5 text-right font-medium text-emerald-500`}>$ {Number(it.subtotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
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
