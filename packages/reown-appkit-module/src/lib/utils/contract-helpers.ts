/**
 * Contract Helper Utilities
 * 
 * Common functions for interacting with smart contracts using ethers.js
 * Works with MetaMask browser extension via useMetaMaskProvider hook
 */

import { ethers } from 'ethers';
import type { JsonRpcSigner, BrowserProvider, Contract } from 'ethers';

/**
 * Contract interaction result
 */
export interface ContractCallResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  txHash?: string;
  receipt?: ethers.ContractTransactionReceipt;
  gasUsed?: bigint;
}

/**
 * Contract read options
 */
export interface ContractReadOptions {
  contractAddress: string;
  abi: any[];
  functionName: string;
  args?: any[];
  provider: BrowserProvider;
}

/**
 * Contract write options
 */
export interface ContractWriteOptions {
  contractAddress: string;
  abi: any[];
  functionName: string;
  args?: any[];
  signer: JsonRpcSigner;
  value?: bigint | string; // ETH value to send (in wei or as string)
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

/**
 * Create a contract instance for reading
 */
export function createReadContract(
  contractAddress: string,
  abi: any[],
  provider: BrowserProvider
): Contract {
  if (!ethers.isAddress(contractAddress)) {
    throw new Error(`Invalid contract address: ${contractAddress}`);
  }
  
  return new ethers.Contract(contractAddress, abi, provider);
}

/**
 * Create a contract instance for writing (with signer)
 */
export function createWriteContract(
  contractAddress: string,
  abi: any[],
  signer: JsonRpcSigner
): Contract {
  if (!ethers.isAddress(contractAddress)) {
    throw new Error(`Invalid contract address: ${contractAddress}`);
  }
  
  return new ethers.Contract(contractAddress, abi, signer);
}

/**
 * Read from a contract (view/pure functions)
 */
export async function readContract<T = any>(
  options: ContractReadOptions
): Promise<ContractCallResult<T>> {
  try {
    const contract = createReadContract(
      options.contractAddress,
      options.abi,
      options.provider
    );

    const functionName = options.functionName;
    if (!contract[functionName]) {
      throw new Error(`Function ${functionName} not found in contract ABI`);
    }

    const result = await contract[functionName](...(options.args || []));
    
    return {
      success: true,
      data: result as T,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to read contract',
    };
  }
}

/**
 * Write to a contract (state-changing functions)
 */
export async function writeContract(
  options: ContractWriteOptions
): Promise<ContractCallResult> {
  try {
    const contract = createWriteContract(
      options.contractAddress,
      options.abi,
      options.signer
    );

    const functionName = options.functionName;
    if (!contract[functionName]) {
      throw new Error(`Function ${functionName} not found in contract ABI`);
    }

    // Prepare transaction options
    const txOptions: {
      value?: bigint;
      gasLimit?: bigint;
      gasPrice?: bigint;
      maxFeePerGas?: bigint;
      maxPriorityFeePerGas?: bigint;
    } = {};
    
    if (options.value) {
      txOptions.value = typeof options.value === 'string' 
        ? BigInt(options.value) 
        : options.value;
    }
    
    if (options.gasLimit) {
      txOptions.gasLimit = options.gasLimit;
    }
    
    if (options.gasPrice) {
      txOptions.gasPrice = options.gasPrice;
    }
    
    if (options.maxFeePerGas) {
      txOptions.maxFeePerGas = options.maxFeePerGas;
    }
    
    if (options.maxPriorityFeePerGas) {
      txOptions.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
    }

    // Execute transaction
    const tx = await contract[functionName](...(options.args || []), txOptions);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    
    if (!receipt) {
      throw new Error('Transaction receipt not found');
    }

    return {
      success: receipt.status === 1,
      txHash: receipt.hash,
      receipt,
      gasUsed: receipt.gasUsed,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to write contract',
    };
  }
}

/**
 * Estimate gas for a contract call
 */
export async function estimateGas(
  options: ContractWriteOptions
): Promise<bigint> {
  const contract = createWriteContract(
    options.contractAddress,
    options.abi,
    options.signer
  );

  const functionName = options.functionName;
  if (!contract[functionName]) {
    throw new Error(`Function ${functionName} not found in contract ABI`);
  }

  const txOptions: {
    value?: bigint;
  } = {};
  
  if (options.value) {
    txOptions.value = typeof options.value === 'string' 
      ? BigInt(options.value) 
      : options.value;
  }

  try {
    const estimatedGas = await contract[functionName].estimateGas(
      ...(options.args || []),
      txOptions
    );
    return estimatedGas;
  } catch (error: any) {
    throw new Error(`Gas estimation failed: ${error.message}`);
  }
}

/**
 * Get current gas price from provider
 */
export async function getGasPrice(
  provider: BrowserProvider
): Promise<ethers.FeeData> {
  return await provider.getFeeData();
}

/**
 * Parse event from transaction receipt
 */
export function parseEvent(
  receipt: ethers.ContractTransactionReceipt,
  contract: Contract,
  eventName: string
): ethers.LogDescription | null {
  try {
    const event = receipt.logs.find((log) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === eventName;
      } catch {
        return false;
      }
    });

    if (!event) {
      return null;
    }

    return contract.interface.parseLog(event);
  } catch (error) {
    return null;
  }
}

/**
 * Parse all events from transaction receipt
 */
export function parseAllEvents(
  receipt: ethers.ContractTransactionReceipt,
  contract: Contract
): ethers.LogDescription[] {
  const events: ethers.LogDescription[] = [];
  
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog(log);
      if (parsed) {
        events.push(parsed);
      }
    } catch {
      // Skip logs that don't match this contract
    }
  }
  
  return events;
}

/**
 * Format ETH value for display
 */
export function formatETH(value: bigint | string, decimals: number = 4): string {
  const formatted = ethers.formatEther(value);
  const num = parseFloat(formatted);
  return num.toFixed(decimals);
}

/**
 * Parse ETH value from string
 */
export function parseETH(value: string): bigint {
  return ethers.parseEther(value);
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Get checksummed address
 */
export function getChecksumAddress(address: string): string {
  return ethers.getAddress(address);
}

/**
 * Wait for transaction confirmation with timeout
 */
export async function waitForTransaction(
  provider: BrowserProvider,
  txHash: string,
  confirmations: number = 1,
  timeout: number = 120000 // 2 minutes default
): Promise<ethers.TransactionReceipt> {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Transaction timeout after ${timeout}ms`));
    }, timeout);

    try {
      const receipt = await provider.waitForTransaction(txHash, confirmations);
      clearTimeout(timeoutId);
      resolve(receipt);
    } catch (error: any) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

/**
 * Get ERC20 token balance
 */
export async function getTokenBalance(
  tokenAddress: string,
  ownerAddress: string,
  provider: BrowserProvider
): Promise<bigint> {
  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
  ];

  const contract = createReadContract(tokenAddress, ERC20_ABI, provider);
  return await contract.balanceOf(ownerAddress);
}

/**
 * Get ERC20 token allowance
 */
export async function getTokenAllowance(
  tokenAddress: string,
  ownerAddress: string,
  spenderAddress: string,
  provider: BrowserProvider
): Promise<bigint> {
  const ERC20_ABI = [
    'function allowance(address, address) view returns (uint256)',
  ];

  const contract = createReadContract(tokenAddress, ERC20_ABI, provider);
  return await contract.allowance(ownerAddress, spenderAddress);
}

/**
 * Approve ERC20 token spending
 */
export async function approveToken(
  tokenAddress: string,
  spenderAddress: string,
  amount: bigint,
  signer: JsonRpcSigner
): Promise<ContractCallResult> {
  const ERC20_ABI = [
    'function approve(address, uint256) returns (bool)',
  ];

  return await writeContract({
    contractAddress: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spenderAddress, amount],
    signer,
  });
}

/**
 * Get ERC20 token info (decimals, symbol, name)
 */
export async function getTokenInfo(
  tokenAddress: string,
  provider: BrowserProvider
): Promise<{ decimals: number; symbol: string; name: string }> {
  const ERC20_ABI = [
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)',
  ];

  const contract = createReadContract(tokenAddress, ERC20_ABI, provider);
  
  const [decimals, symbol, name] = await Promise.all([
    contract.decimals(),
    contract.symbol(),
    contract.name(),
  ]);

  return {
    decimals: Number(decimals),
    symbol,
    name,
  };
}

