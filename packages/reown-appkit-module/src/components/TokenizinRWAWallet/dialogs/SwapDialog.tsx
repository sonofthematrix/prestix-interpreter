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
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { RefreshCw, ArrowDownUp, ArrowRight, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { TigerSpinner } from '../../common/TigerSpinner';
// Note: These hooks should be implemented locally or removed if not needed
// import { useSwap, SEPOLIA_TOKENS } from '../../hooks/wallet/useSwap';
// import { useToast } from '../../hooks/use-toast';
const SEPOLIA_TOKENS = {
  WETH: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
  USDC: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  EURC: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4',
  TKNZN: '0x064682F1555d3baD3Dab5eDD0DEe45372F23a570',
};
const useToast = () => ({ toast: (options: any) => console.log('Toast:', options) });
const useSwap = () => ({
  quote: null,
  isLoadingQuote: false,
  quoteError: null,
  executeSwap: async () => '',
  isSwapping: false,
  swapError: null,
  fetchQuote: (_tokenIn: string, _tokenOut: string, _amount: string, _slippage: number) => {},
});

interface SwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableTokens?: Array<{ symbol: string; balance: string; address?: string }>;
  isLoadingTokens?: boolean;
}

// Map token symbols to addresses
const getTokenAddress = (symbol: string): string => {
  const tokenMap: Record<string, string> = {
    WETH: SEPOLIA_TOKENS.WETH,
    USDC: SEPOLIA_TOKENS.USDC,
    EURC: SEPOLIA_TOKENS.EURC,
    TKNZN: SEPOLIA_TOKENS.TKNZN,
  };
  return tokenMap[symbol] || SEPOLIA_TOKENS.WETH;
};

export function SwapDialog({ open, onOpenChange, availableTokens = [], isLoadingTokens = false }: SwapDialogProps) {
  const [fromToken, setFromToken] = useState('WETH');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5); // 0.5% default
  const { toast } = useToast();

  const {
    quote,
    isLoadingQuote,
    quoteError,
    executeSwap,
    isSwapping,
    swapError,
    fetchQuote,
  } = useSwap();

  // Fetch quote when amount or tokens change
  useEffect(() => {
    if (amount && parseFloat(amount) > 0 && fromToken !== toToken) {
      const tokenInAddress = getTokenAddress(fromToken);
      const tokenOutAddress = getTokenAddress(toToken);

      // Debounce quote fetching
      const timeoutId = setTimeout(() => {
        fetchQuote(tokenInAddress, tokenOutAddress, amount, slippage);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [amount, fromToken, toToken, slippage, fetchQuote]);

  const handleSwap = async () => {
    try {
      const txHash = await executeSwap();

      toast({
        title: 'Swap Successful!',
        description: `Transaction: ${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}`,
        variant: 'default',
      });

      onOpenChange(false);
      setAmount('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Swap failed';

      toast({
        title: 'Swap Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const swapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  // Get balance for selected token
  const getTokenBalance = (symbol: string) => {
    const token = availableTokens.find(t => t.symbol === symbol);
    return token?.balance || '0';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-[#1C3A36] to-[#0F2A26] dark:from-[#1C3A36] dark:to-[#0F2A26] border-2 border-orange-600/30 dark:border-orange-400/30 rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#F8F5F0] dark:text-[#F8F5F0] flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-orange-400" />
            Swap Tokens
          </DialogTitle>
          <DialogDescription className="text-[#B8A898] dark:text-[#B8A898]">
            Exchange tokens at the best rates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* From Token */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[#F8F5F0]">From</Label>
              <span className="text-xs text-[#B8A898]">
                Balance: {getTokenBalance(fromToken)}
              </span>
            </div>
            <div className="flex gap-2">
              <Select value={fromToken} onValueChange={setFromToken}>
                <SelectTrigger className="w-32 bg-[rgba(28,58,54,0.9)] border-orange-600/30 text-[#F8F5F0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1C3A36] border-orange-600/30">
                  {['WETH', 'USDC', 'EURC', 'TKNZN'].map((symbol) => (
                    <SelectItem
                      key={symbol}
                      value={symbol}
                      className="text-[#F8F5F0] focus:bg-orange-500/20"
                    >
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-[rgba(28,58,54,0.9)] border-orange-600/30 text-[#F8F5F0]"
              />
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center -my-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={swapTokens}
              className="rounded-full w-10 h-10 p-0 border border-orange-600/30 hover:bg-orange-500/20"
            >
              <ArrowDownUp className="h-4 w-4 text-orange-400" />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <Label className="text-[#F8F5F0]">To (estimated)</Label>
            <div className="flex gap-2">
              <Select value={toToken} onValueChange={setToToken}>
                <SelectTrigger className="w-32 bg-[rgba(28,58,54,0.9)] border-orange-600/30 text-[#F8F5F0]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1C3A36] border-orange-600/30">
                  {['WETH', 'USDC', 'EURC', 'TKNZN'].map((symbol) => (
                    <SelectItem
                      key={symbol}
                      value={symbol}
                      className="text-[#F8F5F0] focus:bg-orange-500/20"
                    >
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="0.00"
                  value={isLoadingQuote ? '...' : quote?.expectedOutput || ''}
                  readOnly
                  className="bg-[rgba(15,42,38,0.9)] border-orange-600/30 text-[#F8F5F0] cursor-not-allowed"
                />
                {isLoadingQuote && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <TigerSpinner size="sm" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quote Details */}
          {quote && !isLoadingQuote && (
            <div className="p-3 rounded-lg bg-[rgba(28,58,54,0.6)] border border-orange-600/20 space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#B8A898] mb-2">
                <Info className="h-3 w-3" />
                <span>Swap Details</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#B8A898]">Rate</span>
                  <span className="text-[#F8F5F0] font-medium">
                    1 {fromToken} = {quote.executionPrice} {toToken}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B8A898]">Price Impact</span>
                  <span className="text-green-400">{quote.priceImpact}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B8A898]">Minimum Received</span>
                  <span className="text-[#F8F5F0]">{quote.minimumOutput} {toToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B8A898]">Slippage Tolerance</span>
                  <span className="text-[#F8F5F0]">{slippage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#B8A898]">Gas Estimate</span>
                  <span className="text-[#F8F5F0]">~{(parseInt(quote.gasEstimate) / 1000).toFixed(0)}k</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Messages */}
          {quoteError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-red-400">{quoteError}</p>
              </div>
            </div>
          )}

          {swapError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-red-400">{swapError}</p>
              </div>
            </div>
          )}

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={!amount || !quote || isSwapping || fromToken === toToken || isLoadingQuote}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {isSwapping ? (
              <>
                <TigerSpinner size="sm" className="mr-2" />
                Swapping...
              </>
            ) : fromToken === toToken ? (
              'Select different tokens'
            ) : !amount ? (
              'Enter amount'
            ) : isLoadingQuote ? (
              <>
                <TigerSpinner size="sm" className="mr-2" />
                Fetching quote...
              </>
            ) : !quote ? (
              'No quote available'
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Swap {fromToken} for {toToken}
              </>
            )}
          </Button>

          {/* Powered by Uniswap */}
          <div className="flex items-center justify-center gap-2 text-xs text-[#B8A898]">
            <span>Powered by</span>
            <span className="font-semibold text-orange-400">Uniswap V3</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

