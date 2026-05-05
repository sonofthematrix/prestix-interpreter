/**
 * RWA Revenue Contract Service
 * Frontend integration for RWARevenue contract
 */

import { ethers } from 'ethers';
import RWARevenueABI from './abis/RWARevenue';
import deploymentInfo from './abis/rwarevenue-deployment';
import { gasMonitoringService, type GasMetrics } from '@/lib/services/gas-monitoring-service';

export interface RevenueStats {
  totalRevenueAllocated: string;
  totalRevenueDistributed: string;
  pendingRevenue: string;
  totalPropertyDividends: string;
  totalMarketplaceFees: string;
  totalStakingRewards: string;
}

export interface PoolRevenueStats {
  allocated: string;
  distributed: string;
  pending: string;
}

export class RWARevenueService {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private contractAddress: string;
  
  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    this.contractAddress = deploymentInfo.address;
    const abi = RWARevenueABI.abi.abi;
    
    // Check if contract is deployed
    if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️ Revenue contract not deployed. Address:', this.contractAddress);
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
   * Get revenue statistics
   */
  async getRevenueStats(): Promise<RevenueStats> {
    try {
      if (!(await this.checkContractCode())) {
        return {
          totalRevenueAllocated: '0',
          totalRevenueDistributed: '0',
          pendingRevenue: '0',
          totalPropertyDividends: '0',
          totalMarketplaceFees: '0',
          totalStakingRewards: '0',
        };
      }
      
      const stats = await this.contract.getRevenueStats();
      
      return {
        totalRevenueAllocated: ethers.formatEther(stats[0] || 0n),
        totalRevenueDistributed: ethers.formatEther(stats[1] || 0n),
        pendingRevenue: ethers.formatEther(stats[2] || 0n),
        totalPropertyDividends: ethers.formatEther(stats[3] || 0n),
        totalMarketplaceFees: ethers.formatEther(stats[4] || 0n),
        totalStakingRewards: ethers.formatEther(stats[5] || 0n),
      };
    } catch (error: any) {
      console.error('Failed to get revenue stats:', error);
      return {
        totalRevenueAllocated: '0',
        totalRevenueDistributed: '0',
        pendingRevenue: '0',
        totalPropertyDividends: '0',
        totalMarketplaceFees: '0',
        totalStakingRewards: '0',
      };
    }
  }
  
  /**
   * Get pool revenue statistics
   */
  async getPoolRevenueStats(poolId: number): Promise<PoolRevenueStats> {
    try {
      if (!(await this.checkContractCode())) {
        return {
          allocated: '0',
          distributed: '0',
          pending: '0',
        };
      }
      
      const stats = await this.contract.getPoolRevenueStats(poolId);
      
      return {
        allocated: ethers.formatEther(stats[0] || 0n),
        distributed: ethers.formatEther(stats[1] || 0n),
        pending: ethers.formatEther(stats[2] || 0n),
      };
    } catch (error: any) {
      console.error('Failed to get pool revenue stats:', error);
      return {
        allocated: '0',
        distributed: '0',
        pending: '0',
      };
    }
  }
  
  /**
   * Get pending revenue
   */
  async getPendingRevenue(): Promise<string> {
    try {
      if (!(await this.checkContractCode())) {
        return '0';
      }
      
      const pending = await this.contract.pendingRevenue();
      return ethers.formatEther(pending || 0n);
    } catch (error: any) {
      console.error('Failed to get pending revenue:', error);
      return '0';
    }
  }
  
  /**
   * Allocate revenue to a pool (admin only)
   */
  async allocateRevenue(
    poolId: number,
    amount: string,
    source: string,
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
      
      const amountWei = ethers.parseEther(amount);
      
      const tx = await this.contract.allocateRevenue(poolId, amountWei, source);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'allocateRevenue',
          'other',
          {
            poolId,
            userId: walletAddress,
          }
        );
        await gasMonitoringService.recordGasMetrics(gasMetrics);
      } catch (gasError) {
        console.warn('Failed to record gas metrics:', gasError);
      }
      
      return {
        success: true,
        txHash: receipt.hash
      };
      
    } catch (error: any) {
      if (error.code === 'ACTION_REJECTED') {
        return { success: false, error: 'Transaction rejected by user' };
      }
      
      return { success: false, error: error.message || 'Allocate revenue failed' };
    }
  }
  
  /**
   * Distribute revenue (admin only)
   */
  async distributeRevenue(
    poolId: number,
    amount: string,
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
      
      const amountWei = ethers.parseEther(amount);
      
      const tx = await this.contract.distributeRevenue(poolId, amountWei);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'distributeRevenue',
          'other',
          {
            poolId,
            userId: walletAddress,
          }
        );
        await gasMonitoringService.recordGasMetrics(gasMetrics);
      } catch (gasError) {
        console.warn('Failed to record gas metrics:', gasError);
      }
      
      return {
        success: true,
        txHash: receipt.hash
      };
      
    } catch (error: any) {
      if (error.code === 'ACTION_REJECTED') {
        return { success: false, error: 'Transaction rejected by user' };
      }
      
      return { success: false, error: error.message || 'Distribute revenue failed' };
    }
  }
  
  /**
   * Receive property dividends (admin only)
   */
  async receivePropertyDividends(
    amount: string,
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
      
      const amountWei = ethers.parseEther(amount);
      
      const tx = await this.contract.receivePropertyDividends(amountWei);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'receivePropertyDividends',
          'other',
          {
            userId: walletAddress,
          }
        );
        await gasMonitoringService.recordGasMetrics(gasMetrics);
      } catch (gasError) {
        console.warn('Failed to record gas metrics:', gasError);
      }
      
      return {
        success: true,
        txHash: receipt.hash
      };
      
    } catch (error: any) {
      if (error.code === 'ACTION_REJECTED') {
        return { success: false, error: 'Transaction rejected by user' };
      }
      
      return { success: false, error: error.message || 'Receive property dividends failed' };
    }
  }
  
  /**
   * Receive marketplace fees (admin only)
   */
  async receiveMarketplaceFees(
    amount: string,
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
      
      const amountWei = ethers.parseEther(amount);
      
      const tx = await this.contract.receiveMarketplaceFees(amountWei);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'receiveMarketplaceFees',
          'other',
          {
            userId: walletAddress,
          }
        );
        await gasMonitoringService.recordGasMetrics(gasMetrics);
      } catch (gasError) {
        console.warn('Failed to record gas metrics:', gasError);
      }
      
      return {
        success: true,
        txHash: receipt.hash
      };
      
    } catch (error: any) {
      if (error.code === 'ACTION_REJECTED') {
        return { success: false, error: 'Transaction rejected by user' };
      }
      
      return { success: false, error: error.message || 'Receive marketplace fees failed' };
    }
  }
  
  /**
   * Check if contract is paused
   */
  async isPaused(): Promise<boolean> {
    try {
      if (!(await this.checkContractCode())) {
        return false;
      }
      
      return await this.contract.paused();
    } catch (error: any) {
      console.error('Failed to check pause status:', error);
      return false;
    }
  }
  
  /**
   * Get contract addresses
   */
  async getContractAddresses(): Promise<{
    tokenizinToken: string;
    rwaStakingAddress: string;
    rewardDistributorAddress: string;
  }> {
    try {
      if (!(await this.checkContractCode())) {
        return {
          tokenizinToken: '0x0000000000000000000000000000000000000000',
          rwaStakingAddress: '0x0000000000000000000000000000000000000000',
          rewardDistributorAddress: '0x0000000000000000000000000000000000000000',
        };
      }
      
      const [tokenizinToken, rwaStakingAddress, rewardDistributorAddress] = await Promise.all([
        this.contract.tokenizinToken(),
        this.contract.rwaStakingAddress(),
        this.contract.rewardDistributorAddress(),
      ]);
      
      return {
        tokenizinToken,
        rwaStakingAddress,
        rewardDistributorAddress,
      };
    } catch (error: any) {
      console.error('Failed to get contract addresses:', error);
      return {
        tokenizinToken: '0x0000000000000000000000000000000000000000',
        rwaStakingAddress: '0x0000000000000000000000000000000000000000',
        rewardDistributorAddress: '0x0000000000000000000000000000000000000000',
      };
    }
  }
}

/**
 * Get revenue service instance
 */
export function getRevenueService(
  provider: ethers.Provider,
  signer?: ethers.Signer
): RWARevenueService {
  return new RWARevenueService(provider, signer);
}

