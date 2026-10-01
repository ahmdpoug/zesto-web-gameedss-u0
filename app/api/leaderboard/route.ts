import { desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { players } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [top, [totals]] = await Promise.all([
    db
      .select({
        wallet: players.wallet,
        character: players.character,
        totalPoints: players.totalPoints,
        totalDigs: players.totalDigs,
        bestRarity: players.bestRarity,
      })
      .from(players)
      .orderBy(desc(players.totalPoints), players.createdAt)
      .limit(50),
    db
      .select({
        totalPoints: sql<number>`coalesce(sum(${players.totalPoints}), 0)::int`,
        totalDigs: sql<number>`coalesce(sum(${players.totalDigs}), 0)::int`,
        totalPlayers: sql<number>`count(*)::int`,
      })
      .from(players),
  ])

  return Response.json({ players: top, totals })
}
