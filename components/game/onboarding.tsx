'use client'

import { Anvil, Hammer, LoaderCircle, PenLine, Shovel, Sparkles, TreePalm, Wallet } from 'lucide-react'
import { POINTS_POOL_PERCENT, shortAddress } from '@/lib/zesto/config'

const FEATURES = [
  { icon: Shovel, title: 'Dig treasure', body: 'Spend $ZESTO to unearth rare finds on-chain.' },
  { icon: TreePalm, title: 'Gather', body: 'Harvest wood, stone and ore for free with energy.' },
  { icon: Hammer, title: 'Build', body: 'Raise a Forge, Mill, Quarry, Beacon and Vault.' },
  { icon: Anvil, title: 'Craft', body: 'Smelt ingots and forge tools that boost every action.' },
]

export function Onboarding({
  step,
  address,
  busy,
  onConnect,
  onSign,
}: {
  step: 'connect' | 'sign' | 'loading'
  address?: string
  busy: boolean
  onConnect: () => void
  onSign: () => void
}) {
  return (
    <div className="absolute inset-0 z-40 overflow-y-auto bg-[radial-gradient(110%_70%_at_50%_0%,rgb(13_21_36/0.35),rgb(8_12_22/0.92)_70%)]">
      <div className="mx-auto flex min-h-full w-full max-w-xl flex-col justify-end px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10 sm:justify-center sm:pb-10">
        <div className="text-center">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-primary backdrop-blur">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {`${POINTS_POOL_PERCENT}% of supply to players at TGE`}
          </p>
          <h1 className="mt-4 font-display text-5xl font-bold leading-none tracking-tight sm:text-7xl">
            <span className="bg-gradient-to-b from-[#ffe1b0] to-[#ff9a3c] bg-clip-text text-transparent">ZESTO</span>{' '}
            <span>DIG</span>
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground text-pretty sm:text-base">
            Dig the shore, gather materials and build your homestead. Every action earns points.
          </p>
        </div>

        <ul className="mt-6 grid grid-cols-2 gap-2">
          {FEATURES.map((f) => (
            <li key={f.title} className="glass rounded-2xl p-3">
              <f.icon className="size-5 text-primary" aria-hidden="true" />
              <p className="mt-2 font-display text-sm font-semibold">{f.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground text-pretty">{f.body}</p>
            </li>
          ))}
        </ul>

        <div className="glass mt-4 rounded-3xl p-4">
          {step === 'connect' ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Step 1 of 2</p>
              <p className="mt-1 font-display text-lg font-semibold">Connect your wallet</p>
              <button
                type="button"
                onClick={onConnect}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#ffc069] to-[#ff8a2a] font-display text-base font-bold text-primary-foreground shadow-[0_10px_28px_-8px_#ff8a2a] transition hover:brightness-105 active:scale-95"
              >
                <Wallet className="size-4" aria-hidden="true" />
                Connect wallet
              </button>
            </>
          ) : step === 'sign' ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Step 1 of 2</p>
              <p className="mt-1 font-display text-lg font-semibold">Verify wallet ownership</p>
              <p className="mt-1 text-xs text-muted-foreground text-pretty">
                {`Sign a free message with ${address ? shortAddress(address) : 'your wallet'}. No gas, no funds moved.`}
              </p>
              <button
                type="button"
                onClick={onSign}
                disabled={busy}
                className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#ffc069] to-[#ff8a2a] font-display text-base font-bold text-primary-foreground shadow-[0_10px_28px_-8px_#ff8a2a] transition hover:brightness-105 active:scale-95 disabled:opacity-70"
              >
                {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <PenLine className="size-4" aria-hidden="true" />}
                {busy ? 'Waiting for signature…' : 'Sign in with wallet'}
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground" role="status">
              <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
              Loading your homestead…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
