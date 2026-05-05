'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Wallet, 
  Send, 
  ArrowDown, 
  ArrowLeftRight, 
  History,
  Coins,
  Building2,
  Settings,
  QrCode
} from 'lucide-react'
import { cn } from '../../lib/utils'

interface WalletNavItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

const walletNavItems: WalletNavItem[] = [
  { id: 'wallet', label: 'Wallet', icon: Wallet, href: '/wallet' },
  { id: 'send', label: 'Send', icon: Send, href: '/wallet/send' },
  { id: 'receive', label: 'Receive', icon: ArrowDown, href: '/wallet/receive' },
  { id: 'swap', label: 'Swap', icon: ArrowLeftRight, href: '/wallet' },
  { id: 'activity', label: 'Activity', icon: History, href: '/wallet' },
]

interface WalletNavigationProps {
  className?: string
  variant?: 'desktop' | 'mobile'
}

export function WalletNavigation({ className, variant = 'desktop' }: WalletNavigationProps) {
  const pathname = usePathname()

  if (variant === 'mobile') {
    return (
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card dark:bg-gray-900 border-t border-border dark:border-gray-800",
        "safe-area-inset-bottom",
        className
      )}>
        <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
          {walletNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
              (item.href === '/wallet' && pathname?.startsWith('/wallet') && pathname !== '/wallet/send' && pathname !== '/wallet/receive')
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1",
                  "px-3 py-2 rounded-lg transition-colors",
                  "min-w-[60px]",
                  isActive
                    ? "text-primary dark:text-orange-400 bg-primary/10 dark:bg-orange-500/20"
                    : "text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-gray-800"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  // Desktop variant - horizontal navigation
  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {walletNavItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || 
          (item.href === '/wallet' && pathname?.startsWith('/wallet') && pathname !== '/wallet/send' && pathname !== '/wallet/receive')
        
        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
              isActive
                ? "text-primary dark:text-orange-400 bg-primary/10 dark:bg-orange-500/20"
                : "text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-gray-800"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

