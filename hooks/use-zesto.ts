'use client'

import { useCallback } from 'react'
import { useWalletContext } from '@/components/wallet-context'
import useSWR from 'swr'
import { createWalletClient, custom, erc20Abi, formatUnits, type Address } from 'viem'
import { publicClient, robinhoodTestnet } from '@/lib/zesto/chain'
import {
  DIG_COST_WEI,
  TREASURY_ADDRESS,
  ZESTO_ADDRESS,
  ZESTO_DECIMALS,
  type CharacterId,
  type Rarity,
  type RarityId,
} from '@/lib/zesto/config'
import type { Cost } from '@/lib/zesto/economy'

async function readJson(res: Response): Promise<Record<string, unknown> | null> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const jsonFetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Request failed')
  return res.json()
}

export function useZestoWallet() {
  return useWalletContext()
}

export function useBalances(address?: Address) {
  return useSWR(
    address ? ['balances', address] : null,
    async () => {
      const [zesto, eth] = await Promise.all([
        publicClient.readContract({ address: ZESTO_ADDRESS, abi: erc20Abi, functionName: 'balanceOf', args: [address!] }),
        publicClient.getBalance({ address: address! }),
      ])
      return {
        zestoWei: zesto,
        zesto: Number(formatUnits(zesto, ZESTO_DECIMALS)),
        eth: Number(formatUnits(eth, 18)),
      }
    },
    { refreshInterval: 15_000 },
  )
}

export type PlayerResponse = {
  player: {
    wallet: string
    character: CharacterId
    totalPoints: number
    totalDigs: number
    bestRarity: RarityId | null
  } | null
  rank: number | null
  recent: { id: number; rarity: RarityId; item: string; points: number; character: CharacterId; txHash: string; createdAt: string }[]
}

export function usePlayer(address?: Address) {
  return useSWR<PlayerResponse>(address ? `/api/player/${address}` : null, jsonFetcher)
}

export type LeaderboardResponse = {
  players: { wallet: string; character: CharacterId; totalPoints: number; totalDigs: number; bestRarity: RarityId | null }[]
  totals: { totalPoints: number; totalDigs: number; totalPlayers: number }
}

export function useLeaderboard() {
  return useSWR<LeaderboardResponse>('/api/leaderboard', jsonFetcher, { refreshInterval: 20_000 })
}

export type DigResult = {
  rarity: Rarity
  points: number
  basePoints: number
  perkPercent: number
  levelPercent: number
  homesteadPercent: number
  materials: Cost
  totalPoints: number
  totalDigs: number
  level: number
  leveledUp: boolean
  txHash: string
}

export type DigStage = 'paying' | 'confirming' | 'revealing'

export function useDig() {
  const { wallet, address } = useZestoWallet()

  return useCallback(
    async (onStage: (stage: DigStage) => void): Promise<DigResult> => {
      if (!wallet || !address) throw new Error('Connect your wallet first')

      onStage('paying')
      if (wallet.chainId !== `eip155:${robinhoodTestnet.id}`) {
        await wallet.switchChain(robinhoodTestnet.id)
      }
      const provider = await wallet.getEthereumProvider()
      const walletClient = createWalletClient({
        account: wallet.address as Address,
        chain: robinhoodTestnet,
        transport: custom(provider),
      })
      const txHash = await walletClient.writeContract({
        address: ZESTO_ADDRESS,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [TREASURY_ADDRESS, DIG_COST_WEI],
      })

      onStage('confirming')
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 90_000 })
      if (receipt.status !== 'success') throw new Error('Transaction reverted on-chain')

      onStage('revealing')
      let lastError = 'Could not claim this dig'
      for (let attempt = 0; attempt < 3; attempt++) {
        let res: Response
        try {
          res = await fetch('/api/dig', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ txHash }),
          })
        } catch {
          lastError = 'Network error while claiming your dig. Retrying...'
          await new Promise((r) => setTimeout(r, 2000))
          continue
        }
        const data = await readJson(res)
        if (res.ok && data) return { ...data, txHash } as DigResult
        lastError = (data?.error as string | undefined) ?? `Game server error (${res.status}). Your payment is safe — tx ${txHash.slice(0, 10)}…`
        if (res.status < 500) break
        await new Promise((r) => setTimeout(r, 2000))
      }
      throw new Error(lastError)
    },
    [wallet, address],
  )
}
