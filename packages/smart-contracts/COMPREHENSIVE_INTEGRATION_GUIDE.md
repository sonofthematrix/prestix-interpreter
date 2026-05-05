# Comprehensive Smart Contract Integration Guide
## Tiger Palace Pro - Hybrid Blockchain Management System

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Environment Setup](#environment-setup)
3. [Smart Contract Compilation](#smart-contract-compilation)
4. [Deployment Process](#deployment-process)
5. [Hybrid Data Synchronization](#hybrid-data-synchronization)
6. [API Integration Layer](#api-integration-layer)
7. [Frontend Integration](#frontend-integration)
8. [Security & Compliance](#security--compliance)
9. [Upgrade & Maintenance](#upgrade--maintenance)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Tiger Palace Pro                         │
│              Hybrid Blockchain Management System             │
└─────────────────────────────────────────────────────────────┘
                           │
      ┌────────────────────┼────────────────────┐
      │                    │                    │
      ▼                    ▼                    ▼
┌──────────┐     ┌─────────────────┐     ┌──────────┐
│ On-Chain │◄───►│ Synchronization │◄───►│Off-Chain │
│   Data   │     │     Engine      │     │   Data   │
│  (Smart  │     │   (API Layer)   │     │(ZenStack)│
│Contracts)│     │                 │     │   ORM    │
└──────────┘     └─────────────────┘     └──────────┘
     │                    │                    │
     ▼                    ▼                    ▼
[Sepolia]            [Backend]          [PostgreSQL]
```

### Smart Contract Architecture

```
RWAAssetRegistry (Core Registry)
    ├── Asset Registration & Management
    ├── Access Control (Role-Based)
    └── Status Management

RWATokenFactory (Token Creation)
    ├── Token Deployment
    ├── Minting/Burning Operations
    └── Dividend Distribution

RWAToken (ERC-20 Implementation)
    ├── Fractional Ownership
    ├── Dividend Tracking
    └── Holder Management

RWAMarketplace (Trading Platform)
    ├── Buy/Sell Operations
    ├── Fee Management
    └── Transaction Recording

MembershipSystem (Access Control)
    ├── NFT-Based Access (ERC-1155)
    ├── Tier Management
    └── Permission Handling
```

---

## Environment Setup

### 1. Prerequisites

```bash
# Install required tools
npm install -g npm@latest
npm install -g bun

# Verify installations
node --version  # v18+
bun --version   # v1.0+
```

### 2. Environment Variables

Create `.env` in `smart-contracts/` directory:

```bash
# === Blockchain Configuration ===
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key

# === Fee Configuration ===
FEE_RECIPIENT=0x584195f7298E14441D8B27b3c0fE5dDAcd5De4bD
MARKETPLACE_FEE_BPS=250  # 2.5%

# === Gas Settings ===
GAS_PRICE_GWEI=20
GAS_LIMIT=8000000

# === Network Configuration ===
CHAIN_ID=11155111  # Sepolia
BLOCK_CONFIRMATIONS=2
```

Create `.env` in project root for backend:

```bash
# === Database ===
DATABASE_URL=postgresql://user:pass@localhost:5432/tigerpalace

# === Blockchain RPC ===
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY

# === Contract Addresses (from deployment) ===
RWA_ASSET_REGISTRY=0x4db4f17e4e3a67bBD8c0cD3BE83072961703Ef07
RWA_TOKEN_FACTORY=0x07E9a4C59c7774b2700d8e3fe3424CD9fB85aa2E
RWA_MARKETPLACE=0x6e3bfae36b8eE8F0Ec2BA9C3CE6db1Bf61331BD0

# === Admin Wallet ===
ADMIN_WALLET_ADDRESS=0xA621B16E1c197a0774bFEa1701838F4E7c01b331
```

### 3. Install Dependencies

```bash
# Smart Contracts
cd smart-contracts
bun install

# Backend
cd ..
pnpm install
```

---

## Smart Contract Compilation

### 1. Compile Contracts

```bash
cd smart-contracts
bun run compile
```

This generates:
- `artifacts/` - ABI and bytecode
- `typechain-types/` - TypeScript types
- `cache/` - Compilation cache

### 2. Verify Compilation

```bash
# Check for compilation errors
bun run compile 2>&1 | grep -i error

# View generated artifacts
ls -la artifacts/contracts/core/
```

### 3. Run Tests

```bash
# Run full test suite
bun run test

# Run specific tests
bun run test test/RWAAssetRegistry.test.js
```

---

## Deployment Process

### 1. Deploy to Sepolia Testnet

```bash
cd smart-contracts

# Deploy all contracts
bun run deploy:sepolia
```

This will:
1. Deploy `RWAAssetRegistry`
2. Deploy `RWATokenFactory`
3. Deploy `RWAMarketplace`
4. Grant roles automatically
5. Save addresses to `deployments/sepolia.json`

### 2. Verify Deployment

```bash
# Check deployment file
cat deployments/sepolia.json

# Verify on Etherscan
bun run verify --network sepolia 0xYourContractAddress
```

### 3. Update Environment

After deployment, update `.env`:

```bash
RWA_ASSET_REGISTRY=<from sepolia.json>
RWA_TOKEN_FACTORY=<from sepolia.json>
RWA_MARKETPLACE=<from sepolia.json>
```

---

## Hybrid Data Synchronization

### Architecture

```
┌────────────────────────────────────────────────┐
│             Event Synchronization              │
├────────────────────────────────────────────────┤
│  On-Chain Events → Event Listener → Database  │
│                                                │
│  1. Contract emits event                       │
│  2. Backend listener captures event            │
│  3. Validate and transform data                │
│  4. Store in PostgreSQL via ZenStack          │
│  5. Update blockchain reference fields         │
└────────────────────────────────────────────────┘
```

### 1. Create Blockchain Service

Create `lib/services/blockchain-service.ts`:

```typescript
import { ethers } from 'ethers';
import { createClient } from '@/lib/db';

// Contract ABIs
import RWAAssetRegistryABI from '@/smart-contracts/artifacts/contracts/core/RWAAssetRegistry.sol/RWAAssetRegistry.json';
import RWATokenFactoryABI from '@/smart-contracts/artifacts/contracts/core/RWATokenFactory.sol/RWATokenFactory.json';
import RWAMarketplaceABI from '@/smart-contracts/artifacts/contracts/marketplace/RWAMarketplace.sol/RWAMarketplace.json';

interface ContractAddresses {
  registry: string;
  factory: string;
  marketplace: string;
}

export class BlockchainService {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private contracts: {
    registry: ethers.Contract;
    factory: ethers.Contract;
    marketplace: ethers.Contract;
  };

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      process.env.SEPOLIA_RPC_URL
    );
    
    this.signer = new ethers.Wallet(
      process.env.PRIVATE_KEY!,
      this.provider
    );

    const addresses: ContractAddresses = {
      registry: process.env.RWA_ASSET_REGISTRY!,
      factory: process.env.RWA_TOKEN_FACTORY!,
      marketplace: process.env.RWA_MARKETPLACE!,
    };

    this.contracts = {
      registry: new ethers.Contract(
        addresses.registry,
        RWAAssetRegistryABI.abi,
        this.signer
      ),
      factory: new ethers.Contract(
        addresses.factory,
        RWATokenFactoryABI.abi,
        this.signer
      ),
      marketplace: new ethers.Contract(
        addresses.marketplace,
        RWAMarketplaceABI.abi,
        this.signer
      ),
    };
  }

  // === Asset Management ===
  
  async registerAsset(params: {
    owner: string;
    title: string;
    description: string;
    assetType: string;
    location: string;
    price: bigint;
    tokenPrice: bigint;
    totalTokens: bigint;
  }): Promise<{ assetId: bigint; txHash: string }> {
    const tx = await this.contracts.registry.registerAsset(
      params.owner,
      params.title,
      params.description,
      params.assetType,
      params.location,
      params.price,
      params.tokenPrice,
      params.totalTokens
    );

    const receipt = await tx.wait();
    
    // Parse event to get asset ID
    const event = receipt.logs.find(
      (log: any) => log.fragment?.name === 'AssetRegistered'
    );
    const assetId = event?.args?.assetId;

    return { assetId, txHash: receipt.hash };
  }

  async getAsset(assetId: bigint) {
    return await this.contracts.registry.getAsset(assetId);
  }

  async updateAssetStatus(assetId: bigint, status: number) {
    const tx = await this.contracts.registry.updateAssetStatus(
      assetId,
      status
    );
    return await tx.wait();
  }

  // === Token Management ===
  
  async createToken(params: {
    assetId: bigint;
    name: string;
    symbol: string;
    totalSupply: bigint;
    owner: string;
  }): Promise<{ tokenAddress: string; txHash: string }> {
    const tx = await this.contracts.factory.createToken(
      params.assetId,
      params.name,
      params.symbol,
      params.totalSupply,
      params.owner
    );

    const receipt = await tx.wait();
    
    // Parse event to get token address
    const event = receipt.logs.find(
      (log: any) => log.fragment?.name === 'TokenCreated'
    );
    const tokenAddress = event?.args?.tokenAddress;

    return { tokenAddress, txHash: receipt.hash };
  }

  async mintTokens(
    assetId: bigint,
    to: string,
    amount: bigint
  ) {
    const tx = await this.contracts.factory.mintTokens(
      assetId,
      to,
      amount
    );
    return await tx.wait();
  }

  async distributeDividends(assetId: bigint, amount: bigint) {
    const tx = await this.contracts.factory.distributeDividends(
      assetId,
      amount
    );
    return await tx.wait();
  }

  // === Event Listeners ===
  
  startEventListeners(systemUser: any) {
    const db = createClient(systemUser);

    // Listen for AssetRegistered events
    this.contracts.registry.on(
      'AssetRegistered',
      async (assetId, owner, assetType, event) => {
        console.log(`Asset Registered: ${assetId}`);
        
        try {
          const assetDetails = await this.getAsset(assetId);
          
          // Store in database
          await db.property.create({
            data: {
              blockchainAssetId: assetId.toString(),
              title: assetDetails.title,
              description: assetDetails.description,
              location: assetDetails.location,
              price: Number(assetDetails.price),
              tokenPrice: Number(assetDetails.tokenPrice),
              totalTokens: Number(assetDetails.totalTokens),
              availableTokens: Number(assetDetails.availableTokens),
              status: 'ACTIVE',
              propertyType: assetType,
              syncStatus: 'SYNCED',
              lastSyncedAt: new Date(),
              blockchainTxHash: event.log.transactionHash,
            },
          });
          
          console.log(`Asset ${assetId} synced to database`);
        } catch (error) {
          console.error(`Failed to sync asset ${assetId}:`, error);
        }
      }
    );

    // Listen for TokenCreated events
    this.contracts.factory.on(
      'TokenCreated',
      async (assetId, tokenAddress, name, symbol, totalSupply, event) => {
        console.log(`Token Created: ${tokenAddress} for Asset: ${assetId}`);
        
        try {
          await db.tokenizedAsset.create({
            data: {
              tokenAddress,
              assetId: assetId.toString(),
              name,
              symbol,
              totalSupply: totalSupply.toString(),
              network: 'SEPOLIA',
              chainId: 11155111,
              contractType: 'ERC20',
              dataStorage: 'HYBRID',
              syncStatus: 'SYNCED',
              lastSyncedAt: new Date(),
              blockchainTxHash: event.log.transactionHash,
            },
          });
          
          console.log(`Token ${tokenAddress} synced to database`);
        } catch (error) {
          console.error(`Failed to sync token ${tokenAddress}:`, error);
        }
      }
    );

    console.log('✅ Event listeners started');
  }

  stopEventListeners() {
    this.contracts.registry.removeAllListeners();
    this.contracts.factory.removeAllListeners();
    this.contracts.marketplace.removeAllListeners();
    
    console.log('🛑 Event listeners stopped');
  }
}

// Singleton instance
let blockchainService: BlockchainService | null = null;

export function getBlockchainService(): BlockchainService {
  if (!blockchainService) {
    blockchainService = new BlockchainService();
  }
  return blockchainService;
}
```

### 2. Create Synchronization Worker

Create `scripts/blockchain-sync-worker.ts`:

```typescript
import { getBlockchainService } from '@/lib/services/blockchain-service';
import { prisma } from '@/lib/prisma';

async function main() {
  console.log('🚀 Starting blockchain synchronization worker...');

  // System user for elevated privileges
  const systemUser = await prisma.user.findFirst({
    where: { role: 'ADMIN', email: { contains: 'system' } },
  });

  if (!systemUser) {
    throw new Error('System user not found');
  }

  const blockchain = getBlockchainService();
  
  // Start event listeners
  blockchain.startEventListeners(systemUser);

  // Keep process running
  process.on('SIGINT', () => {
    console.log('Stopping worker...');
    blockchain.stopEventListeners();
    process.exit(0);
  });

  console.log('✅ Worker started and listening for events');
}

main().catch((error) => {
  console.error('Worker error:', error);
  process.exit(1);
});
```

Add to `package.json`:

```json
{
  "scripts": {
    "blockchain:sync": "tsx scripts/blockchain-sync-worker.ts",
    "blockchain:sync:dev": "tsx watch scripts/blockchain-sync-worker.ts"
  }
}
```

---

## API Integration Layer

### 1. Create API Routes

Create `src/app/api/blockchain/register-asset/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/db';
import { getBlockchainService } from '@/lib/services/blockchain-service';
import { z } from 'zod';
import { parseEther, parseUnits } from 'ethers';

const registerAssetSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000),
  assetType: z.string().min(1),
  location: z.string().min(1),
  price: z.string(), // ETH amount
  tokenPrice: z.string(), // ETH amount
  totalTokens: z.string(), // Token count
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = registerAssetSchema.parse(body);

    const blockchain = getBlockchainService();
    const db = createClient(user);

    // Register on blockchain
    const { assetId, txHash } = await blockchain.registerAsset({
      owner: user.walletAddress || process.env.ADMIN_WALLET_ADDRESS!,
      title: validated.title,
      description: validated.description,
      assetType: validated.assetType,
      location: validated.location,
      price: parseEther(validated.price),
      tokenPrice: parseEther(validated.tokenPrice),
      totalTokens: BigInt(validated.totalTokens),
    });

    // Store in database (event listener will also store it, but we create placeholder)
    const property = await db.property.create({
      data: {
        blockchainAssetId: assetId.toString(),
        title: validated.title,
        description: validated.description,
        location: validated.location,
        price: Number(validated.price),
        tokenPrice: Number(validated.tokenPrice),
        totalTokens: Number(validated.totalTokens),
        availableTokens: Number(validated.totalTokens),
        status: 'PENDING',
        propertyType: validated.assetType,
        syncStatus: 'PENDING',
        blockchainTxHash: txHash,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        assetId: assetId.toString(),
        txHash,
        property,
      },
    });
  } catch (error) {
    console.error('Register asset error:', error);
    return NextResponse.json(
      { error: 'Failed to register asset' },
      { status: 500 }
    );
  }
}
```

Create `src/app/api/blockchain/create-token/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/db';
import { getBlockchainService } from '@/lib/services/blockchain-service';
import { z } from 'zod';

const createTokenSchema = z.object({
  assetId: z.string(),
  name: z.string().min(1),
  symbol: z.string().min(1).max(10),
  totalSupply: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = createTokenSchema.parse(body);

    const blockchain = getBlockchainService();
    const db = createClient(user);

    // Create token on blockchain
    const { tokenAddress, txHash } = await blockchain.createToken({
      assetId: BigInt(validated.assetId),
      name: validated.name,
      symbol: validated.symbol,
      totalSupply: BigInt(validated.totalSupply),
      owner: user.walletAddress || process.env.ADMIN_WALLET_ADDRESS!,
    });

    // Store in database
    const tokenizedAsset = await db.tokenizedAsset.create({
      data: {
        tokenAddress,
        assetId: validated.assetId,
        name: validated.name,
        symbol: validated.symbol,
        totalSupply: validated.totalSupply,
        network: 'SEPOLIA',
        chainId: 11155111,
        contractType: 'ERC20',
        dataStorage: 'HYBRID',
        syncStatus: 'SYNCED',
        lastSyncedAt: new Date(),
        blockchainTxHash: txHash,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        tokenAddress,
        txHash,
        tokenizedAsset,
      },
    });
  } catch (error) {
    console.error('Create token error:', error);
    return NextResponse.json(
      { error: 'Failed to create token' },
      { status: 500 }
    );
  }
}
```

### 2. Create Query API

Create `src/app/api/blockchain/asset/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getBlockchainService } from '@/lib/services/blockchain-service';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const params = await context.params;
    const assetId = BigInt(params.id);

    const blockchain = getBlockchainService();
    const asset = await blockchain.getAsset(assetId);

    return NextResponse.json({
      success: true,
      data: {
        id: asset.id.toString(),
        owner: asset.owner,
        title: asset.title,
        description: asset.description,
        assetType: asset.assetType,
        location: asset.location,
        price: asset.price.toString(),
        tokenPrice: asset.tokenPrice.toString(),
        totalTokens: asset.totalTokens.toString(),
        availableTokens: asset.availableTokens.toString(),
        soldTokens: asset.soldTokens.toString(),
        status: asset.status,
        createdAt: Number(asset.createdAt),
        updatedAt: Number(asset.updatedAt),
      },
    });
  } catch (error) {
    console.error('Get asset error:', error);
    return NextResponse.json(
      { error: 'Failed to get asset' },
      { status: 500 }
    );
  }
}
```

---

## Frontend Integration

### 1. Create Blockchain Store

Update `lib/store/blockchainStore.ts` with contract integration:

```typescript
import { create } from 'zustand';
import { ethers } from 'ethers';

interface BlockchainState {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  walletAddress: string | null;
  chainId: number | null;
  isConnected: boolean;
  
  // Actions
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  registerAsset: (params: any) => Promise<any>;
  createToken: (params: any) => Promise<any>;
  getAsset: (assetId: string) => Promise<any>;
}

export const useBlockchainStore = create<BlockchainState>((set, get) => ({
  provider: null,
  signer: null,
  walletAddress: null,
  chainId: null,
  isConnected: false,

  connectWallet: async () => {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('MetaMask not installed');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();

    set({
      provider,
      signer,
      walletAddress: address,
      chainId: Number(network.chainId),
      isConnected: true,
    });
  },

  disconnectWallet: () => {
    set({
      provider: null,
      signer: null,
      walletAddress: null,
      chainId: null,
      isConnected: false,
    });
  },

  registerAsset: async (params) => {
    const response = await fetch('/api/blockchain/register-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to register asset');
    }

    return await response.json();
  },

  createToken: async (params) => {
    const response = await fetch('/api/blockchain/create-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to create token');
    }

    return await response.json();
  },

  getAsset: async (assetId) => {
    const response = await fetch(`/api/blockchain/asset/${assetId}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Failed to get asset');
    }

    return await response.json();
  },
}));
```

### 2. Create Asset Registration Component

Create `src/components/admin/RegisterAssetForm.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { useBlockchainStore } from '@/lib/store/blockchainStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function RegisterAssetForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assetType: 'RESIDENTIAL',
    location: '',
    price: '',
    tokenPrice: '',
    totalTokens: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { registerAsset, isConnected, connectWallet } = useBlockchainStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      if (!isConnected) {
        await connectWallet();
      }

      const response = await registerAsset(formData);
      setResult(response.data);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        assetType: 'RESIDENTIAL',
        location: '',
        price: '',
        tokenPrice: '',
        totalTokens: '',
      });
    } catch (error) {
      console.error('Registration error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="price">Total Price (ETH)</Label>
          <Input
            id="price"
            type="number"
            step="0.001"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="tokenPrice">Token Price (ETH)</Label>
          <Input
            id="tokenPrice"
            type="number"
            step="0.001"
            value={formData.tokenPrice}
            onChange={(e) => setFormData({ ...formData, tokenPrice: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="totalTokens">Total Tokens</Label>
          <Input
            id="totalTokens"
            type="number"
            value={formData.totalTokens}
            onChange={(e) => setFormData({ ...formData, totalTokens: e.target.value })}
            required
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Registering...' : 'Register Asset on Blockchain'}
      </Button>

      {result && (
        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          {result.error ? (
            <p className="text-red-600">Error: {result.error}</p>
          ) : (
            <div>
              <p className="text-green-600">✅ Asset registered successfully!</p>
              <p className="mt-2">Asset ID: {result.assetId}</p>
              <p>Transaction: <a href={`https://sepolia.etherscan.io/tx/${result.txHash}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">{result.txHash.slice(0, 10)}...</a></p>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
```

---

## Security & Compliance

### 1. Access Control

```typescript
// lib/security/access-control.ts

export enum BlockchainRole {
  ADMIN = 'ADMIN',
  ASSET_MANAGER = 'ASSET_MANAGER',
  TOKEN_CREATOR = 'TOKEN_CREATOR',
  MARKETPLACE_OPERATOR = 'MARKETPLACE_OPERATOR',
}

export function checkBlockchainPermission(
  userRole: string,
  requiredRole: BlockchainRole
): boolean {
  const roleHierarchy = {
    ADMIN: 4,
    ASSET_MANAGER: 3,
    TOKEN_CREATOR: 2,
    MARKETPLACE_OPERATOR: 1,
  };

  const userLevel = roleHierarchy[userRole as BlockchainRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole];

  return userLevel >= requiredLevel;
}
```

### 2. Compliance Reporting

```typescript
// lib/compliance/reporting.ts

export async function generateComplianceReport(
  startDate: Date,
  endDate: Date
) {
  const db = createClient(systemUser);

  const transactions = await db.transaction.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      type: 'TOKEN_PURCHASE',
    },
    include: {
      user: true,
      property: true,
    },
  });

  return {
    period: { start: startDate, end: endDate },
    totalTransactions: transactions.length,
    totalVolume: transactions.reduce((sum, tx) => sum + tx.amount, 0),
    uniqueUsers: new Set(transactions.map(tx => tx.userId)).size,
    byAssetType: groupBy(transactions, tx => tx.property?.propertyType),
    flaggedTransactions: transactions.filter(tx => tx.amount > 10000),
  };
}
```

---

## Upgrade & Maintenance

### 1. Upgradeable Proxy Pattern

Create `smart-contracts/contracts/proxy/TransparentProxy.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract RWAProxy is TransparentUpgradeableProxy {
    constructor(
        address _logic,
        address admin_,
        bytes memory _data
    ) TransparentUpgradeableProxy(_logic, admin_, _data) {}
}
```

Update deployment script for upgradeable contracts:

```typescript
// scripts/deploy-upgradeable.ts

async function deployUpgradeable() {
  const Implementation = await ethers.getContractFactory("RWAAssetRegistry");
  const implementation = await Implementation.deploy();
  await implementation.waitForDeployment();

  const Proxy = await ethers.getContractFactory("RWAProxy");
  const proxy = await Proxy.deploy(
    await implementation.getAddress(),
    deployer.address,
    "0x" // initialization data
  );
  await proxy.waitForDeployment();

  console.log("Implementation:", await implementation.getAddress());
  console.log("Proxy:", await proxy.getAddress());
}
```

---

## Quick Start Commands

```bash
# 1. Setup Environment
cp .env.example .env
# Edit .env with your values

# 2. Install Dependencies
cd smart-contracts && bun install && cd ..
pnpm install

# 3. Compile Contracts
cd smart-contracts && bun run compile

# 4. Deploy to Sepolia
bun run deploy:sepolia

# 5. Start Sync Worker
pnpm blockchain:sync:dev

# 6. Start Backend
pnpm dev
```

---

## Monitoring & Maintenance

### Health Check Endpoint

```typescript
// src/app/api/blockchain/health/route.ts

export async function GET() {
  try {
    const blockchain = getBlockchainService();
    const provider = blockchain['provider'];
    
    const blockNumber = await provider.getBlockNumber();
    const network = await provider.getNetwork();

    return NextResponse.json({
      status: 'healthy',
      network: network.name,
      chainId: Number(network.chainId),
      blockNumber,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Next Steps

1. ✅ Compile contracts
2. ✅ Deploy to Sepolia
3. ✅ Start sync worker
4. ✅ Test asset registration
5. ✅ Test token creation
6. ✅ Implement frontend components
7. ✅ Add compliance reporting
8. ✅ Setup monitoring
9. ✅ Deploy to production

---

## Support

For issues or questions:
- Check logs: `pnpm blockchain:sync:dev`
- View transactions: https://sepolia.etherscan.io
- Test RPC: `curl $SEPOLIA_RPC_URL`


