'use client'

import Image from 'next/image'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import {
  BUY_URL,
  DIG_COST,
  EXPLORER_URL,
  POINTS_POOL_PERCENT,
  RARITIES,
  TREASURY_ADDRESS,
  ZESTO_ADDRESS,
  shortAddress,
} from '@/lib/zesto/config'
import { Panel } from './panel'

const STEPS = [
  { title: 'Sign up once', body: 'Verify your wallet and lock in one Zesto. Your character and its perk are permanent.' },
  { title: 'Gather for free', body: 'Walk south through the gate. Palm groves, driftwood, granite and ore veins cost 1 energy per harvest.' },
  { title: 'Build your homestead', body: 'Raise a Forge, Anvil, Lumber Mill, Quarry, Tide Beacon and Treasure Vault — then upgrade each to level 3.' },
  { title: 'Smelt & craft', body: 'Turn ore into ingots at the Forge, then craft tools at the Anvil for permanent bonuses.' },
  { title: 'Dig treasure', body: `Each dig sends ${DIG_COST} $ZESTO on-chain and drops rare points plus bonus materials.` },
  { title: 'Earn & level up', body: 'Every action earns points. Levels add +2% to future finds (max +30%). Check in daily for streak bonuses.' },
]

export function GuidePanel({ onClose }: { onClose: () => void }) {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0)

  return (
    <Panel title="How to play" subtitle={`${POINTS_POOL_PERCENT}% of the $ZESTO supply (100M tokens) is reserved for diggers at mainnet TGE.`} onClose={onClose}>
      <ol className="flex flex-col gap-2">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-2xl bg-secondary/60 p-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-foreground">
              {i + 1}
            </span>
            <span>
              <span className="block text-sm font-semibold">{s.title}</span>
              <span className="block text-xs text-muted-foreground text-pretty">{s.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <h3 className="mt-6 font-display text-base font-semibold">Treasure odds</h3>
      <ul className="mt-2 flex flex-col gap-1.5">
        {RARITIES.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-xl bg-secondary/60 px-3 py-2">
            <Image src={r.image || '/placeholder.svg'} alt="" width={36} height={36} className="size-9 object-contain" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold" style={{ color: r.color }}>
                {r.label}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">{r.item}</span>
            </span>
            <span className="text-right">
              <span className="block font-display font-bold tabular-nums">{`${r.points} pts`}</span>
              <span className="block text-[11px] tabular-nums text-muted-foreground">{`${((r.weight / total) * 100).toFixed(0)}%`}</span>
            </span>
          </li>
        ))}
      </ul>

      <h3 className="mt-6 font-display text-base font-semibold">Contracts</h3>
      <dl className="mt-2 flex flex-col gap-1.5 text-sm">
        <AddressRow label="$ZESTO token" address={ZESTO_ADDRESS} />
        <AddressRow label="Dig treasury" address={TREASURY_ADDRESS} />
      </dl>

      <a
        href={BUY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-accent font-display font-bold text-accent-foreground transition hover:brightness-105"
      >
        Buy $ZESTO on Vibevibe
        <ExternalLink className="size-4" aria-hidden="true" />
      </a>
    </Panel>
  )
}

function AddressRow({ label, address }: { label: string; address: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-secondary/60 px-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-2">
        <a
          href={`${EXPLORER_URL}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-xs hover:underline"
        >
          {shortAddress(address)}
        </a>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(address)
            toast.success(`${label} address copied`)
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <Copy className="size-3.5" aria-hidden="true" />
          <span className="sr-only">{`Copy ${label} address`}</span>
        </button>
      </dd>
    </div>
  )
}
