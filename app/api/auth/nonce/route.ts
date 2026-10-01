import { randomBytes } from 'node:crypto'
import { isAddress } from 'viem'
import { db } from '@/lib/db'
import { nonces } from '@/lib/db/schema'
import { errorResponse, signInMessage } from '@/lib/zesto/server'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { wallet?: unknown } | null
  if (!body || typeof body.wallet !== 'string' || !isAddress(body.wallet)) {
    return Response.json({ error: 'Invalid wallet address' }, { status: 400 })
  }
  const wallet = body.wallet.toLowerCase()
  const nonce = randomBytes(16).toString('hex')
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  try {
    await db
      .insert(nonces)
      .values({ wallet, nonce, expiresAt })
      .onConflictDoUpdate({ target: nonces.wallet, set: { nonce, expiresAt } })
    return Response.json({ message: signInMessage(wallet, nonce) })
  } catch (error) {
    return errorResponse(error, 'auth/nonce')
  }
}
