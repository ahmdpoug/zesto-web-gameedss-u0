'use client'

import dynamic from 'next/dynamic'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useGameActions, useGameState, useSession } from '@/hooks/use-game'
import { useNow } from '@/hooks/use-now'
import { useBalances, useDig, useLeaderboard, usePlayer, useZestoWallet, type DigResult, type DigStage } from '@/hooks/use-zesto'
import { RARITIES, type CharacterId } from '@/lib/zesto/config'
import { BUILDINGS, BUILDING_BY_ID, NODE_BY_ID, RESOURCE_META, type BuildingKind, type NodeId, type ResourceId } from '@/lib/zesto/economy'
import type { GameAction } from '@/lib/zesto/game-types'
import { sfx } from '@/lib/zesto/sfx'
import { INITIAL_SPOTS, playerState, randomSpot, type WorldSpot } from '@/lib/zesto/world'
import { CharacterSelect } from './character-select'
import { DigBar, type Interaction, type PanelId } from './dig-bar'
import { GuidePanel } from './guide-panel'
import { BasePanel, BuildingPanel, WorkshopPanel } from './homestead-panels'
import { LeaderboardPanel } from './leaderboard-panel'
import { Onboarding } from './onboarding'
import { ProfilePanel } from './profile-panel'
import { QuestsPanel, claimableCount } from './quests-panel'
import { RewardReveal } from './reward-reveal'
import { RewardsPanel } from './rewards-panel'
import { TopHud } from './top-hud'

const BeachWorld = dynamic(() => import('./world/beach-world').then((m) => m.BeachWorld), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_50%_40%,#2a1d2e,#0d1524)]">
      <p className="animate-pulse font-display text-lg font-semibold text-primary">Loading the shore…</p>
    </div>
  ),
})

function friendlyError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  if (/user rejected|denied|rejected the request/i.test(message)) return 'Request cancelled in wallet'
  if (/insufficient funds|gas/i.test(message)) return 'Not enough testnet ETH for gas'
  if (/exceeds balance|transfer amount/i.test(message)) return 'Not enough $ZESTO for a dig'
  return message.length > 140 ? `${message.slice(0, 140)}…` : message
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function ZestoGame() {
  const { authenticated, login, address } = useZestoWallet()
  const session = useSession()
  const { data: game, error: gameError } = useGameState()
  const { act, register, refresh } = useGameActions()
  const { data: balances, mutate: refreshBalances } = useBalances(address)
  const { mutate: refreshPlayer } = usePlayer(address)
  const { mutate: refreshBoard } = useLeaderboard()
  const dig = useDig()
  const now = useNow()

  const [panel, setPanel] = useState<PanelId | null>(null)
  const [buildingPanel, setBuildingPanel] = useState<BuildingKind | null>(null)
  const [nightOverride, setNightOverride] = useState<boolean | null>(null)
  const [muted, setMuted] = useState(false)
  const [spots, setSpots] = useState<WorldSpot[]>(INITIAL_SPOTS)
  const [nearKey, setNearKey] = useState<string | null>(null)
  const [digSpot, setDigSpot] = useState<number | null>(null)
  const [gatherNode, setGatherNode] = useState<NodeId | null>(null)
  const [stage, setStage] = useState<DigStage | null>(null)
  const [result, setResult] = useState<DigResult | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)

  const player = game?.player ?? null
  const character: CharacterId | null = player?.character ?? null
  const hour = now ? new Date(now).getHours() : 12
  const night = nightOverride ?? (hour < 6 || hour >= 19)
  const play = useCallback((fn: () => void) => !muted && fn(), [muted])

  const buildingLevels = useMemo(() => {
    const levels: Partial<Record<BuildingKind, number>> = {}
    for (const b of BUILDINGS) levels[b.id] = game?.buildings[b.id]?.level ?? 0
    return levels
  }, [game?.buildings])

  const interaction = useMemo<Interaction | null>(() => {
    if (!nearKey) return null
    const [type, id] = nearKey.split(':')
    if (type === 'spot') return { kind: 'dig' }
    if (type === 'node') return { kind: 'gather', node: NODE_BY_ID[id as NodeId] }
    const building = BUILDING_BY_ID[id as BuildingKind]
    return {
      kind: 'plot',
      building,
      level: buildingLevels[building.id] ?? 0,
      locked: !!building.requires && !buildingLevels[building.requires],
    }
  }, [nearKey, buildingLevels])

  const faceTarget = useMemo<WorldSpot | null>(() => {
    if (digSpot !== null) return spots[digSpot] ?? null
    if (gatherNode) return NODE_BY_ID[gatherNode]
    return null
  }, [digSpot, gatherNode, spots])

  const run = useCallback(
    async (action: GameAction, key: string) => {
      setPending(key)
      try {
        const outcome = await act(action)
        const gained = Object.entries(outcome.gained ?? {})
          .map(([k, v]) => `+${v} ${RESOURCE_META[k as ResourceId].label.toLowerCase()}`)
          .join(' · ')
        play(() => sfx.reveal(action.type === 'build' || action.type === 'upgrade' || action.type === 'craft' ? 3 : 1))
        toast.success(outcome.title, {
          description: [outcome.description, gained, outcome.points > 0 ? `+${outcome.points} pts` : null].filter(Boolean).join(' · '),
        })
        void refreshPlayer()
        void refreshBoard()
      } catch (err) {
        play(sfx.error)
        toast.error(friendlyError(err))
      } finally {
        setPending(null)
      }
    },
    [act, play, refreshPlayer, refreshBoard],
  )

  const handleDig = useCallback(async () => {
    if (stage || nearKey === null || !nearKey.startsWith('spot:')) return
    const index = Number(nearKey.slice(5))
    play(sfx.tap)
    setDigSpot(index)
    try {
      const outcome = await dig((next) => {
        setStage(next)
        if (next === 'confirming') play(sfx.dig)
      })
      play(() => sfx.reveal(RARITIES.findIndex((r) => r.id === outcome.rarity.id)))
      setResult(outcome)
      void refreshBalances()
      void refreshPlayer()
      void refreshBoard()
      void refresh()
    } catch (err) {
      setDigSpot(null)
      play(sfx.error)
      toast.error(friendlyError(err))
    } finally {
      setStage(null)
    }
  }, [stage, nearKey, dig, play, refreshBalances, refreshPlayer, refreshBoard, refresh])

  const handleGather = useCallback(
    async (node: NodeId) => {
      if (pending) return
      setGatherNode(node)
      play(sfx.dig)
      await Promise.all([run({ type: 'gather', node }, `gather:${node}`), wait(900)])
      setGatherNode(null)
    },
    [pending, play, run],
  )

  const handleAction = useCallback(() => {
    if (!interaction) return
    if (interaction.kind === 'dig') return void handleDig()
    if (interaction.kind === 'gather') return void handleGather(interaction.node.id)
    play(sfx.tap)
    setBuildingPanel(interaction.building.id)
  }, [interaction, handleDig, handleGather, play])

  const closeReveal = useCallback(() => {
    setResult(null)
    setSpots((current) => {
      if (digSpot === null) return current
      const others = current.filter((_, i) => i !== digSpot)
      return current.map((s, i) => (i === digSpot ? randomSpot(others, playerState) : s))
    })
    setDigSpot(null)
    setNearKey(null)
  }, [digSpot])

  const closePanel = useCallback(() => setPanel(null), [])
  const closeBuilding = useCallback(() => setBuildingPanel(null), [])

  const handleSign = useCallback(async () => {
    try {
      await session.signIn()
    } catch (err) {
      toast.error(friendlyError(err))
    }
  }, [session])

  const handleRegister = useCallback(
    async (id: CharacterId) => {
      setRegistering(true)
      try {
        await register(id)
        play(() => sfx.reveal(4))
        toast.success('Welcome to the shore!', { description: 'Your Zesto is locked in. Head south to start building.' })
        void refreshBoard()
      } catch (err) {
        play(sfx.error)
        toast.error(friendlyError(err))
      } finally {
        setRegistering(false)
      }
    },
    [register, play, refreshBoard],
  )

  const onboardingStep: 'connect' | 'sign' | 'loading' | null = !authenticated || !address
    ? 'connect'
    : session.loading
      ? 'loading'
      : !session.token
        ? 'sign'
        : !game && !gameError
          ? 'loading'
          : null
  const needsCharacter = !onboardingStep && game && !game.player
  const playing = !onboardingStep && !!player && !!character
  const gathering = gatherNode !== null

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background">
      <h1 className="sr-only">Zesto Dig — beach treasure hunt and homestead builder</h1>
      <BeachWorld
        night={night}
        character={playing ? character : null}
        spots={spots}
        nearKey={nearKey}
        digIndex={digSpot}
        faceTarget={faceTarget}
        buildingLevels={buildingLevels}
        locked={stage !== null || gathering || result !== null || !playing || panel !== null || buildingPanel !== null}
        digging={stage === 'confirming' || stage === 'revealing' || gathering}
        onNearChange={setNearKey}
      />

      {playing && player && character ? (
        <>
          <TopHud
            night={night}
            onToggleNight={() => setNightOverride(!night)}
            muted={muted}
            onToggleMute={() => setMuted((m) => !m)}
            points={player.totalPoints}
            player={player}
            onOpenProfile={() => setPanel('profile')}
          />
          <DigBar
            character={character}
            points={player.totalPoints}
            balance={balances?.zesto ?? null}
            stage={stage}
            gathering={gathering}
            interaction={interaction}
            energy={player.energy}
            rewardsReady={!player.checkedInToday}
            questsReady={claimableCount(game?.quests ?? []) > 0}
            onAction={handleAction}
            onOpenPanel={setPanel}
          />
        </>
      ) : null}

      {onboardingStep ? (
        <Onboarding step={onboardingStep} address={address} busy={session.signing} onConnect={login} onSign={handleSign} />
      ) : null}

      {!onboardingStep && gameError && !game ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-background/80 p-6 text-center">
          <div className="glass max-w-sm rounded-3xl p-5">
            <p className="font-display text-lg font-semibold">Could not reach the game server</p>
            <p className="mt-1 text-sm text-muted-foreground">{friendlyError(gameError)}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-4 h-11 w-full rounded-2xl bg-primary font-display font-bold text-primary-foreground"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {needsCharacter ? <CharacterSelect onConfirm={handleRegister} submitting={registering} /> : null}

      {playing && game ? (
        <>
          {panel === 'leaderboard' ? <LeaderboardPanel onClose={closePanel} address={address} /> : null}
          {panel === 'profile' && character ? <ProfilePanel onClose={closePanel} character={character} /> : null}
          {panel === 'guide' ? <GuidePanel onClose={closePanel} /> : null}
          {panel === 'base' ? <BasePanel state={game} run={run} pending={pending} onClose={closePanel} /> : null}
          {panel === 'workshop' ? <WorkshopPanel state={game} run={run} pending={pending} onClose={closePanel} /> : null}
          {panel === 'rewards' ? <RewardsPanel state={game} run={run} pending={pending} onClose={closePanel} /> : null}
          {panel === 'quests' ? <QuestsPanel state={game} run={run} pending={pending} onClose={closePanel} /> : null}
          {buildingPanel ? <BuildingPanel kind={buildingPanel} state={game} run={run} pending={pending} onClose={closeBuilding} /> : null}
        </>
      ) : null}

      {result ? <RewardReveal result={result} onClose={closeReveal} onDigAgain={closeReveal} /> : null}
    </main>
  )
}
