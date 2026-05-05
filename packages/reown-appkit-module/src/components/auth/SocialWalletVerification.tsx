'use client'

import React, { useState, useCallback } from 'react'
import { useAppKitAccount, useAppKit } from '@reown/appkit/react'
import { useSignMessage, useAccount } from 'wagmi'
import { useSession } from 'next-auth/react'
import { Button } from '../ui/button'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { CheckCircle2, Wallet, AlertCircle, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

/**
 * SocialWalletVerification Component
 * 
 * Allows users who signed in with social login (Google) to:
 * 1. Connect a wallet
 * 2. Sign a SIWE message to verify wallet address ownership
 * 3. Link wallet address to their social login account
 * 
 * This enables wallet verification for social login users.
 */
export function SocialWalletVerification() {
  const { data: session, update: updateSession } = useSession()
  const { address, isConnected } = useAppKitAccount()
  const { address: wagmiAddress } = useAccount()
  const { open } = useAppKit()
  const { signMessageAsync } = useSignMessage()
  const { toast } = useToast()
  
  // Use wagmi address if available, otherwise use AppKit address
  const walletAddress = wagmiAddress || address
  
  const [isConnecting, setIsConnecting] = useState(false)
  const [isSigning, setIsSigning] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVerified, setIsVerified] = useState(false)
  
  // Check if user has social login but no wallet
  const hasSocialLogin = session?.user && !session?.user?.walletAddress
  const hasWallet = isConnected && !!walletAddress
  
  // Handle wallet connection
  const handleConnectWallet = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    
    try {
      // Open AppKit modal to connect wallet
      await open({ view: 'Connect' })
    } catch (error: any) {
      console.error('Failed to connect wallet:', error)
      setError(error?.message || 'Failed to connect wallet')
      toast({
        title: 'Connection Failed',
        description: 'Failed to open wallet connection modal',
        variant: 'destructive',
      })
    } finally {
      setIsConnecting(false)
    }
  }, [open, toast])
  
  // Handle wallet verification via SIWE message signing
  const handleVerifyWallet = useCallback(async () => {
    if (!walletAddress || !isConnected) {
      setError('Please connect a wallet first')
      return
    }
    
    setIsSigning(true)
    setIsVerifying(true)
    setError(null)
    
    try {
      // Step 1: Get nonce from server
      const nonceRes = await fetch('/api/auth/wallet/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: walletAddress }),
      })
      
      if (!nonceRes.ok) {
        throw new Error('Failed to get nonce')
      }
      
      const { nonce } = await nonceRes.json()
      
      // Step 2: Create SIWE message
      const domain = typeof window !== 'undefined' ? window.location.host : 'TKNZN.pro'
      const uri = typeof window !== 'undefined' ? window.location.origin : 'https://TKNZN.pro'
      const statement = 'Verify wallet address ownership for Tokenizin'
      const chainId = 11155111 // Sepolia
      const issuedAt = new Date().toISOString()
      const expirationTime = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      
      const message = `${domain} wants you to sign in with your Ethereum account:
${walletAddress}

${statement}

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expirationTime}`
      
      // Step 3: Sign message
      console.log('📝 [SocialWalletVerification] Requesting signature for wallet verification...')
      const signature = await signMessageAsync({ 
        account: walletAddress as `0x${string}`,
        message 
      })
      
      if (!signature) {
        throw new Error('Failed to obtain signature')
      }
      
      // Step 4: Verify signature on server and link wallet to social account
      const verifyRes = await fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          signature,
          nonce,
          walletAddress: walletAddress,
          chainId: chainId.toString(),
          linkToSocialAccount: true, // Link wallet to existing social login account
        }),
      })
      
      if (!verifyRes.ok) {
        const errorData = await verifyRes.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to verify wallet')
      }
      
      const { user } = await verifyRes.json()
      
      // Step 5: Update NextAuth session to include wallet address
      await updateSession()
      
      // Step 6: Update Zustand auth store
      try {
        const { useAuthStore } = await import('@/stores/auth-store')
        const authStore = useAuthStore.getState()
        if (user) {
          authStore.setUser(user as any)
        }
      } catch (storeError) {
        console.warn('Failed to update auth store:', storeError)
      }
      
      setIsVerified(true)
      toast({
        title: 'Wallet Verified',
        description: `Wallet ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} has been verified and linked to your account`,
        variant: 'default',
      })
      
      console.log('✅ [SocialWalletVerification] Wallet verification successful')
    } catch (error: any) {
      console.error('❌ [SocialWalletVerification] Wallet verification failed:', error)
      const errorMessage = error?.message || 'Failed to verify wallet'
      setError(errorMessage)
      toast({
        title: 'Verification Failed',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSigning(false)
      setIsVerifying(false)
    }
  }, [address, isConnected, signMessageAsync, updateSession, toast])
  
  // Don't show if user already has wallet or no social login
  if (!hasSocialLogin || isVerified) {
    return null
  }
  
  return (
    <Alert className="mb-6 border-blue-500/50 bg-blue-500/10">
      <Wallet className="h-4 w-4 text-blue-500" />
      <AlertTitle className="text-blue-500">Verify Wallet Address</AlertTitle>
      <AlertDescription className="text-blue-500">
        Connect and verify a wallet address to link it to your account. This allows you to:
        <ul className="mt-2 ml-4 list-disc space-y-1">
          <li>Access wallet-protected features</li>
          <li>Make transactions and investments</li>
          <li>Verify ownership of wallet addresses</li>
        </ul>
      </AlertDescription>
      
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="mt-4 flex gap-2">
        {!hasWallet ? (
          <Button
            onClick={handleConnectWallet}
            disabled={isConnecting}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleVerifyWallet}
            disabled={isSigning || isVerifying}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            {isSigning || isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isSigning ? 'Signing...' : 'Verifying...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Verify Wallet
              </>
            )}
          </Button>
        )}
      </div>
      
      {hasWallet && (
        <p className="mt-2 text-sm text-muted-foreground dark:text-gray-400">
          Connected: {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
        </p>
      )}
    </Alert>
  )
}

