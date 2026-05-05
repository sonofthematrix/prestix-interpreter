'use client'

import React, { useState } from 'react'
import { Copy, ChevronDown, Menu, Settings, LogOut, ExternalLink, Wallet } from 'lucide-react'
import { useDisconnect } from '../../../config'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'
import { Button } from '../../../components/ui/button'

interface WalletHeaderProps {
  account: ReturnType<typeof import('../../../config').useAppKitAccount>
  network: ReturnType<typeof import('../../../config').useAppKitNetwork>
  walletInfo: ReturnType<typeof import('../../../config').useWalletInfo>
  themeMode: string
  onSettingsClick?: () => void
}

export function WalletHeader({ account, network, walletInfo, themeMode, onSettingsClick }: WalletHeaderProps) {
  const address = account.address || ''
  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''
  const networkName = network?.caipNetwork?.name || 'Unknown'
  const walletName = walletInfo?.walletInfo?.name || 'Wallet'
  const { disconnect } = useDisconnect()
  const router = useRouter()
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      // You could add a toast notification here
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
      setShowDisconnectDialog(false)
      setShowMenu(false)
      router.push('/')
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const handleViewOnExplorer = () => {
    const explorerUrl = `https://sepolia.etherscan.io/address/${address}`
    window.open(explorerUrl, '_blank')
    setShowMenu(false)
  }

  // Close menu when clicking outside
  React.useEffect(() => {
    if (!showMenu) return
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.menu-container')) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  return (
    <>
      <div className="sticky top-0 z-50 bg-background dark:bg-gray-950 border-b border-border dark:border-gray-800">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Title and Network */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground dark:text-white">
                  Tokenizin Wallet
                </h1>
                <ChevronDown className="h-4 w-4 text-muted-foreground dark:text-gray-400" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground dark:text-gray-400">
                  {shortAddress || 'Not connected'}
                </span>
                {address && (
                  <button
                    onClick={handleCopyAddress}
                    className="p-1 hover:bg-muted dark:hover:bg-gray-800 rounded transition-colors"
                    title="Copy address"
                  >
                    <Copy className="h-3 w-3 text-muted-foreground dark:text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Settings and Menu */}
            <div className="flex items-center gap-2 relative menu-container">
              <button 
                onClick={() => {
                  if (onSettingsClick) {
                    onSettingsClick()
                  } else {
                    setShowMenu(!showMenu)
                  }
                }}
                className="p-2 hover:bg-muted dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="h-5 w-5 text-muted-foreground dark:text-gray-400" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-card dark:bg-gray-800 border border-border dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    <button
                      onClick={handleViewOnExplorer}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground dark:text-white hover:bg-muted dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      View on Explorer
                    </button>
                    <button
                      onClick={() => {
                        setShowDisconnectDialog(true)
                        setShowMenu(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-muted dark:hover:bg-gray-700 rounded transition-colors mt-1"
                    >
                      <LogOut className="h-4 w-4" />
                      Disconnect Wallet
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Wallet?</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect your wallet? You'll need to reconnect to access your wallet features.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
            >
              Disconnect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

