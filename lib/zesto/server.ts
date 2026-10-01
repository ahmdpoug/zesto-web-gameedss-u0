import { createHash, randomBytes } from 'node:crypto'
import { and, desc, eq, gt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { buildings, players, pointsLog, sessions, tools } from '@/lib/db/schema'
import type { CharacterId, RarityId } from './config'
import {
  BUILDINGS,
  ENERGY_REGEN_MS,
  PRODUCTION_CAP_HOURS,
  checkinPoints,
  digBonusPercent,
  isToolId,
  maxEnergy,
  productionPerHour,
  type BuildingKind,
  type Cost,
  type PointSource,
  type Production,
  type ResourceId,
  type Resources,
  type ToolId,
} from './economy'
import type { BuildingState, GameState } from './game-types'

export type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0]
export type PlayerRow = typeof players.$inferSelect
export type BuildingRow = typeof buildings.$inferSelect

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export class GameError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(wallet: string) {
  const token = randomBytes(32).toString('base64url')
  await db.insert(sessions).values({ tokenHash: hashToken(token), wallet, expiresAt: new Date(Date.now() + SESSION_TTL_MS) })
  return token
}

export async function getSessionWallet(request: Request) {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null
  if (!token) return null
  const [row] = await db
    .select({ wallet: sessions.wallet })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1)
  return row?.wallet ?? null
}

export async function requireWallet(request: Request) {
  const wallet = await getSessionWallet(request)
  if (!wallet) throw new GameError('Your session has expired. Please sign in again.', 401)
  return wallet
}

export function signInMessage(wallet: string, nonce: string) {
  return [
    'Welcome to Zesto Dig.',
    '',
    'Sign this message to verify you own this wallet. It does not cost gas or move funds.',
    '',
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
  ].join('\n')
}

export function utcDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function resourcesOf(player: PlayerRow): Resources {
  return { wood: player.wood, stone: player.stone, ore: player.ore, ingots: player.ingots }
}

export function computeEnergy(player: PlayerRow, max: number, now: Date) {
  const elapsed = now.getTime() - player.energyAt.getTime()
  const regen = Math.max(0, Math.floor(elapsed / ENERGY_REGEN_MS))
  const energy = Math.min(max, player.energy + regen)
  const energyAt = energy >= max ? now : new Date(player.energyAt.getTime() + regen * ENERGY_REGEN_MS)
  return { energy, energyAt }
}

/** Whole units ready to collect, plus how much of the clock they consume. */
export function computePending(kind: BuildingKind, level: number, collectedAt: Date, now: Date) {
  const rates = productionPerHour(kind, level)
  const entries = Object.entries(rates) as [ResourceId | 'points', number][]
  if (entries.length === 0) return { pending: {} as Production, consumedMs: 0, capped: false }
  const elapsedMs = Math.max(0, now.getTime() - collectedAt.getTime())
  const capMs = PRODUCTION_CAP_HOURS * 3_600_000
  const capped = elapsedMs >= capMs
  const hours = Math.min(elapsedMs, capMs) / 3_600_000
  const [, primaryRate] = entries[0]
  const primaryUnits = Math.floor(primaryRate * hours)
  const consumedHours = primaryUnits / primaryRate
  const pending: Production = {}
  for (const [key, rate] of entries) {
    const amount = Math.floor(rate * consumedHours + 1e-9)
    if (amount > 0) pending[key] = amount
  }
  return { pending, consumedMs: consumedHours * 3_600_000, capped }
}

export function ownedTools(rows: { tool: string }[]): ToolId[] {
  return rows.map((r) => r.tool).filter(isToolId)
}

export function costDelta(cost: Cost, sign: 1 | -1) {
  const delta: Partial<Resources> = {}
  for (const [k, v] of Object.entries(cost) as [ResourceId, number][]) delta[k] = v * sign
  return delta
}

export async function addPoints(tx: Executor, wallet: string, source: PointSource, points: number, detail: string) {
  if (points <= 0) return
  await tx.insert(pointsLog).values({ wallet, source, points, detail })
}

export async function loadState(wallet: string, executor: Executor = db): Promise<GameState> {
  const now = new Date()
  const [[player], buildingRows, toolRows, log] = await Promise.all([
    executor.select().from(players).where(eq(players.wallet, wallet)).limit(1),
    executor.select().from(buildings).where(eq(buildings.wallet, wallet)),
    executor.select({ tool: tools.tool }).from(tools).where(eq(tools.wallet, wallet)),
    executor
      .select({ id: pointsLog.id, source: pointsLog.source, points: pointsLog.points, detail: pointsLog.detail, createdAt: pointsLog.createdAt })
      .from(pointsLog)
      .where(eq(pointsLog.wallet, wallet))
      .orderBy(desc(pointsLog.createdAt))
      .limit(20),
  ])

  if (!player) {
    return { player: null, buildings: {}, tools: [], digBonusPercent: 0, log: [], serverTime: now.toISOString() }
  }

  const owned = ownedTools(toolRows)
  const max = maxEnergy(owned)
  const { energy, energyAt } = computeEnergy(player, max, now)
  const today = utcDay(now)
  const yesterday = utcDay(new Date(now.getTime() - 86_400_000))
  const continuing = player.lastCheckin === yesterday || player.lastCheckin === today
  const nextStreak = player.lastCheckin === today ? player.streak : continuing ? player.streak + 1 : 1

  const buildingMap: GameState['buildings'] = {}
  for (const row of buildingRows) {
    const kind = row.kind as BuildingKind
    if (!BUILDINGS.some((b) => b.id === kind)) continue
    const state: BuildingState = {
      level: row.level,
      pending: computePending(kind, row.level, row.collectedAt, now).pending,
      collectedAt: row.collectedAt.toISOString(),
    }
    buildingMap[kind] = state
  }

  return {
    player: {
      wallet: player.wallet,
      character: player.character as CharacterId,
      totalPoints: player.totalPoints,
      totalDigs: player.totalDigs,
      bestRarity: (player.bestRarity as RarityId | null) ?? null,
      resources: resourcesOf(player),
      energy,
      maxEnergy: max,
      nextEnergyAt: energy >= max ? null : new Date(energyAt.getTime() + ENERGY_REGEN_MS).toISOString(),
      streak: player.lastCheckin === today || player.lastCheckin === yesterday ? player.streak : 0,
      checkedInToday: player.lastCheckin === today,
      nextCheckinPoints: checkinPoints(Math.max(1, nextStreak)),
      createdAt: player.createdAt.toISOString(),
    },
    buildings: buildingMap,
    tools: owned,
    digBonusPercent: digBonusPercent(buildingMap.beacon?.level ?? 0, owned),
    log: log.map((l) => ({ ...l, source: l.source as PointSource, createdAt: l.createdAt.toISOString() })),
    serverTime: now.toISOString(),
  }
}

export function errorResponse(error: unknown, scope: string) {
  if (error instanceof GameError) return Response.json({ error: error.message }, { status: error.status })
  console.error(`[${scope}]`, error)
  return Response.json({ error: 'Game server is temporarily unavailable. Please try again.' }, { status: 503 })
}
