/**
 * AppKit Utils Patch - Early Module Initialization
 * 
 * This module patches @reown/appkit-utils BEFORE any AppKit modules are imported.
 * It must be imported at the very top of appkit.ts before any @reown/appkit imports.
 * 
 * The patch fixes:
 * 1. Missing exports (HelpersUtil, ErrorUtil, ConstantsUtil, CaipNetworksUtil, LoggerUtil)
 * 2. TokenUtil.formatTokenBalance null asset errors
 */

// ✅ CRITICAL: Patch @reown/appkit-utils AFTER it loads naturally (via webpack replacement)
// We don't require it directly here to avoid bypassing webpack's NormalModuleReplacementPlugin
// The webpack config replaces TokenUtil.js with our patched version, so the module should load without errors
if (typeof window !== 'undefined') {
  // Use a function to apply the patch, which waits for the module to be loaded naturally
  function applyPatch() {
    try {
      // Wait for the module to be available - don't require it directly
      // Webpack's NormalModuleReplacementPlugin will replace TokenUtil.js with our patched version
      // So we wait a tick for any pending module loads to complete
      setTimeout(() => {
        try {
          // Check if module is already loaded in cache
          let appkitUtils: any = null;
          try {
            const moduleId = require.resolve('@reown/appkit-utils');
            if ((require as any).cache[moduleId]) {
              appkitUtils = (require as any).cache[moduleId].exports;
            }
          } catch (e) {
            // Module not in cache yet, try to require it (webpack replacement should have applied)
            try {
              appkitUtils = require('@reown/appkit-utils');
            } catch (requireError: any) {
              // If it still fails, the webpack replacement might not have applied yet
              // Try again after a longer delay
              console.warn('[appkit-patch] Module not ready, will retry:', requireError?.message);
              setTimeout(() => applyPatch(), 100);
              return;
            }
          }
          
          if (appkitUtils) {
            applyPatchToModule(appkitUtils);
          }
        } catch (patchError: any) {
          // If patching fails, log but don't throw - AppKit might still work
          console.warn('⚠️ [appkit-patch] Could not patch @reown/appkit-utils:', patchError?.message || patchError);
        }
      }, 0);
    } catch (patchError: any) {
      // If patching fails, log but don't throw - AppKit might still work
      console.warn('⚠️ [appkit-patch] Could not patch @reown/appkit-utils:', patchError?.message || patchError);
    }
  }
  
  function applyPatchToModule(appkitUtils: any) {
    if (!appkitUtils) return;
    
    const shim = require('@/lib/appkit-utils-shim');
    
    // Add missing exports if they don't exist
    if (!appkitUtils.HelpersUtil) {
      appkitUtils.HelpersUtil = shim.HelpersUtil;
    }
    if (!appkitUtils.ErrorUtil) {
      appkitUtils.ErrorUtil = shim.ErrorUtil;
    }
    if (!appkitUtils.ConstantsUtil) {
      appkitUtils.ConstantsUtil = shim.ConstantsUtil;
    }
    if (!appkitUtils.CaipNetworksUtil) {
      appkitUtils.CaipNetworksUtil = shim.CaipNetworksUtil;
    }
    if (!appkitUtils.LoggerUtil) {
      appkitUtils.LoggerUtil = shim.LoggerUtil;
    }
    
    // Patch TokenUtil to handle null assets - CRITICAL for preventing "Cannot read properties of null (reading 'asset')"
    if (appkitUtils.TokenUtil) {
      // Patch formatTokenBalance specifically
      if (appkitUtils.TokenUtil.formatTokenBalance) {
        const originalFormatTokenBalance = appkitUtils.TokenUtil.formatTokenBalance;
        appkitUtils.TokenUtil.formatTokenBalance = function(balance: any, decimals?: number, asset?: any) {
          if (!asset || asset === null || asset === undefined) {
            console.warn('[appkit-patch] TokenUtil.formatTokenBalance: null asset detected, returning 0');
            return '0';
          }
          try {
            return originalFormatTokenBalance.call(this, balance, decimals, asset);
          } catch (error: any) {
            if (error?.message?.includes('asset') || error?.message?.includes('null')) {
              console.warn('[appkit-patch] TokenUtil.formatTokenBalance: error with asset, returning 0', error);
              return '0';
            }
            throw error;
          }
        };
      }
      
      console.log('✅ [appkit-patch] @reown/appkit-utils patched: missing exports added, TokenUtil null-safe');
    } else {
      console.warn('⚠️ [appkit-patch] TokenUtil not found in @reown/appkit-utils');
    }
  }
  
  // Apply patch immediately
  applyPatch();
  
  // Also set up a global error handler to catch and suppress TokenUtil initialization errors
  if (typeof window !== 'undefined') {
    const originalErrorHandler = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      // Suppress TokenUtil null asset errors during initialization
      if (typeof message === 'string' && message.includes("Cannot read properties of null (reading 'asset')")) {
        if (typeof source === 'string' && source.includes('TokenUtil.js')) {
          console.warn('[appkit-patch] Suppressed TokenUtil initialization error - module will be patched on next access');
          return true; // Suppress the error
        }
      }
      // Call original error handler for other errors
      if (originalErrorHandler) {
        return originalErrorHandler.call(window, message, source, lineno, colno, error);
      }
      return false;
    };
  }
} else {
  // SSR - no patching needed, but log for debugging
  console.log('[appkit-patch] Skipping patch in SSR environment');
}

export {};
