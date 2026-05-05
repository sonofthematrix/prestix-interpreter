'use client'

import React from 'react'
import { 
  DollarSign, 
  ArrowLeftRight, 
  Send, 
  ArrowDown,
  Building2,
  Gift,
  Gamepad2,
} from 'lucide-react'
import { useActionButtons } from '../../../store/uiStore'

interface ActionButtonsProps {
  themeMode: string
  onBuyClick?: () => void
  onSwapClick?: () => void
  onSendClick?: () => void
  onReceiveClick?: () => void
  onRWAClick?: () => void
  onRewardsClick?: () => void
  onGameFiClick?: () => void
}

export function ActionButtons({ 
  themeMode,
  onBuyClick,
  onSwapClick,
  onSendClick,
  onReceiveClick,
  onRWAClick,
  onRewardsClick,
  onGameFiClick,
}: ActionButtonsProps) {
  // ✅ CORRECT: Use Zustand store instead of useState
  const { activeButton, setActiveButton } = useActionButtons()

  const primaryButtons = [
    {
      id: 'buy',
      label: 'Buy',
      icon: DollarSign,
      onClick: () => {
        onBuyClick?.()
      },
    },
    {
      id: 'swap',
      label: 'Swap',
      icon: ArrowLeftRight,
      onClick: () => {
        onSwapClick?.()
      },
    },
    {
      id: 'send',
      label: 'Send',
      icon: Send,
      onClick: () => {
        onSendClick?.()
      },
    },
    {
      id: 'receive',
      label: 'Receive',
      icon: ArrowDown,
      onClick: () => {
        onReceiveClick?.()
      },
    },
  ]

  const secondaryButtons = [
    {
      id: 'rwa',
      label: 'RWA Assets',
      icon: Building2,
      onClick: () => {
        onRWAClick?.()
      },
    },
    {
      id: 'rewards',
      label: 'Rewards',
      icon: Gift,
      onClick: () => {
        onRewardsClick?.()
      },
    },
    {
      id: 'gamefi',
      label: 'Game-Fi',
      icon: Gamepad2,
      onClick: () => {
        onGameFiClick?.()
      },
    },
  ]

  const renderButton = (button: typeof primaryButtons[0]) => {
    const Icon = button.icon
    return (
      <button
        key={button.id}
        onClick={() => {
          setActiveButton(button.id)
          button.onClick()
          setTimeout(() => setActiveButton(null), 200)
        }}
        className={`
          flex flex-col items-center justify-center gap-2 p-4 rounded-xl
          bg-card dark:bg-gray-800 border border-border dark:border-gray-700
          hover:bg-muted dark:hover:bg-gray-700 transition-all
          ${activeButton === button.id ? 'scale-95' : 'scale-100'}
        `}
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-orange-500/20 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary dark:text-orange-500" />
        </div>
        <span className="text-xs font-medium text-foreground dark:text-white">
          {button.label}
        </span>
      </button>
    )
  }

  return (
    <div className="mb-6">
      {/* Primary Action Buttons */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {primaryButtons.map(renderButton)}
      </div>
      
      {/* Secondary Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {secondaryButtons.map(renderButton)}
      </div>
    </div>
  )
}

