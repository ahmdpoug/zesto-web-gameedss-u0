import { db } from '@/lib/db'
import { players } from '@/lib/db/schema'
import { CHARACTER_BY_ID, isCharacterId } from '@/lib/zesto/config'
import { SIGNUP_BONUS, STARTER_RESOURCES } from '@/lib/zesto/economy'
import { GameError, addPoints, errorResponse, loadState, requireWallet } from '@/lib/zesto/server'

export async function POST(request: Request) {
  try {
    const wallet = await requireWallet(request)
    const body = (await request.json().catch(() => null)) as { character?: unknown } | null
    if (!body || !isCharacterId(body.character)) throw new GameError('Choose a valid character')
    const character = body.character

    await db.transaction(async (tx) => {
      const inserted = await tx
        .insert(players)
        .values({ wallet, character, totalPoints: SIGNUP_BONUS, ...STARTER_RESOURCES })
        .onConflictDoNothing({ target: players.wallet })
        .returning({ wallet: players.wallet })
      if (inserted.length === 0) throw new GameError('Your character is already locked in for this wallet', 409)
      await addPoints(tx, wallet, 'signup', SIGNUP_BONUS, `Joined as ${CHARACTER_BY_ID[character].name}`)
    })

    return Response.json({ state: await loadState(wallet) })
  } catch (error) {
    return errorResponse(error, 'register')
  }
}
