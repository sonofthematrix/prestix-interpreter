'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { QrCode, Copy, Check, ExternalLink, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ReceiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: string;
  network?: string;
}

export function ReceiveDialog({
  open,
  onOpenChange,
  address,
  network = 'Sepolia Testnet'
}: ReceiveDialogProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const getExplorerUrl = (address: string) => {
    return `https://sepolia.etherscan.io/address/${address}`;
  };

  const isTestnet = network.toLowerCase().includes('sepolia') || network.toLowerCase().includes('testnet');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-[#1C3A36] to-[#0F2A26] dark:from-[#1C3A36] dark:to-[#0F2A26] border-2 border-orange-600/30 dark:border-orange-400/30 rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#F8F5F0] dark:text-[#F8F5F0] flex items-center gap-2">
            <QrCode className="h-5 w-5 text-orange-400" />
            Receive Funds
          </DialogTitle>
          <DialogDescription className="text-[#B8A898] dark:text-[#B8A898]">
            Share your wallet address or QR code to receive funds
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Testnet Warning */}
          {isTestnet && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-400">Testnet Only</p>
                <p className="text-xs text-yellow-400/80 mt-1">
                  This is a {network} address. Do not send mainnet funds to this address.
                </p>
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="flex flex-col items-center p-6 bg-white rounded-xl border-2 border-orange-600/30">
            {address ? (
              <QRCodeSVG
                value={address}
                size={200}
                level="H"
                includeMargin={true as boolean}
                className="rounded-lg"
              />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded-lg">
                <QrCode className="h-16 w-16 text-gray-400" />
              </div>
            )}
          </div>

          {/* Address Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#F8F5F0] dark:text-[#F8F5F0]">
              Your Wallet Address
            </label>
            <div className="flex flex-col gap-2">
              <div className="p-3 rounded-xl bg-[rgba(28,58,54,0.9)] border border-orange-600/30">
                <code className="text-xs text-[#F8F5F0] font-mono break-all block">
                  {address || '0x...'}
                </code>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCopyAddress}
                  disabled={!address}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Address
                    </>
                  )}
                </Button>

                {address && (
                  <a
                    href={getExplorerUrl(address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0"
                  >
                    <Button
                      variant="outline"
                      className="border-orange-600/30 text-orange-400 hover:bg-orange-500/20"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Network Info */}
          <div className="p-3 rounded-xl bg-[rgba(28,58,54,0.9)] border border-orange-600/30">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#B8A898] dark:text-[#B8A898]">Network</span>
              <span className="text-sm font-medium text-[#F8F5F0] dark:text-[#F8F5F0]">{network}</span>
            </div>
          </div>

          {/* Supported Tokens Info */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#B8A898] dark:text-[#B8A898]">
              Supported tokens:
            </p>
            <div className="flex flex-wrap gap-2">
              {['ETH', 'USDC', 'EURC', 'TKNZN', 'ERC-404'].map((token) => (
                <span
                  key={token}
                  className="px-2 py-1 text-xs rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30"
                >
                  {token}
                </span>
              ))}
            </div>
          </div>

          {/* Tips */}
          {isTestnet && (
            <div className="space-y-2 p-3 rounded-xl bg-[rgba(28,58,54,0.9)] border border-orange-600/30">
              <p className="text-xs font-medium text-[#F8F5F0] dark:text-[#F8F5F0]">
                Get Testnet Tokens:
              </p>
              <ul className="text-xs text-[#B8A898] dark:text-[#B8A898] space-y-1">
                <li>• <a href="https://sepoliafaucet.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Sepolia ETH Faucet</a></li>
                <li>• <a href="https://faucets.chain.link/sepolia" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Chainlink Faucet</a></li>
                <li>• Use contract addresses on Etherscan to mint test USDC/EURC</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
