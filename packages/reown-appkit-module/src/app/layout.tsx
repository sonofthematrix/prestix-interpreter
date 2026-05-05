import React from "react";
import {AuthProvider} from "@/components/auth-provider";
import { Providers } from "@/components/providers";
import {AppKitProvider} from "@/context/AppKitProvider";
import ContextProvider from "@/context";
import { SessionSync } from "@/components/auth/SessionSync";

import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { fonts } from "../lib/fonts";
import "@/styles/blog.css";
import "@/styles/globals.css";
import "@/styles/tokenizin-theme.css";
// Import Tokenizin AppKit custom styles
import "@/styles/tokenizin-appkit.css";

// Force all pages to be dynamically rendered to avoid build hangs
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export const metadata: Metadata = {
  title: "RWA Market - Premium Marketplace",
  description: "Premium RWA tokenized assets",
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  other: {
    // Suppress preload warnings for Reown AppKit fonts
    'x-suppress-preload-warnings': 'true',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get cookies for WalletProvider SSR hydration with error handling
  let cookieString = '';
  try {
    const cookieStore = await cookies();
    cookieString = cookieStore.toString();
  } catch (error) {
    // If cookies() fails, continue without cookies (client-side will handle)
    console.warn('Failed to read cookies in layout:', error);
    cookieString = '';
  }

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        {/* Apply dark theme immediately to prevent FOUC (replaces ThemeProvider script) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof document === 'undefined') return;
                document.documentElement.classList.add('dark');
                document.documentElement.classList.remove('light');
                document.documentElement.setAttribute('data-theme', 'dark');
              })();
            `,
          }}
        />
        {/* CRITICAL: Run fetch/sendBeacon interceptors IMMEDIATELY before any other scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
                
                // CRITICAL: Log that interceptors are starting
                console.log('🔧 [Layout] Initializing fetch interceptors for ReownAuthentication...');
                console.log('🔧 [Layout] window.location.origin:', typeof window !== 'undefined' ? window.location?.origin : 'N/A');
                
                // CRITICAL: Intercept img tag src changes for WalletConnect icons
                // AppKit may set img src directly, bypassing fetch interceptor
                const interceptImageSrc = function() {
                  // Watch for new img tags being added to DOM
                  const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                      mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1) { // Element node
                          // Check if it's an img tag
                          if (node.tagName === 'IMG') {
                            const img = node;
                            const src = img.src || img.getAttribute('src') || '';
                            
                            // Check if it's a WalletConnect icon (specifically WalletConnect wallet, not other wallets)
                            const isWC = src.includes('walletconnect') || src.includes('web3modal') || src.includes('reown.app');
                            const isWCIcon = src.includes('/icon') || src.includes('/logo') || src.includes('/image') || 
                                            src.includes('wallet-icons') || src.match(/\\.(jpg|jpeg|png|gif|webp|svg|ico)([?#]|$)/i);
                            const isWCWallet = src.includes('walletconnect') && src.match(/wallet.*connect/i);
                            
                            if (isWC && (isWCIcon || isWCWallet)) {
                              console.log('🖼️ [WC Icon] Intercepting img tag WalletConnect icon:', src);
                              const localIconUrl = window.location.origin + '/WCIcon.png';
                              const originalSrc = src;
                              img.src = localIconUrl;
                              img.onerror = function() {
                                console.warn('⚠️ [WC Icon] Local icon failed, restoring original');
                                img.src = originalSrc;
                              };
                            }
                          }
                          
                          // Also check child img tags
                          const imgs = node.querySelectorAll && node.querySelectorAll('img');
                          if (imgs) {
                            imgs.forEach(function(img) {
                              const src = img.src || img.getAttribute('src') || '';
                              const isWC = src.includes('walletconnect') || src.includes('web3modal') || src.includes('reown.app');
                              const isWCIcon = src.includes('/icon') || src.includes('/logo') || src.includes('/image') || 
                                              src.includes('wallet-icons') || src.match(/\\.(jpg|jpeg|png|gif|webp|svg|ico)([?#]|$)/i);
                              const isWCWallet = src.includes('walletconnect') && src.match(/wallet.*connect/i);
                              
                              if (isWC && (isWCIcon || isWCWallet)) {
                                console.log('🖼️ [WC Icon] Intercepting nested img tag WalletConnect icon:', src);
                                const localIconUrl = window.location.origin + '/WCIcon.png';
                                const originalSrc = src;
                                img.src = localIconUrl;
                                img.onerror = function() {
                                  console.warn('⚠️ [WC Icon] Local icon failed, restoring original');
                                  img.src = originalSrc;
                                };
                              }
                            });
                          }
                        }
                      });
                    });
                  });
                  
                  // Start observing when DOM is ready
                  if (document.body) {
                    observer.observe(document.body, {
                      childList: true,
                      subtree: true
                    });
                  } else {
                    document.addEventListener('DOMContentLoaded', function() {
                      observer.observe(document.body, {
                        childList: true,
                        subtree: true
                      });
                    });
                  }
                  
                  // Also intercept img src property changes
                  const originalImageSrcSetter = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src')?.set;
                  if (originalImageSrcSetter) {
                    Object.defineProperty(HTMLImageElement.prototype, 'src', {
                      set: function(value) {
                        const isWC = value.includes('walletconnect') || value.includes('web3modal') || value.includes('reown.app');
                        const isWCIcon = value.includes('/icon') || value.includes('/logo') || value.includes('/image') || 
                                        value.includes('wallet-icons') || value.match(/\\.(jpg|jpeg|png|gif|webp|svg|ico)([?#]|$)/i);
                        const isWCWallet = value.includes('walletconnect') && value.match(/wallet.*connect/i);
                        
                        if (isWC && (isWCIcon || isWCWallet)) {
                          console.log('🖼️ [WC Icon] Intercepting img.src setter WalletConnect icon:', value);
                          const localIconUrl = window.location.origin + '/WCIcon.png';
                          const originalValue = value;
                          originalImageSrcSetter.call(this, localIconUrl);
                          this.onerror = function() {
                            console.warn('⚠️ [WC Icon] Local icon failed, restoring original');
                            originalImageSrcSetter.call(this, originalValue);
                          };
                        } else {
                          originalImageSrcSetter.call(this, value);
                        }
                      },
                      get: function() {
                        return this.getAttribute('src') || '';
                      },
                      configurable: true
                    });
                  }
                };
                
                // Initialize image interception
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', interceptImageSrc);
                } else {
                  interceptImageSrc();
                }
                
                // Handle broken image errors for WalletConnect icons
                // This catches images that fail to load even after interception
                document.addEventListener('error', function(e) {
                  const img = e.target;
                  if (img && img.tagName === 'IMG') {
                    const src = img.src || img.getAttribute('src') || '';
                    if ((src.includes('walletconnect') || src.includes('web3modal') || src.includes('reown.app')) &&
                        (src.includes('/icon') || src.includes('/logo') || src.includes('/image') || 
                         src.includes('wallet-icons') || src.match(/\\.(jpg|jpeg|png|gif|webp|svg|ico)([?#]|$)/i))) {
                      console.log('🖼️ [WC Icon] Found broken WalletConnect image, replacing:', src);
                      const localIconUrl = window.location.origin + '/WCIcon.png';
                      img.src = localIconUrl;
                    }
                  }
                }, true); // Use capture phase to catch errors early
                
                // Intercept sendBeacon FIRST (AppKit uses this for pulse analytics)
                const originalSendBeacon = navigator.sendBeacon;
                navigator.sendBeacon = function(url, data) {
                  // Only suppress analytics, allow wallet metadata APIs
                  const isWalletMetadataRequest = url.includes('explorer-api.walletconnect.com') ||
                                                 url.includes('api.web3modal.org/v1/wallets') ||
                                                 url.includes('api.web3modal.org/v3/wallets');
                  
                  const isAnalyticsRequest = url.includes('pulse.walletconnect') ||
                                           url.includes('walletconnect.org/pulse') ||
                                           url.includes('web3modal.org/analytics') ||
                                           url.includes('walletconnect.org/analytics');
                  
                  // Block analytics only
                  if ((url.includes('walletconnect.org') || 
                       url.includes('web3modal.org')) &&
                      isAnalyticsRequest &&
                      !isWalletMetadataRequest) {
                    return true; // Suppress without sending
                  }
                  
                  // Block Coinbase analytics
                  if (url.includes('cca-lite.coinbase.com') || 
                      url.includes('coinbase.com/metrics')) {
                    return true;
                  }
                  
                  return originalSendBeacon.apply(navigator, arguments);
                };
                
                // Intercept fetch SECOND - use more aggressive URL matching
                const originalFetch = window.fetch;
                window.fetch = function(...args) {
                  try {
                    // Extract URL from various argument formats
                    let url = '';
                    if (typeof args[0] === 'string') {
                      url = args[0];
                    } else if (args[0] && typeof args[0] === 'object') {
                      url = args[0].url || args[0].href || '';
                    }
                    
                    // Suppress Coinbase analytics requests FIRST (all methods, all URLs)
                    // This prevents Coinbase SDK from throwing "Failed to fetch" errors
                    if (url.includes('cca-lite.coinbase.com') || 
                        url.includes('coinbase.com/metrics') ||
                        url.includes('coinbase.com/amp')) {
                      return Promise.resolve(new Response('', {
                        status: 200,
                        statusText: 'OK',
                        headers: { 
                          'Content-Type': 'text/plain',
                          'Access-Control-Allow-Origin': '*'
                        }
                      }));
                    }
                    
                    // More aggressive URL matching - check for any Web3Modal/Coinbase domains
                    // CRITICAL: Only block external API calls, NOT localhost or internal requests
                    // MetaMask detection and wallet connection use localhost/internal requests
                    // Also suppress Coinbase SDK HEAD requests (harmless but noisy)
                    // Note: Coinbase SDK makes HEAD requests to localhost for cross-origin policy checks
                    const isCoinbaseSDKHeadRequest = args[1] && args[1].method === 'HEAD';
                    
                    // Suppress Coinbase SDK HEAD requests to localhost (cross-origin policy checks)
                    if (isCoinbaseSDKHeadRequest && (url.includes('localhost:3000') || url.includes('127.0.0.1') || url.includes('signin'))) {
                      // Return successful mock response to prevent console errors
                      return Promise.resolve(new Response('', {
                        status: 200,
                        statusText: 'OK',
                        headers: { 'Content-Type': 'text/plain' }
                      }));
                    }
                    
                    // CRITICAL: Intercept WalletConnect icon requests and serve local WCIcon.png
                    // This ensures WalletConnect logo is always available even if external APIs fail
                    // Check for WalletConnect domain requests
                    const isWalletConnectDomain = url.includes('walletconnect') || 
                                                  url.includes('web3modal') ||
                                                  url.includes('reown.app') ||
                                                  url.match(/walletconnect.*\\.(org|com|io)/i);
                    
                    if (isWalletConnectDomain) {
                      // Check if this is an image/icon request (any image from WalletConnect domain)
                      const isImageRequest = url.match(/\\.(jpg|jpeg|png|gif|webp|svg|ico)([?#]|$)/i) ||
                                           url.includes('/icon') || 
                                           url.includes('/logo') || 
                                           url.includes('/image') ||
                                           url.includes('/wallet-icons/') ||
                                           url.includes('wallet-icons') ||
                                           url.includes('wallet-icon') ||
                                           // Also catch wallet metadata API responses that might contain icon URLs
                                           (url.includes('explorer-api.walletconnect.com') && url.includes('wallets'));
                      
                      // Intercept ALL WalletConnect domain image requests
                      if (isImageRequest) {
                        console.log('🖼️ [WC Icon] Intercepting WalletConnect image request:', url);
                        // Serve local WalletConnect icon instead of external API
                        const localIconUrl = window.location.origin + '/WCIcon.png';
                        return originalFetch(localIconUrl, args[1] || {})
                          .then((response) => {
                            if (response.ok) {
                              console.log('✅ [WC Icon] Served local WCIcon.png successfully');
                              // Return response with proper headers for image
                              return new Response(response.body, {
                                status: response.status,
                                statusText: response.statusText,
                                headers: {
                                  'Content-Type': 'image/png',
                                  'Cache-Control': 'public, max-age=31536000',
                                }
                              });
                            }
                            throw new Error('Local icon not found');
                          })
                          .catch((error) => {
                            console.warn('⚠️ [WC Icon] Local icon failed, trying original:', error);
                            // If local icon fails, try original request as fallback
                            return originalFetch.apply(window, args);
                          });
                      }
                    }
                    
                    // Check if this is an image/icon request (should be allowed)
                    // CRITICAL: WalletConnect icons can come from various URL patterns
                    const imageExtPattern = /\\.(jpg|jpeg|png|gif|webp|svg|ico)([?#]|$)/i;
                    const isImageRequest = imageExtPattern.test(url) || 
                                          url.includes('/icon') || 
                                          url.includes('/logo') ||
                                          url.includes('/image') ||
                                          url.includes('/wallet-icons/') ||
                                          url.includes('wallet-icons') ||
                                          // WalletConnect specific icon paths
                                          (url.includes('api.web3modal.org') && (url.includes('/image') || url.includes('/icon'))) ||
                                          (url.includes('explorer-api.walletconnect.com') && (url.includes('/image') || url.includes('/icon')));
                    
                    // Check if this is a wallet metadata API request (should be allowed for AppKit)
                    // AppKit needs these APIs to fetch wallet information and display wallet options
                    const isWalletMetadataRequest = url.includes('explorer-api.walletconnect.com') ||
                                                   url.includes('api.web3modal.org/v1/wallets') ||
                                                   url.includes('api.web3modal.org/v3/wallets') ||
                                                   (url.includes('api.web3modal.org') && url.includes('/wallets')) ||
                                                   // Allow any api.web3modal.org request that might contain wallet icon data
                                                   (url.includes('api.web3modal.org') && !url.includes('/analytics') && !url.includes('/pulse'));
                    
                    // Only block analytics/telemetry, not essential API calls
                    const isAnalyticsRequest = url.includes('pulse.walletconnect') ||
                                             url.includes('walletconnect.org/pulse') ||
                                             url.includes('web3modal.org/analytics') ||
                                             url.includes('walletconnect.org/analytics');
                    
                    if ((url.includes('web3modal.org') || 
                         url.includes('walletconnect.org')) &&
                        !url.includes('localhost:3000') &&
                        !url.includes('127.0.0.1') &&
                        !url.startsWith('/') &&
                        !url.startsWith('./') &&
                        !isImageRequest &&
                        !isWalletMetadataRequest &&
                        isAnalyticsRequest) {
                      // Suppress WalletConnect/Web3Modal analytics only (allow wallet metadata APIs)
                      return Promise.resolve(new Response('', {
                        status: 200,
                        statusText: 'OK',
                        headers: { 
                          'Content-Type': 'text/plain',
                          'Access-Control-Allow-Origin': '*'
                        }
                      }));
                    }
                    
                    // Wrap fetch to suppress 403 console errors for admin-actions endpoint
                    // This is expected behavior for non-admin users
                    const isAdminActionsEndpoint = url.includes('/api/notifications/admin-actions');
                    const fetchPromise = originalFetch.apply(window, args);
                    
                    if (isAdminActionsEndpoint) {
                      return fetchPromise.catch((error) => {
                        // Suppress console errors for 403 on admin-actions (expected for non-admins)
                        // The error is already handled gracefully in the notification bell component
                        return Promise.reject(error);
                      }).then((response) => {
                        // Suppress console errors for 403 responses
                        if (response && response.status === 403) {
                          // Return response without logging to console
                          // The notification bell component handles this gracefully
                          return response;
                        }
                        return response;
                      });
                    }
                    
                    return fetchPromise;
                  } catch (error) {
                    // If interception fails, suppress Coinbase analytics errors
                    const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
                    if (url.includes('cca-lite.coinbase.com') || 
                        url.includes('coinbase.com/metrics') ||
                        url.includes('coinbase.com/amp')) {
                      return Promise.resolve(new Response('', {
                        status: 200,
                        statusText: 'OK',
                        headers: { 
                          'Content-Type': 'text/plain',
                          'Access-Control-Allow-Origin': '*'
                        }
                      }));
                    }
                    // For non-Coinbase errors, rethrow
                    throw error;
                  }
                };
              })();
            `,
          }}
        />
        {/* Fix SVG attributes and suppress preload warnings */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                // CRITICAL: Set up fetch interceptor BEFORE any AppKit code loads
                // This prevents Web3Modal API calls from reaching the network
                // Use Proxy with marker to track and re-intercept AppKit's wrapped fetch
                (function() {
                  // CRITICAL: Store native fetch BEFORE any wrapping to prevent infinite recursion
                  // All interceptors must use this native fetch, not window.fetch (which may be wrapped)
                  if (!window.__nativeFetch) {
                    window.__nativeFetch = window.fetch.bind(window);
                  }
                  const nativeFetch = window.__nativeFetch;
                  
                  // Only wrap if not already wrapped
                  if (window.fetch.__layout_intercepted) {
                    return; // Already intercepted, skip
                  }
                  
                  const originalFetch = window.fetch;
                  const FETCH_MARKER = '__appkit_intercepted__';
                  
                  // Create intercepted fetch function with aggressive URL matching
                  const interceptedFetch = function(...args) {
                    try {
                      // Extract URL from various argument formats (string, URL object, Request object)
                      let url = '';
                      let urlObject = null;
                      let urlString = '';
                      
                      if (typeof args[0] === 'string') {
                        url = args[0];
                        urlString = args[0];
                      } else if (args[0] instanceof URL) {
                        // Handle URL objects (ReownAuthentication uses new URL())
                        urlObject = args[0];
                        urlString = args[0].href || args[0].toString();
                        url = urlString;
                      } else if (args[0] && typeof args[0] === 'object') {
                        urlString = args[0].url || args[0].href || '';
                        url = urlString;
                        if (args[0] instanceof Request) {
                          urlObject = args[0];
                        }
                      }
                      
                      // Debug logging for auth/v1 requests
                      if (urlString && urlString.includes('auth/v1/')) {
                        console.log('🔍 [Layout] InterceptedFetch: Detected auth/v1 request:', {
                          url: urlString,
                          args0Type: typeof args[0],
                          args0IsURL: args[0] instanceof URL,
                          method: args[1]?.method || 'GET',
                        });
                      }
                      
                      // ✅ CRITICAL EARLIEST PASS-THROUGH: Allow /auth/v1/* and /appkit/* endpoints to ALWAYS reach real API
                      // This MUST be the FIRST check before any redirect or suppression logic
                      // These endpoints are critical for authentication and must never be blocked
                      const isAuthV1Endpoint = urlString && (
                        urlString.includes('/auth/v1/nonce') ||
                        urlString.includes('/auth/v1/authenticate') ||
                        urlString.includes('/auth/v1/me')
                      );
                      const isAppKitEndpoint = urlString && (
                        urlString.includes('/appkit/') ||
                        urlString.includes('/projects/')
                      );
                      
                      if (isAuthV1Endpoint || isAppKitEndpoint) {
                        // For auth/v1 and appkit endpoints, redirect api.web3modal.org to local origin
                        if (urlString && urlString.includes('api.web3modal.org')) {
                          const localOrigin = window.location.origin;
                          const redirectedUrl = urlString.replace('https://api.web3modal.org', localOrigin);
                          console.log('🔄 [Layout] InterceptedFetch: EARLY redirect for auth/appkit endpoint:', {
                            from: urlString,
                            to: redirectedUrl,
                            method: args[1]?.method || 'GET',
                          });
                          
                          // Create new args array with redirected URL (can't mutate args[0] for URL objects)
                          let redirectedArgs = [...args];
                          if (typeof args[0] === 'string') {
                            redirectedArgs[0] = redirectedUrl;
                          } else if (args[0] instanceof URL) {
                            // Copy search params from original URL
                            const newUrl = new URL(redirectedUrl);
                            if (args[0].search) {
                              args[0].searchParams.forEach((value, key) => {
                                newUrl.searchParams.set(key, value);
                              });
                            }
                            redirectedArgs[0] = newUrl;
                          } else if (args[0] && typeof args[0] === 'object') {
                            if (args[0] instanceof Request) {
                              redirectedArgs[0] = new Request(redirectedUrl, args[0]);
                            } else {
                              redirectedArgs[0] = { ...args[0], url: redirectedUrl };
                            }
                          }
                          url = redirectedUrl;
                          urlString = redirectedUrl;
                          
                          // Always pass through to native fetch for auth/appkit endpoints with redirected URL
                          if (window.__nativeFetch) {
                            console.log('🔄 [Layout] Using nativeFetch for auth/appkit endpoint:', urlString);
                            return window.__nativeFetch.apply(window, redirectedArgs);
                          }
                          // Fallback to original fetch if nativeFetch not available
                          return originalFetch.apply(window, redirectedArgs);
                        }
                        
                        // Always pass through to native fetch for auth/appkit endpoints
                        if (window.__nativeFetch) {
                          console.log('🔄 [Layout] Using nativeFetch for auth/appkit endpoint:', urlString);
                          return window.__nativeFetch.apply(window, args);
                        }
                        // Fallback to original fetch if nativeFetch not available
                        return originalFetch.apply(window, args);
                      }
                      
                      // ✅ CRITICAL: Redirect /auth/v1/* requests from api.web3modal.org to our local endpoint
                      // This ensures ReownAuthentication uses our /auth/v1/nonce and /auth/v1/authenticate
                      // even if NEXT_PUBLIC_W3M_API_URL isn't being read correctly
                      // This MUST be the FIRST check to ensure it happens before any other logic
                      // Check both url and urlString to catch all cases
                      const shouldRedirect = (urlString && urlString.includes('api.web3modal.org/auth/v1/')) ||
                                            (url && typeof url === 'string' && url.includes('api.web3modal.org/auth/v1/'));
                      
                      if (shouldRedirect) {
                        const localOrigin = window.location.origin;
                        const targetUrl = urlString || url;
                        const redirectedUrl = targetUrl.replace('https://api.web3modal.org', localOrigin);
                        console.log('🔄 [Layout] Fetch: Redirecting ReownAuthentication request:', {
                          from: targetUrl,
                          to: redirectedUrl,
                          method: args[1]?.method || 'GET',
                          isUrlObject: urlObject instanceof URL,
                          args0Type: typeof args[0],
                          args0IsURL: args[0] instanceof URL,
                          args0Href: args[0] instanceof URL ? args[0].href : 'N/A',
                        });
                        
                        // Create new args array with redirected URL (can't mutate args[0] for URL objects)
                        let redirectedArgs = [...args];
                        if (typeof args[0] === 'string') {
                          redirectedArgs[0] = redirectedUrl;
                        } else if (args[0] instanceof URL) {
                          // Copy search params from original URL
                          const newUrl = new URL(redirectedUrl);
                          if (args[0].search) {
                            args[0].searchParams.forEach((value, key) => {
                              newUrl.searchParams.set(key, value);
                            });
                          }
                          redirectedArgs[0] = newUrl;
                        } else if (args[0] && typeof args[0] === 'object') {
                          // For Request objects or other objects, update the url property
                          if (args[0] instanceof Request) {
                            redirectedArgs[0] = new Request(redirectedUrl, args[0]);
                          } else {
                            redirectedArgs[0] = { ...args[0], url: redirectedUrl };
                          }
                        }
                        url = redirectedUrl;
                        urlString = redirectedUrl;
                        
                        // Use nativeFetch after redirection to avoid infinite loops
                        if (window.__nativeFetch) {
                          console.log('🔄 [Layout] Using nativeFetch for redirected request to:', redirectedUrl);
                          return window.__nativeFetch.apply(window, redirectedArgs);
                        }
                        // Fallback to original fetch if nativeFetch not available
                        return originalFetch.apply(window, redirectedArgs);
                      }
                      
                      // Suppress Coinbase analytics requests FIRST (all methods, all URLs)
                      // This prevents Coinbase SDK from throwing "Failed to fetch" errors
                      if (url.includes('cca-lite.coinbase.com') || 
                          url.includes('coinbase.com/metrics') ||
                          url.includes('coinbase.com/amp')) {
                        return Promise.resolve(new Response('', {
                          status: 200,
                          statusText: 'OK',
                          headers: {
                            'Content-Type': 'text/plain',
                            'Access-Control-Allow-Origin': '*'
                          }
                        }));
                      }
                      
                      // More aggressive URL matching - check for any Web3Modal/Coinbase domains
                      // CRITICAL: Only block external API calls, NOT localhost or internal requests
                      // MetaMask detection and wallet connection use localhost/internal requests
                      // Also suppress Coinbase SDK HEAD requests to localhost (cross-origin policy checks)
                      const isCoinbaseSDKHeadRequest = args[1] && args[1].method === 'HEAD';
                      
                      // Suppress Coinbase SDK HEAD requests to localhost (cross-origin policy checks)
                      if (isCoinbaseSDKHeadRequest && (url.includes('localhost:3000') || url.includes('127.0.0.1') || url.includes('signin'))) {
                        return Promise.resolve(new Response('', {
                          status: 200,
                          statusText: 'OK',
                          headers: {
                            'Content-Type': 'text/plain',
                            'Access-Control-Allow-Origin': '*'
                          }
                        }));
                      }
                      
                      // Check if this is an image/icon request (should be allowed)
                      // CRITICAL: WalletConnect icons can come from various URL patterns
                      const imageExtPattern = /\\.(jpg|jpeg|png|gif|webp|svg|ico)([?#]|$)/i;
                      const isImageRequest = imageExtPattern.test(url) || 
                                            url.includes('/icon') || 
                                            url.includes('/logo') ||
                                            url.includes('/image') ||
                                            url.includes('/wallet-icons/') ||
                                            url.includes('wallet-icons') ||
                                            url.includes('explorer-api.walletconnect.com') ||
                                            // WalletConnect specific icon paths
                                            (url.includes('api.web3modal.org') && (url.includes('/image') || url.includes('/icon'))) ||
                                            (url.includes('explorer-api.walletconnect.com') && (url.includes('/image') || url.includes('/icon')));
                      
                      // Check if this is a wallet metadata API request (should be allowed)
                      const isWalletMetadataRequest = url.includes('explorer-api.walletconnect.com') ||
                                                       url.includes('api.web3modal.org/v1/wallets') ||
                                                       url.includes('api.web3modal.org/v3/wallets') ||
                                                       (url.includes('api.web3modal.org') && url.includes('/wallets')) ||
                                                       // Allow any api.web3modal.org request that might contain wallet icon data
                                                       (url.includes('api.web3modal.org') && !url.includes('/analytics') && !url.includes('/pulse'));
                      
                      // Only block analytics/telemetry, not essential API calls or images
                      const isAnalyticsRequest = url.includes('pulse.walletconnect') ||
                                               url.includes('walletconnect.org/pulse') ||
                                               url.includes('web3modal.org/analytics') ||
                                               url.includes('walletconnect.org/analytics');
                      
                      // ✅ CRITICAL: Never suppress /auth/v1/* or /appkit/* endpoints - they must reach the real API
                      const isCriticalEndpoint = url.includes('/auth/v1/') || url.includes('/appkit/') || url.includes('/projects/');
                      
                      if ((url.includes('web3modal.org') || 
                           url.includes('walletconnect.org') ||
                           url.includes('pulse.walletconnect')) &&
                          !url.includes('localhost:3000') &&
                          !url.includes('127.0.0.1') &&
                          !url.startsWith('/') &&
                          !url.startsWith('./') &&
                          !isImageRequest &&
                          !isWalletMetadataRequest &&
                          !isCriticalEndpoint &&
                          isAnalyticsRequest) {
                        // Suppress WalletConnect/Web3Modal analytics only (allow wallet metadata APIs, images/icons, and critical auth/appkit endpoints)
                        return Promise.resolve(new Response('', {
                          status: 200,
                          statusText: 'OK',
                          headers: { 
                            'Content-Type': 'text/plain',
                            'Access-Control-Allow-Origin': '*'
                          }
                        }));
                      }
                      
                      // For other requests, use native fetch to prevent infinite recursion
                      // CRITICAL: After redirecting, use native fetch (not wrapped fetch) to avoid loops
                      return nativeFetch.apply(window, args);
                    } catch (error) {
                      // If interception fails, suppress Coinbase analytics errors
                      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
                      if (url.includes('cca-lite.coinbase.com') || 
                          url.includes('coinbase.com/metrics') ||
                          url.includes('coinbase.com/amp')) {
                        return Promise.resolve(new Response('', {
                          status: 200,
                          statusText: 'OK',
                          headers: {
                            'Content-Type': 'text/plain',
                            'Access-Control-Allow-Origin': '*'
                          }
                        }));
                      }
                      // For non-Coinbase errors, rethrow
                      throw error;
                    }
                  };
                  
                  // Mark our interceptor
                  interceptedFetch[FETCH_MARKER] = true;
                  interceptedFetch.__layout_intercepted = true;
                  
                  // Create proxy wrapper
                  const fetchProxy = new Proxy(interceptedFetch, {
                    apply: function(target, thisArg, argumentsList) {
                      return target.apply(thisArg, argumentsList);
                    },
                    get: function(target, prop) {
                      if (prop === FETCH_MARKER) return true;
                      if (prop === '__layout_intercepted') return true;
                      if (prop in originalFetch && typeof originalFetch[prop] !== 'function') {
                        return originalFetch[prop];
                      }
                      return target[prop];
                    }
                  });
                  
                  window.fetch = fetchProxy;
                  
                  // Log that interceptors are set up
                  console.log('✅ [Layout] Fetch interceptors installed. Will redirect api.web3modal.org/auth/v1/* to local endpoints.');
                  console.log('✅ [Layout] Current origin:', window.location.origin);
                  console.log('✅ [Layout] Interceptor will redirect to:', window.location.origin + '/auth/v1/');
                  
                  // Also intercept XMLHttpRequest as backup (AppKit might use it)
                  const originalXHROpen = XMLHttpRequest.prototype.open;
                  const originalXHRSend = XMLHttpRequest.prototype.send;
                  
                  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                    // ✅ CRITICAL: Redirect /auth/v1/* requests from api.web3modal.org to our local endpoint
                    // This MUST happen in open() so the redirect occurs before send()
                    // Handle both string URLs and URL objects
                    let urlString = typeof url === 'string' ? url : (url?.href || url?.toString() || '');
                    
                    if (urlString && urlString.includes('api.web3modal.org/auth/v1/')) {
                      const localOrigin = window.location.origin;
                      const redirectedUrl = urlString.replace('https://api.web3modal.org', localOrigin);
                      console.log('🔄 [Layout] XMLHttpRequest.open: Redirecting ReownAuthentication request:', {
                        from: urlString,
                        to: redirectedUrl,
                        method: method,
                      });
                      this._interceptedUrl = redirectedUrl;
                      return originalXHROpen.apply(this, [method, redirectedUrl, ...rest]);
                    }
                    this._interceptedUrl = urlString || url;
                    return originalXHROpen.apply(this, [method, url, ...rest]);
                  };
                  
                  XMLHttpRequest.prototype.send = function(...args) {
                    let url = this._interceptedUrl || '';
                    let urlString = typeof url === 'string' ? url : (url?.href || url?.toString() || '');
                    
                    // ✅ CRITICAL: Also check and redirect in send() as a fallback
                    // Some libraries might modify the URL between open() and send()
                    if (urlString && urlString.includes('api.web3modal.org/auth/v1/')) {
                      const localOrigin = window.location.origin;
                      const redirectedUrl = urlString.replace('https://api.web3modal.org', localOrigin);
                      console.log('🔄 [Layout] XMLHttpRequest.send: Redirecting ReownAuthentication request:', {
                        from: urlString,
                        to: redirectedUrl,
                      });
                      // Re-open with redirected URL
                      const method = this._method || 'GET';
                      originalXHROpen.call(this, method, redirectedUrl);
                      url = redirectedUrl;
                      urlString = redirectedUrl;
                      this._interceptedUrl = redirectedUrl;
                    }
                    
                    // More aggressive URL matching
                    // CRITICAL: Only block external API calls, NOT localhost or internal requests
                    // MetaMask detection and wallet connection use localhost/internal requests
                    // Check if this is an image/icon request (should be allowed)
                    // CRITICAL: WalletConnect icons can come from various URL patterns
                    const imageExtPattern = /\\.(jpg|jpeg|png|gif|webp|svg|ico)([?#]|$)/i;
                    const isImageRequest = imageExtPattern.test(url) || 
                                          url.includes('/icon') || 
                                          url.includes('/logo') ||
                                          url.includes('/image') ||
                                          url.includes('/wallet-icons/') ||
                                          url.includes('wallet-icons') ||
                                          // WalletConnect specific icon paths
                                          (url.includes('api.web3modal.org') && (url.includes('/image') || url.includes('/icon'))) ||
                                          (url.includes('explorer-api.walletconnect.com') && (url.includes('/image') || url.includes('/icon')));
                    
                    // Check if this is a wallet metadata API request (should be allowed for AppKit)
                    const isWalletMetadataRequest = url.includes('explorer-api.walletconnect.com') ||
                                                   url.includes('api.web3modal.org/v1/wallets') ||
                                                   url.includes('api.web3modal.org/v3/wallets') ||
                                                   (url.includes('api.web3modal.org') && url.includes('/wallets')) ||
                                                   // Allow any api.web3modal.org request that might contain wallet icon data
                                                   (url.includes('api.web3modal.org') && !url.includes('/analytics') && !url.includes('/pulse'));
                    
                    // Only block analytics/telemetry, not essential API calls
                    const isAnalyticsRequest = url.includes('pulse.walletconnect') ||
                                             url.includes('walletconnect.org/pulse') ||
                                             url.includes('web3modal.org/analytics') ||
                                             url.includes('walletconnect.org/analytics');
                    
                    if ((url.includes('web3modal.org') || 
                         url.includes('walletconnect.org') ||
                         url.includes('cca-lite.coinbase.com') || 
                         url.includes('coinbase.com/metrics')) &&
                        !url.includes('localhost:3000') &&
                        !url.includes('127.0.0.1') &&
                        !url.startsWith('/') &&
                        !url.startsWith('./') &&
                        !isImageRequest &&
                        !isWalletMetadataRequest &&
                        isAnalyticsRequest) {
                      // Suppress analytics only (allow wallet metadata APIs and images)
                      this.readyState = 4;
                      this.status = 200;
                      this.statusText = 'OK';
                      this.responseText = '';
                      if (this.onload) this.onload();
                      if (this.onreadystatechange) this.onreadystatechange();
                      return;
                    }
                    return originalXHRSend.apply(this, args);
                  };
                  
                  // CRITICAL: Intercept navigator.sendBeacon (AppKit uses this for analytics/telemetry)
                  // This MUST run before AppKit initializes to prevent pulse.walletconnect.org requests
                  const originalSendBeacon = navigator.sendBeacon;
                  const BEACON_MARKER = '__appkit_beacon_intercepted__';
                  
                  const interceptedSendBeacon = function(url, data) {
                    // Only suppress analytics/telemetry, not essential API calls
                    // Allow wallet metadata APIs for AppKit functionality
                    const isWalletMetadataRequest = url.includes('explorer-api.walletconnect.com') ||
                                                   url.includes('api.web3modal.org/v1/wallets') ||
                                                   url.includes('api.web3modal.org/v3/wallets');
                    
                    const isAnalyticsRequest = url.includes('pulse.walletconnect') ||
                                             url.includes('walletconnect.org/pulse') ||
                                             url.includes('web3modal.org/analytics') ||
                                             url.includes('walletconnect.org/analytics');
                    
                    // Block analytics only, allow wallet metadata APIs
                    if ((url.includes('walletconnect.org') || 
                         url.includes('web3modal.org')) &&
                        isAnalyticsRequest &&
                        !isWalletMetadataRequest) {
                      // Return true to indicate "success" without actually sending
                      // This prevents AppKit from retrying or logging errors
                      return true;
                    }
                    
                    // Block Coinbase analytics
                    if (url.includes('cca-lite.coinbase.com') || 
                        url.includes('coinbase.com/metrics')) {
                      return true;
                    }
                    
                    // For other requests, use original sendBeacon
                    return originalSendBeacon.apply(navigator, arguments);
                  };
                  
                  interceptedSendBeacon[BEACON_MARKER] = true;
                  
                  // Use Proxy to ensure interception even if AppKit wraps sendBeacon
                  navigator.sendBeacon = new Proxy(interceptedSendBeacon, {
                    apply: function(target, thisArg, argumentsList) {
                      return target.apply(thisArg, argumentsList);
                    }
                  });
                  
                  // Monitor for AppKit wrapping sendBeacon and re-intercept aggressively
                  let lastBeaconRef = navigator.sendBeacon;
                  let beaconCheckCount = 0;
                  const maxBeaconChecks = 200; // Check for 20 seconds
                  
                  const reInterceptBeacon = function() {
                    const currentBeacon = navigator.sendBeacon;
                    if (currentBeacon !== lastBeaconRef && !currentBeacon[BEACON_MARKER] && currentBeacon !== originalSendBeacon) {
                      // AppKit wrapped sendBeacon - wrap it again
                      const appkitBeacon = currentBeacon;
                      const reInterceptedBeacon = function(url, data) {
                        // Only suppress analytics, allow wallet metadata APIs
                        const isWalletMetadataRequest = url.includes('explorer-api.walletconnect.com') ||
                                                       url.includes('api.web3modal.org/v1/wallets') ||
                                                       url.includes('api.web3modal.org/v3/wallets');
                        
                        const isAnalyticsRequest = url.includes('pulse.walletconnect') ||
                                                 url.includes('walletconnect.org/pulse') ||
                                                 url.includes('web3modal.org/analytics') ||
                                                 url.includes('walletconnect.org/analytics');
                        
                        // Block analytics only
                        if ((url.includes('walletconnect.org') || 
                             url.includes('web3modal.org')) &&
                            isAnalyticsRequest &&
                            !isWalletMetadataRequest) {
                          return true;
                        }
                        
                        // Block Coinbase analytics
                        if (url.includes('cca-lite.coinbase.com') || 
                            url.includes('coinbase.com/metrics')) {
                          return true;
                        }
                        
                        return appkitBeacon.apply(navigator, arguments);
                      };
                      reInterceptedBeacon[BEACON_MARKER] = true;
                      navigator.sendBeacon = new Proxy(reInterceptedBeacon, {
                        apply: function(target, thisArg, argumentsList) {
                          return target.apply(thisArg, argumentsList);
                        }
                      });
                      lastBeaconRef = navigator.sendBeacon;
                      return navigator.sendBeacon;
                    }
                    return currentBeacon;
                  };
                  
                  // Check immediately and on DOMContentLoaded
                  reInterceptBeacon();
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', reInterceptBeacon);
                  }
                  
                  // Use requestAnimationFrame for better performance instead of setInterval
                  // Only check when page is active and reduce frequency
                  let rafId;
                  const checkBeacon = () => {
                    beaconCheckCount++;
                    reInterceptBeacon();
                    if (beaconCheckCount < maxBeaconChecks && document.visibilityState === 'visible') {
                      rafId = requestAnimationFrame(() => {
                        setTimeout(checkBeacon, 100); // Check every 100ms instead of 50ms
                      });
                    }
                  };
                  checkBeacon();
                  
                  // Function to re-intercept fetch if it gets wrapped
                  const reInterceptFetch = function() {
                    const currentFetch = window.fetch;
                    if (!currentFetch[FETCH_MARKER] && currentFetch !== originalFetch) {
                      const appkitFetch = currentFetch;
                      const reInterceptedFetch = function(...args) {
                        try {
                          // Extract URL from various argument formats (string, URL object, Request object)
                          let url = '';
                          let urlObject = null;
                          let urlString = '';
                          
                          if (typeof args[0] === 'string') {
                            url = args[0];
                            urlString = args[0];
                          } else if (args[0] instanceof URL) {
                            // Handle URL objects (ReownAuthentication uses new URL())
                            urlObject = args[0];
                            urlString = args[0].href || args[0].toString();
                            url = urlString;
                          } else if (args[0] && typeof args[0] === 'object') {
                            urlString = args[0].url || args[0].href || '';
                            url = urlString;
                            if (args[0] instanceof Request) {
                              urlObject = args[0];
                            }
                          }
                          
                          // Debug logging for auth/v1 requests
                          if (urlString && urlString.includes('auth/v1/')) {
                            console.log('🔍 [Layout] ReInterceptedFetch: Detected auth/v1 request:', {
                              url: urlString,
                              args0Type: typeof args[0],
                              args0IsURL: args[0] instanceof URL,
                              method: args[1]?.method || 'GET',
                            });
                          }
                          
                          // ✅ CRITICAL EARLIEST PASS-THROUGH: Allow /auth/v1/* and /appkit/* endpoints to ALWAYS reach real API
                          // This MUST be the FIRST check before any redirect or suppression logic
                          // These endpoints are critical for authentication and must never be blocked
                          const isAuthV1Endpoint = urlString && (
                            urlString.includes('/auth/v1/nonce') ||
                            urlString.includes('/auth/v1/authenticate') ||
                            urlString.includes('/auth/v1/me')
                          );
                          const isAppKitEndpoint = urlString && (
                            urlString.includes('/appkit/') ||
                            urlString.includes('/projects/')
                          );
                          
                          if (isAuthV1Endpoint || isAppKitEndpoint) {
                            // For auth/v1 and appkit endpoints, redirect api.web3modal.org to local origin
                            if (urlString && urlString.includes('api.web3modal.org')) {
                              const localOrigin = window.location.origin;
                              const redirectedUrl = urlString.replace('https://api.web3modal.org', localOrigin);
                              console.log('🔄 [Layout] ReInterceptedFetch: EARLY redirect for auth/appkit endpoint:', {
                                from: urlString,
                                to: redirectedUrl,
                                method: args[1]?.method || 'GET',
                              });
                              
                              // Create new args array with redirected URL (can't mutate args[0] for URL objects)
                              let redirectedArgs = [...args];
                              if (typeof args[0] === 'string') {
                                redirectedArgs[0] = redirectedUrl;
                              } else if (args[0] instanceof URL) {
                                // Create new URL with redirected base URL
                                // Parse redirectedUrl to get base path without query params
                                const redirectedUrlObj = new URL(redirectedUrl);
                                const newUrl = new URL(redirectedUrlObj.pathname, window.location.origin);
                                
                                // Copy ALL search params from original URL (preserves projectId, st, sv, etc.)
                                if (args[0].search) {
                                  args[0].searchParams.forEach((value, key) => {
                                    newUrl.searchParams.set(key, value);
                                  });
                                }
                                
                                // Also copy any search params from redirectedUrl if they exist
                                if (redirectedUrlObj.search) {
                                  redirectedUrlObj.searchParams.forEach((value, key) => {
                                    // Only add if not already present (original URL takes precedence)
                                    if (!newUrl.searchParams.has(key)) {
                                      newUrl.searchParams.set(key, value);
                                    }
                                  });
                                }
                                
                                redirectedArgs[0] = newUrl;
                              } else if (args[0] && typeof args[0] === 'object') {
                                if (args[0] instanceof Request) {
                                  redirectedArgs[0] = new Request(redirectedUrl, args[0]);
                                } else {
                                  redirectedArgs[0] = { ...args[0], url: redirectedUrl };
                                }
                              }
                              url = redirectedUrl;
                              urlString = redirectedUrl;
                              
                              // Always pass through to native fetch for auth/appkit endpoints with redirected URL
                              if (window.__nativeFetch) {
                                return window.__nativeFetch.apply(window, redirectedArgs);
                              }
                              // Fallback to appkitFetch if nativeFetch not available
                              return appkitFetch.apply(window, redirectedArgs);
                            }
                            
                            // Always pass through to native fetch for auth/appkit endpoints
                            if (window.__nativeFetch) {
                              return window.__nativeFetch.apply(window, args);
                            }
                            // Fallback to appkitFetch if nativeFetch not available
                            return appkitFetch.apply(window, args);
                          }
                          
                          // ✅ CRITICAL: Redirect /auth/v1/* requests from api.web3modal.org to our local endpoint
                          // This ensures ReownAuthentication uses our /auth/v1/nonce and /auth/v1/authenticate
                          // even if NEXT_PUBLIC_W3M_API_URL isn't being read correctly
                          // This MUST be the FIRST check to ensure it happens before any other logic
                          // Check both url and urlString to catch all cases
                          const shouldRedirect = (urlString && urlString.includes('api.web3modal.org/auth/v1/')) ||
                                                (url && typeof url === 'string' && url.includes('api.web3modal.org/auth/v1/'));
                          
                          if (shouldRedirect) {
                            const localOrigin = window.location.origin;
                            const targetUrl = urlString || url;
                            const redirectedUrl = targetUrl.replace('https://api.web3modal.org', localOrigin);
                            console.log('🔄 [Layout] ReInterceptedFetch: Redirecting ReownAuthentication request:', {
                              from: targetUrl,
                              to: redirectedUrl,
                              method: args[1]?.method || 'GET',
                              isUrlObject: urlObject instanceof URL,
                              args0Type: typeof args[0],
                              args0IsURL: args[0] instanceof URL,
                            });
                            
                            // Create new args array with redirected URL (can't mutate args[0] for URL objects)
                            let redirectedArgs = [...args];
                            if (typeof args[0] === 'string') {
                              redirectedArgs[0] = redirectedUrl;
                            } else if (args[0] instanceof URL) {
                              // Create new URL with redirected base URL
                              // Parse redirectedUrl to get base path without query params
                              const redirectedUrlObj = new URL(redirectedUrl);
                              const newUrl = new URL(redirectedUrlObj.pathname, window.location.origin);
                              
                              // Copy ALL search params from original URL (preserves projectId, st, sv, etc.)
                              if (args[0].search) {
                                args[0].searchParams.forEach((value, key) => {
                                  newUrl.searchParams.set(key, value);
                                });
                              }
                              
                              // Also copy any search params from redirectedUrl if they exist
                              if (redirectedUrlObj.search) {
                                redirectedUrlObj.searchParams.forEach((value, key) => {
                                  // Only add if not already present (original URL takes precedence)
                                  if (!newUrl.searchParams.has(key)) {
                                    newUrl.searchParams.set(key, value);
                                  }
                                });
                              }
                              
                              redirectedArgs[0] = newUrl;
                            } else if (args[0] && typeof args[0] === 'object') {
                              // For Request objects or other objects, update the url property
                              if (args[0] instanceof Request) {
                                redirectedArgs[0] = new Request(redirectedUrl, args[0]);
                              } else {
                                redirectedArgs[0] = { ...args[0], url: redirectedUrl };
                              }
                            }
                            url = redirectedUrl;
                            urlString = redirectedUrl;
                            
                            // Use nativeFetch after redirection to avoid infinite loops
                            if (window.__nativeFetch) {
                              return window.__nativeFetch.apply(window, redirectedArgs);
                            }
                            // Fallback to appkitFetch if nativeFetch not available
                            return appkitFetch.apply(window, redirectedArgs);
                          }
                          
                          // Suppress Coinbase analytics requests FIRST (all methods, all URLs)
                          // This prevents Coinbase SDK from throwing "Failed to fetch" errors
                          if (url.includes('cca-lite.coinbase.com') || 
                              url.includes('coinbase.com/metrics') ||
                              url.includes('coinbase.com/amp')) {
                            return Promise.resolve(new Response('', {
                              status: 200,
                              statusText: 'OK',
                              headers: {
                                'Content-Type': 'text/plain',
                                'Access-Control-Allow-Origin': '*'
                              }
                            }));
                          }
                          
                          // More aggressive URL matching
                          // CRITICAL: Only block external API calls, NOT localhost or internal requests
                          // MetaMask detection and wallet connection use localhost/internal requests
                          // Also suppress Coinbase SDK HEAD requests to localhost (cross-origin policy checks)
                          const isCoinbaseSDKHeadRequest = args[1] && args[1].method === 'HEAD';
                          
                          // Suppress Coinbase SDK HEAD requests to localhost (cross-origin policy checks)
                          if (isCoinbaseSDKHeadRequest && (url.includes('localhost:3000') || url.includes('127.0.0.1') || url.includes('signin'))) {
                            return Promise.resolve(new Response('', {
                              status: 200,
                              statusText: 'OK',
                              headers: {
                                'Content-Type': 'text/plain',
                                'Access-Control-Allow-Origin': '*'
                              }
                            }));
                          }
                          
                          // Check if this is an image/icon request (should be allowed)
                          // CRITICAL: WalletConnect icons can come from various URL patterns
                          const imageExtPattern = /\\.(jpg|jpeg|png|gif|webp|svg|ico)([?#]|$)/i;
                          const isImageRequest = imageExtPattern.test(url) || 
                                                url.includes('/icon') || 
                                                url.includes('/logo') ||
                                                url.includes('/image') ||
                                                url.includes('/wallet-icons/') ||
                                                url.includes('wallet-icons') ||
                                                url.includes('explorer-api.walletconnect.com') ||
                                                // WalletConnect specific icon paths
                                                (url.includes('api.web3modal.org') && (url.includes('/image') || url.includes('/icon'))) ||
                                                (url.includes('explorer-api.walletconnect.com') && (url.includes('/image') || url.includes('/icon')));
                          
                          // ✅ CRITICAL: Never suppress /auth/v1/* or /appkit/* endpoints - they must reach the real API
                          const isCriticalEndpoint = url.includes('/auth/v1/') || url.includes('/appkit/') || url.includes('/projects/');
                          
                          if ((url.includes('web3modal.org') || 
                               url.includes('walletconnect.org') ||
                               url.includes('pulse.walletconnect')) &&
                              !url.includes('localhost') &&
                              !url.includes('127.0.0.1') &&
                              !url.startsWith('/') &&
                              !url.startsWith('./') &&
                              !isImageRequest &&
                              !isCriticalEndpoint) {
                            // Suppress WalletConnect/Web3Modal API calls (but allow images/icons and critical auth/appkit endpoints)
                            return Promise.resolve(new Response('', {
                              status: 200,
                              statusText: 'OK',
                              headers: { 
                                'Content-Type': 'text/plain',
                                'Access-Control-Allow-Origin': '*'
                              }
                            }));
                          }
                          return appkitFetch.apply(window, args);
                        } catch (error) {
                          // If interception fails, suppress Coinbase analytics errors
                          const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
                          if (url.includes('cca-lite.coinbase.com') || 
                              url.includes('coinbase.com/metrics') ||
                              url.includes('coinbase.com/amp')) {
                            return Promise.resolve(new Response('', {
                              status: 200,
                              statusText: 'OK',
                              headers: {
                                'Content-Type': 'text/plain',
                                'Access-Control-Allow-Origin': '*'
                              }
                            }));
                          }
                          // For non-Coinbase errors, rethrow
                          throw error;
                        }
                      };
                      reInterceptedFetch[FETCH_MARKER] = true;
                      window.fetch = new Proxy(reInterceptedFetch, {
                        apply: function(target, thisArg, argumentsList) {
                          return target.apply(thisArg, argumentsList);
                        }
                      });
                      return window.fetch;
                    }
                    return currentFetch;
                  };
                  
                  // Aggressively monitor and re-intercept if AppKit wraps fetch
                  let lastFetchRef = fetchProxy;
                  let checkCount = 0;
                  const maxChecks = 150; // Check for 15 seconds (150 * 100ms)
                  
                  // Check immediately and on DOMContentLoaded
                  reInterceptFetch();
                  if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', reInterceptFetch);
                  }
                  
                  // Use requestAnimationFrame for better performance instead of setInterval
                  // Only check when page is active and reduce frequency
                  let fetchRafId;
                  const checkFetch = () => {
                    checkCount++;
                    const currentFetch = window.fetch;
                    
                    // Check if fetch was replaced and doesn't have our marker
                    if (currentFetch !== lastFetchRef) {
                      const newFetch = reInterceptFetch();
                      if (newFetch !== currentFetch) {
                        lastFetchRef = newFetch;
                      }
                    }
                    
                    if (checkCount < maxChecks && document.visibilityState === 'visible') {
                      fetchRafId = requestAnimationFrame(() => {
                        setTimeout(checkFetch, 100); // Check every 100ms instead of 50ms
                      });
                    }
                  };
                  checkFetch();
                })();
                
                // Fix SVG attributes for AppKit components
                function fixSVGAttributes() {
                  const selectors = [
                    'appkit-button svg',
                    'appkit-account-button svg',
                    'appkit-network-button svg',
                    'w3m-account-button svg',
                    'wui-icon svg',
                    'wui-image svg'
                  ];
                  
                  selectors.forEach(selector => {
                    const svgs = document.querySelectorAll(selector);
                    svgs.forEach(svg => {
                      // Fix empty or missing width attribute
                      if (!svg.getAttribute('width') || svg.getAttribute('width') === '') {
                        svg.setAttribute('width', '24');
                      }
                      // Fix empty or missing height attribute
                      if (!svg.getAttribute('height') || svg.getAttribute('height') === '') {
                        svg.setAttribute('height', '24');
                      }
                      // Ensure viewBox exists
                      if (!svg.getAttribute('viewBox')) {
                        svg.setAttribute('viewBox', '0 0 24 24');
                      }
                    });
                  });
                }
                
                // Fix SVGs immediately and on DOM changes
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', fixSVGAttributes);
                } else {
                  fixSVGAttributes();
                }
                
                // ✅ CRITICAL: Fix Phosphor icons specifically (they load dynamically)
                const fixPhosphorIcons = () => {
                  // Phosphor icons use web components with specific tag names
                  const phosphorSelectors = [
                    'ph-wallet',
                    'ph-wallet svg',
                    '[is="ph-wallet"]',
                    '[is="ph-wallet"] svg'
                  ];
                  
                  phosphorSelectors.forEach(selector => {
                    try {
                      const elements = document.querySelectorAll(selector);
                      elements.forEach(el => {
                        const svg = el.tagName === 'SVG' ? el : el.querySelector('svg');
                        if (svg) {
                          if (!svg.getAttribute('width') || svg.getAttribute('width') === '') {
                            svg.setAttribute('width', '24');
                          }
                          if (!svg.getAttribute('height') || svg.getAttribute('height') === '') {
                            svg.setAttribute('height', '24');
                          }
                          if (!svg.getAttribute('viewBox')) {
                            svg.setAttribute('viewBox', '0 0 24 24');
                          }
                        }
                      });
                    } catch (e) {
                      // Ignore errors for invalid selectors
                    }
                  });
                };
                
                // Fix Phosphor icons immediately
                fixPhosphorIcons();
                
                // Use MutationObserver to fix dynamically added SVGs (including Phosphor icons)
                let observer = null;
                const startObserving = () => {
                  // Verify document.body exists and is a valid Node before observing
                  if (document.body && document.body instanceof Node) {
                    try {
                      if (!observer) {
                        observer = new MutationObserver(() => {
                          fixSVGAttributes();
                          fixPhosphorIcons();
                        });
                      }
                      
                      observer.observe(document.body, {
                        childList: true,
                        subtree: true,
                        attributes: true,
                        attributeFilter: ['width', 'height']
                      });
                    } catch (error) {
                      // Silently handle observation errors (element might not be ready)
                      console.debug('MutationObserver setup error:', error);
                    }
                  } else {
                    // If body doesn't exist yet, wait for it
                    setTimeout(startObserving, 50);
                  }
                };
                
                startObserving();
                
                // Suppress unhandled promise rejections from Coinbase analytics and SDK
                window.addEventListener('unhandledrejection', function(event) {
                  // Handle Error objects properly
                  let reason = '';
                  let message = '';
                  let stack = '';
                  
                  if (event.reason instanceof Error) {
                    reason = event.reason.toString();
                    message = event.reason.message || '';
                    stack = event.reason.stack || '';
                  } else if (typeof event.reason === 'string') {
                    reason = event.reason;
                    message = event.reason;
                  } else if (event.reason && typeof event.reason === 'object') {
                    reason = (event.reason.toString && typeof event.reason.toString === 'function' ? event.reason.toString() : null) || JSON.stringify(event.reason) || '';
                    message = event.reason.message || reason;
                    stack = event.reason.stack || '';
                  } else {
                    reason = String(event.reason || '');
                    message = reason;
                  }
                  
                  // Combine all error information for comprehensive matching
                  const fullErrorText = (reason + ' ' + message + ' ' + stack).toLowerCase();
                  
                  // Check if error has AnalyticsSDKApiError context
                  const hasAnalyticsContext = event.reason && 
                    typeof event.reason === 'object' && 
                    event.reason.context === 'AnalyticsSDKApiError';

                  // Suppress WalletConnect session topic errors (harmless - stale sessions)
                  // Match various formats: "No matching key. session topic does not exist", "No matching key", etc.
                  if (
                    reason.includes('No matching key') ||
                    reason.includes('session topic does not exist') ||
                    reason.includes('session topic') ||
                    message.includes('No matching key') ||
                    message.includes('session topic does not exist') ||
                    message.includes('session topic') ||
                    fullErrorText.includes('no matching key') ||
                    fullErrorText.includes('session topic does not exist') ||
                    fullErrorText.includes('session topic') ||
                    (reason.includes('isValidSessionTopic') || reason.includes('isValidEmit') || reason.includes('isValidUpdate')) ||
                    (message.includes('isValidSessionTopic') || message.includes('isValidEmit') || message.includes('isValidUpdate')) ||
                    stack.includes('isValidSessionTopic') ||
                    stack.includes('isValidEmit') ||
                    stack.includes('isValidUpdate') ||
                    stack.includes('onSessionEventRequest') ||
                    stack.includes('onSessionUpdateRequest') ||
                    stack.includes('onRelayMessage') ||
                    fullErrorText.includes('proposal') ||
                    fullErrorText.includes('pending session not found')
                  ) {
                    // WalletConnect trying to process events for non-existent sessions - harmless
                    event.preventDefault();
                    return;
                  }

                  // Suppress Coinbase analytics connection errors
                  if (
                    hasAnalyticsContext ||
                    reason.includes('cca-lite.coinbase.com') ||
                    reason.includes('coinbase.com/amp') ||
                    reason.includes('coinbase.com/metrics') ||
                    reason.includes('Analytics SDK') ||
                    reason.includes('AnalyticsSDKApiError') ||
                    message.includes('cca-lite.coinbase.com') ||
                    message.includes('coinbase.com/amp') ||
                    message.includes('coinbase.com/metrics') ||
                    message.includes('Analytics SDK') ||
                    message.includes('AnalyticsSDKApiError') ||
                    (reason.includes('ERR_CONNECTION_REFUSED') && (reason.includes('coinbase') || reason.includes('cca-lite'))) ||
                    (message.includes('ERR_CONNECTION_REFUSED') && (message.includes('coinbase') || message.includes('cca-lite'))) ||
                    (reason.includes('Failed to fetch') && (reason.includes('coinbase') || reason.includes('cca-lite') || reason.includes('Analytics'))) ||
                    (message.includes('Failed to fetch') && (message.includes('coinbase') || message.includes('cca-lite') || message.includes('Analytics'))) ||
                    (message.includes('TypeError') && message.includes('Failed to fetch') && (message.includes('Analytics') || message.includes('coinbase')))
                  ) {
                    event.preventDefault(); // Suppress the error
                    return;
                  }
                  
                  // Suppress Coinbase SDK MetaMask connection errors (we're not using Coinbase)
                  if (
                    (reason.includes('Failed to connect to MetaMask') || 
                     reason.includes('MetaMask extension not found') ||
                     message.includes('Failed to connect to MetaMask') ||
                     message.includes('MetaMask extension not found')) &&
                    (stack.includes('createBaseAccountSDK') ||
                     stack.includes('baseAccount') ||
                     stack.includes('checkCrossOriginOpenerPolicy') ||
                     reason.includes('createBaseAccountSDK') ||
                     reason.includes('baseAccount') ||
                     reason.includes('checkCrossOriginOpenerPolicy'))
                  ) {
                    // Coinbase SDK tries to connect to MetaMask but we're not using Coinbase - harmless
                    event.preventDefault();
                    return;
                  }
                });
                
                // Suppress runtime errors (not promise rejections) from WalletConnect
                window.addEventListener('error', function(event) {
                  const message = event.message || '';
                  const error = event.error;
                  let errorMessage = '';
                  let errorStack = '';
                  
                  if (error instanceof Error) {
                    errorMessage = error.message || '';
                    errorStack = error.stack || '';
                  } else if (typeof error === 'string') {
                    errorMessage = error;
                  } else if (error && typeof error === 'object') {
                    errorMessage = error.toString?.() || JSON.stringify(error) || '';
                    errorStack = error.stack || '';
                  }
                  
                  // Combine all error information for comprehensive matching
                  const fullErrorText = (message + ' ' + errorMessage + ' ' + errorStack).toLowerCase();
                  
                  // Suppress WalletConnect session topic errors (harmless - stale sessions)
                  if (
                    message.includes('No matching key') ||
                    message.includes('session topic does not exist') ||
                    message.includes('session topic') ||
                    errorMessage.includes('No matching key') ||
                    errorMessage.includes('session topic does not exist') ||
                    errorMessage.includes('session topic') ||
                    fullErrorText.includes('no matching key') ||
                    fullErrorText.includes('session topic does not exist') ||
                    fullErrorText.includes('session topic') ||
                    errorStack.includes('isValidSessionTopic') ||
                    errorStack.includes('isValidEmit') ||
                    errorStack.includes('isValidUpdate') ||
                    errorStack.includes('onSessionEventRequest') ||
                    errorStack.includes('onSessionUpdateRequest') ||
                    errorStack.includes('onRelayMessage') ||
                    fullErrorText.includes('proposal') ||
                    fullErrorText.includes('pending session not found')
                  ) {
                    // WalletConnect trying to process events for non-existent sessions - harmless
                    event.preventDefault();
                    return false; // Prevent default error handling
                  }
                  
                  // Allow other errors to propagate normally
                  return true;
                }, true); // Use capture phase to catch errors early
                
                const originalWarn = console.warn;
                const originalError = console.error;
                const originalLog = console.log;
                
                // Suppress WalletConnect session logs from installHook.js
                console.log = function(...args) {
                  // Check for WalletConnect session log objects
                  if (args.some(arg => 
                    typeof arg === 'object' && 
                    arg !== null && 
                    typeof arg.msg === 'string' &&
                    (arg.msg.includes('No matching key') || 
                     arg.msg.includes('session') ||
                     arg.msg.includes('proposal:') ||
                     arg.msg.includes('Pending session not found') ||
                     arg.msg.includes('onRelayMessage') ||
                     arg.msg.includes('failed to process'))
                  )) {
                    // WalletConnect session log object - suppress
                    return;
                  }
                  originalLog.apply(console, args);
                };
                
                // Suppress warnings for preload and SVG attributes
                console.warn = function(...args) {
                  // Check for WalletConnect session log objects
                  if (args.some(arg => 
                    typeof arg === 'object' && 
                    arg !== null && 
                    typeof arg.msg === 'string' &&
                    (arg.msg.includes('No matching key') || 
                     arg.msg.includes('session') ||
                     arg.msg.includes('proposal:') ||
                     arg.msg.includes('Pending session not found') ||
                     arg.msg.includes('onRelayMessage') ||
                     arg.msg.includes('failed to process'))
                  )) {
                    // WalletConnect session log object - suppress
                    return;
                  }
                  
                  const message = args.join(' ');
                    // Suppress ALL preload warnings (harmless - browser optimization)
                    if (
                      message.includes('preloaded using link preload') ||
                      message.includes('was preloaded using link preload but not used')
                    ) {
                      return;
                    }
                  // Suppress preload warnings for Reown fonts and Next.js chunks
                  if (
                    message.includes('preloaded using link preload') &&
                    (message.includes('fonts.reown.com') || 
                     message.includes('reown.com') ||
                     message.includes('KHTeka') ||
                     message.includes('_next/static/chunks'))
                  ) {
                    return;
                  }
                  // Suppress warnings about resources not used within a few seconds
                  if (
                    message.includes('was preloaded using link preload but not used') &&
                    (message.includes('fonts.reown.com') || 
                     message.includes('reown.com') ||
                       message.includes('KHTeka') ||
                       message.includes('_next/static/chunks'))
                  ) {
                    return;
                  }
                  // Suppress SVG attribute warnings from Lit HTML (AppKit/Reown)
                  if (
                    message.includes('attribute width') ||
                    message.includes('attribute height') ||
                    message.includes('Unexpected end of attribute')
                  ) {
                    // Try to fix the SVG after suppressing the error
                    setTimeout(fixSVGAttributes, 0);
                    return;
                  }
                  // Suppress WalletConnect RPC warnings (non-critical - only affects balance fetching)
                  if (
                    message.includes('rpc.walletconnect.org') ||
                    (message.includes('CORS') && message.includes('walletconnect')) ||
                    (message.includes('Access to fetch') && message.includes('walletconnect')) ||
                    (message.includes('Access-Control-Allow-Origin') && message.includes('walletconnect'))
                  ) {
                    // These warnings are non-critical - wallet connection and authentication work fine
                    return;
                  }
                  // Suppress Lit.dev warnings about inefficient updates (AppKit web components)
                  if (
                    message.includes('scheduled an update') ||
                    message.includes('change-in-update') ||
                    message.includes('w3m-router-container') ||
                    (message.includes('Element') && message.includes('scheduled an update') && message.includes('after an update completed'))
                  ) {
                    // Lit.dev web components scheduling updates - known AppKit behavior, harmless
                    return;
                  }
                  originalWarn.apply(console, args);
                };
                
                // Suppress Coinbase analytics errors
                console.error = function(...args) {
                  // Check all arguments for WalletConnect session errors (log objects)
                  if (args.some(arg => 
                    typeof arg === 'object' && 
                    arg !== null && 
                    typeof arg.msg === 'string' &&
                    (arg.msg.includes('No matching key') || 
                     arg.msg.includes('session') ||
                     arg.msg.includes('proposal:') ||
                     arg.msg.includes('Pending session not found') ||
                     arg.msg.includes('onRelayMessage') ||
                     arg.msg.includes('failed to process'))
                  )) {
                    // WalletConnect session log object - suppress
                    return;
                  }
                  
                  // Check all arguments for Coinbase analytics errors
                  const message = args.map(arg => {
                    if (typeof arg === 'string') return arg;
                    if (arg instanceof Error) return arg.message + ' ' + arg.stack;
                    if (typeof arg === 'object' && arg !== null) {
                      // Check for AnalyticsSDKApiError context
                      if (arg.context === 'AnalyticsSDKApiError') {
                        return 'Analytics SDK Error';
                      }
                      // Check for WalletConnect session errors in msg property
                      if (typeof arg.msg === 'string' && 
                          (arg.msg.includes('No matching key') || 
                           arg.msg.includes('session') ||
                           arg.msg.includes('proposal:') ||
                           arg.msg.includes('Pending session not found') ||
                           arg.msg.includes('onRelayMessage') ||
                           arg.msg.includes('failed to process'))) {
                        return 'WalletConnect Session Error';
                      }
                      try {
                        return JSON.stringify(arg);
                      } catch {
                        return String(arg);
                      }
                    }
                    return String(arg);
                  }).join(' ');
                  
                  // Suppress Coinbase analytics connection errors
                  if (
                    message.includes('cca-lite.coinbase.com') ||
                    message.includes('coinbase.com/amp') ||
                    message.includes('coinbase.com/metrics') ||
                    message.includes('Analytics SDK') ||
                    message.includes('AnalyticsSDKApiError') ||
                    (args.some(arg => typeof arg === 'object' && arg !== null && arg.context === 'AnalyticsSDKApiError')) ||
                    (message.includes('ERR_CONNECTION_REFUSED') && (message.includes('coinbase') || message.includes('cca-lite'))) ||
                    (message.includes('Failed to fetch') && (message.includes('coinbase') || message.includes('cca-lite') || message.includes('Analytics SDK'))) ||
                    (message.includes('Fetch failed loading') && (message.includes('coinbase') || message.includes('cca-lite'))) ||
                    (message.includes('POST') && message.includes('cca-lite.coinbase.com')) ||
                    (message.includes('GET') && message.includes('cca-lite.coinbase.com')) ||
                    (message.includes('TypeError') && message.includes('Failed to fetch') && message.includes('Analytics'))
                  ) {
                    return;
                  }
                  // Suppress IndexedDB errors during page unload (expected behavior)
                  if (
                    message.includes('IDBDatabase') &&
                    (message.includes('connection is closing') ||
                     message.includes('database connection is closing') ||
                     message.includes("Failed to execute 'transaction' on 'IDBDatabase'"))
                  ) {
                    return; // Suppress expected error during page unload
                  }
                  // Suppress Firebase/Realtime Database IndexedDB errors
                  if (
                    message.includes('InvalidStateError') &&
                    (message.includes('IDBDatabase') ||
                     message.includes('transaction') ||
                     message.includes('live_mode'))
                  ) {
                    return; // Suppress Firebase IndexedDB errors during cleanup
                  }
                  // Suppress WalletConnect session topic errors (harmless - stale sessions)
                  if (
                    message.includes('No matching key') ||
                    message.includes('session topic does not exist') ||
                    message.includes('session topic') ||
                    message.includes('session:') ||
                    message.includes('proposal:') ||
                    message.includes('Pending session not found') ||
                    message.includes('onRelayMessage') ||
                    message.includes('failed to process') ||
                    (message.includes('isValidSessionTopic') || message.includes('isValidEmit') || message.includes('isValidUpdate')) ||
                    (message.includes('onSessionEventRequest') || message.includes('onSessionUpdateRequest') || message.includes('processRequest')) ||
                    message.includes('WalletConnect Session Error')
                  ) {
                    // WalletConnect trying to process events for non-existent sessions - harmless
                    return;
                  }

                  // Suppress AppKit initialization and connection errors (harmless during setup)
                  if (
                    (message.includes('Appkit:WagmiAdapter:getBalance') ||
                     message.includes('WagmiAdapter:getBalance') ||
                     message.includes('Error getting balance') ||
                     message.includes('getBalance')) &&
                    (message.includes('Cannot convert undefined to BigInt') ||
                     message.includes('BigInt') ||
                     message.includes('undefined'))
                  ) {
                    // AppKit balance fetching errors during wallet sync - harmless when balance is unavailable
                    return;
                  }

                  // Suppress AppKit provider initialization errors
                  if (
                    message.includes('AppKit initialization timeout') ||
                    message.includes('Failed to initialize AppKit') ||
                    (message.includes('AppKit Provider') && message.includes('failed')) ||
                    (message.includes('createAppKit') && message.includes('error')) ||
                    (message.includes('WagmiAdapter') && message.includes('initialization'))
                  ) {
                    // AppKit provider initialization errors - continue without AppKit features
                    return;
                  }

                  // Suppress MetaMask connection and port errors
                  if (
                    message.includes('MetaMask: Content script lost connection') ||
                    message.includes('MetaMask: Disconnected from MetaMask background') ||
                    message.includes('MetaMask: Lost connection to') ||
                    (message.includes('MetaMask') && message.includes('Port disconnected')) ||
                    (message.includes('chromePort disconnected') && message.includes('contentscript'))
                  ) {
                    // MetaMask extension connection issues - harmless, wallet will reconnect
                    return;
                  }
                  // Suppress AppKit balance errors (harmless - balance fetching failures)
                  // This happens when AppKit tries to sync balance before address/chainId is fully set
                  if (
                    (message.includes('Appkit:WagmiAdapter:getBalance') || 
                     message.includes('WagmiAdapter:getBalance') ||
                     message.includes('Error getting balance') ||
                     message.includes('getBalance')) &&
                    (message.includes('Cannot convert undefined to a BigInt') || 
                     message.includes('BigInt') ||
                     message.includes('undefined'))
                  ) {
                    // AppKit balance fetching errors - harmless when balance is unavailable
                    // This occurs during account sync when address/chainId might be temporarily undefined
                    return;
                  }
                  // Suppress SVG attribute errors from Lit HTML
                  if (
                    message.includes('attribute width') ||
                    message.includes('attribute height') ||
                    message.includes('Unexpected end of attribute')
                  ) {
                    // Try to fix the SVG after suppressing the error
                    setTimeout(fixSVGAttributes, 0);
                    return;
                  }
                  // Suppress WalletConnect RPC errors (non-critical - only affects balance fetching)
                  // These are external service limitations and don't affect wallet connection
                  if (
                    message.includes('rpc.walletconnect.org') ||
                    message.includes('WalletConnect') ||
                    (message.includes('CORS') && message.includes('walletconnect')) ||
                    (message.includes('429') && message.includes('walletconnect')) ||
                    (message.includes('Too Many Requests') && message.includes('walletconnect')) ||
                    (message.includes('ERR_FAILED') && message.includes('walletconnect')) ||
                    (message.includes('TimeoutError') && message.includes('walletconnect')) ||
                    (message.includes('Access to fetch') && message.includes('walletconnect'))
                  ) {
                    // These errors are non-critical - wallet connection and authentication work fine
                    // They only affect balance fetching, which is a nice-to-have feature
                    return;
                  }
                  // Suppress AppKit balance errors (harmless - happens when address/chainId is undefined during sync)
                  // This occurs when AppKit tries to sync balance before account is fully initialized
                  if (
                    message.includes('WagmiAdapter:getBalance') ||
                    message.includes('Appkit:WagmiAdapter:getBalance') ||
                    (message.includes('getBalance') && (message.includes('BigInt') || message.includes('undefined'))) ||
                    (message.includes('Error getting balance') && message.includes('undefined'))
                  ) {
                    // AppKit balance fetching errors - harmless when balance is unavailable during account sync
                    return;
                  }
                  
                  // Suppress Web3Modal API errors (403/400 from getWallets and pulse endpoints)
                  if (
                    message.includes('api.web3modal.org') ||
                    message.includes('pulse.walletconnect.org') ||
                    message.includes('getWallets') ||
                    message.includes('sendBeacon') ||
                    message.includes('/auth/v1/nonce') ||
                    (message.includes('403') && (message.includes('Forbidden') || message.includes('api.web3modal'))) ||
                    (message.includes('400') && (message.includes('Bad Request') || message.includes('pulse.walletconnect'))) ||
                    (message.includes('202') && message.includes('pulse.walletconnect'))
                  ) {
                    // These errors are harmless - we're only using injected wallets
                    return;
                  }
                  // Suppress ChunkLoadError (webpack trying to load from wrong port - harmless)
                  if (
                    message.includes('ChunkLoadError') ||
                    message.includes('Loading chunk') ||
                    (message.includes('ERR_CONNECTION_REFUSED') && message.includes('localhost:3001'))
                  ) {
                    // Webpack trying to load chunks from wrong port - harmless development issue
                    return;
                  }
                  // Suppress sign message errors (expected when user rejects or connector issues)
                  if (
                    (message.includes('WagmiAdapter:signMessage') ||
                     message.includes('Sign message failed') ||
                     message.includes('SWIXUtil:requestSignMessage') ||
                     (message.includes('AppKitError') && message.includes('signMessage'))) &&
                    (message.includes('User rejected') || 
                     message.includes('Connector not connected') ||
                     message.includes('not connected'))
                  ) {
                    // Only suppress connector/user rejection issues, not actual errors
                    return;
                  }
                  // Suppress AppKit planLimits destructuring errors (we provide mock planLimits structure)
                  if (
                    message.includes('Cannot destructure property') &&
                    (message.includes('planLimits') || message.includes('tier')) &&
                    (message.includes('fetchUsage') || message.includes('ApiController'))
                  ) {
                    // This error occurs when AppKit tries to destructure planLimits from our mock response
                    // We provide planLimits structure, but AppKit might still throw this error during initialization
                    return;
                  }
                  // Suppress "Failed to fetch usage" errors from AppKit initialization
                  if (
                    message.includes('Failed to fetch usage') &&
                    (message.includes('ApiController') || message.includes('appkit-base-client'))
                  ) {
                    // AppKit initialization error - harmless when using only injected wallets
                    return;
                  }
                  // Suppress "Failed to fetch remote project configuration" warnings from AppKit
                  if (
                    (message.includes('Failed to fetch remote project configuration') ||
                     message.includes('[Reown Config] Failed to fetch remote project configuration') ||
                     message.includes('fetchProjectConfig')) &&
                    (message.includes('Unexpected end of JSON input') || message.includes('SyntaxError'))
                  ) {
                    // AppKit tries to fetch remote config but endpoint may not be available - harmless
                    return;
                  }
                  // Suppress Coinbase SDK HEAD request failures (harmless - cross-origin policy checks)
                  if (
                    (message.includes('Fetch failed loading') || message.includes('Failed to fetch')) &&
                    message.includes('HEAD') &&
                    (message.includes('localhost') || message.includes('signin') || message.includes('coinbase') || message.includes('checkCrossOriginOpenerPolicy'))
                  ) {
                    // Coinbase SDK checks cross-origin policy via HEAD requests - harmless failures
                    return;
                  }
                  // Suppress Coinbase SDK MetaMask connection errors (we're not using Coinbase)
                  if (
                    (message.includes('Failed to connect to MetaMask') || message.includes('MetaMask extension not found')) &&
                    (message.includes('createBaseAccountSDK') || message.includes('baseAccount') || message.includes('checkCrossOriginOpenerPolicy') || message.includes('Coinbase'))
                  ) {
                    // Coinbase SDK tries to connect to MetaMask but we're not using Coinbase - harmless
                    return;
                  }
                  // Suppress unhandled promise rejections from Coinbase SDK MetaMask connection attempts
                  if (
                    message.includes('Uncaught (in promise)') &&
                    (message.includes('Failed to connect to MetaMask') || message.includes('MetaMask extension not found')) &&
                    (message.includes('inpage.js') || message.includes('createBaseAccountSDK') || message.includes('baseAccount'))
                  ) {
                    // Coinbase SDK's MetaMask connection attempts failing - harmless when not using Coinbase
                    return;
                  }
                  // Suppress Lit.dev warnings about inefficient updates (AppKit web components)
                  if (
                    message.includes('scheduled an update') ||
                    message.includes('change-in-update') ||
                    message.includes('w3m-router-container') ||
                    (message.includes('Element') && message.includes('scheduled an update') && message.includes('after an update completed'))
                  ) {
                    // Lit.dev web components scheduling updates - known AppKit behavior, harmless
                    return;
                  }
                  originalError.apply(console, args);
                };
              }
            `,
          }}
        />
      </head>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        fonts.sans
      )}>
        <ContextProvider cookies={cookieString}>
        <AuthProvider>
          <AppKitProvider>
            <Providers>
              <SessionSync />
              {children}
            </Providers>
          </AppKitProvider>
        </AuthProvider>
        </ContextProvider>
      </body>
    </html>
  )
}
 