'use client'

import dynamic from 'next/dynamic'
import ClientPageHeader from '@/components/client/ClientPageHeader'
import { themeTokens, useClientTheme } from '../ClientThemeContext'

const CharacterModelViewer = dynamic(
    () => import('@/components/client/CharacterModelViewer'),
    {
        ssr: false,
        loading: () => (
            <div
                className="flex w-full items-center justify-center"
                style={{ height: 'clamp(320px, 58vh, 560px)' }}
            >
                <p className="text-sm text-gray-500">Cargando modelo 3D…</p>
            </div>
        ),
    },
)

export default function CuerpoPage() {
    const { darkMode } = useClientTheme()
    const t = darkMode ? themeTokens.dark : themeTokens.light

    return (
        <div className="space-y-6">
            <ClientPageHeader
                title="Cuerpo"
                subtitle="Visualización y seguimiento corporal"
            />

            <section className={`overflow-hidden rounded-2xl ${t.card}`}>
                <CharacterModelViewer
                    darkMode={darkMode}
                    hint="Modelo humano en 3D. Mantén pulsado una zona del cuerpo para ver ejercicios."
                />
            </section>
        </div>
    )
}
