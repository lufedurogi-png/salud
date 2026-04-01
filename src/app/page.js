import { Suspense } from 'react'
import { getTiendaDataForSSR } from '@/lib/productos'
import TiendaClient from './tienda/TiendaClient'

/** Página principal: ahora muestra la tienda en /. */
export default async function HomePage() {
    const initialData = await getTiendaDataForSSR()
    return (
        <Suspense fallback={null}>
            <TiendaClient initialData={initialData} />
        </Suspense>
    )
}
