'use client'

import React, { useEffect, useRef } from 'react'
import { useTokenizinWalletStore } from '@/lib/store/tokenizinWalletStore'
import { useWalletSignatureStore } from '../../store/walletSignatureStore'
import { TigerSpinner } from '../common/TigerSpinner'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Address } from 'viem'

interface WalletInitializationProgressProps {
  walletAddress: Address | null
  className?: string
}

interface Step {
  id: string
  label: string
  icon: React.ReactNode
}

const steps: Step[] = [
  {
    id: 'balances',
    label: 'Fetching balances',
    icon: <Circle className="h-5 w-5" />,
  },
  {
    id: 'tokens',
    label: 'Fetching tokens',
    icon: <Circle className="h-5 w-5" />,
  },
  {
    id: 'properties',
    label: 'Fetching properties',
    icon: <Circle className="h-5 w-5" />,
  },
  {
    id: 'transactions',
    label: 'Fetching transactions',
    icon: <Circle className="h-5 w-5" />,
  },
  {
    id: 'signing',
    label: 'Signing Message',
    icon: <Circle className="h-5 w-5" />,
  },
]

export function WalletInitializationProgress({
  walletAddress,
  className,
}: WalletInitializationProgressProps) {
  const loading = useTokenizinWalletStore((state) => state.loading)
  const isFetchingAll = useTokenizinWalletStore((state) => state.isFetchingAll)
  const fetchingAddress = useTokenizinWalletStore((state) => state.fetchingAddress)
  
  // Track signing state from wallet signature store
  const { isSigning, isAuthenticating, signature, walletAddress: signingWalletAddress } = useWalletSignatureStore()
  const isSigningStep = walletAddress && signingWalletAddress?.toLowerCase() === walletAddress.toLowerCase()
  // Signing is completed if:
  // 1. Signature exists and not currently signing/authenticating, OR
  // 2. We're fetching data (which means signing already happened)
  const signingCompleted = (isSigningStep && signature !== null && !isSigning && !isAuthenticating) || (isFetchingAll && walletAddress === fetchingAddress)
  
  // Ref to prevent multiple verification calls
  const verificationCalledRef = useRef(false)

  // Only show if we're fetching for this specific address
  const isActive = isFetchingAll && fetchingAddress === walletAddress

  if (!isActive || !walletAddress) {
    return null
  }

  // Determine step states based on sequential loading pattern
  const getStepState = (stepId: string): 'pending' | 'loading' | 'completed' => {
    switch (stepId) {
      case 'balances':
        if (loading.balances) return 'loading'
        // Completed if balances are done (tokens may be loading or all done)
        if (!loading.balances) return 'completed'
        return 'pending'
      
      case 'tokens':
        if (loading.tokens) return 'loading'
        // Completed if tokens are done and balances are done
        if (!loading.tokens && !loading.balances) return 'completed'
        // Pending if balances are still loading
        if (loading.balances) return 'pending'
        return 'completed'
      
      case 'properties':
        if (loading.properties) return 'loading'
        // Completed if properties are done and previous steps are done
        if (!loading.properties && !loading.tokens && !loading.balances) return 'completed'
        // Pending if previous steps are still loading
        if (loading.balances || loading.tokens) return 'pending'
        return 'completed'
      
      case 'transactions':
        if (loading.transactions) return 'loading'
        // Completed if transactions are done and all previous steps are done
        if (!loading.transactions && !loading.properties && !loading.tokens && !loading.balances) {
          return 'completed'
        }
        // Pending if any previous step is still loading
        if (loading.balances || loading.tokens || loading.properties) return 'pending'
        return 'completed'
      
      case 'signing':
        // Signing step is completed if:
        // 1. Signature exists and not currently signing/authenticating, OR
        // 2. We're fetching data (which means signing already happened)
        if (signingCompleted) return 'completed'
        // Signing step is loading if currently signing or authenticating
        if (isSigningStep && (isSigning || isAuthenticating)) return 'loading'
        // Signing step is pending otherwise
        return 'pending'
      
      default:
        return 'pending'
    }
  }

  const completedSteps = steps.filter((step) => getStepState(step.id) === 'completed').length
  const progressPercentage = (completedSteps / steps.length) * 100
  
  // Call wallet verification after all steps complete
  useEffect(() => {
    // Reset verification flag when wallet address changes
    if (verificationCalledRef.current && fetchingAddress !== walletAddress) {
      verificationCalledRef.current = false
    }
    
    // All steps are completed when:
    // 1. All 5 steps show as completed
    // 2. Data fetching is done (!isFetchingAll)
    // 3. Signing is completed (signature exists or was completed)
    const allDataStepsCompleted = !loading.balances && !loading.tokens && !loading.properties && !loading.transactions
    const allStepsCompleted = completedSteps === steps.length && !isFetchingAll && allDataStepsCompleted && (signingCompleted || signature !== null)
    
    if (allStepsCompleted && walletAddress && !verificationCalledRef.current) {
      verificationCalledRef.current = true
      console.log('✅ [WalletInitializationProgress] All steps completed, calling wallet verification...')
      
      // Call wallet verification API
      fetch('/api/auth/wallet/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: walletAddress,
          lookupOnly: true,
          checkCompleteness: true,
          initializeMissing: true,
        }),
      })
        .then((response) => {
          if (response.ok) {
            console.log('✅ [WalletInitializationProgress] Wallet verification successful')
            return response.json()
          } else {
            console.warn('⚠️ [WalletInitializationProgress] Wallet verification failed:', response.status)
            return null
          }
        })
        .then((data) => {
          if (data) {
            console.log('✅ [WalletInitializationProgress] Wallet verification complete:', {
              userId: data.user?.id,
              isComplete: data.isComplete,
            })
          }
        })
        .catch((error) => {
          console.warn('⚠️ [WalletInitializationProgress] Error calling wallet verification:', error)
          // Reset flag on error so it can be retried if needed
          verificationCalledRef.current = false
        })
    }
  }, [completedSteps, steps.length, isFetchingAll, loading.balances, loading.tokens, loading.properties, loading.transactions, signingCompleted, signature, walletAddress, fetchingAddress])

  return (
    <div
      className={cn(
        'w-full max-w-md mx-auto p-6 bg-card border border-border rounded-lg shadow-lg',
        'dark:bg-gray-900 dark:border-gray-800',
        className
      )}
    >
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground dark:text-white mb-2">
          Setting up your wallet
        </h3>
        <p className="text-sm text-muted-foreground dark:text-gray-400">
          Initializing wallet data and fetching your assets...
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground dark:text-gray-500 mt-2 text-center">
          {completedSteps} of {steps.length} steps completed
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const state = getStepState(step.id)
          
          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg transition-all duration-300',
                state === 'loading' && 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900',
                state === 'completed' && 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900',
                state === 'pending' && 'bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800'
              )}
            >
              {/* Step Icon */}
              <div className="flex-shrink-0">
                {state === 'completed' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : state === 'loading' ? (
                  <Loader2 className="h-5 w-5 text-orange-600 dark:text-orange-400 animate-spin" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400 dark:text-gray-600" />
                )}
              </div>

              {/* Step Label */}
              <div className="flex-1">
                <p
                  className={cn(
                    'text-sm font-medium transition-colors',
                    state === 'completed' && 'text-green-700 dark:text-green-300',
                    state === 'loading' && 'text-orange-700 dark:text-orange-300',
                    state === 'pending' && 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {step.label}
                </p>
              </div>

              {/* Step Number */}
              <div
                className={cn(
                  'flex-shrink-0 text-xs font-semibold px-2 py-1 rounded',
                  state === 'completed' && 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                  state === 'loading' && 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
                  state === 'pending' && 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                )}
              >
                {index + 1}/{steps.length}
              </div>
            </div>
          )
        })}
      </div>

      {/* Completion Message */}
      {completedSteps === steps.length && !isFetchingAll && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300 font-medium text-center">
            ✅ Wallet setup complete!
          </p>
        </div>
      )}
    </div>
  )
}

