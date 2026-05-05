import { erc20Abi, formatUnits } from 'viem'

import {
  type Address,
  type CaipAddress,
  type CaipNetwork,
  ConstantsUtil,
  ParseUtil
} from '@reown/appkit-common'

import { BlockchainApiController } from '../controllers/BlockchainApiController'
import { ChainController } from '../controllers/ChainController'
import { ConnectionController } from '../controllers/ConnectionController'
import { ConnectorController } from '../controllers/ConnectorController'
import { getSepoliaBaseTokens, fetchSwapTokensFromApi } from '../lib/token-registry'
import { ERC7811Utils } from './ERC7811Util'
import { StorageUtil } from './StorageUtil'
import type { BlockchainApiBalanceResponse } from './TypeUtil'
import { ViemUtil } from './ViemUtil'

const SEPOLIA_CAIP_NETWORK_ID = 'eip155:11155111'
const MAINNET_CAIP_NETWORK_ID = 'eip155:1'
const NATIVE_ETH_ADDRESS = '0x0000000000000000000000000000000000000000'

// WalletConnect RPC (rpc.walletconnect.org) does not support eth_call; wallet_getAssets fails on mainnet.
// Skip it for mainnet so we fall through to BlockchainApiController.getBalance instead.
const SKIP_WALLET_GET_ASSETS_FOR_MAINNET = true

// Fallback USD prices for Sepolia Send view so AppKit does not show "failure to retrieve the price"
const SEPOLIA_FALLBACK_PRICES: Record<string, number> = {
  ETH: 3000,
  WETH: 3000,
  USDC: 1,
  EURC: 1.08,
  TKNZN: 0.01,
}
function getSepoliaFallbackPrice(symbol: string, address: string): number {
  const upper = symbol?.toUpperCase() || ''
  if (SEPOLIA_FALLBACK_PRICES[upper] !== undefined) return SEPOLIA_FALLBACK_PRICES[upper]
  return 0
}

// -- Types -------------------------------------------------------------------- //
interface FetchER20BalanceParams {
  caipAddress: CaipAddress
  assetAddress: string
  caipNetwork: CaipNetwork
}

// -- Controller ---------------------------------------- //
export const BalanceUtil = {
  /**
   * Get the balances of the user's tokens. If user connected with Auth provider or and on the EIP155 network,
   * it'll use the `wallet_getAssets` and `wallet_getCapabilities` calls to fetch the balance rather than Blockchain API
   * @param forceUpdate - If true, the balances will be fetched from the server
   * @returns The balances of the user's tokens
   */
  async getMyTokensWithBalance(
    forceUpdate?: string
  ): Promise<BlockchainApiBalanceResponse['balances']> {
    const address = ChainController.getAccountData()?.address
    const caipNetwork = ChainController.state.activeCaipNetwork
    const isAuthConnector =
      ConnectorController.getConnectorId('eip155') === ConstantsUtil.CONNECTOR_ID.AUTH

    if (!address || !caipNetwork) {
      return []
    }

    const caipAddress = `${caipNetwork.caipNetworkId}:${address}`
    const cachedBalance = StorageUtil.getBalanceCacheForCaipAddress(caipAddress)

    if (cachedBalance) {
      return cachedBalance.balances
    }

    // Extract EIP-155 specific logic (Auth/social wallet may use wallet_getAssets)
    if (caipNetwork.chainNamespace === ConstantsUtil.CHAIN.EVM && isAuthConnector) {
      // Skip wallet_getAssets for mainnet: WalletConnect RPC (rpc.walletconnect.org) does not support eth_call,
      // so the call fails with "The method eth_call is not supported". Fall through to BlockchainApiController.getBalance.
      const isMainnet = caipNetwork.caipNetworkId === MAINNET_CAIP_NETWORK_ID
      let eip155Balances: BlockchainApiBalanceResponse['balances'] | null = null
      if (!(isMainnet && SKIP_WALLET_GET_ASSETS_FOR_MAINNET)) {
        eip155Balances = await this.getEIP155Balances(address, caipNetwork)
      }

      // Only use wallet assets if we got a non-empty list. On Sepolia, social/embedded
      // wallets often return [] from wallet_getAssets; in that case use custom RPC fetch.
      if (eip155Balances && eip155Balances.length > 0) {
        return this.filterLowQualityTokens(eip155Balances)
      }
      // On Sepolia, empty Auth result → use custom token list + RPC balances so Send "Select Token" shows ETH, USDC, EURC, TKNZN
      if (caipNetwork.caipNetworkId === SEPOLIA_CAIP_NETWORK_ID) {
        const customBalances = await this.getCustomBalancesForSepolia(address, caipNetwork)
        const filtered = this.filterLowQualityTokens(customBalances)
        StorageUtil.updateBalanceCache({
          caipAddress,
          balance: { balances: filtered },
          timestamp: Date.now(),
        })
        return filtered
      }
      if (eip155Balances) {
        return this.filterLowQualityTokens(eip155Balances)
      }
    }

    // Fallback to 1Inch API
    const response = await BlockchainApiController.getBalance(
      address,
      caipNetwork.caipNetworkId,
      forceUpdate
    )

    let balances = response.balances

    // If API returns empty (e.g. Sepolia - WalletConnect doesn't support testnets),
    // use custom token registry and fetch balances via RPC
    if ((!balances || balances.length === 0) && caipNetwork.caipNetworkId === SEPOLIA_CAIP_NETWORK_ID) {
      balances = await this.getCustomBalancesForSepolia(address, caipNetwork)
    }

    return this.filterLowQualityTokens(balances)
  },

  /**
   * Fetch token balances for Sepolia using custom token registry and RPC.
   * Used when WalletConnect balance API returns empty (Sepolia not supported).
   * Uses /api/swap-tokens when available (includes RWA tokens).
   */
  async getCustomBalancesForSepolia(
    address: string,
    caipNetwork: CaipNetwork
  ): Promise<BlockchainApiBalanceResponse['balances']> {
    const caipAddress = `${caipNetwork.caipNetworkId}:${address}` as CaipAddress
    const balances: BlockchainApiBalanceResponse['balances'] = []

    // Try API first (includes RWA tokens), fallback to base tokens
    let tokenList: { address: string; name: string; symbol: string; decimals: number; logoUri?: string }[] = []
    const apiTokens = await fetchSwapTokensFromApi()
    if (apiTokens.length > 0) {
      tokenList = apiTokens.map((t) => {
        const rawAddr = t.address.includes(':') ? t.address.split(':')[2] || t.address : t.address
        return {
          address: rawAddr,
          name: t.name,
          symbol: t.symbol,
          decimals: t.decimals,
          logoUri: t.logoUri,
        }
      })
    } else {
      tokenList = getSepoliaBaseTokens().map((t) => ({
        address: t.address,
        name: t.name,
        symbol: t.symbol,
        decimals: t.decimals,
        logoUri: t.logoURI,
      }))
    }

    const publicClient = await ViemUtil.createViemPublicClient(caipNetwork)

    for (const token of tokenList) {
      try {
        if (token.address.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase()) {
          const balanceWei = await publicClient.getBalance({ address: address as Address })
          const balanceFormatted = formatUnits(balanceWei, 18)
          const price = getSepoliaFallbackPrice(token.symbol, token.address)
          const numeric = parseFloat(balanceFormatted)
          balances.push({
            name: token.name,
            symbol: token.symbol,
            chainId: caipNetwork.caipNetworkId,
            address: undefined,
            value: price ? numeric * price : 0,
            price,
            quantity: { decimals: '18', numeric: balanceFormatted },
            iconUrl: token.logoUri || '',
          })
        } else {
          const result = await this.fetchERC20Balance({
            caipAddress,
            assetAddress: token.address,
            caipNetwork,
          })
          const caipTokenAddress = `${caipNetwork.caipNetworkId}:${token.address}`
          const price = getSepoliaFallbackPrice(result.symbol, token.address)
          const numeric = parseFloat(result.balance)
          balances.push({
            name: result.name,
            symbol: result.symbol,
            chainId: caipNetwork.caipNetworkId,
            address: caipTokenAddress,
            value: price ? numeric * price : 0,
            price,
            quantity: {
              decimals: result.decimals.toString(),
              numeric: result.balance,
            },
            iconUrl: token.logoUri || '',
          })
        }
      } catch (err) {
        // Skip tokens that fail to fetch (e.g. RPC error)
        continue
      }
    }

    return balances
  },

  /**
   * Get the balances of the user's tokens on the EIP155 network using native `wallet_getAssets` and `wallet_getCapabilities` calls
   * @param address - The address of the user
   * @param caipNetwork - The CAIP network
   * @returns The balances of the user's tokens on the EIP155 network
   */
  async getEIP155Balances(address: string, caipNetwork: CaipNetwork) {
    try {
      const chainIdHex = ERC7811Utils.getChainIdHexFromCAIP2ChainId(caipNetwork.caipNetworkId)
      const walletCapabilities = (await ConnectionController.getCapabilities(address)) as Record<
        string,
        { assetDiscovery?: { supported: boolean } }
      >

      if (!walletCapabilities?.[chainIdHex]?.['assetDiscovery']?.supported) {
        return null
      }

      const walletGetAssetsResponse = await ConnectionController.walletGetAssets({
        account: address as Address,
        chainFilter: [chainIdHex]
      })

      if (!ERC7811Utils.isWalletGetAssetsResponse(walletGetAssetsResponse)) {
        return null
      }

      const assets = walletGetAssetsResponse[chainIdHex] || []
      const filteredAssets = assets.map(asset =>
        ERC7811Utils.createBalance(asset, caipNetwork.caipNetworkId)
      )

      StorageUtil.updateBalanceCache({
        caipAddress: `${caipNetwork.caipNetworkId}:${address}`,
        balance: { balances: filteredAssets },
        timestamp: Date.now()
      })

      return filteredAssets
    } catch (error) {
      return null
    }
  },

  /**
   * The 1Inch API includes many low-quality tokens in the balance response,
   * which appear inconsistently. This filter prevents them from being displayed.
   */
  filterLowQualityTokens(balances: BlockchainApiBalanceResponse['balances']) {
    return balances.filter(balance => balance.quantity.decimals !== '0')
  },
  async fetchERC20Balance({ caipAddress, assetAddress, caipNetwork }: FetchER20BalanceParams) {
    const publicClient = await ViemUtil.createViemPublicClient(caipNetwork)

    const { address } = ParseUtil.parseCaipAddress(caipAddress)

    // Use type assertion to avoid excessively deep type instantiation
    const balance = await (publicClient.readContract as any)({
      address: assetAddress as Address,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address as Address]
    })
    const decimals = await (publicClient.readContract as any)({
      address: assetAddress as Address,
      abi: erc20Abi as any,
      functionName: 'decimals',
      args: []
    })
    const symbol = await (publicClient.readContract as any)({
      address: assetAddress as Address,
      abi: erc20Abi,
      functionName: 'symbol',
      args: []
    })
    const name = await (publicClient.readContract as any)({
      address: assetAddress as Address,
      abi: erc20Abi,
      functionName: 'name',
      args: []
    })
    return {
      name,
      symbol,
      decimals,
      balance: balance && decimals ? formatUnits(BigInt(String(balance)), Number(decimals)) : '0'
    }
  }
}
