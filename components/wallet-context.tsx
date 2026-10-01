'use client'

import { usePrivy, useWallets, type ConnectedWallet } from '@privy-io/react-auth'
import { createContext, useContext, useMemo } from 'react'
import { toast } from 'sonner'
import type { Address } from 'viem'

export type ZestoWalletState = {
  ready: boolean
  authenticated: boolean
  configured: boolean
  login: () => void
  logout: () => Promise<void>
  address?: Address
  wallet?: ConnectedWallet
}

const unconfiguredWallet: ZestoWalletState = {
  ready: true,
  authenticated: false,
  configured: false,
  login: () => {
    toast.error('Wallet login is not configured yet', {
      description: 'Add NEXT_PUBLIC_PRIVY_APP_ID in project Vars to enable connecting.',
    })
  },
  logout: async () => {},
}

const WalletContext = createContext<ZestoWalletState>(unconfiguredWallet)

export function PrivyWalletBridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, logout, user } = usePrivy()
  const { wallets } = useWallets()
  const address = (user?.wallet?.address as Address | undefined) ?? undefined
  const wallet = wallets.find((w) => address && w.address.toLowerCase() === address.toLowerCase()) ?? wallets[0]

  const value = useMemo<ZestoWalletState>(
    () => ({ ready, authenticated, configured: true, login: () => login(), logout, address, wallet }),
    [ready, authenticated, login, logout, address, wallet],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWalletContext() {
  return useContext(WalletContext)
}
