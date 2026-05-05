'use client';

import Image from 'next/image';
import { useAppKitNetwork, networks } from '../config';
import { WuiButton } from '@reown/appkit-ui/wui-button';  
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppKitNetwork } from '@reown/appkit/networks';  
import { WuiNetworkImage } from '@reown/appkit-ui/wui-network-image';
interface NetworkSelectorProps {
  className?: string;
}

/**
 * NetworkSelector - Custom network selector component for Tokenizin
 *
 * Provides a dropdown menu to switch between configured blockchain networks.
 * Uses AppKit's useAppKitNetwork hook for network switching functionality.
 */
export function NetworkSelector({ className }: NetworkSelectorProps) {
  const { chainId, switchNetwork,  } = useAppKitNetwork();

  const handleNetworkSwitch = async (networkId: number) => {
    try {
      await switchNetwork(networkId as unknown as AppKitNetwork); 
      } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };
  // Get current network info
  const currentNetwork = networks.find(network => network.id === chainId);
  return (
    <Image
      src={'https://assets.reown.io/network-connectors/ethereum.svg'}
      width={24}
      height={24}
      className="w-full h-full object-cover rounded-full"
      alt="Network connector icon"
    />    
  );
}
