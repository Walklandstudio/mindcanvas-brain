import './globals.css'
import '../styles/branding.css'
import type { ReactNode } from 'react'
import { Inter, Manrope } from 'next/font/google'


const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })


export default function RootLayout({ children }: { children: ReactNode }) {
return (
<html lang="en" className={`${inter.variable} ${manrope.variable}`}>
<body className="min-h-dvh antialiased">
{children}
</body>
</html>
)
}
