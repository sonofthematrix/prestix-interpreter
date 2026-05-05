import type { CaipAddress, CaipNetworkId } from '@reown/appkit'
import  {type ChainNamespace, type Chain} from '@reown/appkit/networks'
import { Address } from 'viem'

export type ParsedCaipAddress = {
  chainNamespace: ChainNamespace
  chainId: Chain
  address: string
}

type ParsedCaipNetworkId = {
  chainNamespace: ChainNamespace
  chainId: Chain
}

export const ParseUtil = {
  validateCaipAddress(address: string): CaipAddress {
    if (address.split(':')?.length !== 3) {
      throw new Error('Invalid CAIP Address')
    }

    return address as CaipAddress
  },
  parseCaipAddress(caipAddress: CaipAddress): ParsedCaipAddress {
    const parts = caipAddress.split(':')
    if (parts.length !== 3) {
      throw new Error(`Invalid CAIP-10 address: ${caipAddress}`)
    }

    const [chainNamespace, chainId, address] = parts

    if (!chainNamespace || !chainId || !address) {
      throw new Error(`Invalid CAIP-10 address: ${caipAddress}`)
    }

    return {
      chainNamespace: chainNamespace as ChainNamespace,
      chainId: chainId as unknown as Chain,
      address: address as unknown as Address
    }
  },
  parseCaipNetworkId(caipNetworkId: CaipNetworkId): ParsedCaipNetworkId {
    const parts = caipNetworkId.split(':')
    if (parts.length !== 2) {
      throw new Error(`Invalid CAIP-2 network id: ${caipNetworkId}`)
    }

    const [chainNamespace, chainId] = parts

    if (!chainNamespace || !chainId) {
      throw new Error(`Invalid CAIP-2 network id: ${caipNetworkId}`)
    }

    return {
      chainNamespace: chainNamespace as ChainNamespace,
      chainId: chainId as unknown as Chain
    }
  }
}
