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
            <header className={`sticky top-0 z-50 border-b flex-shrink-0 relative ${
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
                            onClick={() => setMobileMenuOpen((o) => !o)}
                            className={`md:hidden inline-flex items-center gap-1 rounded-md px-2 py-2 text-sm font-semibold ${darkMode ? 'text-gray-200 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
                            aria-expanded={mobileMenuOpen}
                            aria-label="Menú"
                        >
                            Menú
                            <svg className={`h-5 w-5 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                </div>
                {mobileMenuOpen && (
                    <>
                        <button
                            type="button"
                            aria-label="Cerrar menú"
                            onClick={() => setMobileMenuOpen(false)}
                            className="fixed inset-0 z-40 bg-black/50 md:hidden"
                        />
                        <div
                            className={`md:hidden absolute left-0 right-0 top-full z-50 max-h-[min(70vh,360px)] overflow-y-auto border-b shadow-lg ${
                                darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
                            }`}
                        >
                            <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
                                <div className="flex items-center justify-between rounded-lg border border-gray-700/30 px-3 py-2">
                                    <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Tema</span>
                                    <ThemeToggle dark={darkMode} onToggle={() => setDarkMode((d) => !d)} />
                                </div>
                                <Link
                                    href="/"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`block py-2 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
                                >
                                    Inicio
                                </Link>
                            </div>
                        </div>
                    </>
                )}
            </header>
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
