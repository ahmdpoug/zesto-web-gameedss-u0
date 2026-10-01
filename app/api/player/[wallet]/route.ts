import { desc, eq, gt, sql } from 'drizzle-orm'
import { isAddress } from 'viem'
import { db } from '@/lib/db'
import { digs, players } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ wallet: string }> }) {
  const { wallet: raw } = await params
  if (!isAddress(raw)) {
    return Response.json({ error: 'Invalid wallet' }, { status: 400 })
  }
  const wallet = raw.toLowerCase()

  const [[player], recent] = await Promise.all([
    db.select().from(players).where(eq(players.wallet, wallet)).limit(1),
    db
      .select({
        id: digs.id,
        rarity: digs.rarity,
        item: digs.item,
        points: digs.points,
        character: digs.character,
        txHash: digs.txHash,
        createdAt: digs.createdAt,
      })
      .from(digs)
      .where(eq(digs.wallet, wallet))
      .orderBy(desc(digs.createdAt))
      .limit(12),
  ])

  if (!player) {
    return Response.json({ player: null, rank: null, recent: [] })
  }

  const [{ ahead }] = await db
    .select({ ahead: sql<number>`count(*)::int` })
    .from(players)
    .where(gt(players.totalPoints, player.totalPoints))

  return Response.json({ player, rank: ahead + 1, recent })
}
