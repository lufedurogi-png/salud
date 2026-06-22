export const SEX_PRESET = {
    MASCULINO: 'Masculino',
    FEMENINO: 'Femenino',
    OTROS: 'Otros',
}

export const SEX_PRESET_OPTIONS = [
    SEX_PRESET.MASCULINO,
    SEX_PRESET.FEMENINO,
    SEX_PRESET.OTROS,
]

/** Interpreta el valor guardado en BD para el formulario admin. */
export function parseSex(stored) {
    if (stored === null || stored === undefined) {
        return { preset: '', other: '' }
    }
    const raw = String(stored)
    if (raw.trim() === '') {
        return { preset: '', other: '' }
    }
    const lower = raw.trim().toLowerCase()
    if (lower === 'masculino' || lower === 'hombre' || lower === 'm') {
        return { preset: SEX_PRESET.MASCULINO, other: '' }
    }
    if (lower === 'femenino' || lower === 'mujer' || lower === 'f') {
        return { preset: SEX_PRESET.FEMENINO, other: '' }
    }
    if (lower === 'otros') {
        return { preset: SEX_PRESET.OTROS, other: '' }
    }
    return { preset: SEX_PRESET.OTROS, other: raw }
}

/** Valor a persistir según preset + texto libre (Otros). */
export function serializeSex(preset, other) {
    if (preset === SEX_PRESET.MASCULINO) return SEX_PRESET.MASCULINO
    if (preset === SEX_PRESET.FEMENINO) return SEX_PRESET.FEMENINO
    if (preset === SEX_PRESET.OTROS) {
        if (other === null || other === undefined) return SEX_PRESET.OTROS
        return other === '' ? SEX_PRESET.OTROS : String(other)
    }
    return null
}

/** Texto legible para la vista perfil del cliente. */
export function formatSexDisplay(stored) {
    if (stored === null || stored === undefined || String(stored).trim() === '') return null
    const { preset, other } = parseSex(stored)
    if (preset === SEX_PRESET.OTROS) return other || SEX_PRESET.OTROS
    return preset
}
