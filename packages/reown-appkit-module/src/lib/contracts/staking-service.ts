/**
 * RWA Staking Contract Service
 * Frontend integration for RWAStaking contract
 */

import { ethers } from 'ethers';
import RWAStakingABI from './abis/RWAStaking';
import deploymentInfo from './abis/rwastaking-deployment';
import { gasMonitoringService, type GasMetrics } from '@/lib/services/gas-monitoring-service';

export interface PoolData {
  poolId: number;
  name: string;
  duration: number;
  multiplier: number;
  isActive: boolean;
  totalStaked: string;
  totalRewards: string;
}

export interface UserStake {
  stakeId: number;
  poolId: number;
  amount: string;
  stakedAt: number;
  unlockAt: number;
  isClaimed: boolean;
  rewards: string;
}

export interface StakingStats {
  totalStaked: string;
  totalRewardsDistributed: string;
  totalPools: number;
}

export class RWAStakingService {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private contractAddress: string;
  
  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    this.contractAddress = deploymentInfo.address;
    const abi = RWAStakingABI.abi.abi;
    
    // Check if contract is deployed
    if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️ Staking contract not deployed. Address:', this.contractAddress);
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
   * Get all staking pools
   */
  async getAllPools(): Promise<PoolData[]> {
    try {
      if (!(await this.checkContractCode())) {
        return [];
      }
      
      const pools = await this.contract.getAllPools();
      
      return pools.map((pool: any, index: number) => ({
        poolId: index,
        name: pool.name || `Pool ${index}`,
        duration: Number(pool.duration),
        multiplier: Number(pool.multiplier),
        isActive: pool.isActive,
        totalStaked: ethers.formatEther(pool.totalStaked || 0n),
        totalRewards: ethers.formatEther(pool.totalRewards || 0n),
      }));
    } catch (error: any) {
      console.error('Failed to get pools:', error);
      return [];
    }
  }
  
  /**
   * Get pool details
   */
  async getPool(poolId: number): Promise<PoolData | null> {
    try {
      if (!(await this.checkContractCode())) {
        return null;
      }
      
      const pool = await this.contract.getPool(poolId);
      
      return {
        poolId,
        name: pool.name || `Pool ${poolId}`,
        duration: Number(pool.duration),
        multiplier: Number(pool.multiplier),
        isActive: pool.isActive,
        totalStaked: ethers.formatEther(pool.totalStaked || 0n),
        totalRewards: ethers.formatEther(pool.totalRewards || 0n),
      };
    } catch (error: any) {
      console.error('Failed to get pool:', error);
      return null;
    }
  }
  
  /**
   * Get user stakes
   */
  async getUserStakes(userAddress: string): Promise<UserStake[]> {
    try {
      if (!(await this.checkContractCode())) {
        return [];
      }
      
      const stakes = await this.contract.getUserStakes(userAddress);
      
      return stakes.map((stake: any, index: number) => ({
        stakeId: index,
        poolId: Number(stake.poolId),
        amount: ethers.formatEther(stake.amount || 0n),
        stakedAt: Number(stake.stakedAt),
        unlockAt: Number(stake.unlockAt),
        isClaimed: stake.isClaimed,
        rewards: ethers.formatEther(stake.rewards || 0n),
      }));
    } catch (error: any) {
      console.error('Failed to get user stakes:', error);
      return [];
    }
  }
  
  /**
   * Get user stake for specific pool
   */
  async getUserStake(userAddress: string, poolId: number): Promise<UserStake | null> {
    try {
      if (!(await this.checkContractCode())) {
        return null;
      }
      
      const stake = await this.contract.getUserStake(userAddress, poolId);
      
      return {
        stakeId: 0,
        poolId,
        amount: ethers.formatEther(stake.amount || 0n),
        stakedAt: Number(stake.stakedAt),
        unlockAt: Number(stake.unlockAt),
        isClaimed: stake.isClaimed,
        rewards: ethers.formatEther(stake.rewards || 0n),
      };
    } catch (error: any) {
      console.error('Failed to get user stake:', error);
      return null;
    }
  }
  
  /**
   * Get pending rewards for user
   */
  async getPendingRewards(userAddress: string, poolId: number): Promise<string> {
    try {
      if (!(await this.checkContractCode())) {
        return '0';
      }
      
      const rewards = await this.contract.getPendingRewards(userAddress, poolId);
      return ethers.formatEther(rewards || 0n);
    } catch (error: any) {
      console.error('Failed to get pending rewards:', error);
      return '0';
    }
  }
  
  /**
   * Stake tokens
   */
  async stake(
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
      
      const tx = await this.contract.stake(poolId, amountWei);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'stake',
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
      
      if (error.message.includes('insufficient funds')) {
        return { success: false, error: 'Insufficient funds for transaction' };
      }
      
      return { success: false, error: error.message || 'Stake failed' };
    }
  }
  
  /**
   * Claim rewards
   */
  async claimRewards(
    poolId: number,
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
      
      const tx = await this.contract.claimRewards(poolId);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'claimRewards',
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
      
      return { success: false, error: error.message || 'Claim rewards failed' };
    }
  }
  
  /**
   * Get staking statistics
   */
  async getStats(): Promise<StakingStats> {
    try {
      if (!(await this.checkContractCode())) {
        return {
          totalStaked: '0',
          totalRewardsDistributed: '0',
          totalPools: 0,
        };
      }
      
      const [totalStaked, totalRewardsDistributed, nextPoolId] = await this.contract.getStats();
      
      return {
        totalStaked: ethers.formatEther(totalStaked || 0n),
        totalRewardsDistributed: ethers.formatEther(totalRewardsDistributed || 0n),
        totalPools: Number(nextPoolId || 0n),
      };
    } catch (error: any) {
      console.error('Failed to get stats:', error);
      return {
        totalStaked: '0',
        totalRewardsDistributed: '0',
        totalPools: 0,
      };
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
    rwaRevenueAddress: string;
    rewardDistributorAddress: string;
  }> {
    try {
      if (!(await this.checkContractCode())) {
        return {
          tokenizinToken: '0x0000000000000000000000000000000000000000',
          rwaRevenueAddress: '0x0000000000000000000000000000000000000000',
          rewardDistributorAddress: '0x0000000000000000000000000000000000000000',
        };
      }
      
      const [tokenizinToken, rwaRevenueAddress, rewardDistributorAddress] = await Promise.all([
        this.contract.tokenizinToken(),
        this.contract.rwaRevenueAddress(),
        this.contract.rewardDistributorAddress(),
      ]);
      
      return {
        tokenizinToken,
        rwaRevenueAddress,
        rewardDistributorAddress,
      };
    } catch (error: any) {
      console.error('Failed to get contract addresses:', error);
      return {
        tokenizinToken: '0x0000000000000000000000000000000000000000',
        rwaRevenueAddress: '0x0000000000000000000000000000000000000000',
        rewardDistributorAddress: '0x0000000000000000000000000000000000000000',
      };
    }
  }
}

/**
 * Get staking service instance
 */
export function getStakingService(
  provider: ethers.Provider,
  signer?: ethers.Signer
): RWAStakingService {
  return new RWAStakingService(provider, signer);
}

