/**
 * Tokenizin RWA Wallet Types
 * 
 * Type definitions for the Tokenizin RWA Wallet component
 */

import { Address } from 'viem';

/**
 * Account Types
 */
export type AccountType = 'eoa' | 'social' | 'smart';

/**
 * Token Configuration
 */
export interface TokenConfig {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
  type: 'native' | 'erc20' | 'erc404';
}

/**
 * Token Balance
 */
export interface TokenBalance {
  token: TokenConfig;
  balance: string;
  balanceFormatted: string;
  usdValue?: number;
  accountAddress: Address;
  accountType: AccountType;
}

/**
 * ERC404 Property Token
 */
export interface ERC404PropertyToken {
  assetId: string;
  tokenAddress: Address;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  symbol?: string;
  // Property metadata
  title?: string;
  imageUrl?: string;
  propertyId?: string;
  tokenPrice?: string;
  totalTokens?: string;
  availableTokens?: string;
}

/**
 * Contract Addresses
 */
export interface ContractAddresses {
  registry?: Address;
  factory404?: Address;
  staking?: Address;
  paymaster?: Address;
  usdc?: Address;
  eurc?: Address;
  tpt?: Address;
}

/**
 * Transaction Status
 */
export type TransactionStatus = 
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'failed'
  | 'rejected';

/**
 * Transaction
 */
export interface Transaction {
  id: string;
  hash: string;
  userOperationHash?: string; // For Smart Account transactions
  from: Address;
  to: Address;
  value: string;
  tokenAddress?: Address;
  tokenSymbol?: string;
  functionName?: string;
  status: TransactionStatus;
  blockNumber?: number;
  blockHash?: string;
  gasUsed?: string;
  gasPrice?: string;
  isSponsored?: boolean;
  paymasterAddress?: Address;
  timestamp: Date;
  accountType: AccountType;
  // Additional metadata
  metadata?: Record<string, any>;
}

/**
 * Smart Account Capabilities
 */
export interface SmartAccountCapabilities {
  supportsSendCalls: boolean;
  supportsPaymaster: boolean;
  maxBatchSize?: number;
  supportedChains?: number[];
}

/**
 * Paymaster type: verifying (sponsor with policy) or Pimlico ERC-20 (pay gas with token)
 */
export type PaymasterType = 'verifying' | 'pimlico_erc20';

/**
 * Paymaster Configuration
 */
export interface PaymasterConfig {
  address: Address;
  type?: PaymasterType;
  policyId?: string;
  maxGasPerTx?: string;
  maxGasPerDay?: string;
  eligibleContracts?: Address[];
  /** For type 'pimlico_erc20': token address to pay gas with (USDC, EURC, etc.) */
  erc20Token?: Address;
  /** Base URL for Pimlico API proxy (e.g. /api/pimlico) - used to fetch supported tokens */
  pimlicoApiBase?: string;
}

/**
 * Balance Aggregation Result
 */
export interface BalanceAggregation {
  totalETH: string;
  totalUSDC: string;
  totalEURC: string;
  totalTPT: string;
  totalUSDValue: number;
  accounts: {
    address: Address;
    type: AccountType;
    balances: TokenBalance[];
  }[];
}

/**
 * Tokenizin RWA Wallet ref handle (for imperative openAccountSwitch)
 */
export interface TokenizinRWAWalletHandle {
  /** Open AppKit ProfileWallets view to switch EOA account (social ↔ custodial) */
  openAccountSwitch: () => void;
}

/**
 * Tokenizin RWA Wallet Props
 */
export interface TokenizinRWAWalletProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'overview' | 'tokens' | 'properties' | 'history';
  showCurrencyConversion?: boolean;
  enablePaymaster?: boolean;
  /** When true, fetches Pimlico ERC-20 paymaster tokens (USDC, EURC, etc.) and shows "Pay gas with" selector on Sepolia */
  enablePimlicoErc20Paymaster?: boolean;
  supportedTokens?: TokenConfig[];
  contractAddresses?: ContractAddresses;
  onTransactionComplete?: (transaction: Transaction) => void;
  onTransactionError?: (error: Error) => void;
}

/**
 * Send Transaction Options
 */
export interface SendTransactionOptions {
  to: Address;
  value?: string;
  data?: `0x${string}`;
  tokenAddress?: Address;
  tokenAmount?: string;
  usePaymaster?: boolean;
  accountType?: AccountType;
}

/**
 * Send Calls Options (EIP 5792)
 */
export interface SendCallsOptions {
  calls: Array<{
    to: Address;
    value?: string;
    data?: `0x${string}`;
  }>;
  capabilities?: SmartAccountCapabilities;
  usePaymaster?: boolean;
  /** For Pimlico ERC-20 paymaster: token address to pay gas with (USDC, EURC, etc.) */
  paymasterContext?: { token: Address };
}

