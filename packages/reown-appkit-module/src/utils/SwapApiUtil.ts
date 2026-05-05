import type { CaipNetworkId } from '@reown/appkit-common'

import { BlockchainApiController } from '../controllers/BlockchainApiController'
import { ChainController } from '../controllers/ChainController'
import { ConnectionController } from '../controllers/ConnectionController'
import { getCustomSwapTokensForNetworkAsync } from '../lib/token-registry'
import { BalanceUtil } from './BalanceUtil'
import { getActiveNetworkTokenAddress } from './ChainControllerUtil'
import type { SwapTokenWithBalance } from './TypeUtil'
import type { BlockchainApiBalanceResponse, BlockchainApiSwapAllowanceRequest } from './TypeUtil'

// -- Types --------------------------------------------- //
export type TokenInfo = {
  address: `0x${string}`
  symbol: string
  name: string
  decimals: number
  logoURI: string
  domainVersion?: string
  eip2612?: boolean
  isFoT?: boolean
  tags?: string[]
}

// -- Controller ---------------------------------------- //
export const SwapApiUtil = {
  async getTokenList(caipNetworkId?: CaipNetworkId) {
    const response = await BlockchainApiController.fetchSwapTokens({
      chainId: caipNetworkId
    })

    // If API returns empty (e.g. Sepolia - WalletConnect doesn't support testnets),
    // use custom token registry fallback (includes RWA tokens from /api/swap-tokens)
    if (!response?.tokens?.length) {
      const customTokens = await getCustomSwapTokensForNetworkAsync(caipNetworkId)
      if (customTokens.length > 0) {
        return customTokens
      }
    }

    const tokens =
      response?.tokens?.map(
        token =>
          ({
            ...token,
            eip2612: false,
            quantity: {
              decimals: '0',
              numeric: '0'
            },
            price: 0,
            value: 0
          }) as SwapTokenWithBalance
      ) || []

    return tokens
  },

  async fetchGasPrice() {
    const caipNetwork = ChainController.state.activeCaipNetwork

    if (!caipNetwork) {
      return null
    }

    try {
      switch (caipNetwork.chainNamespace) {
        case 'solana':
          // eslint-disable-next-line no-case-declarations
          const lamportsPerSignature = (
            await ConnectionController?.estimateGas({ chainNamespace: 'solana' })
          )?.toString()

          return {
            standard: lamportsPerSignature,
            fast: lamportsPerSignature,
            instant: lamportsPerSignature
          }

        case 'eip155':
        default:
          return await BlockchainApiController.fetchGasPrice({
            chainId: caipNetwork.caipNetworkId
          })
      }
    } catch {
      return null
    }
  },

  async fetchSwapAllowance({
    tokenAddress,
    userAddress,
    sourceTokenAmount,
    sourceTokenDecimals
  }: Pick<BlockchainApiSwapAllowanceRequest, 'tokenAddress' | 'userAddress'> & {
    sourceTokenAmount: string
    sourceTokenDecimals: number
  }) {
    const response = await BlockchainApiController.fetchSwapAllowance({
      tokenAddress,
      userAddress
    })

    if (response?.allowance && sourceTokenAmount && sourceTokenDecimals) {
      const parsedValue =
        ConnectionController.parseUnits(sourceTokenAmount, sourceTokenDecimals) || 0
      const hasAllowance = BigInt(response.allowance) >= parsedValue

      return hasAllowance
    }

    return false
  },

  async getMyTokensWithBalance(forceUpdate?: string) {
    const balances = await BalanceUtil.getMyTokensWithBalance(forceUpdate)

    ChainController.setAccountProp('tokenBalance', balances, ChainController.state.activeChain)

    return this.mapBalancesToSwapTokens(balances)
  },

  /**
   * Maps the balances from Blockchain API to SwapTokenWithBalance array
   * @param balances
   * @returns SwapTokenWithBalance[]
   */
  mapBalancesToSwapTokens(balances: BlockchainApiBalanceResponse['balances']) {
    return (
      balances?.map(
        token =>
          ({
            ...token,
            address: token?.address ? token.address : getActiveNetworkTokenAddress(),
            decimals: parseInt(token.quantity.decimals, 10),
            logoUri: token.iconUrl,
            eip2612: false
          }) as SwapTokenWithBalance
      ) || []
    )
  },

  async handleSwapError(error: unknown) {
    try {
      const cause = (error as ErrorOptions)?.cause as Response
      if (!cause?.json) {
        return undefined
      }

      const response = await cause.json()
      const reason = response?.reasons?.[0]?.description

      if (reason?.includes('insufficient liquidity')) {
        return 'Insufficient liquidity'
      }

      return undefined
    } catch {
      return undefined
    }
  }
}
