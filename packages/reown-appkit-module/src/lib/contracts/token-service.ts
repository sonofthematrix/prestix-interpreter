/**
 * Tokenizin Token Contract Service
 * Frontend integration for TigerPalaceToken contract
 */

import { ethers } from 'ethers';
import TigerPalaceTokenABI from './abis/TigerPalaceToken';
import deploymentInfo from './abis/tigerpalacetoken-deployment';
import { gasMonitoringService, type GasMetrics } from '@/lib/services/gas-monitoring-service';

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

export interface TokenBalance {
  balance: string;
  formatted: string;
}

export interface TaxInfo {
  buyTax: number;
  sellTax: number;
}

export class TigerPalaceTokenService {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private contractAddress: string;
  
  constructor(provider: ethers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    this.contractAddress = deploymentInfo.address;
    const abi = TigerPalaceTokenABI.abi.abi;
    
    // Check if contract is deployed
    if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
      console.warn('⚠️ Tokenizin Token contract not deployed. Address:', this.contractAddress);
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
   * Get token information
   */
  async getTokenInfo(): Promise<TokenInfo> {
    try {
      if (!(await this.checkContractCode())) {
        return {
          name: 'Tokenizin Token',
          symbol: 'TKNZN',
          decimals: 18,
          totalSupply: '0',
        };
      }
      
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        this.contract.name(),
        this.contract.symbol(),
        this.contract.decimals(),
        this.contract.totalSupply(),
      ]);
      
      return {
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: ethers.formatEther(totalSupply || 0n),
      };
    } catch (error: any) {
      console.error('Failed to get token info:', error);
      return {
        name: 'Tokenizin Token',
        symbol: 'TKNZN',
        decimals: 18,
        totalSupply: '0',
      };
    }
  }
  
  /**
   * Get token balance for an address
   */
  async getBalance(address: string): Promise<TokenBalance> {
    try {
      if (!(await this.checkContractCode())) {
        return {
          balance: '0',
          formatted: '0',
        };
      }
      
      const balance = await this.contract.balanceOf(address);
      const formatted = ethers.formatEther(balance || 0n);
      
      return {
        balance: balance.toString(),
        formatted,
      };
    } catch (error: any) {
      console.error('Failed to get balance:', error);
      return {
        balance: '0',
        formatted: '0',
      };
    }
  }
  
  /**
   * Get tax information
   */
  async getTaxInfo(): Promise<TaxInfo> {
    try {
      if (!(await this.checkContractCode())) {
        return {
          buyTax: 0,
          sellTax: 0,
        };
      }
      
      const [buyTax, sellTax] = await Promise.all([
        this.contract.buyTax(),
        this.contract.sellTax(),
      ]);
      
      return {
        buyTax: Number(buyTax),
        sellTax: Number(sellTax),
      };
    } catch (error: any) {
      console.error('Failed to get tax info:', error);
      return {
        buyTax: 0,
        sellTax: 0,
      };
    }
  }
  
  /**
   * Check if address is exempt from tax
   */
  async isExemptFromTax(address: string): Promise<boolean> {
    try {
      if (!(await this.checkContractCode())) {
        return false;
      }
      
      return await this.contract.isExemptFromTax(address);
    } catch (error: any) {
      console.error('Failed to check tax exemption:', error);
      return false;
    }
  }
  
  /**
   * Check if address is exempt from max wallet
   */
  async isExemptFromMaxWallet(address: string): Promise<boolean> {
    try {
      if (!(await this.checkContractCode())) {
        return false;
      }
      
      return await this.contract.isExemptFromMaxWallet(address);
    } catch (error: any) {
      console.error('Failed to check max wallet exemption:', error);
      return false;
    }
  }
  
  /**
   * Transfer tokens
   */
  async transfer(
    to: string,
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
      
      const tx = await this.contract.transfer(to, amountWei);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'transfer',
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
      
      if (error.message.includes('insufficient funds')) {
        return { success: false, error: 'Insufficient balance' };
      }
      
      return { success: false, error: error.message || 'Transfer failed' };
    }
  }
  
  /**
   * Approve spender
   */
  async approve(
    spender: string,
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
      
      const tx = await this.contract.approve(spender, amountWei);
      const receipt = await tx.wait();
      
      if (receipt.status === 0) {
        return { success: false, error: 'Transaction failed' };
      }

      // Track gas metrics
      try {
        const gasMetrics = gasMonitoringService.extractGasMetrics(
          receipt,
          tx,
          'approve',
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
      
      return { success: false, error: error.message || 'Approve failed' };
    }
  }
  
  /**
   * Get allowance
   */
  async getAllowance(owner: string, spender: string): Promise<string> {
    try {
      if (!(await this.checkContractCode())) {
        return '0';
      }
      
      const allowance = await this.contract.allowance(owner, spender);
      return ethers.formatEther(allowance || 0n);
    } catch (error: any) {
      console.error('Failed to get allowance:', error);
      return '0';
    }
  }
  
  /**
   * Get contract addresses
   */
  async getContractAddresses(): Promise<{
    treasuryAddress: string;
    rewardDistributorAddress: string;
  }> {
    try {
      if (!(await this.checkContractCode())) {
        return {
          treasuryAddress: '0x0000000000000000000000000000000000000000',
          rewardDistributorAddress: '0x0000000000000000000000000000000000000000',
        };
      }
      
      const [treasuryAddress, rewardDistributorAddress] = await Promise.all([
        this.contract.treasuryAddress(),
        this.contract.rewardDistributorAddress(),
      ]);
      
      return {
        treasuryAddress,
        rewardDistributorAddress,
      };
    } catch (error: any) {
      console.error('Failed to get contract addresses:', error);
      return {
        treasuryAddress: '0x0000000000000000000000000000000000000000',
        rewardDistributorAddress: '0x0000000000000000000000000000000000000000',
      };
    }
  }
}

/**
 * Get token service instance
 */
export function getTokenService(
  provider: ethers.Provider,
  signer?: ethers.Signer
): TigerPalaceTokenService {
  return new TigerPalaceTokenService(provider, signer);
}

