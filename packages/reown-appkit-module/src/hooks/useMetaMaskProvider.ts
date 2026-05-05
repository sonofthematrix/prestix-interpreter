/**
 * Wallet Provider Hook (AppKit-first, no MetaMask prerequisite)
 *
 * Uses wagmi walletClient - works with AppKit social wallets (Google), MetaMask, WalletConnect.
 * NO MetaMask required. Connect via AppKit with social login or any wallet.
 *
 * Legacy name kept for backward compatibility. Prefer useAppKitProvider when available.
 *
 * Usage:
 * ```tsx
 * const { provider, signer, address, isConnected, connect, disconnect } = useMetaMaskProvider();
 *
 * if (isConnected && signer) {
 *   const contract = new ethers.Contract(address, abi, signer);
 *   const tx = await contract.methodName(params);
 * }
 * ```
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient, useDisconnect } from 'wagmi';

interface MetaMaskProviderState {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  error: Error | null;
}

interface MetaMaskProviderActions {
  connect: () => void;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  requestAccounts: () => Promise<string[]>;
}

export interface UseMetaMaskProviderReturn extends MetaMaskProviderState, MetaMaskProviderActions {}

/**
 * Hook to get ethers provider/signer from AppKit-connected wallet.
 * Works with social wallets (Google), MetaMask, WalletConnect - no MetaMask required.
 */
export function useMetaMaskProvider(): UseMetaMaskProviderReturn {
  const { address: wagmiAddress, isConnected: wagmiConnected, chainId: wagmiChainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect: wagmiDisconnect } = useDisconnect();

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Build provider/signer from wagmi walletClient (works with AppKit social, MetaMask, WalletConnect)
  useEffect(() => {
    if (!wagmiConnected || !wagmiAddress || !walletClient) {
      setProvider(null);
      setSigner(null);
      setChainId(null);
      if (!wagmiConnected) setError(null);
      return;
    }

    (async () => {
      try {
        const browserProvider = new ethers.BrowserProvider(
          walletClient as unknown as ethers.Eip1193Provider
        );
        const signerInstance = await browserProvider.getSigner();
        const network = await browserProvider.getNetwork();

        setProvider(browserProvider);
        setSigner(signerInstance);
        setChainId(Number(network.chainId));
        setError(null);
      } catch (err: unknown) {
        // User rejected (ACTION_REJECTED) - silent, don't surface error
        const errObj = err as { code?: string; reason?: string };
        if (errObj?.code === 'ACTION_REJECTED' || errObj?.reason === 'rejected') {
          setError(null);
          return;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
      }
    })();
  }, [wagmiConnected, wagmiAddress, walletClient]);

  const connect = useCallback(() => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('appkit:open');
      window.dispatchEvent(event);
    }
  }, []);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
    setProvider(null);
    setSigner(null);
    setChainId(null);
    setError(null);
  }, [wagmiDisconnect]);

  const switchNetwork = useCallback(
    async (targetChainId: number) => {
      if (!walletClient) return;
      try {
        await walletClient.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
      } catch (switchError: unknown) {
        const err = switchError as { code?: number };
        if (err?.code === 4902) {
          await walletClient.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: targetChainId === 11155111 ? 'Sepolia Test Network' : 'Unknown',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: [
                  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com',
                ],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } else {
          throw switchError;
        }
      }
    },
    [walletClient]
  );

  const requestAccounts = useCallback(async (): Promise<string[]> => {
    if (wagmiAddress) return [wagmiAddress];
    return [];
  }, [wagmiAddress]);

  return {
    provider,
    signer,
    address: wagmiAddress || null,
    isConnected: wagmiConnected,
    isConnecting: false,
    chainId: chainId ?? (wagmiChainId ? Number(wagmiChainId) : null),
    error,
    connect,
    disconnect,
    switchNetwork,
    requestAccounts,
  };
}
