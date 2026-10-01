'use client'

import Image from 'next/image'
import { ExternalLink, Shovel, Star } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { DigResult } from '@/hooks/use-zesto'
import { EXPLORER_URL } from '@/lib/zesto/config'
import { RESOURCE_META, type ResourceId } from '@/lib/zesto/economy'
import { ResourceIcon } from './resource-icon'

export function RewardReveal({
  result,
  onClose,
  onDigAgain,
}: {
  result: DigResult
  onClose: () => void
  onDigAgain: () => void
}) {
  const { rarity } = result
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`You found a ${rarity.label} ${rarity.item}`}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#060b14]/75 p-4 backdrop-blur-sm animate-in fade-in"
    >
      <div
        aria-hidden="true"
        className="animate-rays pointer-events-none absolute left-1/2 top-1/2 size-[160vmax] -translate-x-1/2 -translate-y-1/2 opacity-40"
        style={{
          background: `repeating-conic-gradient(from 0deg, ${rarity.color}55 0deg 8deg, transparent 8deg 22deg)`,
          maskImage: 'radial-gradient(circle, black 0%, transparent 45%)',
          WebkitMaskImage: 'radial-gradient(circle, black 0%, transparent 45%)',
        }}
      />

      <div className="relative flex w-full max-w-sm flex-col items-center text-center">
        <p
          className="rounded-full px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.2em] animate-in fade-in slide-in-from-top-2"
          style={{ background: `${rarity.color}26`, color: rarity.color, boxShadow: `inset 0 0 0 1px ${rarity.color}66` }}
        >
          {rarity.label} find
        </p>

        <div className="relative mt-4 size-48 sm:size-56">
          <span
            aria-hidden="true"
            className="absolute inset-4 rounded-full blur-2xl"
            style={{ background: rarity.color, opacity: 0.55 }}
          />
          <div className="animate-rise-in relative size-full">
            <Image src={rarity.image || '/placeholder.svg'} alt={rarity.item} fill sizes="224px" className="object-contain drop-shadow-2xl" />
          </div>
        </div>

        <h2 className="mt-2 font-display text-3xl font-bold leading-tight text-balance">{rarity.item}</h2>

        <p className="mt-3 font-display text-5xl font-bold tabular-nums text-primary animate-in zoom-in-50 duration-500">
          {`+${result.points.toLocaleString()}`}
          <span className="ml-1 text-lg font-semibold text-foreground/80">pts</span>
        </p>

        <ul className="mt-3 flex flex-wrap justify-center gap-1.5 text-xs">
          <li className="rounded-full bg-secondary px-2.5 py-1">{`Base ${result.basePoints}`}</li>
          {result.perkPercent > 0 ? (
            <li className="rounded-full bg-secondary px-2.5 py-1 text-accent">{`Perk +${result.perkPercent}%`}</li>
          ) : null}
          {result.levelPercent > 0 ? (
            <li className="rounded-full bg-secondary px-2.5 py-1 text-primary">{`Level +${result.levelPercent}%`}</li>
          ) : null}
          {result.homesteadPercent > 0 ? (
            <li className="rounded-full bg-secondary px-2.5 py-1 text-[#ffc94d]">{`Homestead +${result.homesteadPercent}%`}</li>
          ) : null}
        </ul>

        {Object.keys(result.materials ?? {}).length > 0 ? (
          <ul className="mt-2 flex flex-wrap justify-center gap-1.5 text-xs" aria-label="Materials found">
            {(Object.entries(result.materials) as [ResourceId, number][]).map(([k, v]) => (
              <li key={k} className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                <ResourceIcon id={k} className="size-3.5" />
                <span className="tabular-nums">{`+${v} ${RESOURCE_META[k].label}`}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {result.leveledUp ? (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 font-display text-sm font-bold text-primary-foreground animate-in zoom-in">
            <Star className="size-4" aria-hidden="true" />
            {`Level up! You're now Lv ${result.level}`}
          </p>
        ) : null}

        <p className="mt-4 text-sm text-muted-foreground">
          {`Total: ${result.totalPoints.toLocaleString()} pts · ${result.totalDigs} digs`}
        </p>

        <div className="mt-5 flex w-full gap-2">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-2xl bg-secondary font-semibold transition hover:bg-secondary/80"
          >
            Back to beach
          </button>
          <button
            type="button"
            onClick={onDigAgain}
            className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-b from-[#ffc069] to-[#ff8a2a] font-display font-bold text-primary-foreground shadow-[0_10px_28px_-8px_#ff8a2a] transition hover:brightness-105 active:scale-95"
          >
            <Shovel className="size-4" aria-hidden="true" />
            Hunt next X
          </button>
        </div>

        <a
          href={`${EXPLORER_URL}/tx/${result.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          View transaction
          <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}
