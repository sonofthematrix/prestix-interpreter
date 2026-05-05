'use client';

/**
 * SendDialog - Send ETH or ERC20 (e.g. USDC) using the current wallet session.
 * Works with both EOA and social wallet (smart account) sessions per Reown AppKit:
 * - useAccount() provides the connected address and chain (same as session, including smart account).
 * - writeContract uses that account + viem erc20Abi; wagmi uses the connected wallet client to sign.
 * @see https://docs.reown.com/appkit/recipes/wagmi-send-transaction
 * @see https://github.com/reown-com/appkit/blob/main/apps/laboratory/src/components/Wagmi/WagmiSendUSDCTest.tsx
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { Send, ArrowRight, Copy, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { TigerSpinner } from '../../common/TigerSpinner';
import { useAccount, useSendTransaction, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, isAddress, Address, erc20Abi } from 'viem';
import { parseAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

interface SendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTokens?: Array<{ symbol: string; balance: string; address: string }>;
  isLoadingTokens?: boolean;
}

export function SendDialog({ open, onOpenChange, availableTokens = [], isLoadingTokens = false }: SendDialogProps) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('ETH');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Connected account and chain from wagmi (EOA or smart account from social session)
  const { address: connectedAddress, chain: activeChain } = useAccount();

  // Wagmi hooks for native ETH transfer
  const {
    sendTransaction,
    data: ethTxHash,
    isPending: isEthPending,
    isError: isEthError,
    error: ethError,
  } = useSendTransaction();

  // Wagmi hooks for ERC-20 transfer
  const {
    writeContract,
    data: erc20TxHash,
    isPending: isErc20Pending,
    isError: isErc20Error,
    error: erc20Error,
  } = useWriteContract();

  // Wait for transaction confirmation
  const { isLoading: isEthConfirming, isSuccess: isEthSuccess } = useWaitForTransactionReceipt({
    hash: ethTxHash,
  });

  const { isLoading: isErc20Confirming, isSuccess: isErc20Success } = useWaitForTransactionReceipt({
    hash: erc20TxHash,
  });

  const selectedTokenData = availableTokens.find(t => t.symbol === selectedToken);
  const isProcessing = isEthPending || isErc20Pending || isEthConfirming || isErc20Confirming;
  const txHash = ethTxHash || erc20TxHash;

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setRecipient('');
      setAmount('');
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  // Handle success
  useEffect(() => {
    if (isEthSuccess || isErc20Success) {
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
      }, 3000);
    }
  }, [isEthSuccess, isErc20Success, onOpenChange]);

  // Handle errors
  useEffect(() => {
    if (isEthError && ethError) {
      setError(ethError.message);
    } else if (isErc20Error && erc20Error) {
      setError(erc20Error.message);
    }
  }, [isEthError, ethError, isErc20Error, erc20Error]);

  const handleSend = async () => {
    setError(null);

    // Validate recipient address
    if (!recipient || !isAddress(recipient)) {
      setError('Invalid recipient address');
      return;
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Validate balance
    if (selectedTokenData && parseFloat(selectedTokenData.balance) < amountNum) {
      setError('Insufficient balance');
      return;
    }

    try {
      if (selectedToken === 'ETH') {
        // Send native ETH
        await sendTransaction({
          to: recipient as `0x${string}`,
          value: parseUnits(amount, 18),
        });
      } else {
        // Send ERC-20 token (USDC, EURC, TKNZN, etc.) - works with EOA and smart account session
        const tokenAddress = selectedTokenData?.address;
        if (!tokenAddress) {
          setError('Token address not found');
          return;
        }
        if (!connectedAddress) {
          setError('Wallet not connected');
          return;
        }

        // Decimals: 6 for USDC/EURC, 18 for most others
        const decimals = selectedToken === 'USDC' || selectedToken === 'EURC' ? 6 : 18;
        const amountWei = parseUnits(amount, decimals);

        // Use connected address so EOA and smart account (social session) both work
        await writeContract({
          account: parseAccount(connectedAddress),
          chain: activeChain ?? sepolia,
          address: tokenAddress as Address,
          abi: erc20Abi,
          functionName: 'transfer',
          args: [recipient as Address, amountWei],
        });
      }
    } catch (err) {
      console.error('Send transaction error:', err);
      setError(err instanceof Error ? err.message : 'Transaction failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-[#1C3A36] to-[#0F2A26] dark:from-[#1C3A36] dark:to-[#0F2A26] border-2 border-orange-600/30 dark:border-orange-400/30 rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#F8F5F0] dark:text-[#F8F5F0] flex items-center gap-2">
            <Send className="h-5 w-5 text-orange-400" />
            Send Tokens
          </DialogTitle>
          <DialogDescription className="text-[#B8A898] dark:text-[#B8A898]">
            Transfer tokens to another wallet address
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-[#F8F5F0]">Token</Label>
            {isLoadingTokens && availableTokens.length === 0 ? (
              <div className="flex items-center gap-2 py-3 px-4 rounded-lg bg-[rgba(28,58,54,0.9)] border border-orange-600/30">
                <TigerSpinner size="sm" />
                <span className="text-sm text-[#B8A898]">Loading tokens...</span>
              </div>
            ) : (
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger className="bg-[rgba(28,58,54,0.9)] border-orange-600/30 text-[#F8F5F0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1C3A36] border-orange-600/30">
                  {availableTokens.map((token) => (
                    <SelectItem
                      key={token.symbol}
                      value={token.symbol}
                      className="text-[#F8F5F0] focus:bg-orange-500/20"
                    >
                      {token.symbol} - {token.balance}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedTokenData && (
              <p className="text-xs text-[#B8A898]">
                Available: {selectedTokenData.balance} {selectedToken}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[#F8F5F0]">Recipient Address</Label>
            <div className="flex gap-2">
              <Input
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="bg-[rgba(28,58,54,0.9)] border-orange-600/30 text-[#F8F5F0] font-mono text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigator.clipboard.readText().then(setRecipient)}
                className="border-orange-600/30 text-orange-400"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[#F8F5F0]">Amount</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-[rgba(28,58,54,0.9)] border-orange-600/30 text-[#F8F5F0]"
              disabled={isProcessing}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAmount(selectedTokenData?.balance || '')}
              className="text-xs text-orange-400 hover:text-orange-300"
              disabled={isProcessing}
            >
              Use Max
            </Button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && txHash && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/30">
              <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-green-400 font-medium">Transaction Submitted!</p>
                <a
                  href={
                    activeChain?.blockExplorers?.default?.url
                      ? `${activeChain.blockExplorers.default.url}/tx/${txHash}`
                      : `https://sepolia.etherscan.io/tx/${txHash}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:underline flex items-center gap-1 mt-1"
                >
                  View on Explorer
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* Processing State */}
          {isProcessing && !success && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <TigerSpinner size="sm" />
              <p className="text-xs text-blue-400">
                {isEthConfirming || isErc20Confirming
                  ? 'Waiting for confirmation...'
                  : 'Sending transaction...'}
              </p>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={!connectedAddress || !recipient || !amount || isProcessing || success}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <TigerSpinner size="sm" className="mr-2" />
                {isEthConfirming || isErc20Confirming ? 'Confirming...' : 'Sending...'}
              </>
            ) : success ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Sent!
              </>
            ) : (
              <>
                Send {selectedToken}
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-[#B8A898] dark:text-[#B8A898] text-center">
            Make sure to double-check the recipient address before sending
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

