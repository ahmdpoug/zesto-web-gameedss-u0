import { errorResponse, loadState, requireWallet } from '@/lib/zesto/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const wallet = await requireWallet(request)
    return Response.json(await loadState(wallet))
  } catch (error) {
    return errorResponse(error, 'game/state')
  }
}
