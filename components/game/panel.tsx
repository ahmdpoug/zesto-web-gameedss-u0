'use client'

import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

export function Panel({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
}) {
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ref.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-[#060b14]/60 backdrop-blur-[2px] animate-in fade-in"
        onClick={onClose}
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-popover shadow-2xl outline-none animate-in slide-in-from-bottom-8 duration-300 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id={titleId} className="font-display text-2xl font-semibold leading-tight text-balance">
              {title}
            </h2>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground text-pretty">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition hover:bg-secondary/80"
          >
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
      </div>
    </div>
  )
}
