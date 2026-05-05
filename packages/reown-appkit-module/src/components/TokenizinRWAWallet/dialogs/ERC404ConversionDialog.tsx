'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { AlertCircle, RefreshCw, Coins, Image as ImageIcon, Loader2 } from 'lucide-react';
import { TigerSpinner } from '../../common/TigerSpinner';
// Note: These hooks/services should be implemented locally or removed if not needed
// import { useToast } from '../../hooks/use-toast';
import { useAppKitAccount } from '../../../config';
import { Address, parseUnits, formatUnits } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
// import { getContractABI } from '../../lib/services/contract-database-service';
const getContractABI = async (address: string) => null; // Placeholder

interface ERC404ConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenAddress: Address;
  tokenSymbol?: string;
  tokenName?: string;
}

// ERC404 Contract ABI for conversion functions
const ERC404_ABI = [
  {
    name: 'convertToNFT',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'convertToFungible',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'nftExists',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'nftOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'tokenBalanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

export function ERC404ConversionDialog({
  open,
  onOpenChange,
  tokenAddress,
  tokenSymbol = 'RWA404',
  tokenName = 'RWA404 Token',
}: ERC404ConversionDialogProps) {
  const { address, isConnected } = useAppKitAccount();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [nftExists, setNftExists] = useState<boolean | null>(null);
  const [nftOwner, setNftOwner] = useState<Address | null>(null);
  const [tokenBalance, setTokenBalance] = useState<string | null>(null);
  const [isUserNftOwner, setIsUserNftOwner] = useState(false);

  // Read contract state
  const { data: nftExistsData, refetch: refetchNftExists } = useReadContract({
    address: tokenAddress,
    abi: ERC404_ABI,
    functionName: 'nftExists',
    query: {
      enabled: open && isConnected && !!tokenAddress,
    },
  });

  const { data: nftOwnerData, refetch: refetchNftOwner } = useReadContract({
    address: tokenAddress,
    abi: ERC404_ABI,
    functionName: 'nftOwner',
    query: {
      enabled: open && isConnected && !!tokenAddress && nftExistsData === true,
    },
  });

  const { data: tokenBalanceData, refetch: refetchTokenBalance } = useReadContract({
    address: tokenAddress,
    abi: ERC404_ABI,
    functionName: 'tokenBalanceOf',
    args: address ? [address as Address] : undefined,
    query: {
      enabled: open && isConnected && !!tokenAddress && !!address,
    },
  });

  // Write contract for conversions
  const { writeContract, data: hash, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Update state when contract data changes
  useEffect(() => {
    if (nftExistsData !== undefined) {
      setNftExists(nftExistsData);
    }
  }, [nftExistsData]);

  useEffect(() => {
    if (nftOwnerData) {
      setNftOwner(nftOwnerData as Address);
      setIsUserNftOwner(address?.toLowerCase() === (nftOwnerData as Address).toLowerCase());
    }
  }, [nftOwnerData, address]);

  useEffect(() => {
    if (tokenBalanceData) {
      try {
        const balance = formatUnits(tokenBalanceData as bigint, 18);
        setTokenBalance(balance);
      } catch (error) {
        console.error('Failed to format token balance:', error);
        setTokenBalance('0');
      }
    }
  }, [tokenBalanceData]);

  // Refetch when dialog opens
  useEffect(() => {
    if (open && isConnected) {
      refetchNftExists();
      refetchNftOwner();
      refetchTokenBalance();
    }
  }, [open, isConnected, refetchNftExists, refetchNftOwner, refetchTokenBalance]);

  // Handle successful transaction
  useEffect(() => {
    if (isSuccess) {
      toast({
        title: 'Conversion Successful!',
        description: `Transaction confirmed: ${hash?.substring(0, 10)}...${hash?.substring(hash.length - 8)}`,
        variant: 'default',
      });
      
      // Refetch contract state
      setTimeout(() => {
        refetchNftExists();
        refetchNftOwner();
        refetchTokenBalance();
      }, 2000);
      
      setIsLoading(false);
    }
  }, [isSuccess, hash, refetchNftExists, refetchNftOwner, refetchTokenBalance, toast]);

  const handleConvertToNFT = async () => {
    if (!isConnected || !address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to convert tokens',
        variant: 'destructive',
      });
      return;
    }

    if (!tokenBalance || parseFloat(tokenBalance) === 0) {
      toast({
        title: 'Insufficient Balance',
        description: 'You need to own tokens to convert to NFT',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      writeContract({
        address: tokenAddress,
        abi: ERC404_ABI as any,
        functionName: 'convertToNFT',
      } as any);
    } catch (error: any) {
      console.error('Failed to convert to NFT:', error);
      toast({
        title: 'Conversion Failed',
        description: error?.message || 'Failed to convert tokens to NFT',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleConvertToFungible = async () => {
    if (!isConnected || !address) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to convert NFT',
        variant: 'destructive',
      });
      return;
    }

    if (!isUserNftOwner) {
      toast({
        title: 'Not NFT Owner',
        description: 'You must own the NFT to convert it back to fungible tokens',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      writeContract({
        address: tokenAddress,
        abi: ERC404_ABI as any,
        functionName: 'convertToFungible',
      } as any);
    } catch (error: any) {
      console.error('Failed to convert to fungible:', error);
      toast({
        title: 'Conversion Failed',
        description: error?.message || 'Failed to convert NFT to fungible tokens',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const isLoadingState = isLoading || isWriting || isConfirming;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-orange-400" />
            ERC404 Token Conversion
          </DialogTitle>
          <DialogDescription>
            Convert between ERC20 fungible tokens and ERC721 NFT for {tokenName} ({tokenSymbol})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Current State */}
          <div className="p-4 rounded-lg bg-muted dark:bg-gray-800 border border-border dark:border-gray-700">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground dark:text-gray-400">NFT Status:</span>
                <span className="text-sm font-medium text-foreground dark:text-white">
                  {nftExists === null ? (
                    <TigerSpinner size="sm" />
                  ) : nftExists ? (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <ImageIcon className="h-4 w-4" />
                      NFT Exists
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                      <Coins className="h-4 w-4" />
                      Fungible Tokens
                    </span>
                  )}
                </span>
              </div>
              
              {nftExists && nftOwner && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground dark:text-gray-400">NFT Owner:</span>
                  <span className="text-sm font-mono text-foreground dark:text-white">
                    {nftOwner.slice(0, 6)}...{nftOwner.slice(-4)}
                  </span>
                </div>
              )}
              
              {tokenBalance !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground dark:text-gray-400">Your Token Balance:</span>
                  <span className="text-sm font-medium text-foreground dark:text-white">
                    {parseFloat(tokenBalance).toFixed(4)} {tokenSymbol}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Conversion Actions */}
          <div className="space-y-3">
            {/* Convert to NFT */}
            {!nftExists && (
              <Button
                onClick={handleConvertToNFT}
                disabled={isLoadingState || !isConnected || !tokenBalance || parseFloat(tokenBalance) === 0}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isLoadingState ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Convert to NFT
                  </>
                )}
              </Button>
            )}

            {/* Convert to Fungible */}
            {nftExists && (
              <Button
                onClick={handleConvertToFungible}
                disabled={isLoadingState || !isConnected || !isUserNftOwner}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                {isLoadingState ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    <Coins className="h-4 w-4 mr-2" />
                    Convert to Fungible Tokens
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Info Alert */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">How ERC404 Conversion Works:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Convert to NFT:</strong> Burns all your ERC20 tokens and mints a single NFT representing full ownership</li>
                <li><strong>Convert to Fungible:</strong> Burns the NFT and mints the full ERC20 token supply back to you</li>
                <li>Only the NFT owner can convert back to fungible tokens</li>
              </ul>
            </div>
          </div>

          {/* Error States */}
          {!isConnected && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-800 dark:text-red-300">
                Please connect your wallet to use conversion features
              </p>
            </div>
          )}

          {nftExists && !isUserNftOwner && (
            <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-800 dark:text-yellow-300">
                You don't own the NFT. Only the NFT owner can convert it back to fungible tokens.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

