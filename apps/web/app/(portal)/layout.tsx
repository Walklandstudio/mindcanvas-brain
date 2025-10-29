import type { ReactNode } from 'react'
import { Card } from '@/@/components/ui/Card'


export default function PortalLayout({ children }: { children: ReactNode }) {
return (
<div className="min-h-dvh">
<header className="mc-hero">
<div className="mc-container py-6">
<div className="flex items-center justify-between">
<div>
<div className="text-xs/relaxed opacity-90">MindCanvas Portal</div>
<h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight">Your Organization Canvas</h1>
</div>
</div>
</div>
</header>
<main className="mc-container -mt-6">
<Card className="p-0">
{children}
</Card>
</main>
<footer className="mc-container py-8 text-sm text-[hsl(var(--mc-subtle))]">
© {new Date().getFullYear()} MindCanvas — Profiletest.ai
</footer>
</div>
)
}