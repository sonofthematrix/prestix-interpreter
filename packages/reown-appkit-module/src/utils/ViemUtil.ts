import { type createPublicClient, type defineChain, type http } from 'viem'

import { type CaipNetwork, type CaipNetworkId, ParseUtil } from '@reown/appkit-common'

import { OptionsController } from '../controllers/OptionsController'

// -- Types --------------------------------------------------------------------
type PublicClient = typeof createPublicClient
type Http = typeof http
type ViemUtils = {
  createPublicClient: PublicClient
  http: Http
  defineChain: typeof defineChain
}

// -- Constants ----------------------------------------------------------------
const SEPOLIA_CAIP = 'eip155:11155111'
const MAINNET_CAIP = 'eip155:1'
const SEPOLIA_RPC_FALLBACK = 'https://ethereum-sepolia-rpc.publicnode.com'
const MAINNET_RPC_FALLBACK = 'https://ethereum-rpc.publicnode.com'

let cachedViemUtils: ViemUtils | undefined = undefined

// -- Helpers ------------------------------------------------------------------
function getSepoliaRpcUrl(caipNetwork: CaipNetwork): string {
  const withRpc = caipNetwork as CaipNetwork & { rpcUrls?: { default?: { http?: string[] } } }
  const fromNetwork = withRpc.rpcUrls?.default?.http?.[0]
  if (fromNetwork) return fromNetwork
  const fromEnv = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SEPOLIA_RPC_URL
  return (typeof fromEnv === 'string' ? fromEnv : null) ?? SEPOLIA_RPC_FALLBACK
}

function getMainnetRpcUrl(caipNetwork: CaipNetwork): string {
  const withRpc = caipNetwork as CaipNetwork & { rpcUrls?: { default?: { http?: string[] } } }
  const fromNetwork = withRpc.rpcUrls?.default?.http?.[0]
  if (fromNetwork) return fromNetwork
  const fromEnv = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ETHEREUM_RPC_URL
  if (typeof fromEnv === 'string' && fromEnv.length > 10 && !fromEnv.includes('undefined')) return fromEnv
  const infura = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_INFURA_API_KEY
  if (typeof infura === 'string' && infura.length > 0) return `https://mainnet.infura.io/v3/${infura}`
  const alchemy = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_ALCHEMY_API_KEY
  if (typeof alchemy === 'string' && alchemy.length > 0) return `https://eth-mainnet.g.alchemy.com/v2/${alchemy}`
  return MAINNET_RPC_FALLBACK
}

async function loadViemUtils() {
  if (!cachedViemUtils) {
    const { createPublicClient, http, defineChain } = await import('viem')

    cachedViemUtils = {
      createPublicClient,
      http,
      defineChain
    }
  }

  return cachedViemUtils
}

// -- Utils --------------------------------------------------------------------
export const ViemUtil = {
  getBlockchainApiRpcUrl(caipNetworkId: CaipNetworkId, projectId: string) {
    const url = new URL('https://rpc.walletconnect.org/v1/')
    url.searchParams.set('chainId', caipNetworkId)
    url.searchParams.set('projectId', projectId)

    return url.toString()
  },
  async getViemChain(caipNetwork: CaipNetwork) {
    const { defineChain } = await loadViemUtils()

    const { chainId } = ParseUtil.parseCaipNetworkId(caipNetwork.caipNetworkId)

    return defineChain({ ...caipNetwork, id: Number(chainId) })
  },
  async createViemPublicClient(caipNetwork: CaipNetwork) {
    const { createPublicClient, http } = await loadViemUtils()

    const projectId = OptionsController.state.projectId ?? ''
    // Use real RPC for Sepolia and mainnet: WalletConnect RPC (rpc.walletconnect.org) does not support eth_call,
    // so balance/token fetches fail. Use chain RPC from network config, env, or public node.
    const rpcUrl =
      caipNetwork.caipNetworkId === SEPOLIA_CAIP
        ? getSepoliaRpcUrl(caipNetwork)
        : caipNetwork.caipNetworkId === MAINNET_CAIP
          ? getMainnetRpcUrl(caipNetwork)
          : ViemUtil.getBlockchainApiRpcUrl(caipNetwork.caipNetworkId, projectId)

    const viemChain = await ViemUtil.getViemChain(caipNetwork)

    if (!viemChain) {
      throw new Error(`Chain ${caipNetwork.caipNetworkId} not found in viem/chains`)
    }

    return createPublicClient({
      chain: viemChain,
      transport: http(rpcUrl)
    })
  }
}
