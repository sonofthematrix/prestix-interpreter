'use client';

import { useAppKitAccount } from '@reown/appkit/react';
import { Copy, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/button';

export function WalletInfo() {
  const { address, isConnected } = useAppKitAccount();

  if (!isConnected || !address) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Wallet not connected
      </div>
    );
  }

  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
  };

  const openEtherscan = () => {
    window.open(`https://etherscan.io/address/${address}`, '_blank');
  };

  return (
    <div className="p-4 space-y-3">
      <div className="text-sm">
        <div className="font-medium text-foreground dark:text-white">Connected Wallet</div>
        <div className="text-muted-foreground dark:text-gray-400 font-mono text-xs mt-1">
          {shortAddress}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={copyAddress}
          className="flex-1"
        >
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={openEtherscan}
          className="flex-1"
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          View
        </Button>
      </div>
    </div>
  );
}
