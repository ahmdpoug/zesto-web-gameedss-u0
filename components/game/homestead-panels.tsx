'use client'

import { Anvil, Axe, Check, Flame, Hammer, LoaderCircle, Lock, Pickaxe, TowerControl, Vault, ArrowUpCircle, PackageOpen, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import {
  BUILDINGS,
  BUILDING_BY_ID,
  MAX_BUILDING_LEVEL,
  RESOURCE_META,
  SMELT_COST,
  SMELT_POINTS_PER_INGOT,
  TOOLS,
  buildingCost,
  buildingPoints,
  canAfford,
  type BuildingKind,
  type Cost,
  type ResourceId,
} from '@/lib/zesto/economy'
import type { GameAction, GameState } from '@/lib/zesto/game-types'
import { cn } from '@/lib/utils'
import { CostList } from './cost-list'
import { Panel } from './panel'
import { ResourceIcon } from './resource-icon'

export type RunAction = (action: GameAction, key: string) => Promise<void>

const BUILDING_ICONS: Record<BuildingKind, typeof Flame> = {
  forge: Flame,
  anvil: Anvil,
  lumber_mill: Axe,
  quarry: Pickaxe,
  beacon: TowerControl,
  vault: Vault,
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  className,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-b from-[#ffc069] to-[#ff8a2a] px-4 font-display text-sm font-bold text-primary-foreground shadow-[0_8px_20px_-8px_#ff8a2a] transition hover:brightness-105 active:scale-95 disabled:cursor-not-allowed disabled:from-secondary disabled:to-secondary disabled:text-muted-foreground disabled:shadow-none',
        className,
      )}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}

function BuildingCard({ kind, state, run, pending }: { kind: BuildingKind; state: GameState; run: RunAction; pending: string | null }) {
  const def = BUILDING_BY_ID[kind]
  const Icon = BUILDING_ICONS[kind]
  const level = state.buildings[kind]?.level ?? 0
  const resources = state.player!.resources
  const locked = !!def.requires && !state.buildings[def.requires]
  const maxed = level >= MAX_BUILDING_LEVEL
  const nextLevel = level + 1
  const cost = maxed ? {} : buildingCost(kind, nextLevel)
  const affordable = canAfford(resources, cost)
  const key = `${level === 0 ? 'build' : 'upgrade'}:${kind}`

  return (
    <article className={cn('rounded-2xl p-3 ring-1', level > 0 ? 'bg-[#ffc94d]/[0.07] ring-[#ffc94d]/25' : 'bg-secondary/60 ring-transparent')}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid size-11 shrink-0 place-items-center rounded-xl',
            level > 0 ? 'bg-gradient-to-b from-[#ffe58a] to-[#e9a516] text-[#3a2404]' : 'bg-black/25 text-primary',
          )}
          aria-hidden="true"
        >
          {locked ? <Lock className="size-5 text-muted-foreground" /> : <Icon className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-base font-semibold">{def.name}</h3>
            {level > 0 ? (
              <span className="flex gap-0.5" aria-label={`Level ${level} of ${MAX_BUILDING_LEVEL}`}>
                {Array.from({ length: MAX_BUILDING_LEVEL }, (_, i) => (
                  <span key={i} className={cn('h-1.5 w-3 rounded-full', i < level ? 'bg-[#ffc94d]' : 'bg-white/15')} />
                ))}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground text-pretty">{level > 0 ? def.effects[level - 1] : def.description}</p>
        </div>
      </div>

      {locked ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-black/20 px-3 py-2 text-xs text-muted-foreground">
          <Lock className="size-3.5" aria-hidden="true" />
          {`Requires ${BUILDING_BY_ID[def.requires!].name}`}
        </p>
      ) : maxed ? (
        <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-black/20 px-3 py-2 text-xs font-semibold text-[#ffc94d]">
          <Check className="size-3.5" aria-hidden="true" />
          Max level reached
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/20 p-2 pl-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {level === 0 ? 'Build' : `Upgrade to Lv ${nextLevel}`}
              <span className="ml-1.5 text-primary">{`+${buildingPoints(kind, nextLevel)} pts`}</span>
            </p>
            {level > 0 ? <p className="text-[11px] text-foreground/80">{def.effects[nextLevel - 1]}</p> : null}
            <CostList cost={cost} resources={resources} className="mt-1" />
          </div>
          <PrimaryButton
            onClick={() => run({ type: level === 0 ? 'build' : 'upgrade', kind }, key)}
            disabled={!affordable || pending !== null}
            loading={pending === key}
          >
            {level === 0 ? <Hammer className="size-4" aria-hidden="true" /> : <ArrowUpCircle className="size-4" aria-hidden="true" />}
            {level === 0 ? 'Build' : 'Upgrade'}
          </PrimaryButton>
        </div>
      )}
    </article>
  )
}

function CollectCard({ state, run, pending }: { state: GameState; run: RunAction; pending: string | null }) {
  const totals: Partial<Record<ResourceId | 'points', number>> = {}
  for (const b of Object.values(state.buildings)) {
    for (const [k, v] of Object.entries(b?.pending ?? {}) as [ResourceId | 'points', number][]) totals[k] = (totals[k] ?? 0) + v
  }
  const producers = BUILDINGS.filter((b) => b.production && state.buildings[b.id])
  if (producers.length === 0) return null
  const entries = Object.entries(totals) as [ResourceId | 'points', number][]
  const empty = entries.length === 0

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-accent/20 to-primary/10 p-3 ring-1 ring-accent/30">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Ready to collect</p>
        {empty ? (
          <p className="text-sm text-muted-foreground">Production is ticking…</p>
        ) : (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {entries.map(([k, v]) => (
              <li key={k} className="flex items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 text-xs font-semibold tabular-nums">
                {k === 'points' ? <span className="text-primary">{`+${v} pts`}</span> : (
                  <>
                    <ResourceIcon id={k} className="size-3" />
                    {`+${v}`}
                    <span className="sr-only">{RESOURCE_META[k].label}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <PrimaryButton onClick={() => run({ type: 'collect' }, 'collect')} disabled={empty || pending !== null} loading={pending === 'collect'}>
        <PackageOpen className="size-4" aria-hidden="true" />
        Collect
      </PrimaryButton>
    </div>
  )
}

export function BasePanel({ state, run, pending, onClose }: { state: GameState; run: RunAction; pending: string | null; onClose: () => void }) {
  const built = Object.keys(state.buildings).length
  return (
    <Panel title="Your homestead" subtitle={`${built} of ${BUILDINGS.length} buildings raised. Head south past the gate to see them on the shore.`} onClose={onClose}>
      <CollectCard state={state} run={run} pending={pending} />
      <div className="flex flex-col gap-2">
        {BUILDINGS.map((b) => (
          <BuildingCard key={b.id} kind={b.id} state={state} run={run} pending={pending} />
        ))}
      </div>
    </Panel>
  )
}

function SmeltSection({ state, run, pending }: { state: GameState; run: RunAction; pending: string | null }) {
  const [times, setTimes] = useState(1)
  const forge = state.buildings.forge?.level ?? 0
  const resources = state.player!.resources
  const cost: Cost = Object.fromEntries(Object.entries(SMELT_COST).map(([k, v]) => [k, v * times]))
  const maxTimes = Math.max(1, Math.min(20, Math.floor(resources.ore / (SMELT_COST.ore ?? 1)), Math.floor(resources.wood / (SMELT_COST.wood ?? 1))))
  const ingots = forge * times

  return (
    <section aria-labelledby="smelt-heading" className="rounded-2xl bg-secondary/60 p-3">
      <div className="flex items-center gap-2">
        <Flame className="size-4 text-primary" aria-hidden="true" />
        <h3 id="smelt-heading" className="font-display text-base font-semibold">Smelting</h3>
      </div>
      {forge === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Build a Forge to turn ore into ingots.</p>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">{`Forge Lv ${forge}: ${forge} ingot${forge > 1 ? 's' : ''} per batch · +${SMELT_POINTS_PER_INGOT} pts per ingot`}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/20 p-2 pl-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTimes((t) => Math.max(1, t - 1))}
                className="grid size-8 place-items-center rounded-lg bg-secondary hover:bg-secondary/80"
                aria-label="Fewer batches"
              >
                <Minus className="size-3.5" aria-hidden="true" />
              </button>
              <span className="w-14 text-center font-display text-sm font-semibold tabular-nums">{`${times}×`}</span>
              <button
                type="button"
                onClick={() => setTimes((t) => Math.min(20, t + 1))}
                className="grid size-8 place-items-center rounded-lg bg-secondary hover:bg-secondary/80"
                aria-label="More batches"
              >
                <Plus className="size-3.5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setTimes(maxTimes)} className="text-[11px] font-semibold text-primary hover:underline">
                Max
              </button>
            </div>
            <CostList cost={cost} resources={resources} />
          </div>
          <PrimaryButton
            className="mt-2 w-full"
            onClick={() => run({ type: 'smelt', times }, 'smelt')}
            disabled={!canAfford(resources, cost) || pending !== null}
            loading={pending === 'smelt'}
          >
            {`Smelt ${ingots} ingot${ingots > 1 ? 's' : ''} · +${ingots * SMELT_POINTS_PER_INGOT} pts`}
          </PrimaryButton>
        </>
      )}
    </section>
  )
}

function ToolsSection({ state, run, pending }: { state: GameState; run: RunAction; pending: string | null }) {
  const anvil = state.buildings.anvil?.level ?? 0
  const resources = state.player!.resources

  return (
    <section aria-labelledby="tools-heading" className="mt-3 rounded-2xl bg-secondary/60 p-3">
      <div className="flex items-center gap-2">
        <Anvil className="size-4 text-primary" aria-hidden="true" />
        <h3 id="tools-heading" className="font-display text-base font-semibold">Tools</h3>
        <span className="ml-auto text-[11px] text-muted-foreground">{anvil > 0 ? `Anvil Lv ${anvil}` : 'Requires Anvil'}</span>
      </div>
      <ul className="mt-2 flex flex-col gap-1.5">
        {TOOLS.map((tool) => {
          const owned = state.tools.includes(tool.id)
          const locked = anvil < tool.tier
          const key = `craft:${tool.id}`
          return (
            <li key={tool.id} className={cn('rounded-xl bg-black/20 p-2.5', owned && 'ring-1 ring-accent/40')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {tool.name}
                    <span className="ml-1.5 rounded bg-white/10 px-1 py-px text-[10px] font-semibold text-muted-foreground">{`T${tool.tier}`}</span>
                  </p>
                  <p className="text-[11px] text-accent">{tool.effect}</p>
                </div>
                {owned ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent/15 px-2 py-1 text-[11px] font-semibold text-accent">
                    <Check className="size-3" aria-hidden="true" />
                    Owned
                  </span>
                ) : (
                  <span className="shrink-0 text-[11px] font-semibold text-primary">{`+${tool.points} pts`}</span>
                )}
              </div>
              {!owned ? (
                <div className="mt-2 flex items-center justify-between gap-2">
                  {locked ? (
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Lock className="size-3" aria-hidden="true" />
                      {anvil === 0 ? 'Build an Anvil' : `Anvil Lv ${tool.tier} required`}
                    </p>
                  ) : (
                    <CostList cost={tool.cost} resources={resources} />
                  )}
                  <PrimaryButton
                    className="h-8 px-3 text-xs"
                    onClick={() => run({ type: 'craft', tool: tool.id }, key)}
                    disabled={locked || !canAfford(resources, tool.cost) || pending !== null}
                    loading={pending === key}
                  >
                    Craft
                  </PrimaryButton>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function WorkshopPanel({ state, run, pending, onClose }: { state: GameState; run: RunAction; pending: string | null; onClose: () => void }) {
  return (
    <Panel title="Workshop" subtitle="Refine materials at the Forge and craft permanent tools at the Anvil." onClose={onClose}>
      <SmeltSection state={state} run={run} pending={pending} />
      <ToolsSection state={state} run={run} pending={pending} />
    </Panel>
  )
}

export function BuildingPanel({
  kind,
  state,
  run,
  pending,
  onClose,
}: {
  kind: BuildingKind
  state: GameState
  run: RunAction
  pending: string | null
  onClose: () => void
}) {
  const def = BUILDING_BY_ID[kind]
  const built = !!state.buildings[kind]
  return (
    <Panel title={def.name} subtitle={def.tagline} onClose={onClose}>
      <BuildingCard kind={kind} state={state} run={run} pending={pending} />
      {built && def.production ? (
        <div className="mt-3">
          <CollectCard state={state} run={run} pending={pending} />
        </div>
      ) : null}
      {built && kind === 'forge' ? (
        <div className="mt-3">
          <SmeltSection state={state} run={run} pending={pending} />
        </div>
      ) : null}
      {built && kind === 'anvil' ? <ToolsSection state={state} run={run} pending={pending} /> : null}
    </Panel>
  )
}
