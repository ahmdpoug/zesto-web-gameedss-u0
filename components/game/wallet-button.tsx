'use client'

import { Wallet } from 'lucide-react'
import { useBalances, useZestoWallet } from '@/hooks/use-zesto'
import { shortAddress } from '@/lib/zesto/config'

export function WalletButton({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const { ready, authenticated, login, address } = useZestoWallet()
  const { data: balances } = useBalances(address)

  if (!ready) {
    return <div className="glass h-10 w-32 animate-pulse rounded-full" aria-hidden="true" />
  }

  if (!authenticated || !address) {
    return (
      <button
        type="button"
        onClick={login}
        className="flex h-10 items-center gap-2 rounded-full bg-primary px-4 font-display text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_#ffa447] transition hover:brightness-105 active:scale-95"
      >
        <Wallet className="size-4" aria-hidden="true" />
        Connect
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpenProfile}
      className="glass flex h-10 items-center gap-2 rounded-full pl-1.5 pr-3 text-sm transition hover:brightness-110"
    >
      <span className="grid size-7 place-items-center rounded-full bg-accent text-accent-foreground">
        <Wallet className="size-3.5" aria-hidden="true" />
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="font-display font-semibold tabular-nums">
          {balances ? `${Math.floor(balances.zesto).toLocaleString()} ` : '… '}
          <span className="text-primary">$ZESTO</span>
        </span>
        <span className="mt-0.5 text-[10px] text-muted-foreground">{shortAddress(address)}</span>
      </span>
    </button>
  )
}
