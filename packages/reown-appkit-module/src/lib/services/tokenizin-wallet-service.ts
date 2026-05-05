/**
 * Tiger Wallet Service
 * 
 * Service for formatting and aggregating Tiger wallet data
 */

import { Address } from 'viem';

export interface TokenizinWalletBalance {
  eth: string;
  usdc: string;
  eurc: string;
  tpt: string;
  totalUSDValue: string;
}

export interface TokenizinWalletToken {
  assetId: string;
  tokenAddress: Address;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  symbol: string;
  title?: string;
  imageUrl?: string;
  propertyId?: string;
  tokenPrice?: string;
  totalTokens?: string;
  availableTokens?: string;
  usdValue?: string;
}

export interface TigerWalletProperty {
  assetId: string;
  tokenAddress: Address;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  symbol: string;
  title?: string;
  imageUrl?: string;
  propertyId?: string;
  tokenPrice?: string;
  totalTokens?: string;
  availableTokens?: string;
  ownershipPercentage?: string;
  usdValue?: string;
  metadata?: {
    location?: string;
    assetType?: string;
    price?: string;
  };
}

export interface TigerWalletTransaction {
  id: string;
  hash: string;
  from: Address;
  to: Address;
  value: string;
  tokenAddress?: Address;
  tokenSymbol?: string;
  functionName?: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber?: number;
  blockHash?: string;
  gasUsed?: string;
  gasPrice?: string;
  isSponsored: boolean;
  paymasterAddress?: Address;
  timestamp: Date | string;
  accountType: 'eoa' | 'smart';
  metadata?: Record<string, any>;
}

/**
 * Format balance data for Tiger wallet display
 */
export function formatTokenizinWalletBalance(data: any): TokenizinWalletBalance {
  return {
    eth: data.balances?.eth || '0',
    usdc: data.balances?.usdc || '0',
    eurc: data.balances?.eurc || '0',
    tpt: data.balances?.tpt || '0',
    totalUSDValue: data.balances?.totalUSDValue || '0',
  };
}

/**
 * Format token data for Tiger wallet display
 */
export function formatTokenizinWalletTokens(data: any): TokenizinWalletToken[] {
  if (!data.tokens || !Array.isArray(data.tokens)) {
    return [];
  }

  return data.tokens.map((token: any) => ({
    assetId: token.assetId || token.id,
    tokenAddress: token.tokenAddress,
    balance: token.balance || '0',
    balanceFormatted: token.balanceFormatted || '0',
    decimals: token.decimals || 18,
    symbol: token.symbol || 'TKNZN',
    title: token.title,
    imageUrl: token.imageUrl,
    propertyId: token.propertyId,
    tokenPrice: token.tokenPrice,
    totalTokens: token.totalTokens,
    availableTokens: token.availableTokens,
    usdValue: token.usdValue,
  }));
}

/**
 * Format property data for Tiger wallet display
 */
export function formatTigerWalletProperties(data: any): TigerWalletProperty[] {
  if (!data.properties || !Array.isArray(data.properties)) {
    return [];
  }

  return data.properties.map((property: any) => ({
    assetId: property.assetId || property.id,
    tokenAddress: property.tokenAddress,
    balance: property.balance || '0',
    balanceFormatted: property.balanceFormatted || '0',
    decimals: property.decimals || 18,
    symbol: property.symbol || 'TKNZN',
    title: property.title,
    imageUrl: property.imageUrl,
    propertyId: property.propertyId,
    tokenPrice: property.tokenPrice,
    totalTokens: property.totalTokens,
    availableTokens: property.availableTokens,
    ownershipPercentage: property.ownershipPercentage,
    usdValue: property.usdValue,
    metadata: property.metadata,
  }));
}

/**
 * Format transaction data for Tiger wallet display
 */
export function formatTigerWalletTransactions(data: any): TigerWalletTransaction[] {
  if (!data.transactions || !Array.isArray(data.transactions)) {
    return [];
  }

  return data.transactions.map((tx: any) => ({
    id: tx.id || tx.hash,
    hash: tx.hash || tx.transactionHash || tx.id,
    from: tx.from,
    to: tx.to,
    value: tx.value || '0',
    tokenAddress: tx.tokenAddress,
    tokenSymbol: tx.tokenSymbol,
    functionName: tx.functionName,
    status: (tx.status || 'pending') as 'pending' | 'confirmed' | 'failed',
    blockNumber: tx.blockNumber,
    blockHash: tx.blockHash,
    gasUsed: tx.gasUsed,
    gasPrice: tx.gasPrice,
    isSponsored: tx.isSponsored || false,
    paymasterAddress: tx.paymasterAddress,
    timestamp: tx.timestamp ? new Date(tx.timestamp) : new Date(),
    accountType: (tx.accountType || 'eoa') as 'eoa' | 'smart',
    metadata: tx.metadata,
  }));
}

/**
 * Fetch Tiger wallet data from API
 */
export async function fetchTigerWalletData(address?: Address) {
  const baseUrl = '/api/tokenizin-wallet';
  const addressParam = address ? `?address=${address}` : '';

  try {
    const [balancesRes, tokensRes, propertiesRes, transactionsRes] = await Promise.all([
      fetch(`${baseUrl}/balances${addressParam}`, { credentials: 'include' }),
      fetch(`${baseUrl}/tokens${addressParam}`, { credentials: 'include' }),
      fetch(`${baseUrl}/properties${addressParam}`, { credentials: 'include' }),
      fetch(`${baseUrl}/transactions${addressParam}&limit=50&includePending=true`, { credentials: 'include' }),
    ]);

    const [balances, tokens, properties, transactions] = await Promise.all([
      balancesRes.json().catch(() => ({ success: false, balances: null })),
      tokensRes.json().catch(() => ({ success: false, tokens: [] })),
      propertiesRes.json().catch(() => ({ success: false, properties: [] })),
      transactionsRes.json().catch(() => ({ success: false, transactions: [], pendingTransactions: [] })),
    ]);

    return {
      balances: balances.success ? formatTokenizinWalletBalance(balances) : null,
      tokens: tokens.success ? formatTokenizinWalletTokens(tokens) : [],
      properties: properties.success ? formatTigerWalletProperties(properties) : [],
      transactions: transactions.success ? formatTigerWalletTransactions(transactions) : [],
      pendingTransactions: transactions.success ? formatTigerWalletTransactions(transactions.pendingTransactions || []) : [],
      network: balances.network || transactions.network || null,
    };
  } catch (error) {
    console.error('Error fetching Tokenizin wallet data:', error);
    return {
      balances: null,
      tokens: [],
      properties: [],
      transactions: [],
      pendingTransactions: [],
      network: null,
    };
  }
}

