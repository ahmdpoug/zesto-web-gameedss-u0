'use client'

import Image from 'next/image'
import { ArrowLeft, Check, Lock, LoaderCircle, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { CHARACTERS, type CharacterId } from '@/lib/zesto/config'
import { SIGNUP_BONUS } from '@/lib/zesto/economy'
import { cn } from '@/lib/utils'

export function CharacterSelect({
  onConfirm,
  submitting,
}: {
  onConfirm: (id: CharacterId) => void
  submitting: boolean
}) {
  const [picked, setPicked] = useState<CharacterId>('blu')
  const [confirming, setConfirming] = useState(false)
  const hero = CHARACTERS.find((c) => c.id === picked)!

  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-[radial-gradient(120%_80%_at_50%_0%,rgb(13_21_36/0.6),rgb(8_12_22/0.94))] backdrop-blur-[3px]">
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 pb-6 pt-6 sm:px-6 sm:pt-12">
        <div className="text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary">
            <Lock className="size-3.5" aria-hidden="true" />
            Step 2 of 2 · One-time choice
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold leading-none tracking-tight text-balance sm:text-5xl">
            Choose your Zesto
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground text-pretty sm:text-base">
            Your character is bound to this wallet forever. Pick the perk that fits how you want to play.
          </p>
        </div>

        <ul className="mt-5 grid grid-cols-4 gap-2 sm:mt-8 sm:gap-4" role="radiogroup" aria-label="Characters">
          {CHARACTERS.map((c) => {
            const selected = c.id === picked
            return (
              <li key={c.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={submitting}
                  onClick={() => {
                    setPicked(c.id)
                    setConfirming(false)
                  }}
                  className={cn(
                    'group relative block w-full overflow-hidden rounded-2xl border-2 text-left transition duration-300',
                    selected ? 'scale-[1.02] border-primary' : 'border-transparent opacity-75 hover:opacity-100',
                  )}
                  style={{ boxShadow: selected ? `0 16px 40px -12px ${c.color}` : undefined }}
                >
                  <span className="relative block aspect-[4/5]">
                    <Image
                      src={c.image || '/placeholder.svg'}
                      alt={`${c.name}, ${c.title}`}
                      fill
                      sizes="(min-width: 640px) 220px, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                    <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-2 sm:p-3">
                      <span className="block font-display text-sm font-semibold sm:text-xl">{c.name}</span>
                      <span className="hidden text-xs text-white/75 sm:block">{c.title}</span>
                    </span>
                    {selected ? (
                      <span className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3.5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="glass sticky bottom-0 mt-5 rounded-3xl p-3 sm:mt-8 sm:p-4">
          {confirming ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-2.5 px-1">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                <p className="text-sm text-pretty">
                  <span className="font-semibold">{`Lock in ${hero.name}?`}</span>{' '}
                  <span className="text-muted-foreground">This cannot be changed later.</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={submitting}
                  className="flex h-12 items-center gap-1.5 rounded-2xl bg-secondary px-4 text-sm font-semibold transition hover:bg-secondary/80"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => onConfirm(picked)}
                  disabled={submitting}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#ffc069] to-[#ff8a2a] px-6 font-display text-base font-bold text-primary-foreground shadow-[0_10px_28px_-8px_#ff8a2a] transition hover:brightness-105 active:scale-95 disabled:opacity-70 sm:flex-none"
                >
                  {submitting ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Lock className="size-4" aria-hidden="true" />}
                  {submitting ? 'Creating account…' : `Confirm ${hero.name}`}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 px-1">
                <p className="font-display text-lg font-semibold leading-tight">
                  {hero.name} <span className="text-sm font-medium text-muted-foreground">{hero.title}</span>
                </p>
                <p className="mt-0.5 text-sm" style={{ color: hero.color }}>
                  {hero.perkLabel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="h-12 rounded-2xl bg-gradient-to-b from-[#ffc069] to-[#ff8a2a] px-6 font-display text-base font-bold text-primary-foreground shadow-[0_10px_28px_-8px_#ff8a2a] transition hover:brightness-105 active:scale-95"
              >
                {`Choose ${hero.name} · +${SIGNUP_BONUS} pts`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
