'use client'

import { Zap } from 'lucide-react'
import { useNow } from '@/hooks/use-now'
import { RESOURCE_IDS, RESOURCE_META } from '@/lib/zesto/economy'
import type { GamePlayer } from '@/lib/zesto/game-types'
import { ResourceIcon } from './resource-icon'

function formatCountdown(ms: number) {
  const minutes = Math.max(1, Math.ceil(ms / 60_000))
  return `~${minutes}m`
}

export function ResourceHud({ player }: { player: GamePlayer }) {
  const now = useNow()
  const remaining = player.nextEnergyAt && now ? new Date(player.nextEnergyAt).getTime() - now : null

  return (
    <div className="glass w-[10.5rem] rounded-2xl p-2 sm:w-48" aria-label="Your materials and energy">
      <ul className="grid grid-cols-2 gap-1">
        {RESOURCE_IDS.map((id) => (
          <li key={id} className="flex items-center gap-1.5 rounded-lg bg-black/20 px-1.5 py-1">
            <ResourceIcon id={id} className="size-3.5 shrink-0" />
            <span className="sr-only">{RESOURCE_META[id].label}</span>
            <span className="font-display text-xs font-semibold tabular-nums">{player.resources[id].toLocaleString()}</span>
          </li>
        ))}
      </ul>
      <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
        <Zap className="size-3.5 shrink-0 text-[#ffe066]" aria-hidden="true" />
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/30"
          role="progressbar"
          aria-label="Energy"
          aria-valuenow={player.energy}
          aria-valuemin={0}
          aria-valuemax={player.maxEnergy}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#ffd84d] to-[#ffa447] transition-[width] duration-500"
            style={{ width: `${(player.energy / player.maxEnergy) * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold tabular-nums text-foreground/80">{`${player.energy}/${player.maxEnergy}`}</span>
      </div>
      {remaining !== null && remaining > 0 ? (
        <p className="mt-0.5 px-0.5 text-[9px] text-muted-foreground tabular-nums">{`+1 energy in ${formatCountdown(remaining)}`}</p>
      ) : null}
    </div>
  )
}
