/**
 * Tiger Wallet Properties API
 * 
 * GET /api/tokenizin-wallet/properties
 * Get all property tokens (ERC721/ERC404) for Tiger wallet
 * Fetches from Etherscan API for ERC721 tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { Address, isAddress } from 'viem';
import { getERC721Tokens } from '../../../../lib/services/etherscan-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address') as Address | null;

    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json({
        success: true,
        properties: [],
        count: 0,
      });
    }

    // Fetch ERC721 tokens from Etherscan
    const erc721Tokens = await getERC721Tokens(walletAddress);

    // Format properties from ERC721 tokens
    const properties = erc721Tokens.map((token) => ({
      assetId: token.contractAddress.toLowerCase(),
      tokenAddress: token.contractAddress.toLowerCase() as Address,
      balance: '1', // ERC721 tokens are non-fungible (1 per token)
      balanceFormatted: '1',
      decimals: parseInt(token.tokenDecimal) || 0,
      symbol: token.tokenSymbol,
      title: token.tokenName,
      imageUrl: undefined, // Would need to fetch from tokenURI
      propertyId: token.tokenID,
      tokenPrice: undefined,
      totalTokens: undefined,
      availableTokens: undefined,
      ownershipPercentage: undefined,
      usdValue: undefined,
      metadata: {
        tokenId: token.tokenID,
        contractAddress: token.contractAddress,
      },
    }));

    return NextResponse.json({
      success: true,
      properties,
      count: properties.length,
    });
  } catch (error) {
    console.error('Error fetching Tokenizin wallet properties:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch properties',
        properties: [],
        count: 0,
      },
      { status: 500 }
    );
  }
}

