import { randomInt } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { buildings, players, questClaims, tools } from '@/lib/db/schema'
import { db } from '@/lib/db'
import {
  BUILDINGS,
  BUILDING_BY_ID,
  CHECKIN_ENERGY,
  GATHER_ENERGY,
  GATHER_POINTS,
  MAX_BUILDING_LEVEL,
  NODE_BY_ID,
  RESOURCE_META,
  SMELT_COST,
  SMELT_POINTS_PER_INGOT,
  TOOL_BY_ID,
  buildingCost,
  buildingPoints,
  canAfford,
  checkinPoints,
  isBuildingKind,
  isToolId,
  maxEnergy,
  type BuildingKind,
  type Cost,
  type ResourceId,
  type Resources,
} from '@/lib/zesto/economy'
import type { ActionOutcome, GameAction } from '@/lib/zesto/game-types'
import {
  GameError,
  addPoints,
  computeEnergy,
  computePending,
  computeQuests,
  errorResponse,
  loadState,
  ownedTools,
  requireWallet,
  resourcesOf,
  trackProgress,
  utcDay,
  type Executor,
  type PlayerRow,
} from '@/lib/zesto/server'

function parseAction(body: unknown): GameAction {
  if (!body || typeof body !== 'object') throw new GameError('Invalid action')
  const a = body as Record<string, unknown>
  switch (a.type) {
    case 'gather':
      if (typeof a.node !== 'string' || !(a.node in NODE_BY_ID)) throw new GameError('Unknown resource node')
      return { type: 'gather', node: a.node as keyof typeof NODE_BY_ID }
    case 'build':
    case 'upgrade':
      if (!isBuildingKind(a.kind)) throw new GameError('Unknown building')
      return { type: a.type, kind: a.kind }
    case 'smelt': {
      const times = Number(a.times)
      if (!Number.isInteger(times) || times < 1 || times > 20) throw new GameError('Smelt between 1 and 20 batches')
      return { type: 'smelt', times }
    }
    case 'craft':
      if (!isToolId(a.tool)) throw new GameError('Unknown tool')
      return { type: 'craft', tool: a.tool }
    case 'collect':
    case 'checkin':
      return { type: a.type }
    case 'claim_quest':
      if (typeof a.id !== 'string' || a.id.length > 64) throw new GameError('Unknown quest')
      return { type: 'claim_quest', id: a.id }
    default:
      throw new GameError('Unknown action')
  }
}

function scaleCost(cost: Cost, times: number): Cost {
  return Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, v * times])) as Cost
}

function missingText(resources: Resources, cost: Cost) {
  const missing = (Object.entries(cost) as [ResourceId, number][])
    .filter(([k, v]) => resources[k] < v)
    .map(([k, v]) => `${v - resources[k]} ${RESOURCE_META[k].label.toLowerCase()}`)
  return `Not enough materials — need ${missing.join(', ')} more`
}

function applyDelta(resources: Resources, delta: Partial<Resources>): Resources {
  const next = { ...resources }
  for (const [k, v] of Object.entries(delta) as [ResourceId, number][]) next[k] = Math.max(0, next[k] + v)
  return next
}

function negate(cost: Cost): Partial<Resources> {
  return Object.fromEntries(Object.entries(cost).map(([k, v]) => [k, -v])) as Partial<Resources>
}

async function savePlayer(tx: Executor, player: PlayerRow, resources: Resources, points: number, extra: Partial<PlayerRow> = {}) {
  await tx
    .update(players)
    .set({
      ...resources,
      ...extra,
      totalPoints: sql`${players.totalPoints} + ${points}`,
      updatedAt: new Date(),
    })
    .where(eq(players.wallet, player.wallet))
}

async function perform(tx: Executor, wallet: string, action: GameAction): Promise<ActionOutcome> {
  const now = new Date()
  const [player] = await tx.select().from(players).where(eq(players.wallet, wallet)).for('update').limit(1)
  if (!player) throw new GameError('Create your character first', 403)

  const buildingRows = await tx.select().from(buildings).where(eq(buildings.wallet, wallet))
  const levelOf = (kind: BuildingKind) => buildingRows.find((b) => b.kind === kind)?.level ?? 0
  const owned = ownedTools(await tx.select({ tool: tools.tool }).from(tools).where(eq(tools.wallet, wallet)))
  const resources = resourcesOf(player)

  switch (action.type) {
    case 'gather': {
      const node = NODE_BY_ID[action.node]
      const max = maxEnergy(owned)
      const { energy, energyAt } = computeEnergy(player, max, now)
      if (energy < GATHER_ENERGY) throw new GameError('Out of energy — rest a moment or check in for a refill')
      let amount = randomInt(node.yield[0], node.yield[1] + 1)
      if (node.resource === 'wood' && owned.includes('iron_axe')) amount += 1
      if (node.resource !== 'wood' && owned.includes('iron_pick')) amount += 1
      const gained = { [node.resource]: amount } as Partial<Resources>
      const nextEnergy = energy - GATHER_ENERGY
      await savePlayer(tx, player, applyDelta(resources, gained), GATHER_POINTS, {
        energy: nextEnergy,
        energyAt: energy >= max ? now : energyAt,
      })
      await addPoints(tx, wallet, 'gather', GATHER_POINTS, `Gathered ${amount} ${RESOURCE_META[node.resource].label.toLowerCase()} at ${node.name}`)
      await trackProgress(tx, wallet, { gather: amount, [`gather_${node.resource}`]: amount }, now)
      return { title: `+${amount} ${RESOURCE_META[node.resource].label}`, description: node.name, points: GATHER_POINTS, gained }
    }

    case 'build': {
      const def = BUILDING_BY_ID[action.kind]
      if (levelOf(action.kind) > 0) throw new GameError(`${def.name} is already built`)
      if (def.requires && levelOf(def.requires) === 0) throw new GameError(`Build the ${BUILDING_BY_ID[def.requires].name} first`)
      const cost = buildingCost(action.kind, 1)
      if (!canAfford(resources, cost)) throw new GameError(missingText(resources, cost))
      const points = buildingPoints(action.kind, 1)
      await tx.insert(buildings).values({ wallet, kind: action.kind, level: 1, builtAt: now, collectedAt: now })
      await savePlayer(tx, player, applyDelta(resources, negate(cost)), points)
      await addPoints(tx, wallet, 'build', points, `Constructed the ${def.name}`)
      await trackProgress(tx, wallet, { build: 1 }, now)
      return { title: `${def.name} constructed`, description: def.effects[0], points }
    }

    case 'upgrade': {
      const def = BUILDING_BY_ID[action.kind]
      const row = buildingRows.find((b) => b.kind === action.kind)
      if (!row) throw new GameError(`Build the ${def.name} first`)
      if (row.level >= MAX_BUILDING_LEVEL) throw new GameError(`${def.name} is already at max level`)
      const nextLevel = row.level + 1
      const cost = buildingCost(action.kind, nextLevel)
      if (!canAfford(resources, cost)) throw new GameError(missingText(resources, cost))

      const { pending } = computePending(action.kind, row.level, row.collectedAt, now)
      const { points: pendingPoints = 0, ...pendingResources } = pending
      const points = buildingPoints(action.kind, nextLevel) + pendingPoints
      await tx
        .update(buildings)
        .set({ level: nextLevel, collectedAt: now })
        .where(and(eq(buildings.wallet, wallet), eq(buildings.kind, action.kind)))
      await savePlayer(tx, player, applyDelta(applyDelta(resources, pendingResources), negate(cost)), points)
      await addPoints(tx, wallet, 'upgrade', buildingPoints(action.kind, nextLevel), `Upgraded the ${def.name} to level ${nextLevel}`)
      if (pendingPoints > 0) await addPoints(tx, wallet, 'collect', pendingPoints, `${def.name} payout`)
      await trackProgress(tx, wallet, { build: 1 }, now)
      return { title: `${def.name} → Level ${nextLevel}`, description: def.effects[nextLevel - 1], points }
    }

    case 'smelt': {
      const forge = levelOf('forge')
      if (forge === 0) throw new GameError('Build a Forge to smelt ingots')
      const cost = scaleCost(SMELT_COST, action.times)
      if (!canAfford(resources, cost)) throw new GameError(missingText(resources, cost))
      const ingots = forge * action.times
      const points = ingots * SMELT_POINTS_PER_INGOT
      await savePlayer(tx, player, applyDelta(applyDelta(resources, negate(cost)), { ingots }), points)
      await addPoints(tx, wallet, 'smelt', points, `Smelted ${ingots} ingot${ingots === 1 ? '' : 's'}`)
      await trackProgress(tx, wallet, { smelt: ingots }, now)
      return { title: `+${ingots} Ingot${ingots === 1 ? '' : 's'}`, description: 'Fresh from the Forge', points, gained: { ingots } }
    }

    case 'craft': {
      const tool = TOOL_BY_ID[action.tool]
      const anvil = levelOf('anvil')
      if (anvil === 0) throw new GameError('Build an Anvil to craft tools')
      if (anvil < tool.tier) throw new GameError(`Upgrade your Anvil to level ${tool.tier} to craft the ${tool.name}`)
      if (owned.includes(tool.id)) throw new GameError(`You already own the ${tool.name}`)
      if (!canAfford(resources, tool.cost)) throw new GameError(missingText(resources, tool.cost))
      await tx.insert(tools).values({ wallet, tool: tool.id })
      await savePlayer(tx, player, applyDelta(resources, negate(tool.cost)), tool.points)
      await addPoints(tx, wallet, 'craft', tool.points, `Forged the ${tool.name}`)
      await trackProgress(tx, wallet, { craft: 1 }, now)
      return { title: `${tool.name} crafted`, description: tool.effect, points: tool.points }
    }

    case 'collect': {
      let next = resources
      let points = 0
      const gained: Partial<Resources> = {}
      for (const row of buildingRows) {
        const kind = row.kind as BuildingKind
        if (!BUILDINGS.some((b) => b.id === kind)) continue
        const { pending, consumedMs, capped } = computePending(kind, row.level, row.collectedAt, now)
        const { points: p = 0, ...res } = pending
        if (p === 0 && Object.keys(res).length === 0) continue
        points += p
        next = applyDelta(next, res)
        for (const [k, v] of Object.entries(res) as [ResourceId, number][]) gained[k] = (gained[k] ?? 0) + v
        const collectedAt = capped ? now : new Date(row.collectedAt.getTime() + consumedMs)
        await tx
          .update(buildings)
          .set({ collectedAt })
          .where(and(eq(buildings.wallet, wallet), eq(buildings.kind, kind)))
      }
      if (points === 0 && Object.keys(gained).length === 0) throw new GameError('Nothing to collect yet — check back soon')
      await savePlayer(tx, player, next, points)
      await addPoints(tx, wallet, 'collect', points, 'Collected homestead production')
      await trackProgress(tx, wallet, { collect: 1 }, now)
      return { title: 'Production collected', description: 'Your homestead has been busy', points, gained }
    }

    case 'checkin': {
      const today = utcDay(now)
      if (player.lastCheckin === today) throw new GameError('Already checked in today — come back tomorrow')
      const yesterday = utcDay(new Date(now.getTime() - 86_400_000))
      const streak = player.lastCheckin === yesterday ? player.streak + 1 : 1
      const points = checkinPoints(streak)
      const max = maxEnergy(owned)
      const { energy, energyAt } = computeEnergy(player, max, now)
      const refilled = Math.min(max, energy + CHECKIN_ENERGY)
      await savePlayer(tx, player, resources, points, {
        streak,
        lastCheckin: today,
        energy: refilled,
        energyAt: refilled >= max ? now : energyAt,
      })
      await addPoints(tx, wallet, 'checkin', points, `Day ${streak} check-in`)
      await trackProgress(tx, wallet, { checkin: 1 }, now)
      return { title: `Day ${streak} check-in`, description: `+${CHECKIN_ENERGY} energy restored`, points }
    }

    case 'claim_quest': {
      const quests = await computeQuests(tx, wallet, player, buildingRows, owned, now)
      const quest = quests.find((q) => q.id === action.id)
      if (!quest) throw new GameError('That quest is no longer active')
      if (quest.claimed) throw new GameError('Reward already claimed')
      if (quest.progress < quest.goal) throw new GameError(`Keep going — ${quest.progress}/${quest.goal}`)
      const inserted = await tx
        .insert(questClaims)
        .values({ wallet, questId: quest.id, period: quest.period })
        .onConflictDoNothing()
        .returning({ questId: questClaims.questId })
      if (inserted.length === 0) throw new GameError('Reward already claimed')
      const gained = { ...(quest.reward.resources ?? {}) } as Partial<Resources>
      const { points } = quest.reward
      await savePlayer(tx, player, applyDelta(resources, gained), points)
      const label = quest.scope === 'achievement' ? 'Achievement' : `${quest.scope === 'daily' ? 'Daily' : 'Weekly'} quest`
      await addPoints(tx, wallet, 'quest', points, `${label}: ${quest.title}`)
      return { title: `${label} complete`, description: quest.title, points, gained }
    }
  }
}

export async function POST(request: Request) {
  try {
    const wallet = await requireWallet(request)
    const action = parseAction(await request.json().catch(() => null))
    const outcome = await db.transaction((tx) => perform(tx, wallet, action))
    return Response.json({ state: await loadState(wallet), outcome })
  } catch (error) {
    return errorResponse(error, 'game/action')
  }
}
