import * as React from 'react'
import clsx from 'clsx'


export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
return <div className={clsx('mc-card', className)} {...props} />
}


export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
return <div className={clsx('px-6 pt-6', className)} {...props} />
}


export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
return <div className={clsx('px-6 pb-6', className)} {...props} />
}