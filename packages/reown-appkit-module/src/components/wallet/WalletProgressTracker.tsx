'use client'

import React from 'react'
import { useTokenizinWalletStore, type FetchProgress, type OperationProgress, type ContractProgress } from '../../store/tokenizinWalletStore'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Progress } from '../../components/ui/progress'
import { TigerSpinner } from '../../components/common/TigerSpinner'
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'

interface TokenizinWalletProgressTrackerProps {
  className?: string
}

export function TokenizinWalletProgressTracker({ className }: TokenizinWalletProgressTrackerProps) {
  const progress = useTokenizinWalletStore((state) => state.progress)

  if (!progress.isActive) {
    return null
  }

  const formatDuration = (ms: number | undefined) => {
    if (!ms) return ''
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const getStatusIcon = (status: OperationProgress['status'] | ContractProgress['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'in-progress':
      case 'fetching':
        return <Loader2 className="h-4 w-4 text-orange-600 dark:text-orange-400 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getOperationLabel = (operation: OperationProgress['operation']) => {
    switch (operation) {
      case 'balances':
        return 'Token Balances'
      case 'tokens':
        return 'ERC20 Tokens'
      case 'properties':
        return 'Property Tokens'
      case 'transactions':
        return 'Transaction History'
      default:
        return operation
    }
  }

  const elapsedTime = progress.startedAt ? Date.now() - progress.startedAt : 0

  return (
    <Card className={`bg-card dark:bg-gray-800 border-border dark:border-gray-700 ${className}`}>
      <CardHeader>
        <CardTitle className="text-foreground dark:text-white flex items-center gap-2">
          <TigerSpinner size="sm" />
          <span>Syncing Blockchain Data</span>
          {elapsedTime > 0 && (
            <span className="text-sm font-normal text-muted-foreground dark:text-gray-400 ml-auto">
              {formatDuration(elapsedTime)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground dark:text-white font-medium">
              Overall Progress
            </span>
            <span className="text-muted-foreground dark:text-gray-400">
              {progress.overallProgress}%
            </span>
          </div>
          <Progress value={progress.overallProgress} className="h-2" />
        </div>

        {/* Operation Progress */}
        <div className="space-y-3">
          {progress.operations.map((operation, index) => {
            const isCurrentStep = index + 1 === progress.currentStep
            const operationProgress = operation.totalContracts > 0
              ? Math.round((operation.completedContracts / operation.totalContracts) * 100)
              : operation.status === 'completed' ? 100 : operation.status === 'in-progress' ? 50 : 0

            return (
              <div
                key={operation.operation}
                className={`p-3 rounded-lg border ${
                  isCurrentStep
                    ? 'bg-orange-600/10 dark:bg-orange-500/20 border-orange-600/30 dark:border-orange-400/40'
                    : 'bg-muted/50 dark:bg-gray-900/50 border-border dark:border-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(operation.status)}
                    <span className="text-sm font-medium text-foreground dark:text-white">
                      {getOperationLabel(operation.operation)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground dark:text-gray-400">
                    {operation.completedContracts}/{operation.totalContracts} contracts
                    {operation.totalItems > 0 && ` • ${operation.storedItems}/${operation.totalItems} items`}
                  </span>
                </div>

                {operation.status === 'in-progress' && (
                  <Progress value={operationProgress} className="h-1.5 mb-2" />
                )}

                {/* Contract Details */}
                {operation.contracts.length > 0 && (
                  <div className="mt-2 space-y-1.5 pl-6">
                    {operation.contracts.map((contract) => (
                      <div
                        key={contract.contractAddress}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(contract.status)}
                          <span className="text-muted-foreground dark:text-gray-400">
                            {contract.contractName}
                          </span>
                        </div>
                        {contract.itemsFound > 0 && (
                          <span className="text-muted-foreground dark:text-gray-500">
                            {contract.itemsStored}/{contract.itemsFound} items
                          </span>
                        )}
                        {contract.error && (
                          <span className="text-xs text-red-600 dark:text-red-400 ml-2">
                            ({contract.error.slice(0, 30)}...)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {operation.error && (
                  <div className="mt-2 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 pl-6">
                    <div className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">
                          Error
                        </div>
                        <div className="text-xs text-red-700 dark:text-red-300">
                          {operation.error}
                        </div>
                        {operation.error.includes('Network error') && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1 italic">
                            Please check your internet connection and try again.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

