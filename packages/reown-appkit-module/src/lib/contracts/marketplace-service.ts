/**
 * RWA Marketplace Contract Service
 * Frontend integration for RWAMarketplaceUpgradeable contract
 */

import { ethers } from 'ethers';
import RWAMarketplaceABI from './abis/RWAMarketplaceUpgradeable';
import deploymentInfo from './abis/rwa-marketplace-deployment';
import { gasMonitoringService, type GasMetrics } from '@/lib/services/gas-monitoring-service';

export interface MarketplaceConfig {
  proxyAddress: string;
  chainId: number;
  network: string;
}

export interface ListingData {
  listingId: number;
  assetId: number;
  seller: string;
  tokenAmount: number;
  pricePerToken: string;
  status: number;
  createdAt: number;
}

export interface PurchaseCost {
  subtotal: string;
  marketplaceFee: string;
  total: string;
}

export class RWAMarketplaceService {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private contractAddress: string;
  
  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    this.contractAddress = deploymentInfo.address;
    const abi = RWAMarketplaceABI.abi;
    
    // Check if contract is deployed
    if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️ Marketplace contract not deployed. Address:', this.contractAddress);
    }
    
    this.contract = new ethers.Contract(
      this.contractAddress,
      abi,
      signer || provider
    );
  }
  
  /**
   * Check if contract is deployed
   */
  private isContractDeployed(): boolean {
    return this.contractAddress && 
           this.contractAddress !== '0x0000000000000000000000000000000000000000' &&
           ethers.isAddress(this.contractAddress);
  }
  
  /**
   * Get contract code to verify deployment
   */
  private async checkContractCode(): Promise<boolean> {
    if (!this.isContractDeployed()) {
      return false;
    }
    
    try {
      const code = await this.provider.getCode(this.contractAddress);
      return code !== '0x' && code !== '0x0';
    } catch {
      return false;
    }
  }
  
  /**
   * Get marketplace configuration
   */
  async getConfig(): Promise<MarketplaceConfig> {
    const network = await this.provider.getNetwork();
    
    // Check if contract is deployed
    const isDeployed = await this.checkContractCode();
    
    return {
      proxyAddress: isDeployed ? this.contractAddress : '0x0000000000000000000000000000000000000000',
      chainId: Number(network.chainId),
      network: network.name
    };
  }
  
  /**
   * Purchase tokens from primary market
   */
  async purchaseTokens(
    assetId: number,
    tokenAmount: number,
    walletAddress: string
  ): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      if (!this.signer) {
        return { success: false, error: 'No signer connected' };
      }
      
      // Calculate purchase cost
      const cost = await this.calculatePurchaseCost(assetId, tokenAmount);
      const totalCostWei = ethers.parseEther(cost.total);
      
      // Execute purchase
      const tx = await this.contract.purchaseTokens(
        assetId,
        tokenAmount,
        { value: totalCostWei }
      );
      
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'purchaseTokens',
          'purchase',
          {
            assetId,
            tokenAmount,
            userId: walletAddress, // Use wallet address as userId identifier
          }
        );
        await gasMonitoringService.recordGasMetrics(gasMetrics);
      } catch (gasError) {
        console.warn('Failed to record gas metrics:', gasError);
        // Don't fail the transaction if gas tracking fails
      }
      
      return {
        success: true,
        txHash: receipt.hash
      };
      
    } catch (error: any) {
      if (error.code === 'ACTION_REJECTED') {
        return { success: false, error: 'Transaction rejected by user' };
      }
      
      if (error.message.includes('insufficient funds')) {
        return { success: false, error: 'Insufficient funds for transaction' };
      }
      
      return { success: false, error: error.message || 'Purchase failed' };
    }
  }
  
  /**
   * Calculate purchase cost with fees
   */
  async calculatePurchaseCost(
    assetId: number,
    tokenAmount: number
  ): Promise<PurchaseCost> {
    try {
      const [totalCost, marketplaceFee] = await this.contract.calculatePurchaseCost(
        assetId,
        tokenAmount
      );
      
      const subtotal = ethers.formatEther(totalCost - marketplaceFee);
      const fee = ethers.formatEther(marketplaceFee);
      const total = ethers.formatEther(totalCost);
      
      return {
        subtotal,
        marketplaceFee: fee,
        total
      };
      
    } catch (error: any) {
      throw new Error(`Failed to calculate purchase cost: ${error.message}`);
    }
  }
  
  /**
   * Create secondary market listing
   */
  async createListing(
    assetId: number,
    tokenAmount: number,
    pricePerToken: string
  ): Promise<{
    success: boolean;
    listingId?: number;
    txHash?: string;
    error?: string;
  }> {
    try {
      if (!this.signer) {
        return { success: false, error: 'No signer connected' };
      }
      
      const pricePerTokenWei = ethers.parseEther(pricePerToken);
      
      const tx = await this.contract.createListing(
        assetId,
        tokenAmount,
        pricePerTokenWei
      );
      
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'createListing',
          'listing',
          {
            assetId,
            tokenAmount,
          }
        );
        await gasMonitoringService.recordGasMetrics(gasMetrics);
      } catch (gasError) {
        console.warn('Failed to record gas metrics:', gasError);
      }
      
      // Extract listing ID from event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.contract.interface.parseLog(log);
          return parsed?.name === 'ListingCreated';
        } catch {
          return false;
        }
      });
      
      if (event) {
        const parsed = this.contract.interface.parseLog(event);
        const listingId = Number(parsed?.args[0]);
        
        return {
          success: true,
          listingId,
          txHash: receipt.hash
        };
      }
      
      return {
        success: true,
        txHash: receipt.hash
      };
      
    } catch (error: any) {
      if (error.code === 'ACTION_REJECTED') {
        return { success: false, error: 'Transaction rejected by user' };
      }
      
      return { success: false, error: error.message || 'Listing creation failed' };
    }
  }
  
  /**
   * Get listing details
   */
  async getListing(listingId: number): Promise<ListingData | null> {
    try {
      const listing = await this.contract.getListing(listingId);
      
      return {
        listingId,
        assetId: Number(listing.assetId),
        seller: listing.seller,
        tokenAmount: Number(listing.tokenAmount),
        pricePerToken: ethers.formatEther(listing.pricePerToken),
        status: Number(listing.status),
        createdAt: Number(listing.createdAt)
      };
      
    } catch (error: any) {
      console.error('Failed to get listing:', error);
      return null;
    }
  }
  
  /**
   * Get all listings for an asset
   */
  async getAssetListings(assetId: number): Promise<ListingData[]> {
    try {
      const listingIds = await this.contract.getAssetListings(assetId);
      
      const listings = await Promise.all(
        listingIds.map((id: bigint) => this.getListing(Number(id)))
      );
      
      return listings.filter((listing): listing is ListingData => listing !== null);
      
    } catch (error: any) {
      console.error('Failed to get asset listings:', error);
      return [];
    }
  }
  
  /**
   * Get marketplace fee percentage
   */
  async getMarketplaceFeePercentage(): Promise<number> {
    try {
      // Check if contract is deployed
      if (!(await this.checkContractCode())) {
        console.warn('Marketplace contract not deployed, returning default fee');
        return 2.5; // Default 2.5%
      }
      
      // Contract method is getMarketplaceFee() which returns basis points
      const feeBasisPoints = await this.contract.getMarketplaceFee();
      return Number(feeBasisPoints) / 100; // Convert basis points to percentage
    } catch (error: any) {
      console.error('Failed to get marketplace fee:', error);
      return 2.5; // Default 2.5%
    }
  }
  
  /**
   * Pause marketplace (admin only)
   */
  async pause(): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      if (!this.signer) {
        return { success: false, error: 'No signer connected' };
      }
      
      const tx = await this.contract.pause();
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }
      
      return {
        success: true,
        txHash: receipt.hash
      };
      
    } catch (error: any) {
      return { success: false, error: error.message || 'Pause failed' };
    }
  }
  
  /**
   * Unpause marketplace (admin only)
   */
  async unpause(): Promise<{
    success: boolean;
    txHash?: string;
    error?: string;
  }> {
    try {
      if (!this.signer) {
        return { success: false, error: 'No signer connected' };
      }
      
      const tx = await this.contract.unpause();
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }
      
      return {
        success: true,
        txHash: receipt.hash
      };
      
    } catch (error: any) {
      return { success: false, error: error.message || 'Unpause failed' };
    }
  }
  
  /**
   * Check if marketplace is paused
   */
  async isPaused(): Promise<boolean> {
    try {
      // Check if contract is deployed
      if (!(await this.checkContractCode())) {
        console.warn('Marketplace contract not deployed, returning default pause status');
        return false; // Not paused if contract doesn't exist
      }
      
      return await this.contract.paused();
    } catch (error: any) {
      // If contract call fails, assume not paused
      console.error('Failed to check pause status:', error);
      return false;
    }
  }
  
  /**
   * Check if address has admin role
   * Falls back to checking application admin role if contract not deployed
   */
  async hasAdminRole(address: string): Promise<boolean> {
    try {
      // Check if contract is deployed
      if (!(await this.checkContractCode())) {
        console.warn('Marketplace contract not deployed, checking application admin role');
        // Fallback: Check if user is admin in application database
        // This allows admin access even if contract isn't deployed yet
        try {
          const response = await fetch('/api/users/me', {
            credentials: 'include'
          });
          if (response.ok) {
            const user = await response.json();
            return user?.role === 'ADMIN' || user?.role === 'admin';
          }
        } catch (err) {
          console.error('Failed to check application admin role:', err);
        }
        return false;
      }
      
      const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
      return await this.contract.hasRole(DEFAULT_ADMIN_ROLE, address);
    } catch (error: any) {
      console.error('Failed to check admin role:', error);
      // Fallback: Check application admin role
      try {
        const response = await fetch('/api/users/me', {
          credentials: 'include'
        });
        if (response.ok) {
          const user = await response.json();
          return user?.role === 'ADMIN' || user?.role === 'admin';
        }
      } catch (err) {
        console.error('Failed to check application admin role:', err);
      }
      return false;
    }
  }
  
  /**
   * Estimate gas for token purchase
   */
  async estimatePurchaseGas(
    assetId: number,
    tokenAmount: number,
    walletAddress: string
  ): Promise<{
    gasLimit: string;
    estimatedCost: string;
  }> {
    try {
      const cost = await this.calculatePurchaseCost(assetId, tokenAmount);
      const totalCostWei = ethers.parseEther(cost.total);
      
      const gasEstimate = await this.contract.purchaseTokens.estimateGas(
        assetId,
        tokenAmount,
        { value: totalCostWei, from: walletAddress }
      );
      
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const estimatedCost = gasEstimate * gasPrice;
      
      return {
        gasLimit: gasEstimate.toString(),
        estimatedCost: ethers.formatEther(estimatedCost)
      };
      
    } catch (error: any) {
      throw new Error(`Failed to estimate gas: ${error.message}`);
    }
  }
}

/**
 * Get marketplace service instance
 */
export async function getMarketplaceService(
  provider: ethers.Provider,
  signer?: ethers.Signer
): Promise<RWAMarketplaceService> {
  return await new RWAMarketplaceService(provider, signer);
}

