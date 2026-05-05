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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { DollarSign, Droplet, ExternalLink, Copy, AlertTriangle, CheckCircle } from 'lucide-react';

interface FundWalletDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: string;
}

interface FaucetLink {
  name: string;
  url: string;
  description: string;
  tokens: string[];
}

const FAUCETS: FaucetLink[] = [
  {
    name: 'Alchemy Sepolia Faucet',
    url: 'https://sepoliafaucet.com',
    description: 'Get 0.5 Sepolia ETH per day',
    tokens: ['ETH'],
  },
  {
    name: 'Chainlink Faucet',
    url: 'https://faucets.chain.link/sepolia',
    description: 'Get Sepolia ETH and testnet LINK',
    tokens: ['ETH', 'LINK'],
  },
  {
    name: 'Infura Sepolia Faucet',
    url: 'https://www.infura.io/faucet/sepolia',
    description: 'Get 0.5 Sepolia ETH',
    tokens: ['ETH'],
  },
];

const TEST_TOKEN_CONTRACTS = [
  {
    symbol: 'USDC',
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    description: 'USD Coin (Testnet)',
  },
  {
    symbol: 'USDC',
    address: '0xbe72E441BF55620febc26715db68d3494213D8Cb',
    description: 'USD Coin (Testnet 2)',
  },
  {
    symbol: 'EURC',
    address: '0x08210F9170F89Ab7658F0B5E3fF39b0E03C594D4',
    description: 'Euro Coin (Testnet)',
  },
  {
    symbol: 'EURe',
    address: '0x67b34b93ac295c985e856E5B8A20D83026b580Eb',
    description: 'Euro (e-money)',
  },
  {
    symbol: 'PIM',
    address: '0xFC3e86566895Fb007c6A0d3809eb2827DF94F751',
    description: 'Pimlico',
  },
  {
    symbol: 'USD₮',
    address: '0xd077A400968890Eacc75cdc901F0356c943e4fDb',
    description: 'Tether USD (Testnet)',
  },
  {
    symbol: 'TKNZN',
    address: '0xb0af8e94C74c2346609c3d94FCba61Ae85cf3e6e',
    description: 'Tokenizin Token',
  },
];

export function FundWalletDialog({ open, onOpenChange, address }: FundWalletDialogProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [activeMethod, setActiveMethod] = useState<'faucets' | 'contracts'>('faucets');

  const handleCopyAddress = async (addr: string, label: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopiedAddress(label);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-[#1C3A36] to-[#0F2A26] dark:from-[#1C3A36] dark:to-[#0F2A26] border-2 border-orange-600/30 dark:border-orange-400/30 rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#F8F5F0] dark:text-[#F8F5F0] flex items-center gap-2">
            <Droplet className="h-5 w-5 text-orange-400" />
            Get Testnet Tokens
          </DialogTitle>
          <DialogDescription className="text-[#B8A898] dark:text-[#B8A898]">
            Fund your Sepolia testnet wallet with free tokens
          </DialogDescription>
        </DialogHeader>

        {/* Testnet Warning */}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 mt-4">
          <AlertTriangle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-400">Sepolia Testnet Only</p>
            <p className="text-xs text-yellow-400/80 mt-1">
              These are test tokens with no real value. OnRamp (buying with fiat) only works on mainnet.
            </p>
          </div>
        </div>

        <Tabs value={activeMethod} onValueChange={(v) => setActiveMethod(v as 'faucets' | 'contracts')} className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-[rgba(10,58,42,0.6)] border border-orange-600/30">
            <TabsTrigger value="faucets" className="text-xs">
              <Droplet className="h-3.5 w-3.5 mr-1" />
              Faucets
            </TabsTrigger>
            <TabsTrigger value="contracts" className="text-xs">
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Token Contracts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="faucets" className="space-y-4 mt-4">
            <div className="space-y-3">
              <p className="text-sm text-[#F8F5F0] dark:text-[#F8F5F0] font-medium">
                Get Free Sepolia ETH
              </p>

              {FAUCETS.map((faucet) => (
                <Card key={faucet.name} className="bg-[rgba(28,58,54,0.9)] border-orange-600/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-[#F8F5F0] text-sm flex items-center justify-between">
                      {faucet.name}
                      <a
                        href={faucet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-orange-400 hover:text-orange-300"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-orange-600/30 text-orange-400 hover:bg-orange-500/20"
                        >
                          Get Tokens
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </Button>
                      </a>
                    </CardTitle>
                    <CardDescription className="text-[#B8A898] text-xs">
                      {faucet.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-1 flex-wrap">
                      {faucet.tokens.map((token) => (
                        <span
                          key={token}
                          className="px-2 py-0.5 text-xs rounded bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        >
                          {token}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 mt-4">
                <p className="text-xs text-blue-400 flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>
                    You'll need ETH first to pay for gas fees on other transactions. Get ETH from a faucet above before minting test tokens.
                  </span>
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4 mt-4">
            <div className="space-y-3">
              <p className="text-sm text-[#F8F5F0] dark:text-[#F8F5F0] font-medium">
                Test Token Contracts
              </p>
              <p className="text-xs text-[#B8A898] dark:text-[#B8A898]">
                Use these contract addresses on Etherscan to mint test tokens (requires ETH for gas)
              </p>

              {TEST_TOKEN_CONTRACTS.map((token) => (
                <Card key={token.symbol} className="bg-[rgba(28,58,54,0.9)] border-orange-600/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-[#F8F5F0] text-sm">
                      {token.symbol}
                    </CardTitle>
                    <CardDescription className="text-[#B8A898] text-xs">
                      {token.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs text-[#F8F5F0] font-mono bg-[rgba(15,42,38,0.9)] p-2 rounded border border-orange-600/20 break-all">
                          {token.address}
                        </code>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyAddress(token.address, token.symbol)}
                          className="flex-1 border-orange-600/30 text-orange-400 hover:bg-orange-500/20 text-xs"
                        >
                          {copiedAddress === token.symbol ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                        <a
                          href={`https://sepolia.etherscan.io/address/${token.address}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1"
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full border-orange-600/30 text-orange-400 hover:bg-orange-500/20 text-xs"
                          >
                            View on Etherscan
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Your Wallet Address */}
        {address && (
          <div className="mt-4 p-3 rounded-xl bg-[rgba(28,58,54,0.9)] border border-orange-600/30">
            <p className="text-xs font-medium text-[#B8A898] dark:text-[#B8A898] mb-2">
              Your Wallet Address:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-[#F8F5F0] font-mono break-all">
                {address}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyAddress(address, 'wallet')}
                className="flex-shrink-0 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20"
              >
                {copiedAddress === 'wallet' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

