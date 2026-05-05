# ZenStack v3 Blockchain Financial Reporting Setup Guide

## Quick Setup Prompt for AI Assistant

**Use this prompt to set up blockchain financial reporting with ZenStack v3:**

```
I need to set up blockchain financial reporting using ZenStack v3 ORM with Neon PostgreSQL and pgvector extension.

The system should support:
1. Daily blockchain data ingestion from Ethereum/Sepolia networks
2. Financial snapshots with treasury balances, revenue, fees, staking metrics
3. Actual vs projected cashflow comparison
4. Day-by-day trend analysis and progression tracking
5. RAG capabilities with vector embeddings for financial reports

Please:
1. Add blockchain financial reporting models to zenstack/schema.zmodel
2. Set up proper access control with @@allow rules
3. Create ZenStack v3 CRUD utility functions using createClient(user)
4. Provide TypeScript/Next.js API route examples using ZenStack v3 ORM patterns
5. Show how to handle vector embeddings with pgvector in ZenStack models

The contracts I'm tracking:
- RWAMarketplace (marketplace fees)
- RWAStaking (staking pools and rewards)
- RWARevenue (revenue distribution)
- RWATokenFactory (token creation)
- RWAAssetRegistry (asset management)
- Treasury (fee collection)

Networks: Ethereum Mainnet (chainId: 1) and Sepolia Testnet (chainId: 11155111)

⚠️ CRITICAL: Use ZenStack v3 ORM patterns:
- createClient(user) for all runtime operations
- Never use PrismaClient in runtime code
- Use ZenStack transactions for atomic operations
- Follow access control patterns with @@allow rules
```

---

## Step-by-Step Setup Instructions

### 1. Create Neon Database

1. Go to https://neon.tech and sign up/login
2. Create a new project
3. Copy your connection string (format: `postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`)
4. Save as `DATABASE_URL` in your `.env.local`

### 2. Enable Extensions

Connect to your Neon database and run:

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 3. Add Models to ZenStack Schema

Add these models to `zenstack/schema.zmodel`:

```zmodel
// Blockchain Network Configuration
model BlockchainNetwork {
  id                String   @id @default(cuid())
  chainId           Int      @unique
  name              String   // "Sepolia", "Mainnet", "Hardhat Local"
  displayName       String   // "Ethereum Sepolia Testnet"
  isTestnet         Boolean  @default(true)
  isActive          Boolean  @default(true)
  
  // RPC Configuration
  primaryRpcUrl     String
  fallbackRpcUrls   Json     @default("[]") // Array of backup RPCs
  wssUrl            String?  // WebSocket URL
  
  // Explorer Configuration
  explorerUrl       String   // "https://sepolia.etherscan.io"
  explorerApiKey    String?  // For verification
  
  // Network Details
  nativeCurrency    Json     // {name, symbol, decimals}
  blockTime         Int      @default(12) // Average block time in seconds
  
  // Relations
  contracts         DeployedContract[]
  dailySnapshots    DailyFinancialSnapshot[]
  projections       DailyFinancialProjection[]
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@allow('read', auth() != null)
  @@allow('all', auth() != null && auth().role == ADMIN)
  @@map("blockchain_networks")
}

// Deployed Contract Registry
model DeployedContract {
  id                String   @id @default(cuid())
  networkId         String
  network           BlockchainNetwork @relation(fields: [networkId], references: [id])
  
  contractType      String   // "MARKETPLACE", "STAKING", "REVENUE", "TOKEN_FACTORY", "ASSET_REGISTRY", "TREASURY"
  contractName      String   // "RWAMarketplace", "RWAStaking"
  contractAddress   String
  
  // Proxy Configuration (for upgradeable contracts)
  isUpgradeable     Boolean  @default(true)
  proxyType         String?  // "TRANSPARENT", "UUPS"
  implementationAddress String?
  proxyAdminAddress String?
  
  // Deployment Info
  deployedBy        String   // Admin wallet address
  deploymentTx      String
  deploymentBlock   BigInt
  deployedAt        DateTime
  
  // Status
  isActive          Boolean  @default(true)
  isVerified        Boolean  @default(false)
  verifiedAt        DateTime?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([networkId, contractType])
  @@index([contractAddress])
  @@allow('read', auth() != null)
  @@allow('all', auth() != null && auth().role == ADMIN)
  @@map("deployed_contracts")
}

// Daily Financial Snapshots
model DailyFinancialSnapshot {
  id                        String   @id @default(cuid())
  networkId                 String
  network                   BlockchainNetwork @relation(fields: [networkId], references: [id])
  
  snapshotDate              DateTime @db.Date
  
  // Treasury Metrics
  treasuryBalanceEth        Decimal  @db.Decimal(18, 8) @default(0)
  treasuryBalanceUsd        Decimal? @db.Decimal(18, 2)
  
  // Revenue Metrics
  dailyRevenueDistributed   Decimal  @db.Decimal(18, 8) @default(0)
  cumulativeRevenue         Decimal  @db.Decimal(18, 8) @default(0)
  
  // Marketplace Metrics
  marketplaceDailyFeesEth   Decimal  @db.Decimal(18, 8) @default(0)
  marketplaceTotalFees      Decimal  @db.Decimal(18, 8) @default(0)
  marketplaceTransactions   Int      @default(0)
  
  // Staking Metrics
  totalStaked              Decimal  @db.Decimal(18, 8) @default(0)
  activeStakingPools        Int      @default(0)
  totalStakers              Int      @default(0)
  dailyStakingRewards       Decimal  @db.Decimal(18, 8) @default(0)
  
  // Token Metrics
  totalTokensCreated        Int      @default(0)
  totalTokensMinted         Decimal  @db.Decimal(18, 8) @default(0)
  totalTokensBurned         Decimal  @db.Decimal(18, 8) @default(0)
  
  // Asset Metrics
  totalAssetsRegistered     Int      @default(0)
  totalAssetValue           Decimal  @db.Decimal(18, 8) @default(0)
  
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  
  @@unique([networkId, snapshotDate])
  @@index([networkId, snapshotDate])
  @@index([snapshotDate])
  @@allow('read', auth() != null)
  @@allow('create,update', auth() != null && auth().role == ADMIN)
  @@map("daily_financial_snapshots")
}

// Daily Financial Projections
model DailyFinancialProjection {
  id                        String   @id @default(cuid())
  networkId                 String
  network                   BlockchainNetwork @relation(fields: [networkId], references: [id])
  
  projectionDate            DateTime @db.Date
  projectionType            String   // "CONSERVATIVE", "MODERATE", "OPTIMISTIC"
  
  // Projected Metrics
  projectedRevenue          Decimal  @db.Decimal(18, 8)
  projectedFees             Decimal  @db.Decimal(18, 8)
  projectedStaking          Decimal  @db.Decimal(18, 8)
  
  // Assumptions
  assumptions               Json?    // Projection assumptions and parameters
  
  createdBy                 String
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  
  @@unique([networkId, projectionDate, projectionType])
  @@index([networkId, projectionDate])
  @@allow('read', auth() != null)
  @@allow('create,update', auth() != null && auth().role == ADMIN)
  @@map("daily_financial_projections")
}

// Financial Reports with Vector Embeddings
model FinancialReport {
  id                        String   @id @default(cuid())
  networkId                 String
  
  reportDate                DateTime @db.Date
  reportType                String   // "daily", "weekly", "monthly"
  reportTitle               String
  reportContent             String   @db.Text
  executiveSummary          String   @db.Text
  
  // Vector Embedding for RAG (pgvector)
  contentEmbedding          Unsupported("vector(1536)")? // OpenAI embedding dimension
  
  // Metadata
  generatedBy               String   @default("automated")
  tags                      String[] @default([])
  
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
  
  @@index([networkId, reportDate])
  @@index([reportType])
  @@allow('read', auth() != null)
  @@allow('create,update', auth() != null && auth().role == ADMIN)
  @@map("financial_reports")
}

// Daily Progression Metrics
model DailyProgressionMetric {
  id                        String   @id @default(cuid())
  networkId                 String
  
  snapshotDate              DateTime @db.Date
  metricName                String   // "treasury_balance", "revenue", "staking"
  metricValue               Decimal  @db.Decimal(18, 8)
  previousValue             Decimal? @db.Decimal(18, 8)
  dayOverDayChange          Decimal? @db.Decimal(18, 8)
  dayOverDayChangePct       Decimal? @db.Decimal(10, 4)
  
  createdAt                 DateTime @default(now())
  
  @@unique([networkId, snapshotDate, metricName])
  @@index([networkId, snapshotDate])
  @@allow('read', auth() != null)
  @@allow('create,update', auth() != null && auth().role == ADMIN)
  @@map("daily_progression_metrics")
}

// Cashflow Performance Analysis
model CashflowPerformanceAnalysis {
  id                        String   @id @default(cuid())
  networkId                 String
  
  snapshotDate              DateTime @db.Date
  
  // Actual vs Projected
  actualRevenue             Decimal  @db.Decimal(18, 8)
  projectedRevenue          Decimal  @db.Decimal(18, 8)
  revenueVariance           Decimal  @db.Decimal(18, 8)
  revenueVariancePct       Decimal  @db.Decimal(10, 4)
  
  actualFees                Decimal  @db.Decimal(18, 8)
  projectedFees             Decimal  @db.Decimal(18, 8)
  feesVariance              Decimal  @db.Decimal(18, 8)
  feesVariancePct           Decimal  @db.Decimal(10, 4)
  
  createdAt                 DateTime @default(now())
  
  @@unique([networkId, snapshotDate])
  @@index([networkId, snapshotDate])
  @@allow('read', auth() != null)
  @@allow('create,update', auth() != null && auth().role == ADMIN)
  @@map("cashflow_performance_analysis")
}
```

### 4. Generate ZenStack Code

After adding models to schema:

```bash
# Generate ZenStack client code
bun run zen:generate

# Push schema to database
bun run db:push
```

### 5. Insert Initial Network Data

Create a seed script using ZenStack:

```typescript
// scripts/seed-blockchain-networks.ts
import 'dotenv/config';
import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';

async function seedNetworks() {
  const systemUser = await getSystemUser();
  const db = createClient(systemUser);
  
  // Insert networks
  await db.blockchainNetwork.upsert({
    where: { chainId: 1 },
    create: {
      chainId: 1,
      name: 'mainnet',
      displayName: 'Ethereum Mainnet',
      isTestnet: false,
      isActive: true,
      primaryRpcUrl: process.env.ETHEREUM_RPC_URL || '',
      explorerUrl: 'https://etherscan.io',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      blockTime: 12,
    },
    update: {},
  });
  
  await db.blockchainNetwork.upsert({
    where: { chainId: 11155111 },
    create: {
      chainId: 11155111,
      name: 'sepolia',
      displayName: 'Ethereum Sepolia Testnet',
      isTestnet: true,
      isActive: true,
      primaryRpcUrl: process.env.SEPOLIA_RPC_URL || '',
      explorerUrl: 'https://sepolia.etherscan.io',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      blockTime: 12,
    },
    update: {},
  });
  
  console.log('✅ Blockchain networks seeded');
}

seedNetworks().catch(console.error);
```

---

## ZenStack v3 CRUD Utility Functions

### Create Database Client Utility

```typescript
// lib/utils/blockchain-db.ts
import { createClient } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSystemUser } from '@/lib/utils/system-user';
import { NextRequest } from 'next/server';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Get ZenStack client with user context for blockchain operations
 * ⚠️ CRITICAL: Always use createClient(user) for runtime operations
 */
export async function getBlockchainDb(user?: any) {
  if (!user) {
    // For system operations (cron jobs, webhooks)
    const systemUser = await getSystemUser();
    return createClient(systemUser);
  }
  return createClient(user);
}

/**
 * Get blockchain database client from request context
 */
export async function getBlockchainDbFromRequest(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return createClient(user);
}
```

### Daily Snapshot Ingestion with ZenStack

```typescript
// scripts/ingest-daily-snapshot.ts
import 'dotenv/config';
import { ethers } from 'ethers';
import { getBlockchainDb } from '@/lib/utils/blockchain-db';
import { getSystemUser } from '@/lib/utils/system-user';
import { Decimal } from '@prisma/client/runtime/library';

interface ContractState {
  treasuryBalance: bigint;
  dailyFees: bigint;
  dailyRevenue: bigint;
  // ... other contract states
}

async function fetchContractState(
  provider: ethers.Provider,
  contractAddress: string,
  abi: any[]
): Promise<ContractState> {
  const contract = new ethers.Contract(contractAddress, abi, provider);
  // Fetch contract state
  return {
    treasuryBalance: await contract.getBalance(),
    dailyFees: BigInt(0), // Calculate from events
    dailyRevenue: BigInt(0), // Calculate from events
  };
}

async function ingestDailySnapshot(
  networkId: string,
  date: Date = new Date()
): Promise<void> {
  const snapshotDate = date.toISOString().split('T')[0];
  
  // Get system user for admin operations
  const systemUser = await getSystemUser();
  const db = getBlockchainDb(systemUser);
  
  // 1. Get network and contracts
  const network = await db.blockchainNetwork.findUnique({
    where: { id: networkId },
    include: { contracts: { where: { isActive: true } } },
  });
  
  if (!network) {
    throw new Error(`Network ${networkId} not found`);
  }
  
  // 2. Fetch blockchain data
  const provider = new ethers.JsonRpcProvider(
    network.primaryRpcUrl
  );
  
  const contractStates: Record<string, ContractState> = {};
  for (const contract of network.contracts) {
    // Fetch state for each contract
    // contractStates[contract.contractType] = await fetchContractState(...)
  }
  
  // 3. Calculate daily metrics
  const treasuryBalanceEth = new Decimal(contractStates['TREASURY']?.treasuryBalance.toString() || '0')
    .div(1e18);
  const marketplaceDailyFeesEth = new Decimal(contractStates['MARKETPLACE']?.dailyFees.toString() || '0')
    .div(1e18);
  const dailyRevenueDistributed = new Decimal(contractStates['REVENUE']?.dailyRevenue.toString() || '0')
    .div(1e18);
  
  // 4. Upsert snapshot using ZenStack
  await db.dailyFinancialSnapshot.upsert({
    where: {
      networkId_snapshotDate: {
        networkId: network.id,
        snapshotDate: new Date(snapshotDate),
      },
    },
    create: {
      networkId: network.id,
      snapshotDate: new Date(snapshotDate),
      treasuryBalanceEth: treasuryBalanceEth.toNumber() as any,
      marketplaceDailyFeesEth: marketplaceDailyFeesEth.toNumber() as any,
      dailyRevenueDistributed: dailyRevenueDistributed.toNumber() as any,
      // ... other fields
    },
    update: {
      treasuryBalanceEth: treasuryBalanceEth.toNumber() as any,
      marketplaceDailyFeesEth: marketplaceDailyFeesEth.toNumber() as any,
      dailyRevenueDistributed: dailyRevenueDistributed.toNumber() as any,
      updatedAt: new Date(),
    },
  });
  
  // 5. Calculate progression metrics using ZenStack transaction
  await db.$transaction(async (tx) => {
    const previousSnapshot = await tx.dailyFinancialSnapshot.findFirst({
      where: {
        networkId: network.id,
        snapshotDate: { lt: new Date(snapshotDate) },
      },
      orderBy: { snapshotDate: 'desc' },
    });
    
    if (previousSnapshot) {
      const treasuryChange = treasuryBalanceEth.minus(previousSnapshot.treasuryBalanceEth);
      const treasuryChangePct = previousSnapshot.treasuryBalanceEth.gt(0)
        ? treasuryChange.div(previousSnapshot.treasuryBalanceEth).times(100)
        : new Decimal(0);
      
      await tx.dailyProgressionMetric.upsert({
        where: {
          networkId_snapshotDate_metricName: {
            networkId: network.id,
            snapshotDate: new Date(snapshotDate),
            metricName: 'treasury_balance',
          },
        },
        create: {
          networkId: network.id,
          snapshotDate: new Date(snapshotDate),
          metricName: 'treasury_balance',
          metricValue: treasuryBalanceEth.toNumber() as any,
          previousValue: previousSnapshot.treasuryBalanceEth.toNumber() as any,
          dayOverDayChange: treasuryChange.toNumber() as any,
          dayOverDayChangePct: treasuryChangePct.toNumber() as any,
        },
        update: {
          metricValue: treasuryBalanceEth.toNumber() as any,
          previousValue: previousSnapshot.treasuryBalanceEth.toNumber() as any,
          dayOverDayChange: treasuryChange.toNumber() as any,
          dayOverDayChangePct: treasuryChangePct.toNumber() as any,
        },
      });
    }
  });
  
  // 6. Compare with projections
  const projection = await db.dailyFinancialProjection.findFirst({
    where: {
      networkId: network.id,
      projectionDate: new Date(snapshotDate),
    },
    orderBy: { createdAt: 'desc' },
  });
  
  if (projection) {
    const revenueVariance = dailyRevenueDistributed.minus(projection.projectedRevenue);
    const revenueVariancePct = projection.projectedRevenue.gt(0)
      ? revenueVariance.div(projection.projectedRevenue).times(100)
      : new Decimal(0);
    
    await db.cashflowPerformanceAnalysis.upsert({
      where: {
        networkId_snapshotDate: {
          networkId: network.id,
          snapshotDate: new Date(snapshotDate),
        },
      },
      create: {
        networkId: network.id,
        snapshotDate: new Date(snapshotDate),
        actualRevenue: dailyRevenueDistributed.toNumber() as any,
        projectedRevenue: projection.projectedRevenue.toNumber() as any,
        revenueVariance: revenueVariance.toNumber() as any,
        revenueVariancePct: revenueVariancePct.toNumber() as any,
        // ... other fields
      },
      update: {
        actualRevenue: dailyRevenueDistributed.toNumber() as any,
        projectedRevenue: projection.projectedRevenue.toNumber() as any,
        revenueVariance: revenueVariance.toNumber() as any,
        revenueVariancePct: revenueVariancePct.toNumber() as any,
      },
    });
  }
  
  console.log(`✅ Daily snapshot ingested for ${snapshotDate}`);
}

// Run ingestion
if (require.main === module) {
  const networkId = process.argv[2] || 'sepolia-network-id'; // Use actual network ID
  ingestDailySnapshot(networkId)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}
```

### Generate Financial Report with Embedding

```typescript
// scripts/generate-financial-report.ts
import 'dotenv/config';
import { getBlockchainDb } from '@/lib/utils/blockchain-db';
import { getSystemUser } from '@/lib/utils/system-user';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateFinancialReport(
  networkId: string,
  reportDate: Date
): Promise<void> {
  const dateStr = reportDate.toISOString().split('T')[0];
  
  const systemUser = await getSystemUser();
  const db = getBlockchainDb(systemUser);
  
  // 1. Fetch snapshot data using ZenStack
  const snapshot = await db.dailyFinancialSnapshot.findUnique({
    where: {
      networkId_snapshotDate: {
        networkId,
        snapshotDate: new Date(dateStr),
      },
    },
  });
  
  if (!snapshot) {
    throw new Error(`No snapshot found for ${dateStr}`);
  }
  
  // 2. Fetch progression metrics
  const progression = await db.dailyProgressionMetric.findMany({
    where: {
      networkId,
      snapshotDate: new Date(dateStr),
    },
  });
  
  // 3. Fetch actual vs projected comparison
  const comparison = await db.cashflowPerformanceAnalysis.findUnique({
    where: {
      networkId_snapshotDate: {
        networkId,
        snapshotDate: new Date(dateStr),
      },
    },
  });
  
  // 4. Generate report content
  const reportContent = `
    Daily Financial Report - ${dateStr}
    
    Treasury Balance: ${snapshot.treasuryBalanceEth} ETH
    Daily Revenue: ${snapshot.dailyRevenueDistributed} ETH
    Marketplace Fees: ${snapshot.marketplaceDailyFeesEth} ETH
    
    Trends:
    ${progression.map(p => `- ${p.metricName}: ${p.dayOverDayChangePct}% change`).join('\n')}
    
    Performance vs Projections:
    ${comparison ? `Revenue variance: ${comparison.revenueVariancePct}%` : 'No projections available'}
  `;
  
  // 5. Generate embeddings
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: reportContent,
  });
  
  const embedding = embeddingResponse.data[0].embedding;
  
  // 6. Insert report using ZenStack
  // Note: Vector embeddings require raw SQL for pgvector, but we can store JSON
  // For full pgvector support, use a hybrid approach with raw SQL for vector operations
  await db.financialReport.create({
    data: {
      networkId,
      reportDate: new Date(dateStr),
      reportType: 'daily',
      reportTitle: `Daily Financial Report - ${dateStr}`,
      reportContent,
      executiveSummary: reportContent.substring(0, 500),
      // contentEmbedding will need raw SQL for pgvector insertion
      generatedBy: 'automated',
    },
  });
  
  // For vector embedding, use raw SQL (hybrid approach)
  // This is acceptable for specialized operations like vector search
  const { sql } = await import('@/lib/db');
  await sql`
    UPDATE financial_reports
    SET content_embedding = ${JSON.stringify(embedding)}::vector
    WHERE id = ${reportId}
  `;
  
  console.log(`✅ Financial report generated for ${dateStr}`);
}
```

---

## Next.js API Routes with ZenStack v3

### API Route: Get Daily Trends

```typescript
// app/api/blockchain/trends/daily/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainDbFromRequest } from '@/lib/utils/blockchain-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const networkId = searchParams.get('networkId');
    const days = parseInt(searchParams.get('days') || '30');
    
    if (!networkId) {
      return NextResponse.json({ error: 'networkId required' }, { status: 400 });
    }
    
    const db = await getBlockchainDbFromRequest(request);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Fetch snapshots using ZenStack
    const snapshots = await db.dailyFinancialSnapshot.findMany({
      where: {
        networkId,
        snapshotDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { snapshotDate: 'desc' },
    });
    
    // Calculate trends
    const trends = snapshots.map((snapshot, index) => {
      const previous = index < snapshots.length - 1 ? snapshots[index + 1] : null;
      return {
        date: snapshot.snapshotDate,
        treasuryBalance: snapshot.treasuryBalanceEth,
        dailyRevenue: snapshot.dailyRevenueDistributed,
        marketplaceFees: snapshot.marketplaceDailyFeesEth,
        treasuryChange: previous
          ? snapshot.treasuryBalanceEth - previous.treasuryBalanceEth
          : null,
      };
    });
    
    return NextResponse.json({ trends });
  } catch (error) {
    console.error('Error fetching trends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trends' },
      { status: 500 }
    );
  }
}
```

### API Route: RAG Query (Hybrid Approach)

```typescript
// app/api/blockchain/rag/query/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainDbFromRequest } from '@/lib/utils/blockchain-db';
import { OpenAI } from 'openai';
import { sql } from '@/lib/db'; // Raw SQL for vector operations

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    
    // 1. Generate query embedding
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });
    
    const queryEmbedding = JSON.stringify(embeddingResponse.data[0].embedding);
    
    // 2. Find similar reports using raw SQL for vector search
    // This is acceptable for specialized pgvector operations
    const similarReports = await sql`
      SELECT 
        id,
        report_title,
        report_date,
        executive_summary,
        report_content,
        1 - (content_embedding <=> ${queryEmbedding}::vector) AS similarity
      FROM financial_reports
      WHERE 1 - (content_embedding <=> ${queryEmbedding}::vector) > 0.7
      ORDER BY content_embedding <=> ${queryEmbedding}::vector
      LIMIT 5
    `;
    
    // 3. Generate RAG response
    const context = similarReports
      .map((r: any) => r.report_content)
      .join('\n\n');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a blockchain financial analyst. Answer questions based on the provided financial reports.',
        },
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${query}`,
        },
      ],
    });
    
    return NextResponse.json({
      answer: completion.choices[0].message.content,
      sources: similarReports.map((r: any) => ({
        id: r.id,
        title: r.report_title,
        date: r.report_date,
        similarity: r.similarity,
      })),
    });
  } catch (error) {
    console.error('RAG query error:', error);
    return NextResponse.json(
      { error: 'Failed to process RAG query' },
      { status: 500 }
    );
  }
}
```

### API Route: Actual vs Projected

```typescript
// app/api/blockchain/performance/comparison/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainDbFromRequest } from '@/lib/utils/blockchain-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const networkId = searchParams.get('networkId');
    const days = parseInt(searchParams.get('days') || '7');
    
    if (!networkId) {
      return NextResponse.json({ error: 'networkId required' }, { status: 400 });
    }
    
    const db = await getBlockchainDbFromRequest(request);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Fetch comparisons using ZenStack
    const comparisons = await db.cashflowPerformanceAnalysis.findMany({
      where: {
        networkId,
        snapshotDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { snapshotDate: 'desc' },
    });
    
    return NextResponse.json({ comparisons });
  } catch (error) {
    console.error('Error fetching comparison:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comparison' },
      { status: 500 }
    );
  }
}
```

---

## Scheduled Daily Ingestion

### Vercel Cron Job

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/blockchain/daily-ingestion",
      "schedule": "0 1 * * *"
    }
  ]
}
```

### Cron API Route

```typescript
// app/api/cron/blockchain/daily-ingestion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ingestDailySnapshot } from '@/scripts/ingest-daily-snapshot';
import { generateFinancialReport } from '@/scripts/generate-financial-report';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    const networkId = 'sepolia-network-id'; // Use actual network ID
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Ingest snapshot
    await ingestDailySnapshot(networkId, yesterday);
    
    // Generate report
    await generateFinancialReport(networkId, yesterday);
    
    return NextResponse.json({ 
      success: true, 
      date: yesterday.toISOString().split('T')[0] 
    });
  } catch (error) {
    console.error('Daily ingestion error:', error);
    return NextResponse.json(
      { error: 'Ingestion failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

---

## Environment Variables Template

```env
# Database
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname?sslmode=require

# OpenAI
OPENAI_API_KEY=sk-...

# Blockchain RPC
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Cron Secret
CRON_SECRET=your-secret-key-here

# Network IDs
MAINNET_CHAIN_ID=1
SEPOLIA_CHAIN_ID=11155111
```

---

## Testing the Setup

### 1. Test Database Connection

```typescript
// scripts/test-blockchain-db.ts
import 'dotenv/config';
import { createClient } from '@/lib/db';
import { getSystemUser } from '@/lib/utils/system-user';

async function testConnection() {
  try {
    const systemUser = await getSystemUser();
    const db = createClient(systemUser);
    
    // Test query using ZenStack
    const networks = await db.blockchainNetwork.findMany({
      take: 1,
    });
    
    console.log('✅ Database connected via ZenStack');
    console.log('Networks found:', networks.length);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

testConnection();
```

### 2. Test Vector Search

```typescript
// scripts/test-vector-search.ts
import 'dotenv/config';
import { sql } from '@/lib/db';
import { OpenAI } from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testVectorSearch() {
  const query = 'What was the treasury balance yesterday?';
  
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: query,
  });
  
  const embedding = JSON.stringify(embeddingResponse.data[0].embedding);
  
  // Use raw SQL for vector search (hybrid approach)
  const results = await sql`
    SELECT 
      id,
      report_title,
      1 - (content_embedding <=> ${embedding}::vector) AS similarity
    FROM financial_reports
    ORDER BY content_embedding <=> ${embedding}::vector
    LIMIT 5
  `;
  
  console.log('Search results:', results);
}

testVectorSearch();
```

---

## Key ZenStack v3 Patterns Used

### ✅ CORRECT Patterns

1. **Always use `createClient(user)` for runtime operations**
   ```typescript
   const db = createClient(user); // With user context
   ```

2. **Use ZenStack transactions for atomic operations**
   ```typescript
   await db.$transaction(async (tx) => {
     // Multiple operations
   });
   ```

3. **Use ZenStack CRUD methods**
   ```typescript
   await db.dailyFinancialSnapshot.findMany({ where: {...} });
   await db.dailyFinancialSnapshot.upsert({ where: {...}, create: {...}, update: {...} });
   ```

4. **Hybrid approach for specialized operations**
   - Use ZenStack for standard CRUD
   - Use raw SQL only for pgvector operations (vector search)

### ❌ WRONG Patterns

1. **Never use PrismaClient in runtime**
   ```typescript
   // ❌ WRONG
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();
   ```

2. **Never bypass user context**
   ```typescript
   // ❌ WRONG - Bypasses access control
   const db = createClient(); // Missing user context
   ```

3. **Never use raw SQL for standard operations**
   ```typescript
   // ❌ WRONG - Use ZenStack instead
   await sql`SELECT * FROM daily_financial_snapshots`;
   ```

---

## Monitoring and Maintenance

### Daily Checklist

- [ ] Verify daily snapshot was ingested
- [ ] Check for failed transactions
- [ ] Verify embeddings were generated
- [ ] Review actual vs projected variance
- [ ] Check database performance metrics

### Weekly Tasks

- [ ] Review and optimize slow queries
- [ ] Update projection models if needed
- [ ] Archive old data (if implementing retention policy)
- [ ] Review and update contract addresses

### Monthly Tasks

- [ ] Analyze query performance
- [ ] Optimize indexes
- [ ] Review and update schema if needed
- [ ] Backup database

---

This setup provides a complete foundation for blockchain financial reporting with RAG capabilities using ZenStack v3 ORM patterns!
