'use client'

import { Axe, BookOpen, Coins, Gift, Hammer, LoaderCircle, Lock, MapPin, Pickaxe, ScrollText, Shovel, Sparkles, Trophy, User, Warehouse, Anvil, Compass } from 'lucide-react'
import type { DigStage } from '@/hooks/use-zesto'
import { BUY_URL, CHARACTER_BY_ID, DIG_COST, getLevel, type CharacterId } from '@/lib/zesto/config'
import { BUILDING_BY_ID, GATHER_ENERGY, RESOURCE_META, type BuildingDef, type ResourceNode } from '@/lib/zesto/economy'
import { cn } from '@/lib/utils'
import { CharacterAvatar } from './character-avatar'
import { Joystick } from './joystick'

export type PanelId = 'leaderboard' | 'profile' | 'base' | 'workshop' | 'rewards' | 'guide' | 'quests'

export type Interaction =
  | { kind: 'dig' }
  | { kind: 'gather'; node: ResourceNode }
  | { kind: 'plot'; building: BuildingDef; level: number; locked: boolean }

const STAGE_COPY: Record<DigStage, string> = {
  paying: 'Approve 100 $ZESTO in your wallet…',
  confirming: 'Digging… confirming on Robinhood Chain',
  revealing: 'Brushing away the sand…',
}

export function DigBar({
  character,
  points,
  balance,
  stage,
  gathering,
  interaction,
  energy,
  rewardsReady,
  questsReady,
  onAction,
  onOpenPanel,
}: {
  character: CharacterId
  points: number
  balance: number | null
  stage: DigStage | null
  gathering: boolean
  interaction: Interaction | null
  energy: number
  rewardsReady: boolean
  questsReady: boolean
  onAction: () => void
  onOpenPanel: (panel: PanelId) => void
}) {
  const hero = CHARACTER_BY_ID[character]
  const level = getLevel(points)
  const busy = stage !== null || gathering
  const insufficient = balance !== null && balance < DIG_COST

  return (
    <>
      <nav
        aria-label="Game menu"
        className="pointer-events-auto absolute right-3 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2 sm:right-5 sm:gap-2.5"
      >
        <RailButton icon={<Warehouse className="size-[18px]" />} label="Base" onClick={() => onOpenPanel('base')} />
        <RailButton icon={<Anvil className="size-[18px]" />} label="Craft" onClick={() => onOpenPanel('workshop')} />
        <RailButton icon={<ScrollText className="size-[18px]" />} label="Quests" onClick={() => onOpenPanel('quests')} badge={questsReady} />
        <RailButton icon={<Gift className="size-[18px]" />} label="Rewards" onClick={() => onOpenPanel('rewards')} badge={rewardsReady} />
        <RailButton icon={<Trophy className="size-[18px]" />} label="Ranks" onClick={() => onOpenPanel('leaderboard')} />
        <RailButton icon={<User className="size-[18px]" />} label="Profile" onClick={() => onOpenPanel('profile')} />
        <RailButton icon={<BookOpen className="size-[18px]" />} label="Guide" onClick={() => onOpenPanel('guide')} />
      </nav>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
        <div className="flex justify-center">
          <StatusPill stage={stage} gathering={gathering} interaction={interaction} />
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="pointer-events-auto">
            <Joystick disabled={busy} />
          </div>

          <button
            type="button"
            onClick={() => onOpenPanel('profile')}
            className="glass pointer-events-auto mb-2 hidden w-full max-w-xs items-center gap-3 rounded-3xl p-2.5 text-left md:flex"
          >
            <CharacterAvatar id={character} size={44} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-1.5">
                <span className="truncate font-display text-base font-semibold">{hero.name}</span>
                <span className="shrink-0 text-[11px] font-medium text-primary">{`Lv ${level.level}`}</span>
              </span>
              <span className="mt-1 block h-1.5 w-full overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-accent to-primary transition-[width] duration-700"
                  style={{ width: `${Math.round(level.progress * 100)}%` }}
                />
              </span>
              <span className="mt-1 block truncate text-[10px] text-muted-foreground">
                {level.title}
                {level.next !== null ? ` · ${(level.next - points).toLocaleString()} pts to Lv ${level.level + 1}` : ' · Max level'}
              </span>
            </span>
          </button>

          <div className="pointer-events-auto">
            <PrimaryAction
              interaction={interaction}
              busy={busy}
              stage={stage}
              insufficient={insufficient}
              energy={energy}
              onAction={onAction}
            />
          </div>
        </div>
      </div>
    </>
  )
}

function PrimaryAction({
  interaction,
  busy,
  stage,
  insufficient,
  energy,
  onAction,
}: {
  interaction: Interaction | null
  busy: boolean
  stage: DigStage | null
  insufficient: boolean
  energy: number
  onAction: () => void
}) {
  const spinner = <LoaderCircle className="size-6 animate-spin" />

  if (!interaction) {
    return <ActionButton onClick={onAction} disabled icon={busy ? spinner : <Compass className="size-6" />} label="Explore" sub="Walk to a marker" busy={busy} />
  }

  if (interaction.kind === 'dig') {
    if (insufficient && !stage) {
      return (
        <a
          href={BUY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex size-24 flex-col items-center justify-center gap-0.5 rounded-full bg-gradient-to-b from-[#6ee7da] to-[#22a99b] text-accent-foreground shadow-[0_12px_30px_-8px_#3cc6b8,inset_0_2px_0_rgb(255_255_255/0.5)] transition active:scale-95 sm:size-28"
        >
          <Coins className="size-6" aria-hidden="true" />
          <span className="font-display text-sm font-bold leading-none">Get $ZESTO</span>
          <span className="text-[9px] font-semibold opacity-80">{`Need ${DIG_COST}`}</span>
        </a>
      )
    }
    return (
      <ActionButton
        onClick={onAction}
        disabled={busy}
        busy={busy}
        ready={!busy}
        icon={busy ? spinner : <Shovel className="size-6" />}
        label="Dig"
        sub={`${DIG_COST} $ZESTO`}
      />
    )
  }

  if (interaction.kind === 'gather') {
    const Icon = interaction.node.resource === 'wood' ? Axe : Pickaxe
    const empty = energy < GATHER_ENERGY
    return (
      <ActionButton
        onClick={onAction}
        disabled={busy || empty}
        busy={busy}
        ready={!busy && !empty}
        tone="teal"
        icon={busy ? spinner : <Icon className="size-6" />}
        label="Gather"
        sub={empty ? 'No energy' : `${GATHER_ENERGY} energy`}
      />
    )
  }

  const { building, level, locked } = interaction
  return (
    <ActionButton
      onClick={onAction}
      disabled={busy}
      busy={busy}
      ready={!busy}
      tone={level > 0 ? 'gold' : 'orange'}
      icon={locked ? <Lock className="size-6" /> : <Hammer className="size-6" />}
      label={level > 0 ? 'Open' : 'Build'}
      sub={building.name}
    />
  )
}

function StatusPill({ stage, gathering, interaction }: { stage: DigStage | null; gathering: boolean; interaction: Interaction | null }) {
  if (stage || gathering) {
    return (
      <div role="status" className="glass flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium sm:text-sm animate-in fade-in slide-in-from-bottom-2">
        <LoaderCircle className="size-4 animate-spin text-primary" aria-hidden="true" />
        {stage ? STAGE_COPY[stage] : 'Gathering…'}
      </div>
    )
  }

  let text = 'Walk to a glowing X to dig — or head south to your homestead'
  if (interaction?.kind === 'dig') text = 'Treasure spot found — tap Dig!'
  if (interaction?.kind === 'gather') text = `${interaction.node.name} · ${RESOURCE_META[interaction.node.resource].label}`
  if (interaction?.kind === 'plot') {
    const { building, level, locked } = interaction
    text = locked
      ? `${building.name} · requires ${BUILDING_BY_ID[building.requires!].name}`
      : level > 0
        ? `${building.name} · Level ${level}`
        : `${building.name} plot · ${building.tagline}`
  }

  return (
    <div
      role="status"
      className={cn(
        'flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors duration-300 sm:text-sm',
        interaction ? 'bg-primary text-primary-foreground shadow-[0_8px_24px_-6px_#ffa447]' : 'glass text-foreground/85',
      )}
    >
      {interaction ? <Sparkles className="size-4 shrink-0" aria-hidden="true" /> : <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />}
      <span className="truncate">{text}</span>
    </div>
  )
}

const TONES = {
  orange:
    'bg-gradient-to-b from-[#ffd08a] to-[#ff7f1f] text-primary-foreground shadow-[0_14px_34px_-8px_#ff8a2a,inset_0_2px_0_rgb(255_255_255/0.55),inset_0_-4px_8px_rgb(120_40_0/0.3)]',
  teal: 'bg-gradient-to-b from-[#7ef0e2] to-[#1fa596] text-accent-foreground shadow-[0_14px_34px_-8px_#3cc6b8,inset_0_2px_0_rgb(255_255_255/0.5),inset_0_-4px_8px_rgb(0_60_50/0.3)]',
  gold: 'bg-gradient-to-b from-[#ffe58a] to-[#e9a516] text-[#3a2404] shadow-[0_14px_34px_-8px_#ffc94d,inset_0_2px_0_rgb(255_255_255/0.6),inset_0_-4px_8px_rgb(120_70_0/0.3)]',
}

function ActionButton({
  onClick,
  icon,
  label,
  sub,
  disabled,
  busy,
  ready,
  tone = 'orange',
}: {
  onClick: () => void
  icon: React.ReactNode
  label: string
  sub: string
  disabled?: boolean
  busy?: boolean
  ready?: boolean
  tone?: keyof typeof TONES
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      className={cn(
        'relative flex size-24 flex-col items-center justify-center gap-0.5 rounded-full transition duration-300 active:scale-95 sm:size-28',
        ready ? TONES[tone] : 'glass text-foreground/70',
        busy && 'cursor-wait',
        disabled && !busy && 'cursor-not-allowed',
      )}
    >
      {ready ? (
        <span aria-hidden="true" className="absolute -inset-1.5 animate-ping rounded-full border-2 border-primary/60 [animation-duration:1.8s]" />
      ) : null}
      <span aria-hidden="true">{icon}</span>
      <span className="font-display text-lg font-bold uppercase leading-none tracking-wide">{label}</span>
      <span className="max-w-[5.5rem] truncate text-[9px] font-semibold opacity-80">{sub}</span>
    </button>
  )
}

function RailButton({ icon, label, onClick, badge }: { icon: React.ReactNode; label: string; onClick: () => void; badge?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="group relative flex flex-col items-center gap-1" aria-label={label}>
      <span
        aria-hidden="true"
        className="glass grid size-10 place-items-center rounded-2xl text-primary transition group-hover:brightness-125 group-active:scale-95 sm:size-11"
      >
        {icon}
      </span>
      {badge ? (
        <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[#ff5d5d] ring-2 ring-background" />
      ) : null}
      <span aria-hidden="true" className="hidden text-[10px] font-semibold text-foreground/90 [text-shadow:0_1px_4px_rgb(0_0_0/0.7)] sm:block">
        {label}
      </span>
    </button>
  )
}
