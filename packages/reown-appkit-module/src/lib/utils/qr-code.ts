import { Address } from 'viem'

/**
 * Generate EIP-681 URI for token transfers
 * Format: ethereum:address@chainId/transfer?address=tokenAddress&uint256=amount
 * 
 * @param address - Recipient wallet address
 * @param chainId - Chain ID (default: 11155111 for Sepolia)
 * @param tokenAddress - Token contract address (optional, for ERC20 tokens)
 * @param amount - Amount in token's smallest unit (optional)
 * @returns EIP-681 URI string
 */
export function generateEIP681URI(
  address: Address | string,
  chainId: number = 11155111,
  tokenAddress?: Address | string,
  amount?: string
): string {
  // Ensure address starts with 0x
  const normalizedAddress = address.startsWith('0x') ? address : `0x${address}`
  
  // Base URI: ethereum:address@chainId
  let uri = `ethereum:${normalizedAddress}@${chainId}`
  
  // Add transfer path and parameters if token address or amount is provided
  if (tokenAddress || amount) {
    uri += '/transfer'
    
    const params = new URLSearchParams()
    
    if (tokenAddress) {
      // Ensure token address starts with 0x
      const normalizedTokenAddress = tokenAddress.startsWith('0x') 
        ? tokenAddress 
        : `0x${tokenAddress}`
      params.append('address', normalizedTokenAddress)
    }
    
    if (amount) {
      params.append('uint256', amount)
    }
    
    if (params.toString()) {
      uri += `?${params.toString()}`
    }
  }
  
  return uri
}

/**
 * Generate QR code data for receiving tokens
 * Returns EIP-681 URI if token is specified, otherwise plain address
 * 
 * @param address - Wallet address
 * @param chainId - Chain ID (default: 11155111 for Sepolia)
 * @param tokenAddress - Token contract address (optional)
 * @param amount - Amount in token's smallest unit (optional)
 * @returns QR code data string (EIP-681 URI or plain address)
 */
export function generateQRCodeData(
  address: Address | string,
  chainId: number = 11155111,
  tokenAddress?: Address | string,
  amount?: string
): string {
  // If token address is provided (and not zero address), generate EIP-681 URI
  if (tokenAddress && tokenAddress.toLowerCase() !== '0x0000000000000000000000000000000000000000') {
    return generateEIP681URI(address, chainId, tokenAddress, amount)
  }
  
  // Otherwise, return plain address
  return address.startsWith('0x') ? address : `0x${address}`
}

/**
 * Get chain ID from network name
 * 
 * @param networkName - Network name (e.g., 'ethereum', 'sepolia', 'polygon')
 * @returns Chain ID number
 */
export function getChainIdFromNetwork(networkName: string): number {
  const networkMap: Record<string, number> = {
    'ethereum': 1,
    'mainnet': 1,
    'sepolia': 11155111,
    'polygon': 137,
    'mumbai': 80001,
    'arbitrum': 42161,
    'base': 8453,
    'optimism': 10,
    'linea': 59144,
    'bnb': 56,
    'bsc': 56,
  }
  
  return networkMap[networkName.toLowerCase()] || 11155111 // Default to Sepolia
}

