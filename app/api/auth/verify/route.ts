import { and, eq, gt } from 'drizzle-orm'
import { isAddress, isHex, type Address } from 'viem'
import { db } from '@/lib/db'
import { nonces } from '@/lib/db/schema'
import { publicClient } from '@/lib/zesto/chain'
import { createSession, errorResponse, signInMessage } from '@/lib/zesto/server'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { wallet?: unknown; signature?: unknown } | null
  if (!body || typeof body.wallet !== 'string' || !isAddress(body.wallet) || typeof body.signature !== 'string' || !isHex(body.signature)) {
    return Response.json({ error: 'Invalid sign-in request' }, { status: 400 })
  }
  const wallet = body.wallet.toLowerCase()

  try {
    const [row] = await db
      .select()
      .from(nonces)
      .where(and(eq(nonces.wallet, wallet), gt(nonces.expiresAt, new Date())))
      .limit(1)
    if (!row) return Response.json({ error: 'Sign-in request expired. Please try again.' }, { status: 400 })

    const valid = await publicClient
      .verifyMessage({ address: wallet as Address, message: signInMessage(wallet, row.nonce), signature: body.signature })
      .catch(() => false)
    if (!valid) return Response.json({ error: 'Signature could not be verified' }, { status: 401 })

    await db.delete(nonces).where(eq(nonces.wallet, wallet))
    const token = await createSession(wallet)
    return Response.json({ token })
  } catch (error) {
    return errorResponse(error, 'auth/verify')
  }
}
