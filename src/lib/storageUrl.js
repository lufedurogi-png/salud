/**
 * Convierte la URL de storage de Laravel al origen real del API (p. ej. 127.0.0.1:8000).
 */
export function resolveStorageUrl(url) {
    if (!url) return null

    const apiBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000/api/v1'
    const apiOrigin = apiBase.replace(/\/api\/v1\/?$/, '')

    if (url.startsWith('/storage/')) {
        return `${apiOrigin}${url}`
    }

    try {
        const parsed = new URL(url)
        if (parsed.pathname.startsWith('/storage/')) {
            return `${apiOrigin}${parsed.pathname}`
        }
    } catch {
        return url
    }

    return url
}
