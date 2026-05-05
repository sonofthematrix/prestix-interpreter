'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { X, Camera, AlertCircle, Loader2, Keyboard } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'

interface QRScannerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanSuccess: (result: QRScanResult) => void
  onError?: (error: string) => void
}

export interface QRScanResult {
  address: string
  tokenAddress?: string
  network?: string
  tokenType?: 'native' | 'ERC20' | 'ERC721' | 'ERC1155' | 'ERC404'
  amount?: string
  chainId?: number
}

/**
 * Parse EIP-681 URI format: ethereum:address@chainId/transfer?address=tokenAddress&uint256=amount
 * Also handles plain Ethereum addresses
 */
function parseQRCodeData(qrData: string): QRScanResult | null {
  try {
    // Check if it's an EIP-681 URI
    if (qrData.startsWith('ethereum:')) {
      const uri = new URL(qrData.replace('ethereum:', 'http://'))
      const address = uri.hostname || uri.pathname.split('@')[0]
      const chainId = uri.pathname.includes('@') 
        ? parseInt(uri.pathname.split('@')[1]?.split('/')[0] || '1')
        : 1
      
      const params = new URLSearchParams(uri.search)
      const tokenAddress = params.get('address')
      const amount = params.get('uint256')
      
      // Determine token type based on URI path
      let tokenType: QRScanResult['tokenType'] = 'native'
      if (uri.pathname.includes('/transfer')) {
        tokenType = tokenAddress ? 'ERC20' : 'native'
      } else if (uri.pathname.includes('/nft')) {
        tokenType = 'ERC721'
      }
      
      return {
        address: address.startsWith('0x') ? address : `0x${address}`,
        tokenAddress: tokenAddress || undefined,
        network: chainId === 11155111 ? 'Sepolia' : chainId === 1 ? 'Ethereum' : `Chain ${chainId}`,
        tokenType,
        amount: amount || undefined,
        chainId,
      }
    }
    
    // Check if it's a plain Ethereum address
    if (qrData.startsWith('0x') && qrData.length === 42) {
      return {
        address: qrData,
        tokenType: 'native',
      }
    }
    
    // Try to extract address from JSON or other formats
    try {
      const json = JSON.parse(qrData)
      if (json.address) {
        return {
          address: json.address,
          tokenAddress: json.tokenAddress,
          network: json.network,
          tokenType: json.tokenType,
          amount: json.amount,
          chainId: json.chainId,
        }
      }
    } catch {
      // Not JSON, continue
    }
    
    return null
  } catch (error) {
    console.error('Failed to parse QR code data:', error)
    return null
  }
}

export function QRScanner({ open, onOpenChange, onScanSuccess, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cameraPermission, setCameraPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const [useManualInput, setUseManualInput] = useState(false)
  const [manualAddress, setManualAddress] = useState('')
  const scannerId = 'qr-scanner'

  useEffect(() => {
    if (!open) {
      // Cleanup scanner when dialog closes
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {
          // Ignore errors during cleanup
        })
        scannerRef.current.clear()
        scannerRef.current = null
      }
      setIsScanning(false)
      setError(null)
      setManualAddress('')
      setUseManualInput(false)
      setCameraPermission('prompt')
      return
    }

    // Initialize scanner when dialog opens
    const initScanner = async () => {
      try {
        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not available. Please use a modern browser with camera support.')
        }

        // Check camera permission
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach(track => track.stop()) // Stop immediately, just checking permission
        setCameraPermission('granted')

        const scanner = new Html5Qrcode(scannerId)
        scannerRef.current = scanner

        // Success callback handler
        const onScanSuccessCallback = (decodedText: string) => {
          const result = parseQRCodeData(decodedText)
          if (result) {
            scanner.stop().catch(() => {})
            scanner.clear()
            scannerRef.current = null
            setIsScanning(false)
            onScanSuccess(result)
            onOpenChange(false)
          } else {
            setError('Invalid QR code format. Please scan a valid Ethereum address or EIP-681 URI.')
            onError?.('Invalid QR code format')
          }
        }

        // Error callback handler
        const onScanErrorCallback = (errorMessage: string) => {
          // Ignore "no QR code found" errors - these are normal while scanning
          if (errorMessage.includes('NotFoundException') || 
              errorMessage.includes('No QR code found') ||
              errorMessage.includes('QR code parse error')) {
            return
          }
          console.warn('QR scan error:', errorMessage)
        }

        // Scanner config
        const scannerConfig = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        }

        // Try multiple camera strategies in order of preference
        const cameraStrategies = [
          // Strategy 1: Try back camera with facingMode (most reliable)
          { facingMode: 'environment' },
          // Strategy 2: Try front camera with facingMode
          { facingMode: 'user' },
          // Strategy 3: Try to enumerate and use deviceId (less reliable)
          async () => {
            try {
              const devices = await navigator.mediaDevices.enumerateDevices()
              const videoDevices = devices.filter(device => device.kind === 'videoinput')
              
              if (videoDevices.length === 0) {
                return null
              }
              
              // Prefer back camera, fallback to first available
              const backCamera = videoDevices.find(device => 
                device.label.toLowerCase().includes('back') || 
                device.label.toLowerCase().includes('rear') ||
                device.label.toLowerCase().includes('environment')
              )
              
              if (backCamera?.deviceId) {
                return { deviceId: backCamera.deviceId }
              } else if (videoDevices[0]?.deviceId) {
                return { deviceId: videoDevices[0].deviceId }
              }
              
              return null
            } catch {
              return null
            }
          },
        ]

        // Try each strategy until one works
        let lastError: Error | null = null
        let strategyIndex = 0

        while (strategyIndex < cameraStrategies.length) {
          try {
            let cameraConfig: { facingMode?: string; deviceId?: string } | null = null

            // Get camera config for this strategy
            const strategy = cameraStrategies[strategyIndex]
            if (typeof strategy === 'function') {
              cameraConfig = await strategy()
              if (!cameraConfig) {
                strategyIndex++
                continue
              }
            } else {
              cameraConfig = strategy
            }

            // Try to start scanner with this config
            await scanner.start(
              cameraConfig,
              scannerConfig,
              onScanSuccessCallback,
              onScanErrorCallback
            )
            
            // Success! Scanner started
            setIsScanning(true)
            setError(null)
            return // Exit successfully
            
          } catch (strategyError: any) {
            lastError = strategyError
            const errorMessage = strategyError.message || String(strategyError)
            
            // Check if this is a device not found error
            if (errorMessage.includes('device not found') || 
                errorMessage.includes('Requested device not found') ||
                errorMessage.includes('NotFoundError') ||
                strategyError.name === 'NotFoundError') {
              // Try next strategy
              strategyIndex++
              console.warn(`Camera strategy ${strategyIndex} failed, trying next...`)
              continue
            }
            
            // For other errors, try next strategy but log the error
            console.warn(`Camera strategy ${strategyIndex} failed:`, errorMessage)
            strategyIndex++
          }
        }

        // All strategies failed - show error and offer manual input
        if (lastError) {
          let errorMessage = 'Could not access camera.'
          
          if (lastError.message?.includes('device not found') || 
              lastError.message?.includes('Requested device not found') ||
              lastError.name === 'NotFoundError') {
            errorMessage = 'No camera device found. Please ensure a camera is connected and available, or use manual input.'
          } else if (lastError.name === 'NotAllowedError' || lastError.message?.includes('permission')) {
            errorMessage = 'Camera permission denied. Please enable camera access in your browser settings, or use manual input.'
            setCameraPermission('denied')
          } else if (lastError.message) {
            errorMessage = lastError.message
          }
          
          setError(errorMessage)
          onError?.(errorMessage)
          setIsScanning(false)
          // Automatically switch to manual input if camera fails
          setUseManualInput(true)
        }
      } catch (err: any) {
        console.error('Failed to start QR scanner:', err)
        
        let errorMessage = 'Failed to start camera.'
        
        if (err.message?.includes('device not found') || err.message?.includes('Requested device not found')) {
          errorMessage = 'No camera device found. Please ensure a camera is connected and available.'
        } else if (err.name === 'NotAllowedError' || err.message?.includes('permission')) {
          errorMessage = 'Camera permission denied. Please enable camera access in your browser settings.'
          setCameraPermission('denied')
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device. Please use a device with a camera.'
        } else if (err.message) {
          errorMessage = err.message
        }
        
        setError(errorMessage)
        onError?.(errorMessage)
        setIsScanning(false)
      }
    }

    initScanner()

    return () => {
      // Cleanup on unmount
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
        scannerRef.current.clear()
        scannerRef.current = null
      }
    }
  }, [open, onScanSuccess, onError, onOpenChange])

  const handleClose = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {})
      scannerRef.current.clear()
      scannerRef.current = null
    }
    setIsScanning(false)
    setError(null)
    setManualAddress('')
    setUseManualInput(false)
    onOpenChange(false)
  }

  const handleManualSubmit = () => {
    if (!manualAddress.trim()) {
      setError('Please enter a valid Ethereum address')
      return
    }

    const result = parseQRCodeData(manualAddress.trim())
    if (result) {
      onScanSuccess(result)
      handleClose()
    } else {
      // Try to validate as plain address
      if (manualAddress.trim().startsWith('0x') && manualAddress.trim().length === 42) {
        onScanSuccess({
          address: manualAddress.trim(),
          tokenType: 'native',
        })
        handleClose()
      } else {
        setError('Invalid address format. Please enter a valid Ethereum address (0x...)')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Scan QR Code
          </DialogTitle>
          <DialogDescription>
            Point your camera at a QR code to scan an Ethereum address or payment URI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Toggle between Scan and Manual Input */}
          <div className="flex gap-2">
            <Button
              variant={!useManualInput ? 'default' : 'outline'}
              onClick={() => {
                setUseManualInput(false)
                setError(null)
                setManualAddress('')
              }}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan QR Code
            </Button>
            <Button
              variant={useManualInput ? 'default' : 'outline'}
              onClick={() => {
                setUseManualInput(true)
                setError(null)
                // Stop scanner when switching to manual input
                if (scannerRef.current) {
                  scannerRef.current.stop().catch(() => {})
                  scannerRef.current.clear()
                  scannerRef.current = null
                  setIsScanning(false)
                }
              }}
              className="flex-1"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Enter Address
            </Button>
          </div>

          {!useManualInput ? (
            <>
              {/* Scanner Container */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <div id={scannerId} className="w-full" style={{ minHeight: '300px' }} />
                
                {/* Overlay */}
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="border-2 border-primary dark:border-orange-400 rounded-lg w-64 h-64" />
                  </div>
                )}

                {/* Loading State */}
                {!isScanning && cameraPermission === 'prompt' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-sm">Initializing camera...</p>
                  </div>
                )}

                {/* Error State */}
                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4">
                    <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                    <p className="text-sm text-center">{error}</p>
                    {cameraPermission === 'denied' && (
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        Please enable camera permissions in your browser settings
                      </p>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setUseManualInput(true)}
                      className="mt-4"
                    >
                      <Keyboard className="h-4 w-4 mr-2" />
                      Enter Address Manually
                    </Button>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="text-xs text-muted-foreground dark:text-gray-400 space-y-1">
                <p>• Point camera at QR code</p>
                <p>• Ensure good lighting</p>
                <p>• Hold device steady</p>
              </div>
            </>
          ) : (
            <>
              {/* Manual Input Form */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground dark:text-white mb-2 block">
                    Ethereum Address or EIP-681 URI
                  </label>
                  <Input
                    type="text"
                    placeholder="0x... or ethereum:0x...@11155111/transfer?address=..."
                    value={manualAddress}
                    onChange={(e) => {
                      setManualAddress(e.target.value)
                      setError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleManualSubmit()
                      }
                    }}
                    className="font-mono text-sm"
                  />
                  {error && (
                    <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {error}
                    </p>
                  )}
                </div>

                <div className="text-xs text-muted-foreground dark:text-gray-400 space-y-1">
                  <p>• Enter a valid Ethereum address (0x...)</p>
                  <p>• Or use EIP-681 format for token transfers</p>
                  <p>• Example: ethereum:0x...@11155111/transfer?address=0x...</p>
                </div>

                <Button onClick={handleManualSubmit} className="w-full">
                  Use This Address
                </Button>
              </div>
            </>
          )}

          {/* Close Button */}
          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

