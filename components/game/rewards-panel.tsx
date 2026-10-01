'use client'

import { CalendarCheck, Check, LoaderCircle } from 'lucide-react'
import { CHECKIN_ENERGY, CHECKIN_MAX_STREAK, POINT_SOURCES, checkinPoints } from '@/lib/zesto/economy'
import type { GameState } from '@/lib/zesto/game-types'
import { cn } from '@/lib/utils'
import type { RunAction } from './homestead-panels'
import { Panel } from './panel'

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function RewardsPanel({ state, run, pending, onClose }: { state: GameState; run: RunAction; pending: string | null; onClose: () => void }) {
  const player = state.player!
  const done = player.checkedInToday
  const streakDays = player.streak
  const highlight = done ? player.streak : player.streak + 1

  return (
    <Panel title="Rewards" subtitle="Every action on the shore earns points toward your TGE allocation." onClose={onClose}>
      <section aria-labelledby="checkin-heading" className="rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 p-4 ring-1 ring-primary/30">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 id="checkin-heading" className="font-display text-lg font-semibold">Daily check-in</h3>
            <p className="text-xs text-muted-foreground">{`${streakDays}-day streak · resets if you miss a day (UTC)`}</p>
          </div>
          <CalendarCheck className="size-6 text-primary" aria-hidden="true" />
        </div>
        <ol className="mt-3 grid grid-cols-7 gap-1">
          {Array.from({ length: CHECKIN_MAX_STREAK }, (_, i) => {
            const day = i + 1
            const claimed = day <= Math.min(streakDays, CHECKIN_MAX_STREAK)
            const today = !done && day === Math.min(highlight, CHECKIN_MAX_STREAK)
            return (
              <li
                key={day}
                className={cn(
                  'flex flex-col items-center rounded-xl py-2 text-center',
                  claimed ? 'bg-primary text-primary-foreground' : today ? 'bg-black/30 ring-2 ring-primary' : 'bg-black/20',
                )}
              >
                <span className="text-[9px] font-semibold uppercase opacity-70">{`D${day}`}</span>
                {claimed ? <Check className="my-0.5 size-3.5" aria-hidden="true" /> : null}
                <span className="font-display text-xs font-bold tabular-nums">{checkinPoints(day)}</span>
              </li>
            )
          })}
        </ol>
        <button
          type="button"
          onClick={() => run({ type: 'checkin' }, 'checkin')}
          disabled={done || pending !== null}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#ffc069] to-[#ff8a2a] font-display text-sm font-bold text-primary-foreground shadow-[0_8px_20px_-8px_#ff8a2a] transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:from-secondary disabled:to-secondary disabled:text-muted-foreground disabled:shadow-none"
        >
          {pending === 'checkin' ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
          {done ? 'Checked in — see you tomorrow' : `Check in · +${player.nextCheckinPoints} pts & +${CHECKIN_ENERGY} energy`}
        </button>
      </section>

      <h3 className="mt-6 font-display text-base font-semibold">How points are earned</h3>
      <ul className="mt-2 flex flex-col gap-1">
        {POINT_SOURCES.map((s) => (
          <li key={s.source} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-3 py-2 text-sm">
            <span>{s.label}</span>
            <span className="shrink-0 font-display font-semibold tabular-nums text-primary">{s.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground text-pretty">
        Your level adds up to +30% on digs. Character perks, the Tide Beacon and shovels stack on top.
      </p>

      <h3 className="mt-6 font-display text-base font-semibold">Recent activity</h3>
      {state.log.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {state.log.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/40 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm">{l.detail}</span>
                <span className="block text-[11px] text-muted-foreground">{timeAgo(l.createdAt)}</span>
              </span>
              <span className="shrink-0 font-display font-bold tabular-nums text-primary">{`+${l.points}`}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No activity yet.</p>
      )}
    </Panel>
  )
}
