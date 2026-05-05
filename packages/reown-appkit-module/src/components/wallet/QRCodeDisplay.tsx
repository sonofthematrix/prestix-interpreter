'use client'

import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Address } from 'viem'
import { generateQRCodeData } from '../../lib/utils/qr-code'

interface QRCodeDisplayProps {
  /** Wallet address or EIP-681 URI */
  value: string | Address
  /** Size of QR code in pixels */
  size?: number
  /** Chain ID for EIP-681 URI generation (default: 11155111 for Sepolia) */
  chainId?: number
  /** Token contract address (optional, for ERC20 tokens) */
  tokenAddress?: Address | string
  /** Amount in token's smallest unit (optional) */
  amount?: string
  /** Background color (default: white) */
  bgColor?: string
  /** Foreground color (default: black) */
  fgColor?: string
  /** Error correction level */
  level?: 'L' | 'M' | 'Q' | 'H'
  /** Include margin around QR code */
  includeMargin?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * QR Code Display Component
 * 
 * Generates QR codes client-side using qrcode.react library.
 * Supports both plain addresses and EIP-681 URIs for token transfers.
 * 
 * @example
 * ```tsx
 * // Plain address QR code
 * <QRCodeDisplay value="0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047" />
 * 
 * // EIP-681 URI for token transfer
 * <QRCodeDisplay 
 *   value="0x8eD7F4FB3Aa1a3B346756624B17094dfd6040047"
 *   tokenAddress="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
 *   amount="1000000"
 * />
 * ```
 */
export function QRCodeDisplay({
  value,
  size = 200,
  chainId = 11155111,
  tokenAddress,
  amount,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  level = 'M',
  includeMargin = true,
  className = '',
}: QRCodeDisplayProps) {
  // Generate QR code data (EIP-681 URI or plain address)
  const qrData = React.useMemo(() => {
    // If value is already an EIP-681 URI, use it directly
    if (typeof value === 'string' && value.startsWith('ethereum:')) {
      return value
    }
    
    // Otherwise, generate QR code data
    return generateQRCodeData(
      value as Address | string,
      chainId,
      tokenAddress,
      amount
    )
  }, [value, chainId, tokenAddress, amount])

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div 
        className="p-4 rounded-lg"
        style={{ backgroundColor: bgColor }}
      >
        <QRCodeSVG
          value={qrData}
          size={size}
          bgColor={bgColor}
          fgColor={fgColor}
          level={level}
          includeMargin={includeMargin}
        />
      </div>
    </div>
  )
}

