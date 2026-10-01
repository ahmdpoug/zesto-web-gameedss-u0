'use client'

import Image from 'next/image'
import { Copy, ExternalLink, LogOut, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useBalances, useLeaderboard, usePlayer, useZestoWallet } from '@/hooks/use-zesto'
import {
  CHARACTER_BY_ID,
  EXPLORER_URL,
  POINTS_POOL_TOKENS,
  RARITY_BY_ID,
  getLevel,
  getLevelTable,
  shortAddress,
  type CharacterId,
  type RarityId,
} from '@/lib/zesto/config'
import { cn } from '@/lib/utils'
import { CharacterAvatar } from './character-avatar'
import { formatTokens } from './leaderboard-panel'
import { Panel } from './panel'

export function ProfilePanel({ onClose, character }: { onClose: () => void; character: CharacterId }) {
  const { authenticated, login, logout, address } = useZestoWallet()
  const { data: balances } = useBalances(address)
  const { data } = usePlayer(address)
  const { data: board } = useLeaderboard()

  if (!authenticated || !address) {
    return (
      <Panel title="Your profile" onClose={onClose}>
        <div className="flex flex-col items-center py-6 text-center">
          <CharacterAvatar id={character} size={84} />
          <p className="mt-4 max-w-xs text-sm text-muted-foreground text-pretty">
            Connect a wallet to track your points, level up and climb the leaderboard.
          </p>
          <button
            type="button"
            onClick={login}
            className="mt-5 flex h-12 items-center gap-2 rounded-2xl bg-primary px-6 font-display font-bold text-primary-foreground"
          >
            <Wallet className="size-4" aria-hidden="true" />
            Connect wallet
          </button>
        </div>
      </Panel>
    )
  }

  const points = data?.player?.totalPoints ?? 0
  const level = getLevel(points)
  const totalPoints = board?.totals.totalPoints ?? 0
  const share = totalPoints > 0 ? (points / totalPoints) * POINTS_POOL_TOKENS : 0
  const hero = CHARACTER_BY_ID[character]
  const best = data?.player?.bestRarity ? RARITY_BY_ID[data.player.bestRarity as RarityId] : null

  return (
    <Panel title="Your profile" onClose={onClose}>
      <div className="flex items-center gap-3">
        <CharacterAvatar id={character} size={56} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-semibold leading-tight">
            {hero.name} <span className="text-sm text-primary">{`Lv ${level.level}`}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(address)
              toast.success('Address copied')
            }}
            className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {shortAddress(address)}
            <Copy className="size-3" aria-hidden="true" />
            <span className="sr-only">Copy address</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            void logout()
            onClose()
          }}
          className="flex h-9 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-semibold hover:bg-secondary/80"
        >
          <LogOut className="size-3.5" aria-hidden="true" />
          Log out
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 p-4 ring-1 ring-primary/30">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{level.title}</p>
            <p className="font-display text-3xl font-bold tabular-nums">
              {points.toLocaleString()} <span className="text-base font-semibold text-muted-foreground">pts</span>
            </p>
          </div>
          <p className="text-right text-xs text-muted-foreground">
            {level.next !== null ? `${(level.next - points).toLocaleString()} to Lv ${level.level + 1}` : 'Max level'}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30" role="progressbar" aria-valuenow={Math.round(level.progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Level progress">
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-primary" style={{ width: `${level.progress * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{`Level bonus: +${level.bonusPercent}% points on every dig`}</p>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="Rank" value={data?.rank ? `#${data.rank}` : '—'} />
        <Stat label="Digs" value={(data?.player?.totalDigs ?? 0).toLocaleString()} />
        <Stat label="Est. TGE share" value={`${formatTokens(share)}`} sub="$ZESTO" accent />
        <Stat label="Wallet" value={balances ? formatTokens(balances.zesto) : '…'} sub={balances ? `$ZESTO · ${balances.eth.toFixed(4)} ETH` : undefined} />
      </dl>

      {best ? (
        <div className="mt-3 flex items-center gap-3 rounded-2xl bg-secondary/70 p-3">
          <Image src={best.image || '/placeholder.svg'} alt={best.item} width={44} height={44} className="size-11 object-contain" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Best find</p>
            <p className="text-sm font-semibold" style={{ color: best.color }}>{`${best.label} · ${best.item}`}</p>
          </div>
        </div>
      ) : null}

      <h3 className="mt-6 font-display text-base font-semibold">Recent finds</h3>
      {data && data.recent.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {data.recent.map((d) => {
            const r = RARITY_BY_ID[d.rarity]
            return (
              <li key={d.id} className="flex items-center gap-3 rounded-xl bg-secondary/60 px-3 py-2">
                <Image src={r.image || '/placeholder.svg'} alt="" width={32} height={32} className="size-8 object-contain" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{d.item}</span>
                  <span className="block text-[11px]" style={{ color: r.color }}>{r.label}</span>
                </span>
                <span className="font-display font-bold tabular-nums text-primary">{`+${d.points}`}</span>
                <a
                  href={`${EXPLORER_URL}/tx/${d.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">View transaction</span>
                </a>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">No finds yet. Tap a sparkle on the sand and dig!</p>
      )}

      <h3 className="mt-6 font-display text-base font-semibold">Level ladder</h3>
      <ol className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
        {getLevelTable().map((l) => (
          <li
            key={l.level}
            className={cn(
              'flex items-center justify-between rounded-lg px-3 py-1.5 text-xs',
              l.level === level.level ? 'bg-primary/20 text-foreground ring-1 ring-primary/50' : l.level < level.level ? 'text-muted-foreground' : 'bg-secondary/40',
            )}
          >
            <span>
              <span className="font-semibold">{`Lv ${l.level}`}</span> {l.title}
            </span>
            <span className="tabular-nums text-muted-foreground">{`${l.points.toLocaleString()} · +${l.bonusPercent}%`}</span>
          </li>
        ))}
      </ol>
    </Panel>
  )
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl bg-secondary/70 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className={cn('mt-0.5 font-display text-xl font-bold tabular-nums', accent && 'text-accent')}>
        {value}
        {sub ? <span className="block text-[10px] font-sans font-medium text-muted-foreground">{sub}</span> : null}
      </dd>
    </div>
  )
}
