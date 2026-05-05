/**
 * Token Metadata Service
 * 
 * Fetches and manages token metadata for ERC20, ERC721, and ERC404 tokens
 * to enable visibility in AppKit wallet interface.
 */

import { ethers } from 'ethers';
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// ============================================================================
// TYPES
// ============================================================================

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
  tokenType: 'ERC20' | 'ERC721' | 'ERC404';
  assetId?: number;
  assetTitle?: string;
  totalSupply?: string;
}

export interface ERC721TokenMetadata extends TokenMetadata {
  tokenId: string;
  tokenURI?: string;
  owner?: string;
}

export interface ERC404TokenMetadata extends TokenMetadata {
  tokenId?: string;
  tokenURI?: string;
}

// ============================================================================
// ERC STANDARD ABIs
// ============================================================================

const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
] as const;

const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function tokenURI(uint256) view returns (string)',
  'function ownerOf(uint256) view returns (address)',
  'function totalSupply() view returns (uint256)',
] as const;

const ERC404_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function tokenURI(uint256) view returns (string)',
  'function balanceOf(address) view returns (uint256)',
] as const;

// ============================================================================
// TOKEN METADATA SERVICE
// ============================================================================

export class TokenMetadataService {
  private provider: ethers.JsonRpcProvider;
  private chainId: number;

  constructor(chainId: number = 11155111) {
    // Sepolia chain ID
    this.chainId = chainId;
    
    // Initialize provider
    const rpcUrl =
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
      (process.env.NEXT_PUBLIC_INFURA_API_KEY
        ? `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`
        : `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`);
    
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Fetch ERC20 token metadata
   */
  async getERC20Metadata(tokenAddress: string): Promise<TokenMetadata | null> {
    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name().catch(() => 'Unknown Token'),
        contract.symbol().catch(() => 'UNKNOWN'),
        contract.decimals().catch(() => 18),
        contract.totalSupply().catch(() => '0'),
      ]);

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals: Number(decimals),
        chainId: this.chainId,
        tokenType: 'ERC20',
        totalSupply: totalSupply.toString(),
      };
    } catch (error) {
      console.error(`Failed to fetch ERC20 metadata for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Fetch ERC721 token metadata
   */
  async getERC721Metadata(
    tokenAddress: string,
    tokenId?: string
  ): Promise<ERC721TokenMetadata | null> {
    try {
      const contract = new ethers.Contract(tokenAddress, ERC721_ABI, this.provider);
      
      const [name, symbol, tokenURI, owner] = await Promise.all([
        contract.name().catch(() => 'Unknown NFT'),
        contract.symbol().catch(() => 'NFT'),
        tokenId ? contract.tokenURI(tokenId).catch(() => null) : Promise.resolve(null),
        tokenId ? contract.ownerOf(tokenId).catch(() => null) : Promise.resolve(null),
      ]);

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals: 0, // NFTs don't have decimals
        chainId: this.chainId,
        tokenType: 'ERC721',
        tokenId: tokenId || '',
        tokenURI: tokenURI || undefined,
        owner: owner || undefined,
      };
    } catch (error) {
      console.error(`Failed to fetch ERC721 metadata for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Fetch ERC404 token metadata (hybrid ERC20/ERC721)
   */
  async getERC404Metadata(
    tokenAddress: string,
    tokenId?: string
  ): Promise<ERC404TokenMetadata | null> {
    try {
      const contract = new ethers.Contract(tokenAddress, ERC404_ABI, this.provider);
      
      const [name, symbol, decimals, totalSupply, tokenURI] = await Promise.all([
        contract.name().catch(() => 'Unknown Token'),
        contract.symbol().catch(() => 'UNKNOWN'),
        contract.decimals().catch(() => 18),
        contract.totalSupply().catch(() => '0'),
        tokenId ? contract.tokenURI(tokenId).catch(() => null) : Promise.resolve(null),
      ]);

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals: Number(decimals),
        chainId: this.chainId,
        tokenType: 'ERC404',
        totalSupply: totalSupply.toString(),
        tokenId: tokenId || undefined,
        tokenURI: tokenURI || undefined,
      };
    } catch (error) {
      console.error(`Failed to fetch ERC404 metadata for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Detect token type and fetch appropriate metadata
   */
  async getTokenMetadata(
    tokenAddress: string,
    tokenType?: 'ERC20' | 'ERC721' | 'ERC404',
    tokenId?: string
  ): Promise<TokenMetadata | null> {
    if (tokenType === 'ERC20') {
      return this.getERC20Metadata(tokenAddress);
    } else if (tokenType === 'ERC721') {
      return this.getERC721Metadata(tokenAddress, tokenId);
    } else if (tokenType === 'ERC404') {
      return this.getERC404Metadata(tokenAddress, tokenId);
    }

    // Try to detect token type
    try {
      // Try ERC20 first (most common)
      const erc20Metadata = await this.getERC20Metadata(tokenAddress);
      if (erc20Metadata) {
        // Check if it's actually ERC404 by checking for tokenURI
        const contract = new ethers.Contract(tokenAddress, ERC404_ABI, this.provider);
        try {
          await contract.tokenURI(1); // Try to get tokenURI for tokenId 1
          return this.getERC404Metadata(tokenAddress, tokenId);
        } catch {
          return erc20Metadata;
        }
      }

      // Try ERC721
      return this.getERC721Metadata(tokenAddress, tokenId);
    } catch (error) {
      console.error(`Failed to detect token type for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Get all token addresses for assets from database
   */
  async getAllAssetTokens(): Promise<Array<{ assetId: number; tokenAddress: string; tokenType: 'ERC20' | 'ERC404' }>> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Unauthorized');
      }

      const db = await createClient(user);
      
      // Get all assets with token addresses
      const assets = await db.realEstateAsset.findMany({
        where: {
          blockchainTokenAddress: { not: null },
          blockchainAssetId: { not: null },
        },
        select: {
          id: true,
          blockchainAssetId: true,
          blockchainTokenAddress: true,
          blockchainTokenType: true,
        },
      });

      return assets
        .filter((asset) => asset.blockchainTokenAddress)
        .map((asset) => ({
          assetId: asset.blockchainAssetId || 0,
          tokenAddress: asset.blockchainTokenAddress!,
          tokenType: (asset.blockchainTokenType || 'ERC20') as 'ERC20' | 'ERC404',
        }));
    } catch (error) {
      console.error('Failed to get asset tokens:', error);
      return [];
    }
  }

  /**
   * Get token metadata for all user's tokens
   */
  async getUserTokenMetadata(userAddress: string): Promise<TokenMetadata[]> {
    try {
      // Get all asset tokens
      const assetTokens = await this.getAllAssetTokens();
      
      // Fetch metadata for each token
      const metadataPromises = assetTokens.map(({ tokenAddress, tokenType }) =>
        this.getTokenMetadata(tokenAddress, tokenType)
      );

      const metadataResults = await Promise.all(metadataPromises);
      
      // Filter out null results and enrich with asset info
      const metadata: TokenMetadata[] = [];
      for (let i = 0; i < metadataResults.length; i++) {
        const meta = metadataResults[i];
        if (meta) {
          const assetToken = assetTokens[i];
          metadata.push({
            ...meta,
            assetId: assetToken.assetId,
          });
        }
      }

      return metadata;
    } catch (error) {
      console.error('Failed to get user token metadata:', error);
      return [];
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const tokenMetadataService = new TokenMetadataService(11155111); // Sepolia

