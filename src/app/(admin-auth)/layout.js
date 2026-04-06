'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import ThemeToggle from '@/components/ThemeToggle'
import { AdminThemeProvider, useAdminTheme } from './AdminThemeContext'

function LayoutContent({ children }) {
    const { darkMode, setDarkMode } = useAdminTheme()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    useEffect(() => {
        if (!mobileMenuOpen) return undefined
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [mobileMenuOpen])

    return (
        <div className={`min-h-screen transition-colors duration-300 flex flex-col ${
            darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'
        }`}>
            <header className={`sticky top-0 z-50 border-b flex-shrink-0 ${
                darkMode ? 'bg-gray-900/95 backdrop-blur-sm border-gray-800' : 'bg-white/95 backdrop-blur-sm border-gray-200'
            }`} style={{ height: '4rem' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center">
                            <Image src="/Imagenes/logo_en.png" alt="NXT.IT" width={120} height={40} className="h-8 w-auto" />
                        </Link>
                        <div className="hidden md:block">
                            <ThemeToggle dark={darkMode} onToggle={() => setDarkMode((d) => !d)} />
                        </div>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className={`md:hidden rounded-md p-2 ${darkMode ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
                            aria-label="Abrir menú"
                        >
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>
            {mobileMenuOpen && (
                <>
                    <button
                        type="button"
                        aria-label="Cerrar menú"
                        onClick={() => setMobileMenuOpen(false)}
                        className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    />
                    <aside className={`fixed left-0 top-0 z-50 h-screen w-[85%] max-w-sm p-4 md:hidden ${darkMode ? 'bg-gray-900 border-r border-gray-800' : 'bg-white border-r border-gray-200'}`}>
                        <div className="mb-4 flex items-center justify-between">
                            <Image src="/Imagenes/logo_en.png" alt="NXT.IT" width={110} height={36} className="h-8 w-auto" />
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(false)}
                                className={`rounded-md p-2 ${darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
                                aria-label="Cerrar navegación"
                            >
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDarkMode((d) => !d)}
                            className={`w-full py-3 text-left font-medium border-t border-b border-gray-700/30 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
                        >
                            Tema: {darkMode ? 'Oscuro' : 'Claro'}
                        </button>
                        <Link
                            href="/"
                            onClick={() => setMobileMenuOpen(false)}
                            className={`block py-3 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
                        >
                            Inicio
                        </Link>
                    </aside>
                </>
            )}
            <main className="flex-1 flex flex-col min-h-[calc(100vh-4rem)]">{children}</main>
        </div>
    )
}

const Layout = ({ children }) => (
    <AdminThemeProvider>
        <LayoutContent>{children}</LayoutContent>
    </AdminThemeProvider>
)

export default Layout
