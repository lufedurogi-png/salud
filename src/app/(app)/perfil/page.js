'use client'

import { useEffect, useRef, useState } from 'react'
import axios from '@/lib/axios'
import ClientPageHeader from '@/components/client/ClientPageHeader'
import { formatSexDisplay } from '@/lib/sexProfile'
import { resolveStorageUrl } from '@/lib/storageUrl'
import { themeTokens, useClientTheme } from '../ClientThemeContext'

const PROFILE_FIELDS = [
    ['Peso (kg)', 'weight_kg'],
    ['Estatura (cm)', 'height_cm'],
    ['Sexo', 'sex'],
    ['Medidas', 'measures'],
    ['Edad', 'age'],
    ['Edad metabólica', 'metabolic_age'],
]

const AVATAR_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

function formatProfileValue(key, value) {
    if (key === 'sex') {
        const display = formatSexDisplay(value)
        if (display === null) return '—'
        return display
    }
    if (value === null || value === undefined || value === '') return '—'
    return value
}

export default function PerfilPage() {
    const [profile, setProfile] = useState(null)
    const [alias, setAlias] = useState('')
    const [avatarUrl, setAvatarUrl] = useState(null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [avatarError, setAvatarError] = useState('')
    const fileInputRef = useRef(null)
    const { darkMode, setDarkMode } = useClientTheme()
    const t = darkMode ? themeTokens.dark : themeTokens.light

    useEffect(() => {
        ;(async () => {
            const { data } = await axios.get('/client/profile')
            const payload = data?.data || null
            setProfile(payload)
            setAlias(payload?.alias || '')
            setAvatarUrl(resolveStorageUrl(payload?.avatar_url))
        })()
    }, [])

    const saveAlias = async () => {
        await axios.put('/client/profile/alias', { alias })
    }

    const openAvatarPicker = () => {
        if (uploadingAvatar) return
        fileInputRef.current?.click()
    }

    const onAvatarSelected = async event => {
        const file = event.target.files?.[0]
        event.target.value = ''
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setAvatarError('Selecciona un archivo de imagen válido.')
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            setAvatarError('La imagen no puede superar 5 MB.')
            return
        }

        setAvatarError('')
        setUploadingAvatar(true)
        try {
            const formData = new FormData()
            formData.append('avatar', file)
            const { data } = await axios.post('/client/profile/avatar', formData, {
                transformRequest: [
                    (payload, headers) => {
                        if (headers) delete headers['Content-Type']
                        return payload
                    },
                ],
            })
            const url = resolveStorageUrl(data?.data?.avatar_url)
            if (url) {
                setAvatarUrl(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`)
                setProfile(prev => (prev ? { ...prev, avatar_url: url } : prev))
            }
        } catch (e) {
            setAvatarError(
                e?.response?.data?.message ||
                    e?.response?.data?.errors?.avatar?.[0] ||
                    'No se pudo subir la foto de perfil.',
            )
        } finally {
            setUploadingAvatar(false)
        }
    }

    const inputClass = `w-full rounded-xl border px-3 py-2 text-sm ${
        darkMode ? 'border-gray-700 bg-[#111827] text-white' : 'border-[#E5DECF] bg-white text-gray-900'
    }`

    return (
        <div className="space-y-6 lg:space-y-8">
            <ClientPageHeader title="Perfil" subtitle="Tu progreso y datos" />

            <div className="lg:grid lg:grid-cols-[minmax(220px,280px)_1fr] lg:items-start lg:gap-8">
                <div className="flex flex-col items-center lg:sticky lg:top-24">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={AVATAR_ACCEPT}
                        className="sr-only"
                        aria-hidden
                        onChange={onAvatarSelected}
                    />
                    <button
                        type="button"
                        onClick={openAvatarPicker}
                        disabled={uploadingAvatar}
                        className={`group relative block h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 p-0 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B7962D] focus-visible:ring-offset-2 disabled:opacity-70 sm:h-28 sm:w-28 lg:h-32 lg:w-32 ${
                            darkMode ? 'border-gray-600 bg-gray-200' : 'border-white bg-[#F0EBE0] shadow-lg'
                        }`}
                        aria-label="Cambiar foto de perfil"
                    >
                        {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={avatarUrl}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover object-center"
                                onError={() => {
                                    setAvatarUrl(null)
                                    setAvatarError('No se pudo mostrar la foto. Intenta subirla de nuevo.')
                                }}
                            />
                        ) : (
                            <span className="absolute inset-0 flex items-center justify-center bg-white">
                                <svg
                                    className="h-12 w-12 text-gray-700 sm:h-14 sm:w-14"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 12a4 4 0 110-8 4 4 0 010 8zm-7 8a7 7 0 1114 0"
                                    />
                                </svg>
                            </span>
                        )}
                        <span
                            className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition ${
                                uploadingAvatar
                                    ? 'bg-black/45'
                                    : 'bg-black/0 group-hover:bg-black/30'
                            }`}
                        >
                            {uploadingAvatar ? (
                                <span className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            ) : (
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#B7962D] text-white shadow-md opacity-0 transition group-hover:opacity-100 sm:h-10 sm:w-10">
                                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                </span>
                            )}
                        </span>
                    </button>
                    <p className={`mt-2 text-center text-xs ${t.textSub}`}>
                        Toca el icono para cambiar tu foto
                    </p>
                    {avatarError ? (
                        <p className="mt-1 max-w-[220px] text-center text-xs text-red-600 dark:text-red-400">
                            {avatarError}
                        </p>
                    ) : null}
                    <div className="mt-4 text-center lg:mt-6">
                        <p className="text-2xl font-black sm:text-3xl">
                            {profile?.name} {profile?.last_name}
                        </p>
                        <p className={`mt-1 text-sm ${t.textSub}`}>{profile?.email}</p>
                    </div>
                </div>

                <section className={`rounded-2xl ${t.card}`}>
                    <div className="flex flex-col gap-3 border-b border-inherit p-4 sm:flex-row sm:items-center sm:p-5">
                        <label className={`text-sm font-semibold ${t.textSub}`}>Alias</label>
                        <input value={alias} onChange={e => setAlias(e.target.value)} className={inputClass} />
                        <button
                            type="button"
                            onClick={saveAlias}
                            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold text-white sm:w-auto ${t.accentBg}`}
                        >
                            Guardar
                        </button>
                    </div>

                    <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                        {PROFILE_FIELDS.map(([label, key]) => (
                            <div key={label}>
                                <p className={`mb-1.5 text-sm font-semibold ${t.textSub}`}>{label}</p>
                                <div className={`rounded-xl px-4 py-3 text-xl font-bold sm:text-2xl ${t.cardMuted}`}>
                                    {formatProfileValue(key, profile?.[key])}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4 border-t border-inherit p-4 sm:p-5">
                        <div className={`flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between ${t.cardMuted}`}>
                            <div>
                                <p className="text-xl font-black sm:text-2xl">Apariencia</p>
                                <p className={`text-sm ${t.textSub}`}>Modo activo: {darkMode ? 'oscuro' : 'claro'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDarkMode(v => !v)}
                                className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition ${darkMode ? 'bg-[#B7962D]' : 'bg-gray-300'}`}
                                aria-label="Cambiar tema"
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${darkMode ? 'translate-x-8' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>

                        <button
                            type="button"
                            className={`w-full rounded-xl border py-3 text-lg font-bold sm:max-w-xs ${
                                darkMode ? 'border-gray-700 text-[#D6B45B]' : 'border-[#E5DECF] text-[#A88A2B]'
                            }`}
                        >
                            Cambiar contraseña
                        </button>
                    </div>
                </section>
            </div>
        </div>
    )
}
