/**
 * RWA Reward Distributor Contract Service
 * Frontend integration for RWARewardDistributor contract
 */

import { ethers } from 'ethers';
import RWARewardDistributorABI from './abis/RWARewardDistributor';
import deploymentInfo from './abis/rwarewarddistributor-deployment';
import { gasMonitoringService, type GasMetrics } from '@/lib/services/gas-monitoring-service';

export interface RewardPoolStats {
  totalRewardPool: string;
  distributedRewards: string;
  pendingRewards: string;
  availableBalance: string;
  totalCollected: string;
  totalDistributed: string;
}

export class RWARewardDistributorService {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private contractAddress: string;
  
  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    this.contractAddress = deploymentInfo.address;
    const abi = RWARewardDistributorABI.abi.abi;
    
    // Check if contract is deployed
    if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️ Reward Distributor contract not deployed. Address:', this.contractAddress);
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
   * Get reward pool statistics
   */
  async getRewardPoolStats(): Promise<RewardPoolStats> {
    try {
      if (!(await this.checkContractCode())) {
        return {
          totalRewardPool: '0',
          distributedRewards: '0',
          pendingRewards: '0',
          availableBalance: '0',
          totalCollected: '0',
          totalDistributed: '0',
        };
      }
      
      const stats = await this.contract.getRewardPoolStats();
      
      return {
        totalRewardPool: ethers.formatEther(stats[0] || 0n),
        distributedRewards: ethers.formatEther(stats[1] || 0n),
        pendingRewards: ethers.formatEther(stats[2] || 0n),
        availableBalance: ethers.formatEther(stats[3] || 0n),
        totalCollected: ethers.formatEther(stats[4] || 0n),
        totalDistributed: ethers.formatEther(stats[5] || 0n),
      };
    } catch (error: any) {
      console.error('Failed to get reward pool stats:', error);
      return {
        totalRewardPool: '0',
        distributedRewards: '0',
        pendingRewards: '0',
        availableBalance: '0',
        totalCollected: '0',
        totalDistributed: '0',
      };
    }
  }
  
  /**
   * Get available balance
   */
  async getAvailableBalance(): Promise<string> {
    try {
      if (!(await this.checkContractCode())) {
        return '0';
      }
      
      const balance = await this.contract.getAvailableBalance();
      return ethers.formatEther(balance || 0n);
    } catch (error: any) {
      console.error('Failed to get available balance:', error);
      return '0';
    }
  }
  
  /**
   * Get pending rewards
   */
  async getPendingRewards(): Promise<string> {
    try {
      if (!(await this.checkContractCode())) {
        return '0';
      }
      
      const pending = await this.contract.pendingRewards();
      return ethers.formatEther(pending || 0n);
    } catch (error: any) {
      console.error('Failed to get pending rewards:', error);
      return '0';
    }
  }
  
  /**
   * Add rewards (admin only)
   */
  async addRewards(
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
      
      const tx = await this.contract.addRewards(amountWei, source);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'addRewards',
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
      
      return { success: false, error: error.message || 'Add rewards failed' };
    }
  }
  
  /**
   * Distribute rewards (admin only)
   */
  async distributeRewards(
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
      
      const tx = await this.contract.distributeRewards(amountWei);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'distributeRewards',
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
      
      return { success: false, error: error.message || 'Distribute rewards failed' };
    }
  }
  
  /**
   * Collect marketplace fees (admin only)
   */
  async collectMarketplaceFees(
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
      
      const tx = await this.contract.collectMarketplaceFees(amountWei);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'collectMarketplaceFees',
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
      
      return { success: false, error: error.message || 'Collect marketplace fees failed' };
    }
  }
  
  /**
   * Collect property dividends (admin only)
   */
  async collectPropertyDividends(
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
      
      const tx = await this.contract.collectPropertyDividends(amountWei);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'collectPropertyDividends',
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
      
      return { success: false, error: error.message || 'Collect property dividends failed' };
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
    rwaRevenueAddress: string;
    treasuryAddress: string;
  }> {
    try {
      if (!(await this.checkContractCode())) {
        return {
          tokenizinToken: '0x0000000000000000000000000000000000000000',
          rwaStakingAddress: '0x0000000000000000000000000000000000000000',
          rwaRevenueAddress: '0x0000000000000000000000000000000000000000',
          treasuryAddress: '0x0000000000000000000000000000000000000000',
        };
      }
      
      const [tokenizinToken, rwaStakingAddress, rwaRevenueAddress, treasuryAddress] = await Promise.all([
        this.contract.tokenizinToken(),
        this.contract.rwaStakingAddress(),
        this.contract.rwaRevenueAddress(),
        this.contract.treasuryAddress(),
      ]);
      
      return {
        tokenizinToken,
        rwaStakingAddress,
        rwaRevenueAddress,
        treasuryAddress,
      };
    } catch (error: any) {
      console.error('Failed to get contract addresses:', error);
      return {
        tokenizinToken: '0x0000000000000000000000000000000000000000',
        rwaStakingAddress: '0x0000000000000000000000000000000000000000',
        rwaRevenueAddress: '0x0000000000000000000000000000000000000000',
        treasuryAddress: '0x0000000000000000000000000000000000000000',
      };
    }
  }
}

/**
 * Get reward distributor service instance
 */
export function getRewardDistributorService(
  provider: ethers.Provider,
  signer?: ethers.Signer
): RWARewardDistributorService {
  return new RWARewardDistributorService(provider, signer);
}

