import * as React from 'react'
import clsx from 'clsx'


type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
variant?: 'primary' | 'ghost' | 'neutral'
}


export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
const base = 'mc-btn'
const variants: Record<typeof variant, string> = {
primary: 'mc-btn-primary',
ghost: 'mc-btn-ghost',
neutral: 'mc-btn bg-white text-[hsl(var(--mc-text))] border border-[hsl(var(--mc-border))] hover:bg-gray-50'
}
return <button className={clsx(base, variants[variant], className)} {...props} />
}

