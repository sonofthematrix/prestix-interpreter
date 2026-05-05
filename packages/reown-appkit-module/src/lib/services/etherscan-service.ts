/**
 * Etherscan API Service
 * 
 * Service for fetching on-chain data from Sepolia Etherscan API
 * Documentation: https://docs.etherscan.io/api-endpoints
 */

import { Address } from 'viem';

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || '';
const ETHERSCAN_API_URL = 'https://api-sepolia.etherscan.io/api';
const ETHERSCAN_API_V2_URL = 'https://api-sepolia.etherscan.io/v2/api';
const SEPOLIA_CHAIN_ID = '11155111';

interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

interface TokenBalance {
  account: Address;
  balance: string;
}

interface ERC20TokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: Address;
  contractAddress: Address;
  to: Address;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

interface ERC721TokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: Address;
  contractAddress: Address;
  to: Address;
  tokenID: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
}

interface NormalTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: Address;
  to: Address;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
}

/**
 * Get token balance for a specific contract address
 * Uses tokenbalance endpoint for direct balance query
 */
export async function getTokenBalance(address: Address, contractAddress: Address): Promise<{ balance: string; decimals?: number }> {
  if (!ETHERSCAN_API_KEY) {
    return { balance: '0' };
  }

  try {
    const url = `${ETHERSCAN_API_URL}?module=account&action=tokenbalance&contractaddress=${contractAddress}&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
    
    const response = await fetch(url);
    const data: EtherscanResponse<string> = await response.json();

    if (data.status !== '1' || !data.result) {
      return { balance: '0' };
    }

    return { balance: data.result };
  } catch (error) {
    console.error(`Error fetching token balance for ${contractAddress}:`, error);
    return { balance: '0' };
  }
}

/**
 * Get ERC20 token balances for an address
 * Uses transfer history (tokentx endpoint) to discover and calculate balances
 * This is the standard approach as Etherscan doesn't have a direct tokenlist endpoint
 */
export async function getTokenBalances(address: Address): Promise<(TokenBalance & { tokenAddress: Address; decimals: number; symbol: string; name: string })[]> {
  if (!ETHERSCAN_API_KEY) {
    console.warn('⚠️  ETHERSCAN_API_KEY not set, skipping token balance fetch');
    return [];
  }

  return await getTokenBalancesFromTransfers(address);
}

/**
 * Calculate token balances from transfer history
 * Uses tokentx endpoint to get all transfers and calculate current balances
 */
async function getTokenBalancesFromTransfers(address: Address): Promise<(TokenBalance & { tokenAddress: Address; decimals: number; symbol: string; name: string })[]> {
  try {
    const url = `${ETHERSCAN_API_URL}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    
    const response = await fetch(url);
    const data: EtherscanResponse<ERC20TokenTransfer[]> = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return [];
    }

    // Group by token contract address and calculate balances
    const tokenBalances = new Map<Address, { balance: bigint; decimals: number; symbol: string; name: string }>();

    for (const transfer of data.result) {
      const tokenAddress = transfer.contractAddress.toLowerCase() as Address;
      const value = BigInt(transfer.value);
      const decimals = parseInt(transfer.tokenDecimal) || 18;

      if (!tokenBalances.has(tokenAddress)) {
        tokenBalances.set(tokenAddress, {
          balance: BigInt(0),
          decimals,
          symbol: transfer.tokenSymbol,
          name: transfer.tokenName,
        });
      }

      const tokenData = tokenBalances.get(tokenAddress)!;
      
      // If transfer is TO the address, add to balance
      if (transfer.to.toLowerCase() === address.toLowerCase()) {
        tokenData.balance += value;
      }
      // If transfer is FROM the address, subtract from balance
      if (transfer.from.toLowerCase() === address.toLowerCase()) {
        tokenData.balance -= value;
      }
    }

    // Convert to TokenBalance array format
    return Array.from(tokenBalances.entries())
      .filter(([_, data]) => data.balance > 0)
      .map(([tokenAddress, data]) => ({
        account: address,
        balance: data.balance.toString(),
        tokenAddress,
        decimals: data.decimals,
        symbol: data.symbol,
        name: data.name,
      }));
  } catch (error) {
    console.error('Error calculating token balances from transfers:', error);
    return [];
  }
}

/**
 * Get ERC721 token holdings for an address
 */
export async function getERC721Tokens(address: Address): Promise<ERC721TokenTransfer[]> {
  if (!ETHERSCAN_API_KEY) {
    console.warn('⚠️  ETHERSCAN_API_KEY not set, skipping ERC721 fetch');
    return [];
  }

  try {
    const url = `${ETHERSCAN_API_URL}?module=account&action=tokennfttx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    
    const response = await fetch(url);
    const data: EtherscanResponse<ERC721TokenTransfer[]> = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return [];
    }

    // Filter to only tokens currently held (last transfer TO address)
    const holdings = new Map<string, ERC721TokenTransfer>();

    for (const transfer of data.result) {
      const key = `${transfer.contractAddress.toLowerCase()}-${transfer.tokenID}`;
      
      // If transfer is TO the address, add/update holding
      if (transfer.to.toLowerCase() === address.toLowerCase()) {
        holdings.set(key, transfer);
      }
      // If transfer is FROM the address, remove holding
      if (transfer.from.toLowerCase() === address.toLowerCase()) {
        holdings.delete(key);
      }
    }

    return Array.from(holdings.values());
  } catch (error) {
    console.error('Error fetching ERC721 tokens from Etherscan:', error);
    return [];
  }
}

/**
 * Get normal transactions for an address
 */
export async function getNormalTransactions(
  address: Address,
  startBlock?: number,
  endBlock?: number
): Promise<NormalTransaction[]> {
  if (!ETHERSCAN_API_KEY) {
    console.warn('⚠️  ETHERSCAN_API_KEY not set, skipping transaction fetch');
    return [];
  }

  try {
    const start = startBlock || 0;
    const end = endBlock || 99999999;
    const url = `${ETHERSCAN_API_URL}?module=account&action=txlist&address=${address}&startblock=${start}&endblock=${end}&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    
    const response = await fetch(url);
    const data: EtherscanResponse<NormalTransaction[]> = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return [];
    }

    return data.result;
  } catch (error) {
    console.error('Error fetching transactions from Etherscan:', error);
    return [];
  }
}

/**
 * Get ERC20 token transfers for an address
 */
export async function getERC20Transfers(address: Address): Promise<ERC20TokenTransfer[]> {
  if (!ETHERSCAN_API_KEY) {
    console.warn('⚠️  ETHERSCAN_API_KEY not set, skipping ERC20 transfers fetch');
    return [];
  }

  try {
    const url = `${ETHERSCAN_API_URL}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${ETHERSCAN_API_KEY}`;
    
    const response = await fetch(url);
    const data: EtherscanResponse<ERC20TokenTransfer[]> = await response.json();

    if (data.status !== '1' || !Array.isArray(data.result)) {
      return [];
    }

    return data.result;
  } catch (error) {
    console.error('Error fetching ERC20 transfers from Etherscan:', error);
    return [];
  }
}

/**
 * Get native balance for an address using Etherscan v2 API
 * Uses the new v2 endpoint: /v2/api?module=account&action=balance
 */
export async function getAccountBalance(address: Address): Promise<string> {
  if (!ETHERSCAN_API_KEY) {
    console.warn('⚠️  ETHERSCAN_API_KEY not set, skipping balance fetch');
    return '0';
  }

  try {
    // Use v2 API endpoint with chainid parameter
    const url = `${ETHERSCAN_API_V2_URL}?apikey=${ETHERSCAN_API_KEY}&chainid=${SEPOLIA_CHAIN_ID}&module=account&action=balance&address=${address}&tag=latest`;
    
    console.log(`🔍 [Etherscan Service] Fetching native balance via v2 API for: ${address}`);
    
    const response = await fetch(url);
    const data: EtherscanResponse<string> = await response.json();

    if (data.status !== '1' || !data.result) {
      console.warn('⚠️  Etherscan v2 balance API returned error:', data.message);
      // Fallback to v1 API if v2 fails
      return await getAccountBalanceV1(address);
    }

    // Result is in Wei, convert to ETH
    const weiBalance = BigInt(data.result);
    const ethBalance = Number(weiBalance) / 1e18;
    
    console.log(`✅ [Etherscan Service] Native balance: ${ethBalance} ETH (${weiBalance.toString()} Wei)`);
    
    return ethBalance.toString();
  } catch (error) {
    console.error('❌ [Etherscan Service] Error fetching account balance from Etherscan v2:', error);
    // Fallback to v1 API on error
    return await getAccountBalanceV1(address);
  }
}

/**
 * Fallback: Get native balance using Etherscan v1 API
 */
async function getAccountBalanceV1(address: Address): Promise<string> {
  try {
    console.log(`🔄 [Etherscan Service] Falling back to v1 API for: ${address}`);
    const url = `${ETHERSCAN_API_URL}?module=account&action=balance&address=${address}&tag=latest&apikey=${ETHERSCAN_API_KEY}`;
    
    const response = await fetch(url);
    const data: EtherscanResponse<string> = await response.json();

    if (data.status !== '1' || !data.result) {
      console.warn('⚠️  Etherscan v1 balance API returned error:', data.message);
      return '0';
    }

    // Result is in Wei, convert to ETH
    const weiBalance = BigInt(data.result);
    const ethBalance = Number(weiBalance) / 1e18;
    
    return ethBalance.toString();
  } catch (error) {
    console.error('❌ [Etherscan Service] Error fetching account balance from Etherscan v1:', error);
    return '0';
  }
}

