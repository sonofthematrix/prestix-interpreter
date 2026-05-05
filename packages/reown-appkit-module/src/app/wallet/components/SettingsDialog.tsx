'use client'

import React from 'react'
import { X, Wallet, Network, Moon, Sun, LogOut, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { useDisconnect, useAppKitNetwork, useAppKitAccount, useWalletInfo } from '../../../config'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'
import { Button } from '../../../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  address?: string
  isConnected?: boolean
}

export function SettingsDialog({ open, onOpenChange, address: propAddress, isConnected: propIsConnected }: SettingsDialogProps) {
  // ✅ BEST PRACTICE: Use AppKit hooks directly in component
  const { address: hookAddress, caipAddress } = useAppKitAccount()
  const walletInfo = useWalletInfo()
  const { disconnect } = useDisconnect()
  const { switchNetwork } = useAppKitNetwork()
  const { theme, setTheme: setNextTheme } = useTheme()
  const router = useRouter()
  
  // Use prop address if provided, otherwise use hook address
  const address = propAddress || hookAddress || ''
  const isConnected = propIsConnected ?? !!hookAddress

  const handleDisconnect = async () => {
    try {
      await disconnect()
      onOpenChange(false)
      router.push('/')
    } catch (error) {
      console.error('Failed to disconnect:', error)
    }
  }

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      // Could add toast notification here
    }
  }

  const handleViewOnExplorer = () => {
    const explorerUrl = `https://sepolia.etherscan.io/address/${address}`
    window.open(explorerUrl, '_blank')
  }

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setNextTheme(newTheme)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Wallet Settings</DialogTitle>
          <DialogDescription>
            Manage your wallet connection and preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Wallet Info */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground dark:text-white flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet Information
            </h3>
            <div className="bg-muted dark:bg-gray-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground dark:text-gray-400">Wallet</span>
                <span className="text-sm text-foreground dark:text-white">
                  {walletInfo?.walletInfo?.name || 'Unknown'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground dark:text-gray-400">Address</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-foreground dark:text-white font-mono">
                    {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                  </span>
                  {address && (
                    <>
                      <button
                        onClick={handleCopyAddress}
                        className="p-1 hover:bg-background dark:hover:bg-gray-700 rounded transition-colors"
                        title="Copy address"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        onClick={handleViewOnExplorer}
                        className="p-1 hover:bg-background dark:hover:bg-gray-700 rounded transition-colors"
                        title="View on Explorer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Network */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground dark:text-white flex items-center gap-2">
              <Network className="h-4 w-4" />
              Network
            </h3>
            <div className="bg-muted dark:bg-gray-800 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground dark:text-gray-400">Current Network</span>
                <span className="text-sm text-foreground dark:text-white">
                  {caipAddress?.split(':')[1]?.split('@')[0] || 'Sepolia'}
                </span>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground dark:text-white flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              Appearance
            </h3>
            <div className="bg-muted dark:bg-gray-800 rounded-lg p-3">
              <button
                onClick={handleToggleTheme}
                className="w-full flex items-center justify-between text-sm text-foreground dark:text-white hover:opacity-80 transition-opacity"
              >
                <span>Theme</span>
                <span className="text-muted-foreground dark:text-gray-400 capitalize">
                  {theme || 'dark'}
                </span>
              </button>
            </div>
          </div>

          {/* Disconnect */}
          <div className="pt-4 border-t border-border dark:border-gray-700">
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              className="w-full flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Disconnect Wallet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

