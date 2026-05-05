/**
 * @deprecated This file is deprecated. Use @TKNZN/reown-appkit-module instead.
 * 
 * All AppKit functionality should now import from '@TKNZN/reown-appkit-module'
 * 
 * Migration:
 * - OLD: import { useAppKit } from '@/lib/config/appkit'
 * - NEW: import { useAppKit } from '@TKNZN/reown-appkit-module'
 * 
 * This file is kept for backward compatibility but will be removed in a future version.
 */

// Re-export everything from the module package for backward compatibility
// Re-export from local config
// AppKit configuration is exported from packages/reown-appkit-module/src/config/index.ts
// This file is a compatibility layer
export * from '../../config/index'
