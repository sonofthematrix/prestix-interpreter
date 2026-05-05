'use client';

import { Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppKitAccount } from '../../config';
import { Button } from '../../components/ui/button';

interface TokenizinWalletButtonProps {
  className?: string;
}

export function TokenizinWalletButton({ className }: TokenizinWalletButtonProps) {
  const router = useRouter();
  const { isConnected } = useAppKitAccount();

  const handleClick = () => {
    if (isConnected) {
      router.push('/wallet');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={!isConnected}
      className={`hover:bg-orange-600/10 dark:hover:bg-orange-500/20 ${className}`}
      title={isConnected ? 'View Wallet' : 'Connect wallet to view'}
    >
      <Wallet className="h-4 w-4 text-foreground dark:text-gray-300" />
    </Button>
  );
}
