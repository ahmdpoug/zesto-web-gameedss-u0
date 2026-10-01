'use client'

import { Crown } from 'lucide-react'
import { useLeaderboard } from '@/hooks/use-zesto'
import { POINTS_POOL_TOKENS, getLevel, shortAddress } from '@/lib/zesto/config'
import { cn } from '@/lib/utils'
import { CharacterAvatar } from './character-avatar'
import { Panel } from './panel'

const CROWN_COLORS = ['#ffcf4a', '#d9e2ef', '#e0995c']

export function formatTokens(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return Math.floor(value).toLocaleString()
}

export function LeaderboardPanel({ onClose, address }: { onClose: () => void; address?: string }) {
  const { data, isLoading, error } = useLeaderboard()
  const totalPoints = data?.totals.totalPoints ?? 0
  const me = address?.toLowerCase()

  return (
    <Panel title="Leaderboard" subtitle="Top diggers share 100M $ZESTO at mainnet TGE, pro-rata to points." onClose={onClose}>
      <dl className="grid grid-cols-3 gap-2">
        <Stat label="Diggers" value={data ? data.totals.totalPlayers.toLocaleString() : '—'} />
        <Stat label="Total digs" value={data ? data.totals.totalDigs.toLocaleString() : '—'} />
        <Stat label="Pool" value="100M" accent />
      </dl>

      {error ? (
        <p className="mt-6 text-center text-sm text-destructive">Could not load the leaderboard.</p>
      ) : isLoading ? (
        <ul className="mt-5 flex flex-col gap-2" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="h-14 animate-pulse rounded-2xl bg-secondary" />
          ))}
        </ul>
      ) : data && data.players.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">No digs yet. Be the first on the board!</p>
      ) : (
        <ol className="mt-5 flex flex-col gap-1.5">
          {data?.players.map((p, i) => {
            const share = totalPoints > 0 ? (p.totalPoints / totalPoints) * POINTS_POOL_TOKENS : 0
            const isMe = p.wallet === me
            return (
              <li
                key={p.wallet}
                className={cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5',
                  isMe ? 'bg-primary/15 ring-1 ring-primary/50' : 'bg-secondary/60',
                )}
              >
                <span className="flex w-6 justify-center font-display text-sm font-bold tabular-nums text-muted-foreground">
                  {i < 3 ? <Crown className="size-5" style={{ color: CROWN_COLORS[i] }} aria-label={`Rank ${i + 1}`} /> : i + 1}
                </span>
                <CharacterAvatar id={p.character} size={34} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {shortAddress(p.wallet)}
                    {isMe ? <span className="ml-1.5 text-xs text-primary">You</span> : null}
                  </span>
                  <span className="block text-[11px] text-muted-foreground">
                    {`Lv ${getLevel(p.totalPoints).level} · ${p.totalDigs} digs`}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-display text-base font-bold tabular-nums">{p.totalPoints.toLocaleString()}</span>
                  <span className="block text-[11px] tabular-nums text-accent">{`≈ ${formatTokens(share)} $ZESTO`}</span>
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className={cn('mt-0.5 font-display text-xl font-bold tabular-nums', accent && 'text-primary')}>{value}</dd>
    </div>
  )
}
