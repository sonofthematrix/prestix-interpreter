import {
  type CaipNetwork,
  type CaipNetworkId,
} from '@reown/appkit'
import { Address } from 'viem'
import { AppKitPayErrorCodes } from '../types/errors'
import type { PaymentOptions } from '../types/options'
import { ChainController } from '../controllers/ChainController'
import { ConnectionController } from '../controllers/ConnectionController'
import { CoreHelperUtil } from '../utils/CoreHelperUtil'
import { ProviderController } from '../controllers/ProviderController'
import { ContractUtil } from '../utils/ContractUtil'
import { AppKitPayError } from '../types/errors'

interface EnsureNetworkOptions {
  paymentAssetNetwork: string 
  activeCaipNetwork: CaipNetwork
  approvedCaipNetworkIds: string[] | undefined
  requestedCaipNetworks: CaipNetwork[] | undefined
}

export async function ensureCorrectNetwork(options: EnsureNetworkOptions): Promise<void> {
  const { paymentAssetNetwork, activeCaipNetwork, approvedCaipNetworkIds, requestedCaipNetworks } =
    options

  const sortedNetworks = CoreHelperUtil.sortRequestedNetworks(
    approvedCaipNetworkIds as CaipNetworkId[] | undefined,
    requestedCaipNetworks
  )

  const assetCaipNetwork = sortedNetworks.find(
    network => network.caipNetworkId === paymentAssetNetwork
  )

  if (!assetCaipNetwork) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG)
  }

  if (assetCaipNetwork.caipNetworkId === activeCaipNetwork.caipNetworkId) {
    return
  }

  const isSupportingAllNetworks = ChainController.getNetworkProp(
    'supportsAllNetworks',
    assetCaipNetwork.chainNamespace
  )

  const isSwitchAllowed =
    approvedCaipNetworkIds?.includes(assetCaipNetwork.caipNetworkId) || isSupportingAllNetworks

  if (!isSwitchAllowed) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG)
  }

  try {
    await ChainController.switchActiveNetwork(assetCaipNetwork)
  } catch (error) {
    throw new AppKitPayError(AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR, error)
  }
}

interface EvmPaymentParams {
  recipient: string
  amount: number | string
  fromAddress?: string
}

export async function processEvmNativePayment(
  paymentAsset: PaymentOptions['paymentAsset'],
  chainNamespace: 'eip155' | 'solana',
  params: EvmPaymentParams
): Promise<string | undefined> {
  if (chainNamespace !== 'eip155') {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_CHAIN_NAMESPACE)
  }
  if (!params.fromAddress) {
    throw new AppKitPayError(
      AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG,
      'fromAddress is required for native EVM payments.'
    )
  }

  const amountValue = typeof params.amount === 'string' ? parseFloat(params.amount) : params.amount
  if (isNaN(amountValue)) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG)
  }

  const decimals = paymentAsset.metadata?.decimals ?? 18
  const amountBigInt = ConnectionController.parseUnits(amountValue.toString(), decimals)

  if (typeof amountBigInt !== 'bigint') {
    throw new AppKitPayError(AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR)
  }

  const txResponse = await ConnectionController.sendTransaction({
    chainNamespace: 'solana',
    to: params.recipient,
    value: amountValue
  })

  return txResponse
}

export async function processEvmErc20Payment(
  paymentAsset: PaymentOptions['paymentAsset'],
  params: EvmPaymentParams
): Promise<string | undefined> {
  if (!params.fromAddress) {
    throw new AppKitPayError(
      AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG,
      'fromAddress is required for ERC20 EVM payments.'
    )
  }
  const tokenAddress = paymentAsset.asset as string
  const recipientAddress = params.recipient
  const decimals = Number(paymentAsset.metadata.decimals)
  const amountBigInt = ConnectionController.parseUnits(params.amount.toString(), decimals)

  if (amountBigInt === undefined) {
    throw new AppKitPayError(AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR)
  }

  const txResponse = await ConnectionController.writeContract({
    fromAddress: params.fromAddress as `0x${string}`,
    tokenAddress: tokenAddress as Address,
    args: [recipientAddress, amountBigInt],
    method: 'transfer',
    abi: ContractUtil.getERC20Abi(tokenAddress),
    chainNamespace: 'eip155' as 'eip155' | 'solana'
  })

  return txResponse ?? undefined
}

interface SolanaPaymentParams {
  recipient: string
  amount: number | string
  fromAddress?: string
  tokenMint?: string
}

export async function processSolanaPayment(
  chainNamespace: 'eip155' | 'solana',
  params: SolanaPaymentParams
): Promise<string | undefined> {
  if (chainNamespace !== 'solana') {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_CHAIN_NAMESPACE)
  }

  if (!params.fromAddress) {
    throw new AppKitPayError(
      AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG,
      'fromAddress is required for Solana payments.'
    )
  }

  const amountValue = typeof params.amount === 'string' ? parseFloat(params.amount) : params.amount
  if (isNaN(amountValue) || amountValue <= 0) {
    throw new AppKitPayError(AppKitPayErrorCodes.INVALID_PAYMENT_CONFIG, 'Invalid payment amount.')
  }

  try {
    const provider = ProviderController.getProvider(chainNamespace)
    if (!provider) {
      throw new AppKitPayError(
        AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR,
        'No Solana provider available.'
      )
    }
    const txResponse = await ConnectionController.sendTransaction({
      chainNamespace: 'solana',
      to: params.recipient,
      value: amountValue,
      tokenMint: params.tokenMint
    })

    if (!txResponse) {
      throw new AppKitPayError(AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR, 'Transaction failed.')
    }

    return txResponse
  } catch (error) {
    if (error instanceof AppKitPayError) {
      throw error
    }
    throw new AppKitPayError(
      AppKitPayErrorCodes.GENERIC_PAYMENT_ERROR,
      `Solana payment failed: ${error}`
    )
  }
}
