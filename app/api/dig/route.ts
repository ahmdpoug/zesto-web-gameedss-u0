import { randomInt } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import { decodeEventLog, erc20Abi, isHash, type Hash } from 'viem'
import { db } from '@/lib/db'
import { buildings, digs, players, tools } from '@/lib/db/schema'
import { publicClient } from '@/lib/zesto/chain'
import {
  CHARACTER_BY_ID,
  DIG_COST_WEI,
  RARITIES,
  RARITY_BY_ID,
  TREASURY_ADDRESS,
  ZESTO_ADDRESS,
  calculatePoints,
  getLevel,
  isCharacterId,
  type RarityId,
} from '@/lib/zesto/config'
import { DIG_MATERIALS, digBonusPercent } from '@/lib/zesto/economy'
import { addPoints, ownedTools, trackProgress } from '@/lib/zesto/server'

export const maxDuration = 60

const RARITY_ORDER: RarityId[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

function rollRarity() {
  const total = RARITIES.reduce((sum, r) => sum + r.weight, 0)
  let roll = randomInt(0, total * 100) / 100
  for (const rarity of RARITIES) {
    if (roll < rarity.weight) return rarity
    roll -= rarity.weight
  }
  return RARITIES[0]
}

async function findPayment(txHash: Hash) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 45_000 })
  if (receipt.status !== 'success') return null

  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== ZESTO_ADDRESS.toLowerCase()) continue
    try {
      const event = decodeEventLog({ abi: erc20Abi, data: log.data, topics: log.topics })
      if (event.eventName !== 'Transfer') continue
      const { from, to, value } = event.args
      if (
        from.toLowerCase() === receipt.from.toLowerCase() &&
        to.toLowerCase() === TREASURY_ADDRESS.toLowerCase() &&
        value >= DIG_COST_WEI
      ) {
        return from.toLowerCase()
      }
    } catch {
      continue
    }
  }
  return null
}

export async function POST(request: Request) {
  let body: { txHash?: unknown }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { txHash } = body
  if (typeof txHash !== 'string' || !isHash(txHash)) {
    return Response.json({ error: 'Invalid transaction hash' }, { status: 400 })
  }

  const normalizedHash = txHash.toLowerCase()
  let existing: { id: number }[]
  try {
    existing = await db.select({ id: digs.id }).from(digs).where(eq(digs.txHash, normalizedHash)).limit(1)
  } catch (error) {
    console.error('[dig] database lookup failed', error)
    return Response.json({ error: 'Game server is temporarily unavailable. Please try again.' }, { status: 503 })
  }
  if (existing.length > 0) {
    return Response.json({ error: 'This dig has already been claimed' }, { status: 409 })
  }

  let wallet: string | null
  try {
    wallet = await findPayment(normalizedHash as Hash)
  } catch {
    return Response.json({ error: 'Could not confirm the transaction yet. Please try again shortly.' }, { status: 502 })
  }
  if (!wallet) {
    return Response.json({ error: 'No valid 100 $ZESTO dig payment found in this transaction' }, { status: 400 })
  }

  let player: typeof players.$inferSelect | undefined
  let bonusPercent = 0
  try {
    const [[row], beaconRows, toolRows] = await Promise.all([
      db.select().from(players).where(eq(players.wallet, wallet)).limit(1),
      db
        .select({ level: buildings.level })
        .from(buildings)
        .where(and(eq(buildings.wallet, wallet), eq(buildings.kind, 'beacon'))),
      db.select({ tool: tools.tool }).from(tools).where(eq(tools.wallet, wallet)),
    ])
    player = row
    bonusPercent = digBonusPercent(beaconRows[0]?.level ?? 0, ownedTools(toolRows))
  } catch (error) {
    console.error('[dig] player lookup failed', error)
    return Response.json({ error: 'Game server is temporarily unavailable. Please try again.' }, { status: 503 })
  }
  if (!player || !isCharacterId(player.character)) {
    return Response.json({ error: 'Create your character before digging. Your payment is safe — retry after signing up.' }, { status: 403 })
  }

  const character = player.character
  const levelBefore = getLevel(player.totalPoints).level
  const rarity = rollRarity()
  const hero = CHARACTER_BY_ID[character]
  const reward = calculatePoints(rarity, hero, levelBefore, bonusPercent)
  const materials = DIG_MATERIALS[rarity.id]

  const currentBest = player.bestRarity as RarityId | null
  const bestRarity =
    currentBest && RARITY_ORDER.indexOf(currentBest) >= RARITY_ORDER.indexOf(rarity.id) ? currentBest : rarity.id

  try {
    const result = await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(digs)
        .values({ wallet, txHash: normalizedHash, character, rarity: rarity.id, item: rarity.item, points: reward.points })
        .onConflictDoNothing({ target: digs.txHash })
        .returning({ id: digs.id })

      if (inserted.length === 0) return null

      const [updated] = await tx
        .update(players)
        .set({
          totalPoints: sql`${players.totalPoints} + ${reward.points}`,
          totalDigs: sql`${players.totalDigs} + 1`,
          wood: sql`${players.wood} + ${materials.wood ?? 0}`,
          stone: sql`${players.stone} + ${materials.stone ?? 0}`,
          ore: sql`${players.ore} + ${materials.ore ?? 0}`,
          ingots: sql`${players.ingots} + ${materials.ingots ?? 0}`,
          bestRarity,
          updatedAt: new Date(),
        })
        .where(eq(players.wallet, wallet))
        .returning()
      await addPoints(tx, wallet, 'dig', reward.points, `Dug up a ${rarity.label} ${rarity.item}`)
      await trackProgress(tx, wallet, { dig: 1 })
      return updated
    })

    if (!result) {
      return Response.json({ error: 'This dig has already been claimed' }, { status: 409 })
    }

    const levelAfter = getLevel(result.totalPoints)
    return Response.json({
      rarity: RARITY_BY_ID[rarity.id],
      points: reward.points,
      basePoints: rarity.points,
      perkPercent: reward.perkPercent,
      levelPercent: reward.levelPercent,
      homesteadPercent: reward.homesteadPercent,
      materials,
      totalPoints: result.totalPoints,
      totalDigs: result.totalDigs,
      level: levelAfter.level,
      leveledUp: levelAfter.level > levelBefore,
    })
  } catch (error) {
    console.error('[dig] failed to record dig', error)
    return Response.json({ error: 'Failed to record your dig. Please contact support with your tx hash.' }, { status: 500 })
  }
}
