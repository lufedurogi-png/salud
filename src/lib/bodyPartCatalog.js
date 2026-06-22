/** Catálogo de regiones corporales y ejercicios sugeridos. */
export const BODY_PARTS = {
    cabeza: {
        id: 'cabeza',
        label: 'Cabeza',
        description: 'Cuida la postura cervical y evita tensión en mandíbula y cuello.',
        exercises: [
            'Estiramientos cervicales suaves',
            'Rotaciones de cuello controladas',
            'Relajación de mandíbula y respiración diafragmática',
        ],
    },
    cuello: {
        id: 'cuello',
        label: 'Cuello',
        description: 'Zona clave para aliviar rigidez por postura o estrés.',
        exercises: [
            'Inclinaciones laterales de cuello',
            'Retracción de barbilla (chin tuck)',
            'Movilidad cervical en círculos lentos',
        ],
    },
    pecho: {
        id: 'pecho',
        label: 'Pecho',
        description: 'Fortalece el tórax y mejora la capacidad respiratoria.',
        exercises: [
            'Flexiones de pecho (o en pared)',
            'Aperturas con banda elástica',
            'Press de pecho con mancuernas ligeras',
        ],
    },
    abdomen: {
        id: 'abdomen',
        label: 'Abdomen',
        description: 'Core estable para proteger la espalda y mejorar el equilibrio.',
        exercises: [
            'Plancha frontal',
            'Crunch abdominal controlado',
            'Dead bug (bicho muerto)',
        ],
    },
    cadera: {
        id: 'cadera',
        label: 'Cadera',
        description: 'Mantén movilidad y estabilidad en la articulación de la cadera.',
        exercises: [
            'Puente de glúteos',
            'Estiramiento de flexores de cadera',
            'Clamshell con banda elástica',
        ],
    },
    muslo: {
        id: 'muslo',
        label: 'Muslo',
        description: 'Cuádriceps e isquiotibiales para caminar, subir y bajar escaleras.',
        exercises: [
            'Sentadillas parciales',
            'Zancadas estáticas',
            'Extensión de rodilla sentado',
        ],
    },
    pierna_inferior: {
        id: 'pierna_inferior',
        label: 'Pierna inferior',
        description: 'Pantorrilla y tobillo: impulso al caminar y estabilidad.',
        exercises: [
            'Elevaciones de talón',
            'Estiramiento de gemelos en pared',
            'Sentadilla de pantorrilla en un pie',
        ],
    },
    pie: {
        id: 'pie',
        label: 'Pie',
        description: 'Base de apoyo; fortalece arco y movilidad del tobillo.',
        exercises: [
            'Flexo-extensión de dedos',
            'Rodar el pie sobre una pelota',
            'Equilibrio en un solo pie',
        ],
    },
    brazo_superior: {
        id: 'brazo_superior',
        label: 'Brazo superior',
        description: 'Hombro y bíceps para empujar, levantar y sostener objetos.',
        exercises: [
            'Curl de bíceps con mancuernas',
            'Elevaciones laterales de hombro',
            'Flexiones en pared',
        ],
    },
    antebrazo: {
        id: 'antebrazo',
        label: 'Antebrazo',
        description: 'Mejora agarre y resistencia en actividades diarias.',
        exercises: [
            'Curl de muñeca con mancuerna',
            'Extensión de muñeca',
            'Apretón con pelota de estrés',
        ],
    },
    mano: {
        id: 'mano',
        label: 'Mano',
        description: 'Destreza y fuerza de agarre para tareas cotidianas.',
        exercises: [
            'Apertura y cierre de dedos con banda',
            'Estiramiento de flexores de dedos',
            'Pinza pulgar-índice con resistencia',
        ],
    },
}

/**
 * Clasifica un punto en espacio local del modelo (centrado, altura ~TARGET_HEIGHT).
 * @param {{ x: number, y: number, z: number }} point
 */
export function classifyBodyPart(point) {
    const { x, y } = point
    const ax = Math.abs(x)

    if (ax >= 0.36) {
        if (y > 0.28) return 'brazo_superior'
        if (y > -0.12) return 'antebrazo'
        return 'mano'
    }

    if (y < -0.24) {
        if (y < -1.08) return 'pie'
        if (y < -0.74) return 'pierna_inferior'
        return 'muslo'
    }

    if (y > 0.96) return 'cabeza'
    if (y > 0.78) return 'cuello'
    if (y > 0.38) return 'pecho'
    if (y > -0.02) return 'abdomen'
    return 'cadera'
}

export function getBodyPartInfo(partId) {
    return BODY_PARTS[partId] ?? null
}
