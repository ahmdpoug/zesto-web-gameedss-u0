'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { Toaster } from 'sonner'
import { robinhoodTestnet } from '@/lib/zesto/chain'
import { PrivyWalletBridge } from './wallet-context'

export function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID

  const toaster = (
    <Toaster
      position="top-center"
      theme="dark"
      toastOptions={{
        style: {
          background: 'rgb(16 24 40 / 0.92)',
          border: '1px solid rgb(255 246 234 / 0.14)',
          color: '#fff6ea',
          backdropFilter: 'blur(12px)',
        },
      }}
    />
  )

  if (!appId) {
    return (
      <>
        {children}
        {toaster}
      </>
    )
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ['wallet', 'email'],
        appearance: {
          theme: 'dark',
          accentColor: '#FFA447',
          walletChainType: 'ethereum-only',
          landingHeader: 'Enter the Shore',
          loginMessage: 'Connect to start digging for $ZESTO points',
        },
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
        defaultChain: robinhoodTestnet,
        supportedChains: [robinhoodTestnet],
      }}
    >
      <PrivyWalletBridge>{children}</PrivyWalletBridge>
      {toaster}
    </PrivyProvider>
  )
}
