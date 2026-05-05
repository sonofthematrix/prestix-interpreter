/**
 * Gas Monitoring Service
 * 
 * Tracks gas usage for marketplace transactions and provides analytics
 */

import { ethers } from 'ethers';

export interface GasMetrics {
  transactionHash: string;
  contractAddress: string;
  functionName: string;
  operationType: 'purchase' | 'listing' | 'cancel' | 'purchaseFromListing' | 'other';
  
  // Gas details
  gasUsed: string;
  gasLimit: string;
  gasPrice: string;
  effectiveGasPrice?: string;
  gasCostWei: string;
  gasCostETH: string;
  gasCostUSD?: string;
  
  // Transaction details
  blockNumber: number;
  blockTimestamp: Date;
  from: string;
  to: string;
  value: string;
  
  // Marketplace specific
  assetId?: number;
  tokenAmount?: number;
  listingId?: number;
  
  // Metadata
  userId?: string;
  investmentId?: string;
  orderId?: string;
  poolId?: number;
}

export interface GasAnalytics {
  totalTransactions: number;
  totalGasUsed: string;
  totalGasCostETH: string;
  totalGasCostUSD?: string;
  averageGasPerTransaction: string;
  averageGasCostETH: string;
  averageGasCostUSD?: string;
  
  // By operation type
  byOperationType: {
    [key: string]: {
      count: number;
      totalGasUsed: string;
      totalGasCostETH: string;
      averageGasUsed: string;
      averageGasCostETH: string;
    };
  };
  
  // Time series data
  dailyBreakdown: {
    date: string;
    transactions: number;
    totalGasUsed: string;
    totalGasCostETH: string;
  }[];
  
  // Cost analysis
  costAnalysis: {
    estimatedMonthlyCostETH: string;
    estimatedMonthlyCostUSD?: string;
    estimatedYearlyCostETH: string;
    estimatedYearlyCostUSD?: string;
  };
}

export class GasMonitoringService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = '/api/gas-monitoring';
  }

  /**
   * Record gas metrics for a transaction
   */
  async recordGasMetrics(metrics: GasMetrics): Promise<void> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(metrics),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to record gas metrics');
      }
    } catch (error) {
      console.error('Failed to record gas metrics:', error);
      // Don't throw - gas monitoring shouldn't break the transaction flow
    }
  }

  /**
   * Extract gas metrics from transaction receipt
   */
  extractGasMetrics(
    receipt: ethers.TransactionReceipt,
    tx: ethers.TransactionResponse,
    functionName: string,
    operationType: GasMetrics['operationType'],
    metadata?: {
      assetId?: number;
      tokenAmount?: number;
      listingId?: number;
      userId?: string;
      investmentId?: string;
      orderId?: string;
      poolId?: number;
    }
  ): GasMetrics {
    const gasUsed = receipt.gasUsed.toString();
    const gasLimit = tx.gasLimit?.toString() || receipt.gasUsed.toString();
    const gasPrice = receipt.gasPrice?.toString() || tx.gasPrice?.toString() || '0';
    const effectiveGasPrice = receipt.gasPrice?.toString() || gasPrice;
    
    const gasCostWei = (receipt.gasUsed * BigInt(effectiveGasPrice)).toString();
    const gasCostETH = ethers.formatEther(gasCostWei);

    return {
      transactionHash: receipt.hash,
      contractAddress: receipt.to || '',
      functionName,
      operationType,
      
      gasUsed,
      gasLimit,
      gasPrice,
      effectiveGasPrice,
      gasCostWei,
      gasCostETH,
      
      blockNumber: receipt.blockNumber,
      blockTimestamp: new Date(),
      from: receipt.from,
      to: receipt.to || '',
      value: tx.value?.toString() || '0',
      
      assetId: metadata?.assetId,
      tokenAmount: metadata?.tokenAmount,
      listingId: metadata?.listingId,
      userId: metadata?.userId,
      investmentId: metadata?.investmentId,
      orderId: metadata?.orderId,
      poolId: metadata?.poolId,
    };
  }

  /**
   * Get gas analytics
   */
  async getAnalytics(params?: {
    startDate?: Date;
    endDate?: Date;
    operationType?: GasMetrics['operationType'];
    contractAddress?: string;
  }): Promise<GasAnalytics> {
    const queryParams = new URLSearchParams();
    
    if (params?.startDate) {
      queryParams.append('startDate', params.startDate.toISOString());
    }
    if (params?.endDate) {
      queryParams.append('endDate', params.endDate.toISOString());
    }
    if (params?.operationType) {
      queryParams.append('operationType', params.operationType);
    }
    if (params?.contractAddress) {
      queryParams.append('contractAddress', params.contractAddress);
    }

    const response = await fetch(`${this.apiBaseUrl}/analytics?${queryParams.toString()}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get gas analytics');
    }

    return response.json();
  }

  /**
   * Get recent gas metrics
   */
  async getRecentMetrics(limit: number = 50): Promise<GasMetrics[]> {
    const response = await fetch(`${this.apiBaseUrl}/recent?limit=${limit}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get recent gas metrics');
    }

    return response.json();
  }

  /**
   * Get gas cost estimate for operation
   */
  async estimateGasCost(
    operationType: GasMetrics['operationType'],
    gasEstimate: bigint,
    gasPrice?: bigint
  ): Promise<{
    estimatedGasUsed: string;
    estimatedGasCostETH: string;
    estimatedGasCostUSD?: string;
  }> {
    // Get current gas price if not provided
    let currentGasPrice = gasPrice;
    if (!currentGasPrice) {
      try {
        const response = await fetch(`${this.apiBaseUrl}/gas-price`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          currentGasPrice = BigInt(data.gasPrice);
        }
      } catch (error) {
        console.warn('Failed to get current gas price:', error);
      }
    }

    // Use default if still not available
    if (!currentGasPrice) {
      currentGasPrice = BigInt(20_000_000_000); // 20 gwei default
    }

    const estimatedGasCostWei = gasEstimate * currentGasPrice;
    const estimatedGasCostETH = ethers.formatEther(estimatedGasCostWei);

    return {
      estimatedGasUsed: gasEstimate.toString(),
      estimatedGasCostETH,
    };
  }
}

export const gasMonitoringService = new GasMonitoringService();

