'use client'

import { Award, Check, Clock, LoaderCircle, ScrollText, Sun } from 'lucide-react'
import { useState } from 'react'
import { useNow } from '@/hooks/use-now'
import type { GameState } from '@/lib/zesto/game-types'
import type { QuestScope, QuestState } from '@/lib/zesto/quests'
import { cn } from '@/lib/utils'
import { CostList } from './cost-list'
import type { RunAction } from './homestead-panels'
import { Panel } from './panel'

const TABS: { id: QuestScope; label: string; icon: typeof Sun }[] = [
  { id: 'daily', label: 'Daily', icon: Sun },
  { id: 'weekly', label: 'Weekly', icon: ScrollText },
  { id: 'achievement', label: 'Achievements', icon: Award },
]

export function claimableCount(quests: QuestState[], scope?: QuestScope) {
  return quests.filter((q) => (!scope || q.scope === scope) && !q.claimed && q.progress >= q.goal).length
}

function countdown(target: string, now: number | null) {
  if (!now) return ''
  const ms = Math.max(0, new Date(target).getTime() - now)
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function QuestsPanel({ state, run, pending, onClose }: { state: GameState; run: RunAction; pending: string | null; onClose: () => void }) {
  const [tab, setTab] = useState<QuestScope>(() => (claimableCount(state.quests, 'daily') === 0 && claimableCount(state.quests, 'weekly') > 0 ? 'weekly' : 'daily'))
  const now = useNow()
  const quests = state.quests
    .filter((q) => q.scope === tab)
    .sort((a, b) => rank(a) - rank(b))
  const done = state.quests.filter((q) => q.scope === tab && q.claimed).length
  const total = state.quests.filter((q) => q.scope === tab).length

  return (
    <Panel title="Quests" subtitle="Complete goals around the shore for bonus points and materials." onClose={onClose}>
      <div role="tablist" aria-label="Quest categories" className="grid grid-cols-3 gap-1 rounded-2xl bg-secondary/60 p-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const ready = claimableCount(state.quests, id)
          const selected = tab === id
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(id)}
              className={cn(
                'relative flex h-10 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition sm:text-sm',
                selected ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="truncate">{label}</span>
              {ready > 0 ? (
                <span className="grid size-4 place-items-center rounded-full bg-[#ff5d5d] text-[10px] font-bold text-white">
                  {ready}
                  <span className="sr-only">{' ready to claim'}</span>
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{`${done} / ${total} claimed`}</span>
        {tab !== 'achievement' ? (
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden="true" />
            {`Resets in ${countdown(tab === 'daily' ? state.questResets.daily : state.questResets.weekly, now)}`}
          </span>
        ) : (
          <span>Permanent milestones</span>
        )}
      </div>

      <ul role="tabpanel" className="mt-3 flex flex-col gap-2">
        {quests.map((q) => (
          <QuestCard key={q.id} quest={q} pending={pending} run={run} />
        ))}
      </ul>
    </Panel>
  )
}

function rank(q: QuestState) {
  if (!q.claimed && q.progress >= q.goal) return 0
  if (!q.claimed) return 1 - q.progress / q.goal
  return 2
}

function QuestCard({ quest, pending, run }: { quest: QuestState; pending: string | null; run: RunAction }) {
  const complete = quest.progress >= quest.goal
  const ready = complete && !quest.claimed
  const key = `quest:${quest.id}`
  const percent = Math.round((quest.progress / quest.goal) * 100)

  return (
    <li
      className={cn(
        'rounded-2xl p-3 ring-1 transition',
        ready ? 'bg-gradient-to-br from-primary/25 to-accent/10 ring-primary/50' : 'bg-secondary/50 ring-border',
        quest.claimed && 'opacity-60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold leading-tight">{quest.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{quest.description}</p>
        </div>
        <span className="shrink-0 font-display text-sm font-bold tabular-nums text-primary">{`+${quest.reward.points.toLocaleString()}`}</span>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-black/30"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={quest.goal}
          aria-valuenow={quest.progress}
          aria-label={`${quest.title} progress`}
        >
          <div
            className={cn('h-full rounded-full transition-[width] duration-700', complete ? 'bg-primary' : 'bg-gradient-to-r from-accent to-primary')}
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">{`${quest.progress.toLocaleString()}/${quest.goal.toLocaleString()}`}</span>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {quest.reward.resources ? <CostList cost={quest.reward.resources} /> : <span />}
        {quest.claimed ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-primary">
            <Check className="size-4" aria-hidden="true" />
            Claimed
          </span>
        ) : (
          <button
            type="button"
            onClick={() => run({ type: 'claim_quest', id: quest.id }, key)}
            disabled={!ready || pending !== null}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-b from-[#ffc069] to-[#ff8a2a] px-4 font-display text-sm font-bold text-primary-foreground shadow-[0_6px_16px_-6px_#ff8a2a] transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:from-secondary disabled:to-secondary disabled:text-muted-foreground disabled:shadow-none"
          >
            {pending === key ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            {ready ? 'Claim' : 'In progress'}
          </button>
        )}
      </div>
    </li>
  )
}
