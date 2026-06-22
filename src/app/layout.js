import { Nunito, Playfair_Display, VT323 } from 'next/font/google'
import ThemeInitScript from '@/components/ThemeInitScript'
import '@/app/global.css'

const nunitoFont = Nunito({
    subsets: ['latin'],
    display: 'swap',
})

const playfairDisplay = Playfair_Display({
    subsets: ['latin'],
    weight: ['400', '600', '700'],
    display: 'swap',
    variable: '--font-playfair',
})

const vt323 = VT323({
    subsets: ['latin'],
    weight: ['400'],
    display: 'swap',
    variable: '--font-vt323',
})

const RootLayout = ({ children }) => {
    return (
        <html
            lang="es"
            suppressHydrationWarning
            className={`${nunitoFont.className} ${playfairDisplay.variable} ${vt323.variable}`}
        >
            <head>
                <ThemeInitScript />
            </head>
            <body className="antialiased bg-gray-950 w-full overflow-x-hidden" suppressHydrationWarning>
                {children}
            </body>
        </html>
    )
}

import { BRAND_LOGO_SRC, BRAND_TITLE } from '@/lib/branding'

export const metadata = {
    title: BRAND_TITLE,
    icons: {
        icon: BRAND_LOGO_SRC,
        shortcut: BRAND_LOGO_SRC,
        apple: BRAND_LOGO_SRC,
    },
}

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
}

export default RootLayout
