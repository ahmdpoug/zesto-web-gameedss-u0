'use client'

import { Moon, Sun, Volume2, VolumeX } from 'lucide-react'
import { getTide, useNow } from '@/hooks/use-now'
import type { GamePlayer } from '@/lib/zesto/game-types'
import { ResourceHud } from './resource-hud'
import { WalletButton } from './wallet-button'

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function TopHud({
  night,
  onToggleNight,
  muted,
  onToggleMute,
  points,
  player,
  onOpenProfile,
}: {
  night: boolean
  onToggleNight: () => void
  muted: boolean
  onToggleMute: () => void
  points: number | null
  player: GamePlayer | null
  onOpenProfile: () => void
}) {
  const now = useNow()
  const tide = now ? getTide(now) : null

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-3 sm:p-5">
      <div className="flex flex-col items-start gap-2">
      <div className="pointer-events-auto flex items-center gap-2">
        <div className="glass-light flex items-center gap-2 rounded-full py-1 pl-1 pr-3 sm:pr-4">
          <span
            className="grid size-8 place-items-center rounded-full sm:size-9"
            style={{
              background: night
                ? 'radial-gradient(circle at 35% 35%, #4a5f95, #1a2547)'
                : 'radial-gradient(circle at 35% 35%, #ffe2a8, #ff9f4a)',
            }}
            aria-hidden="true"
          >
            {night ? <Moon className="size-4 text-[#e8f0ff]" /> : <Sun className="size-4 text-[#7a3a08]" />}
          </span>
          <div className="leading-tight">
            <p className="whitespace-nowrap font-display text-[11px] font-semibold uppercase tracking-wider sm:text-xs">
              {now ? formatTime(new Date(now)) : '--:--'}
              <span className="mx-1 opacity-50">{'·'}</span>
              {tide ? (tide.rising ? 'Rising' : 'Falling') : 'Tide'}
              <span className="hidden sm:inline">{' tide'}</span>
            </p>
            <p className="text-[10px] opacity-70 sm:text-[11px]">
              {tide ? `${tide.rising ? 'High' : 'Low'} at ${formatTime(tide.turnAt)}` : 'Reading the sea…'}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <HudIconButton onClick={onToggleNight} label={night ? 'Switch to golden hour' : 'Switch to night'}>
            {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </HudIconButton>
          <HudIconButton onClick={onToggleMute} label={muted ? 'Unmute sounds' : 'Mute sounds'}>
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </HudIconButton>
        </div>
      </div>
      {player ? (
        <div className="pointer-events-auto">
          <ResourceHud player={player} />
        </div>
      ) : null}
      </div>

      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <WalletButton onOpenProfile={onOpenProfile} />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 sm:hidden">
            <HudIconButton onClick={onToggleNight} label={night ? 'Switch to golden hour' : 'Switch to night'}>
              {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </HudIconButton>
            <HudIconButton onClick={onToggleMute} label={muted ? 'Unmute sounds' : 'Mute sounds'}>
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </HudIconButton>
          </div>
          <PointsBucket points={points} />
        </div>
      </div>
    </header>
  )
}

function HudIconButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-light grid size-9 place-items-center rounded-full transition hover:scale-105 active:scale-95"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  )
}

function PointsBucket({ points }: { points: number | null }) {
  return (
    <div className="glass-light flex items-center gap-2 rounded-2xl py-1 pl-1.5 pr-3" aria-label="Your points">
      <span className="relative grid h-8 w-8 place-items-end" aria-hidden="true">
        <span className="absolute inset-x-1 bottom-0 top-1.5 rounded-b-xl rounded-t-sm bg-gradient-to-b from-[#ffd84d] to-[#f0a81a] shadow-inner" />
        <span className="absolute inset-x-0.5 top-1 h-1.5 rounded-full bg-[#ffe680]" />
      </span>
      <div className="leading-none">
        <p className="text-[9px] font-semibold uppercase tracking-widest opacity-60">Points</p>
        <p className="font-display text-lg font-bold tabular-nums">{points === null ? '—' : points.toLocaleString()}</p>
      </div>
    </div>
  )
}
