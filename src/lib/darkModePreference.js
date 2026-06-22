export const DARK_MODE_STORAGE_KEY = 'darkMode'

export function readDarkModePreference() {
    if (typeof window === 'undefined') return true
    try {
        const saved = localStorage.getItem(DARK_MODE_STORAGE_KEY)
        if (saved === null) return true
        return JSON.parse(saved)
    } catch {
        return true
    }
}

export function writeDarkModePreference(darkMode) {
    if (typeof window === 'undefined') return
    try {
        localStorage.setItem(DARK_MODE_STORAGE_KEY, JSON.stringify(darkMode))
    } catch {
        /* quota / modo privado */
    }
    applyDarkModeClass(darkMode)
    window.dispatchEvent(new CustomEvent('darkModeChange', { detail: darkMode }))
}

export function applyDarkModeClass(darkMode) {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('dark', Boolean(darkMode))
}
