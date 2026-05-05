/**
 * AppKit Connection Test Component
 * 
 * Diagnostic component to test AppKit modal initialization and opening
 * Use this to verify AppKit is working correctly
 */

'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useAppKit } from '@reown/appkit/react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export function AppKitConnectionTest() {
  const [testResults, setTestResults] = useState<Record<string, boolean | string>>({});
  const [isTesting, setIsTesting] = useState(false);
  
  const appKit = useAppKit();
  const appKitRef = useRef(appKit);
  
  // Update ref when appKit changes (during render, not in useEffect)
  if (appKitRef.current !== appKit) {
    appKitRef.current = appKit;
  }
  
  // Extract open function from ref
  const openAppKit = useMemo(() => appKitRef.current?.open, [appKit?.open]);

  useEffect(() => {
    // Run diagnostic tests on mount only (empty deps)
    runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  const runDiagnostics = () => {
    const results: Record<string, boolean | string> = {};
    
    // Test 1: Check if useAppKit() returns a value
    results['useAppKit() returns value'] = appKit !== null && appKit !== undefined;
    
    // Test 2: Check if open function exists
    results['open function exists'] = typeof openAppKit === 'function';
    
    // Test 3: Check window.__appkit_modal
    if (typeof window !== 'undefined') {
      results['window.__appkit_modal exists'] = !!(window as any).__appkit_modal;
      results['window.__appkit_initialized'] = !!(window as any).__appkit_initialized;
      
      const windowModal = (window as any).__appkit_modal;
      if (windowModal) {
        results['window.__appkit_modal.open exists'] = typeof windowModal.open === 'function';
        results['window.__appkit_modal.getState exists'] = typeof windowModal.getState === 'function';
        
        // Try to get state
        try {
          const state = windowModal.getState?.();
          results['window.__appkit_modal.getState() works'] = state !== undefined;
          results['Modal state.open'] = state?.open === false ? 'closed' : state?.open === true ? 'open' : 'unknown';
        } catch (e) {
          results['window.__appkit_modal.getState() works'] = `Error: ${e}`;
        }
      }
    } else {
      results['window.__appkit_modal exists'] = 'N/A (SSR)';
    }
    
    // Test 4: Check appKit object structure
    if (appKitRef.current) {
      results['appKit.open exists'] = typeof (appKitRef.current as any).open === 'function';
      results['appKit.close exists'] = typeof (appKitRef.current as any).close === 'function';
      results['appKit.getState exists'] = typeof (appKitRef.current as any).getState === 'function';
    }
    
    setTestResults(results);
  };

  const testOpenModal = async () => {
    setIsTesting(true);
    try {
      console.log('🧪 [AppKitConnectionTest] Testing modal open...');
      
      if (openAppKit && typeof openAppKit === 'function') {
        console.log('✅ [AppKitConnectionTest] openAppKit is a function, calling...');
        await openAppKit({ view: 'Connect' });
        console.log('✅ [AppKitConnectionTest] Modal open called successfully');
        setTestResults(prev => ({ ...prev, 'Modal open test': 'Success' }));
      } else if (typeof window !== 'undefined' && (window as any).__appkit_modal) {
        console.log('🔄 [AppKitConnectionTest] Trying window.__appkit_modal...');
        const windowModal = (window as any).__appkit_modal;
        await windowModal.open({ view: 'Connect' });
        console.log('✅ [AppKitConnectionTest] Modal opened via window.__appkit_modal');
        setTestResults(prev => ({ ...prev, 'Modal open test': 'Success (via window)' }));
      } else {
        console.error('❌ [AppKitConnectionTest] No modal available');
        setTestResults(prev => ({ ...prev, 'Modal open test': 'Failed - No modal' }));
      }
    } catch (error) {
      console.error('❌ [AppKitConnectionTest] Error opening modal:', error);
      setTestResults(prev => ({ ...prev, 'Modal open test': `Error: ${error}` }));
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = (value: boolean | string) => {
    if (value === true) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (value === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>AppKit Connection Diagnostics</CardTitle>
        <CardDescription>
          Test AppKit modal initialization and connection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold">Test Results:</h3>
          <div className="space-y-1">
            {Object.entries(testResults).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                {getStatusIcon(value)}
                <span className="flex-1">{key}:</span>
                <span className={typeof value === 'boolean' ? (value ? 'text-green-600' : 'text-red-600') : 'text-gray-600'}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={runDiagnostics} variant="outline" size="sm">
            Refresh Diagnostics
          </Button>
          <Button 
            onClick={testOpenModal} 
            disabled={isTesting || !openAppKit}
            size="sm"
          >
            {isTesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Open Modal'
            )}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>Check browser console for detailed logs.</p>
          <p>If modal doesn't open, check:</p>
          <ul className="list-disc list-inside mt-1">
            <li>AppKit initialization logs in console</li>
            <li>Any errors related to WagmiAdapter</li>
            <li>Network connectivity (WalletConnect requires internet)</li>
            <li>Project ID configuration</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

