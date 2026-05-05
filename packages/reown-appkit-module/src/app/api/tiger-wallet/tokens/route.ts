/**
 * Tiger Wallet Tokens API
 * 
 * GET /api/tokenizin-wallet/tokens
 * Get all tokens (ERC20, ERC404) for Tiger wallet
 * Fetches from Etherscan API and on-chain data
 */

import { NextRequest, NextResponse } from 'next/server';
import { Address, isAddress, formatUnits } from 'viem';
import { getTokenBalances } from '../../../../lib/services/etherscan-service';
import { createPublicClient, http } from 'viem';
import { sepoliaChain } from '../../../../config';

export const dynamic = 'force-dynamic';

// Vercel serverless: extend timeout to avoid FUNCTION_INVOCATION_TIMEOUT (Etherscan + RPC per token)
export const maxDuration = 60;

// Known token addresses (Sepolia Testnet)
const KNOWN_TOKENS: Record<string, { symbol: string; name: string; decimals: number }> = {
  '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  '0x08210f9170f89ab7658f0b5e3ff39b0e03c594d4': { symbol: 'EURC', name: 'Euro Coin', decimals: 6 },
  '0xb0af8e94c74c2346609c3d94fcba61ae85cf3e6e': { symbol: 'TKNZN', name: 'Tokenizin Token', decimals: 18 },
};

// ERC20 ABI for additional metadata
const ERC20_ABI = [
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address') as Address | null;

    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json({
        success: true,
        tokens: [],
        count: 0,
      });
    }

    // Fetch token balances from Etherscan
    const tokenBalances = await getTokenBalances(walletAddress);
    
    // Create public client for additional metadata queries (Thirdweb second-to-last - strict 429 rate limits)
    const rpcUrls = [
      process.env.SEPOLIA_RPC_URL,
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL,
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://rpc.sepolia.org',
      'https://sepolia.drpc.org',
      'https://11155111.rpc.thirdweb.com',
    ].filter(Boolean) as string[];

    const publicClient = createPublicClient({
      chain: sepoliaChain,
      transport: http(rpcUrls[0] || 'https://ethereum-sepolia-rpc.publicnode.com', { timeout: 5000 }),
    });

    // Format tokens with metadata
    const tokens = await Promise.all(
      tokenBalances.map(async (tokenBalance: any) => {
        const tokenAddress = tokenBalance.tokenAddress.toLowerCase() as Address;
        const knownToken = KNOWN_TOKENS[tokenAddress];
        
        // Try to get metadata from contract if not in known tokens
        let symbol = knownToken?.symbol || tokenBalance.symbol || 'UNKNOWN';
        let name = knownToken?.name || tokenBalance.name || 'Unknown Token';
        let decimals = knownToken?.decimals || tokenBalance.decimals || 18;

        // Fetch from contract if needed
        if (!knownToken) {
          try {
            const [contractSymbol, contractName, contractDecimals] = await Promise.all([
              publicClient.readContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                functionName: 'symbol',
              } as any).catch(() => null),
              publicClient.readContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                functionName: 'name',
              } as any).catch(() => null),
              publicClient.readContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                functionName: 'decimals',
              } as any).catch(() => null),
            ]);

            if (contractSymbol) symbol = contractSymbol as string;
            if (contractName) name = contractName as string;
            if (contractDecimals) decimals = contractDecimals as number;
          } catch (error) {
            console.warn(`Failed to fetch metadata for token ${tokenAddress}:`, error);
          }
        }

        const balance = BigInt(tokenBalance.balance);
        const balanceFormatted = formatUnits(balance, decimals);

        return {
          assetId: tokenAddress,
          tokenAddress,
          balance: balance.toString(),
          balanceFormatted,
          decimals,
          symbol,
          title: name,
          imageUrl: undefined,
          propertyId: undefined,
          tokenPrice: undefined,
          totalTokens: undefined,
          availableTokens: undefined,
          usdValue: undefined, // Would need price oracle
        };
      })
    );

    return NextResponse.json({
      success: true,
      tokens,
      count: tokens.length,
    });
  } catch (error) {
    console.error('Error fetching Tokenizin wallet tokens:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tokens',
        tokens: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

