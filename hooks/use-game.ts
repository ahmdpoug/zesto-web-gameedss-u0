'use client'

import { useCallback, useState } from 'react'
import useSWR from 'swr'
import { createWalletClient, custom, type Address } from 'viem'
import { useWalletContext } from '@/components/wallet-context'
import type { CharacterId } from '@/lib/zesto/config'
import type { ActionResponse, GameAction, GameState } from '@/lib/zesto/game-types'
import { robinhoodTestnet } from '@/lib/zesto/chain'

const storageKey = (address: string) => `zesto:session:${address.toLowerCase()}`

class AuthError extends Error {}

function readToken(address?: string) {
  if (!address || typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(storageKey(address))
  } catch {
    return null
  }
}

function writeToken(address: string, token: string | null) {
  try {
    if (token) window.localStorage.setItem(storageKey(address), token)
    else window.localStorage.removeItem(storageKey(address))
  } catch {
    // Storage can be unavailable in private mode; the session simply won't persist.
  }
}

async function request<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...init?.headers },
  })
  const data = await res.json().catch(() => null)
  if (res.status === 401) throw new AuthError(data?.error ?? 'Session expired')
  if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`)
  return data as T
}

export function useSession() {
  const { address, wallet } = useWalletContext()
  const { data: token, mutate } = useSWR(address ? ['session', address] : null, () => readToken(address), {
    revalidateOnFocus: false,
  })
  const [signing, setSigning] = useState(false)

  const signIn = useCallback(async () => {
    if (!address || !wallet) throw new Error('Connect your wallet first')
    setSigning(true)
    try {
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ wallet: address }),
      })
      const nonce = await nonceRes.json().catch(() => null)
      if (!nonceRes.ok || !nonce?.message) throw new Error(nonce?.error ?? 'Could not start sign-in')

      const provider = await wallet.getEthereumProvider()
      const client = createWalletClient({ account: wallet.address as Address, chain: robinhoodTestnet, transport: custom(provider) })
      const signature = await client.signMessage({ account: wallet.address as Address, message: nonce.message })

      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ wallet: address, signature }),
      })
      const verified = await verifyRes.json().catch(() => null)
      if (!verifyRes.ok || !verified?.token) throw new Error(verified?.error ?? 'Sign-in failed')
      writeToken(address, verified.token)
      await mutate(verified.token, { revalidate: false })
    } finally {
      setSigning(false)
    }
  }, [address, wallet, mutate])

  const signOut = useCallback(async () => {
    if (address) writeToken(address, null)
    await mutate(null, { revalidate: false })
  }, [address, mutate])

  return { token: token ?? null, loading: !!address && token === undefined, signing, signIn, signOut }
}

export function useGameState() {
  const { token, signOut } = useSession()
  const swr = useSWR<GameState>(
    token ? ['game-state', token] : null,
    async () => {
      try {
        return await request<GameState>('/api/game/state', token!)
      } catch (error) {
        if (error instanceof AuthError) await signOut()
        throw error
      }
    },
    { refreshInterval: 30_000, revalidateOnFocus: true },
  )
  return { ...swr, token }
}

export function useGameActions() {
  const { token, mutate } = useGameState()

  const act = useCallback(
    async (action: GameAction) => {
      if (!token) throw new Error('Sign in to play')
      const res = await request<ActionResponse>('/api/game/action', token, { method: 'POST', body: JSON.stringify(action) })
      await mutate(res.state, { revalidate: false })
      return res.outcome
    },
    [token, mutate],
  )

  const register = useCallback(
    async (character: CharacterId) => {
      if (!token) throw new Error('Sign in first')
      const res = await request<{ state: GameState }>('/api/register', token, {
        method: 'POST',
        body: JSON.stringify({ character }),
      })
      await mutate(res.state, { revalidate: false })
    },
    [token, mutate],
  )

  return { act, register, refresh: () => mutate() }
}
