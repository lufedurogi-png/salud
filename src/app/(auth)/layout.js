'use client'

import Link from 'next/link'
import Image from 'next/image'
import { BRAND_LOGO_SRC, BRAND_NAME } from '@/lib/branding'
import { useDarkModePreference } from '@/hooks/useDarkModePreference'

const Layout = ({ children }) => {
    const { darkMode, setDarkMode } = useDarkModePreference()

    const pill = `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
        darkMode ? 'bg-gray-800/80 text-gray-200 hover:bg-gray-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
    }`

    return (
        <div className={`min-h-screen transition-colors duration-300 flex flex-col ${
            darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
        }`}>
            {/* Header */}
            <header className={`sticky top-0 z-50 border-b transition-colors duration-300 flex-shrink-0 ${
                darkMode ? 'bg-gray-900/95 backdrop-blur-sm border-gray-800' : 'bg-white/95 backdrop-blur-sm border-gray-200'
            }`}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="hidden md:flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center">
                            <Image
                                src={BRAND_LOGO_SRC}
                                alt={BRAND_NAME}
                                width={120}
                                height={40}
                                className="h-8 w-auto"
                            />
                        </Link>
                        <div className="flex items-center space-x-4">
                            {/* Toggle Modo Oscuro/Claro */}
                            <div className="flex items-center space-x-2">
                                <div className="relative w-5 h-5">
                                    <Image
                                        src="/Imagenes/icon_modo.webp"
                                        alt="Modo"
                                        width={20}
                                        height={20}
                                        className={`object-contain transition-all duration-300 ${
                                            darkMode 
                                                ? 'brightness-0 invert' 
                                                : ''
                                        }`}
                                    />
                                </div>
                                <button
                                    onClick={() => setDarkMode(!darkMode)}
                                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#B7962D] focus:ring-offset-2 ${
                                        darkMode 
                                            ? 'bg-[#2b4e94]' 
                                            : 'bg-gray-300'
                                    }`}
                                    aria-label="Toggle dark mode"
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${
                                            darkMode ? 'translate-x-8' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                                <span className={`text-xs font-medium ${
                                    darkMode ? 'text-[#B7962D]' : 'text-gray-500'
                                }`}>
                                    {darkMode ? 'Oscuro' : 'Claro'}
                                </span>
                            </div>
                            <Link
                                href="/"
                                className={`transition-colors font-medium ${
                                    darkMode ? 'text-gray-300 hover:text-[#B7962D]' : 'text-gray-700 hover:text-[#B7962D]'
                                }`}
                            >
                                Inicio
                            </Link>
                            <Link
                                href="/"
                                className={`transition-colors font-medium ${
                                    darkMode ? 'text-gray-300 hover:text-[#B7962D]' : 'text-gray-700 hover:text-[#B7962D]'
                                }`}
                            >
                                Tienda
                            </Link>
                        </div>
                    </div>

                    {/* Móvil: controles siempre visibles arriba (sticky), sin desplegable */}
                    <div className="md:hidden py-3 space-y-3">
                        <div className="flex justify-center">
                            <Link href="/" className="flex items-center">
                                <Image src={BRAND_LOGO_SRC} alt={BRAND_NAME} width={110} height={36} className="h-8 w-auto" />
                            </Link>
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
                                    onClick={() => setDarkMode(!darkMode)}
                                    className={`relative inline-flex h-6 w-12 shrink-0 items-center rounded-full transition-colors ${
                                        darkMode ? 'bg-[#2b4e94]' : 'bg-gray-300'
                                    }`}
                                    aria-label="Cambiar tema"
                                >
                                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                                <span className="text-xs font-medium">{darkMode ? 'Oscuro' : 'Claro'}</span>
                            </div>
                            <Link href="/" className={pill}>
                                Inicio
                            </Link>
                            <Link href="/" className={pill}>
                                Tienda
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Contenido Principal: altura mínima para que la cortina/form lleguen hasta abajo en pantalla completa */}
            <main className="flex-1 flex flex-col relative min-h-0 min-h-[calc(100vh-8rem)] md:min-h-[calc(100vh-4rem)]">
                {children}
            </main>
        </div>
    )
}

export default Layout
