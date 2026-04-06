'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/hooks/auth'
import SearchBar from '@/components/SearchBar'
import { useCarrito } from '@/lib/carrito'
import { useFavoritos } from '@/lib/favoritos'
import { useProductosByClaves } from '@/hooks/useProductosChunked'
import IconoNavegacion from '@/components/IconoNavegacion'

/**
 * Barra de navegación de la tienda: logo, toggle oscuro, Favoritos, Carrito, Tienda, Inicio.
 * Prefetch de datos de favoritos y carrito para que al abrir esas vistas carguen al instante.
 * @param {() => void} [onOpenLeftSidebar] — Móvil: abre el panel izquierdo (filtros/categorías). Opcional.
 */
export default function TiendaNavHeader({ darkMode, setDarkMode, onOpenLeftSidebar }) {
    const { user, logout } = useAuth({ middleware: 'guest' })
    const [userDropdownOpen, setUserDropdownOpen] = useState(false)
    const [hasToken, setHasToken] = useState(false)
    useEffect(() => {
        setHasToken(typeof window !== 'undefined' && !!localStorage.getItem('auth_token'))
    }, [])
    const isLogged = !!user || hasToken
    const { items: cartItems } = useCarrito(isLogged)
    const cartCount = (cartItems || []).reduce((s, i) => s + (Number(i.cantidad) || 0), 0)
    const { claves: favoritosClaves } = useFavoritos(isLogged)
    const favoritosCount = favoritosClaves?.length ?? 0

    const cartKeys = (cartItems || []).map((i) => i.clave)

    useProductosByClaves(isLogged ? [] : cartKeys, 'cart-productos')

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userDropdownOpen && !e.target.closest('.tienda-nav-user-dropdown')) {
                setUserDropdownOpen(false)
            }
        }
        document.addEventListener('click', handleClickOutside)
        return () => document.removeEventListener('click', handleClickOutside)
    }, [userDropdownOpen])

    const toggleDark = () => {
        const next = !darkMode
        setDarkMode(next)
        localStorage.setItem('darkMode', JSON.stringify(next))
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('darkModeChange', { detail: next }))
        }
    }

    const pill = `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
        darkMode ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }`

    return (
        <header
            className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
                darkMode ? 'bg-gray-900/95 backdrop-blur-sm border-gray-800' : 'bg-white/95 backdrop-blur-sm border-gray-200'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="hidden md:flex items-center justify-between h-16 gap-4">
                    <Link href="/" className="flex items-center shrink-0">
                        <Image src="/Imagenes/logo_en.png" alt="Todo para oficina" width={120} height={40} className="h-8 w-auto" />
                    </Link>
                    <div className="flex-1 max-w-md">
                        <SearchBar darkMode={darkMode} />
                    </div>
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                        <div className="flex items-center space-x-2">
                            <div className="relative w-5 h-5">
                                <Image
                                    src="/Imagenes/icon_modo.webp"
                                    alt="Modo"
                                    width={20}
                                    height={20}
                                    className={`object-contain transition-all duration-300 ${darkMode ? 'brightness-0 invert' : ''}`}
                                />
                            </div>
                            <button
                                onClick={toggleDark}
                                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#FF8000] focus:ring-offset-2 ${
                                    darkMode ? 'bg-[#2b4e94]' : 'bg-gray-300'
                                }`}
                                aria-label="Cambiar tema"
                            >
                                <span className={`inline-block h-5 w-5 rounded-full bg-white transition-transform duration-300 ${darkMode ? 'translate-x-8' : 'translate-x-1'}`} />
                            </button>
                            <span className={`text-xs font-medium ${darkMode ? 'text-[#FF8000]' : 'text-gray-500'}`}>
                                {darkMode ? 'Oscuro' : 'Claro'}
                            </span>
                        </div>
                        {user && (
                            <Link
                                href="/favoritos"
                                className={`flex items-center gap-1.5 transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-[#FF8000]' : 'text-gray-700 hover:text-[#FF8000]'}`}
                                aria-label="Favoritos"
                            >
                                <Image
                                    src="/Imagenes/icon_favoritos.png"
                                    alt="Favoritos"
                                    width={22}
                                    height={22}
                                    className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                                />
                                <span>Favoritos</span>
                                {favoritosCount > 0 && (
                                    <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#FF8000] text-white text-xs font-semibold">
                                        {favoritosCount > 99 ? '99+' : favoritosCount}
                                    </span>
                                )}
                            </Link>
                        )}
                        <Link
                            href="/tienda/carrito"
                            className={`flex items-center gap-1.5 transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-[#FF8000]' : 'text-gray-700 hover:text-[#FF8000]'}`}
                            aria-label="Carrito"
                        >
                            <Image
                                src="/Imagenes/icon_carrito.png"
                                alt="Carrito"
                                width={22}
                                height={22}
                                className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                            />
                            <span>Carrito</span>
                            {cartCount > 0 && (
                                <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-[#FF8000] text-white text-xs font-semibold">
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                        </Link>
                        <Link href="/" className={`transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-[#FF8000]' : 'text-gray-700 hover:text-[#FF8000]'}`}>
                            Tienda
                        </Link>
                        <Link href="/" className={`transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-[#FF8000]' : 'text-gray-700 hover:text-[#FF8000]'}`}>
                            Inicio
                        </Link>
                        {user ? (
                            <div className="relative tienda-nav-user-dropdown">
                                <button
                                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                    className={`flex items-center space-x-2 transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-[#FF8000]' : 'text-gray-700 hover:text-[#FF8000]'}`}
                                >
                                    <span>Tienda: {user?.name || user?.email}</span>
                                    <svg className={`w-4 h-4 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                {userDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setUserDropdownOpen(false)} aria-hidden />
                                        <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg border z-20 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                                            <div className="py-1">
                                                <Link
                                                    href="/dashboard"
                                                    onClick={() => setUserDropdownOpen(false)}
                                                    className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-[#FF8000]' : 'text-gray-700 hover:bg-gray-100 hover:text-[#FF8000]'}`}
                                                >
                                                    <Image src="/Imagenes/icon_home.webp" alt="" width={20} height={20} className={`mr-3 object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                                    Home
                                                </Link>
                                                <Link
                                                    href="/dashboard"
                                                    onClick={() => setUserDropdownOpen(false)}
                                                    className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-[#FF8000]' : 'text-gray-700 hover:bg-gray-100 hover:text-[#FF8000]'}`}
                                                >
                                                    <Image src="/Imagenes/icon_pedidos.png" alt="" width={20} height={20} className={`mr-3 object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                                    Mis pedidos
                                                </Link>
                                                <Link
                                                    href="/favoritos"
                                                    onClick={() => setUserDropdownOpen(false)}
                                                    className={`flex items-center px-4 py-2 text-sm transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-[#FF8000]' : 'text-gray-700 hover:bg-gray-100 hover:text-[#FF8000]'}`}
                                                >
                                                    <Image src="/Imagenes/icon_favoritos.png" alt="" width={20} height={20} className={`mr-3 object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                                    Favoritos
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        setUserDropdownOpen(false)
                                                        logout()
                                                    }}
                                                    className={`w-full flex items-center px-4 py-2 text-sm transition-colors text-left ${darkMode ? 'text-gray-300 hover:bg-gray-700 hover:text-[#FF8000]' : 'text-gray-700 hover:bg-gray-100 hover:text-[#FF8000]'}`}
                                                >
                                                    <Image src="/Imagenes/icon_cerrar_sesion.webp" alt="" width={20} height={20} className={`mr-3 object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                                    Cerrar
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <Link href="/login" className={`transition-colors font-medium ${darkMode ? 'text-gray-300 hover:text-[#FF8000]' : 'text-gray-700 hover:text-[#FF8000]'}`}>
                                Iniciar sesión
                            </Link>
                        )}
                    </div>
                </div>

                {/* Móvil: barra superior fija (sticky) con bloques que se acomodan con flex-wrap; sin menú desplegable */}
                <div className="md:hidden py-3 space-y-3">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                        {typeof onOpenLeftSidebar === 'function' ? (
                            <button
                                type="button"
                                onClick={onOpenLeftSidebar}
                                className={`shrink-0 rounded-xl p-2 transition-colors ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                                aria-label="Abrir panel lateral"
                            >
                                <IconoNavegacion darkMode={darkMode} />
                            </button>
                        ) : (
                            <span className="w-11 shrink-0" aria-hidden />
                        )}
                        <Link href="/" className="flex min-w-0 flex-1 justify-center">
                            <Image src="/Imagenes/logo_en.png" alt="Todo para oficina" width={108} height={36} className="h-8 w-auto max-w-[min(100%,200px)]" />
                        </Link>
                        <Link
                            href="/tienda/carrito"
                            className={`relative inline-flex shrink-0 items-center justify-center rounded-xl p-2 transition-colors ${
                                darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                            }`}
                            aria-label="Carrito"
                        >
                            <Image
                                src="/Imagenes/icon_carrito.png"
                                alt=""
                                width={24}
                                height={24}
                                className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                            />
                            {cartCount > 0 && (
                                <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.05rem] items-center justify-center rounded-full bg-[#FF8000] px-1 text-[10px] font-semibold text-white">
                                    {cartCount > 99 ? '99+' : cartCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    <div className="min-w-0 w-full">
                        <SearchBar darkMode={darkMode} className="max-w-none w-full" />
                    </div>

                    <div className={`flex flex-wrap items-center gap-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                        <div className={`flex flex-wrap items-center gap-2 ${pill}`}>
                            <Image
                                src="/Imagenes/icon_modo.webp"
                                alt=""
                                width={18}
                                height={18}
                                className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`}
                            />
                            <button
                                type="button"
                                onClick={toggleDark}
                                className={`relative inline-flex h-6 w-12 shrink-0 items-center rounded-full transition-colors ${
                                    darkMode ? 'bg-[#2b4e94]' : 'bg-gray-300'
                                }`}
                                aria-label="Cambiar tema"
                            >
                                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-1'}`} />
                            </button>
                            <span className="text-xs font-medium">{darkMode ? 'Oscuro' : 'Claro'}</span>
                        </div>
                        {user && (
                            <Link href="/favoritos" className={pill}>
                                <Image src="/Imagenes/icon_favoritos.png" alt="" width={18} height={18} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                Favoritos
                                {favoritosCount > 0 && (
                                    <span className="rounded-full bg-[#FF8000] px-1.5 text-[11px] font-semibold text-white">{favoritosCount > 99 ? '99+' : favoritosCount}</span>
                                )}
                            </Link>
                        )}
                        <Link href="/tienda/carrito" className={pill}>
                            <Image src="/Imagenes/icon_carrito.png" alt="" width={18} height={18} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                            Carrito
                            {cartCount > 0 && (
                                <span className="rounded-full bg-[#FF8000] px-1.5 text-[11px] font-semibold text-white">{cartCount > 99 ? '99+' : cartCount}</span>
                            )}
                        </Link>
                        <Link href="/" className={pill}>
                            Tienda
                        </Link>
                        <Link href="/" className={pill}>
                            Inicio
                        </Link>
                        {!user && (
                            <Link href="/login" className={pill}>
                                Iniciar sesión
                            </Link>
                        )}
                    </div>

                    {user && (
                        <div className={`flex flex-wrap items-center gap-2 border-t pt-2 ${darkMode ? 'border-gray-700/60' : 'border-gray-200'}`}>
                            <span className={`w-full text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                                Cuenta · {user?.name || user?.email}
                            </span>
                            <Link href="/dashboard" className={pill}>
                                <Image src="/Imagenes/icon_home.webp" alt="" width={16} height={16} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                Home
                            </Link>
                            <Link href="/dashboard" className={pill}>
                                <Image src="/Imagenes/icon_pedidos.png" alt="" width={16} height={16} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                Pedidos
                            </Link>
                            <Link href="/favoritos" className={pill}>
                                <Image src="/Imagenes/icon_favoritos.png" alt="" width={16} height={16} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                Favoritos
                            </Link>
                            <button type="button" onClick={() => logout()} className={`${pill} text-left`}>
                                <Image src="/Imagenes/icon_cerrar_sesion.webp" alt="" width={16} height={16} className={`object-contain ${darkMode ? 'brightness-0 invert' : ''}`} />
                                Salir
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
