'use client';

import { Wallet, Coins, Building2, Trophy, Gift, Gamepad2, History } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MobileBottomNavProps {
  activePage: string;
  onPageChange: (page: string) => void;
  className?: string;
}

const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: Wallet },
  { id: 'valuation', label: 'Assets', icon: Building2 },
  { id: 'tokens', label: 'Tokens', icon: Coins },
  { id: 'tier', label: 'Tier', icon: Trophy },
  { id: 'rewards', label: 'Rewards', icon: Gift },
  { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
  { id: 'history', label: 'History', icon: History },
];

export function MobileBottomNav({ activePage, onPageChange, className }: MobileBottomNavProps) {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[10000]',
        'bg-gradient-to-t from-[#1C3A36] to-[#0F2A26]',
        'border-t-2 border-orange-600/30',
        'shadow-[0_-4px_20px_rgba(230,184,0,0.15)]',
        'backdrop-blur-sm',
        'md:hidden', // Only show on mobile
        className
      )}
    >
      <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center',
                'px-2 py-1.5 rounded-lg',
                'transition-all duration-200',
                'min-w-[60px]',
                isActive
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-[#B8A898] hover:text-[#F8F5F0] hover:bg-orange-500/10'
              )}
              aria-label={item.label}
            >
              <Icon
                className={cn(
                  'h-5 w-5 mb-1',
                  isActive && 'text-orange-400'
                )}
              />
              <span className="text-[10px] font-medium leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

