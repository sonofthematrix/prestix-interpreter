// TigerPalace RWA Marketplace Ecosystem Integration Example
// This file shows how to integrate the RWA contracts in your frontend
// Generated at: 2025-11-30T21:08:05.500Z

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, ContractAddresses } from './types';

// Import contract ABIs
import ProxyAdminABI from './ProxyAdmin.json';
import TokenizinTokenABI from './TokenizinToken.json';
import RWAAssetRegistryABI from './RWAAssetRegistry.json';
import RWATokenFactoryABI from './RWATokenFactory.json';
import RWAMarketplaceABI from './RWAMarketplace.json';
import RWAStakingABI from './RWAStaking.json';
import RWARewardDistributorABI from './RWARewardDistributor.json';
import RWARevenueABI from './RWARevenue.json';
import MembershipSystemABI from './MembershipSystem.json';

export class TigerPalaceRWAIntegration {
  private provider: ethers.Provider;
  private signer: ethers.Signer | null;
  private contracts: {
    proxyAdmin: ethers.Contract;
    tokenizinToken: ethers.Contract;
    rwaAssetRegistry: ethers.Contract;
    rwaTokenFactory: ethers.Contract;
    rwaMarketplace: ethers.Contract;
    rwaStaking: ethers.Contract;
    rwaRewardDistributor: ethers.Contract;
    rwaRevenue: ethers.Contract;
    membershipSystem: ethers.Contract;
  };

  constructor(provider: ethers.Provider, signer: ethers.Signer | null = null) {
    this.provider = provider;
    this.signer = signer;

    // Initialize contracts with proxy addresses (for frontend integration)
    this.contracts = {
      proxyAdmin: new ethers.Contract(
        CONTRACT_ADDRESSES.ProxyAdmin,
        ProxyAdminABI.abi,
        signer || provider
      ),
      tokenizinToken: new ethers.Contract(
        CONTRACT_ADDRESSES.TokenizinToken,
        TokenizinTokenABI.abi,
        signer || provider
      ),
      rwaAssetRegistry: new ethers.Contract(
        CONTRACT_ADDRESSES.RWAAssetRegistry,
        RWAAssetRegistryABI.abi,
        signer || provider
      ),
      rwaTokenFactory: new ethers.Contract(
        CONTRACT_ADDRESSES.RWATokenFactory,
        RWATokenFactoryABI.abi,
        signer || provider
      ),
      rwaMarketplace: new ethers.Contract(
        CONTRACT_ADDRESSES.RWAMarketplace,
        RWAMarketplaceABI.abi,
        signer || provider
      ),
      rwaStaking: new ethers.Contract(
        CONTRACT_ADDRESSES.RWAStaking,
        RWAStakingABI.abi,
        signer || provider
      ),
      rwaRewardDistributor: new ethers.Contract(
        CONTRACT_ADDRESSES.RWARewardDistributor,
        RWARewardDistributorABI.abi,
        signer || provider
      ),
      rwaRevenue: new ethers.Contract(
        CONTRACT_ADDRESSES.RWARevenue,
        RWARevenueABI.abi,
        signer || provider
      ),
      membershipSystem: new ethers.Contract(
        CONTRACT_ADDRESSES.MembershipSystem,
        MembershipSystemABI.abi,
        signer || provider
      ),
    };
  }

  // Token operations
  async getTokenBalance(address: string): Promise<string> {
    const balance = await this.contracts.tokenizinToken.balanceOf(address);
    return ethers.formatEther(balance);
  }

  async approveToken(spender: string, amount: string): Promise<void> {
    if (!this.signer) throw new Error("Signer required for transactions");
    const tx = await this.contracts.tokenizinToken.approve(
      spender,
      ethers.parseEther(amount)
    );
    await tx.wait();
  }

  // Asset Registry operations
  async getAsset(assetId: number): Promise<any> {
    return await this.contracts.rwaAssetRegistry.getAsset(assetId);
  }

  async getAllAssets(): Promise<any[]> {
    return await this.contracts.rwaAssetRegistry.getAllAssets();
  }

  // Marketplace operations
  async purchaseTokens(assetId: number, tokenAmount: string, options?: { value?: string }): Promise<void> {
    if (!this.signer) throw new Error("Signer required for transactions");
    const tx = await this.contracts.rwaMarketplace.purchaseTokens(
      assetId,
      ethers.parseEther(tokenAmount),
      { value: options?.value ? ethers.parseEther(options.value) : undefined }
    );
    await tx.wait();
  }

  // Staking operations
  async stake(poolId: number, amount: string): Promise<void> {
    if (!this.signer) throw new Error("Signer required for transactions");
    const tx = await this.contracts.rwaStaking.stake(
      poolId,
      ethers.parseEther(amount)
    );
    await tx.wait();
  }

  async claimRewards(stakeId: number): Promise<void> {
    if (!this.signer) throw new Error("Signer required for transactions");
    const tx = await this.contracts.rwaStaking.claimRewards(stakeId);
    await tx.wait();
  }

  async getUserStakes(address: string): Promise<any[]> {
    return await this.contracts.rwaStaking.getUserStakes(address);
  }

  async getPendingRewards(address: string, stakeId: number): Promise<string> {
    const rewards = await this.contracts.rwaStaking.getPendingRewards(address, stakeId);
    return ethers.formatEther(rewards);
  }

  // Revenue operations
  async getRevenueStats(): Promise<any> {
    return await this.contracts.rwaRevenue.getRevenueStats();
  }

  // Reward Distributor operations
  async getRewardPoolStats(): Promise<any> {
    return await this.contracts.rwaRewardDistributor.getRewardPoolStats();
  }

  // Membership operations
  async getMembershipLevel(address: string): Promise<any> {
    return await this.contracts.membershipSystem.getMembershipLevel(address);
  }
}

// Usage example:
/*
// In a React component or frontend app:
import { ethers } from 'ethers';
import { TigerPalaceRWAIntegration } from './integration-example';

// Initialize provider and signer
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const rwa = new TigerPalaceRWAIntegration(provider, signer);

// Get user's token balance
const balance = await rwa.getTokenBalance(userAddress);

// Approve token spending
await rwa.approveToken(CONTRACT_ADDRESSES.RWAStaking, '1000');

// Stake tokens
await rwa.stake(1, '1000');

// Get user's stakes
const stakes = await rwa.getUserStakes(userAddress);

// Claim rewards
await rwa.claimRewards(0);
*/
