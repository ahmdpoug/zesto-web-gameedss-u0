import { createPublicClient, defineChain, http } from 'viem'
import { EXPLORER_URL } from './config'

export const robinhoodTestnet = defineChain({
  id: 46630,
  name: 'Robinhood Chain Testnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.chain.robinhood.com'] },
  },
  blockExplorers: {
    default: { name: 'Robinhood Explorer', url: EXPLORER_URL },
  },
  testnet: true,
})

export const publicClient = createPublicClient({
  chain: robinhoodTestnet,
  transport: http(),
})
