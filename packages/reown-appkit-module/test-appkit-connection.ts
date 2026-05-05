/**
 * Test script to diagnose AppKit MetaMask connection issues in development
 */

import 'dotenv/config';

// Mock window object for testing
if (typeof window === 'undefined') {
  (global as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
    location: { origin: 'http://localhost:3000' },
    fetch: global.fetch,
    indexedDB: undefined, // Simulate no IndexedDB for testing
  };
}

async function testAppKitConnection() {
  console.log('🔍 Testing AppKit MetaMask Connection in DEV');
  console.log('='.repeat(50));

  // Check environment
  console.log('📋 Environment Check:');
  console.log('  NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('  NEXT_PUBLIC_PROJECT_ID:', process.env.NEXT_PUBLIC_PROJECT_ID || 'NOT SET');
  console.log('  Window available:', typeof window !== 'undefined');
  console.log('  IndexedDB available:', typeof window !== 'undefined' && !!window.indexedDB);

  // Check MetaMask detection
  console.log('\n🔍 MetaMask Detection:');
  if (typeof window !== 'undefined') {
    const ethereum = (window as any).ethereum;
    console.log('  window.ethereum exists:', !!ethereum);
    console.log('  isMetaMask:', ethereum?.isMetaMask || false);
    console.log('  selectedAddress:', ethereum?.selectedAddress || 'none');
    console.log('  providers count:', ethereum?.providers?.length || 0);

    if (ethereum?.providers) {
      ethereum.providers.forEach((provider: any, index: number) => {
        console.log(`  Provider ${index}:`, {
          isMetaMask: provider.isMetaMask,
          constructor: provider.constructor?.name,
          selectedAddress: provider.selectedAddress
        });
      });
    }
  }

  // Test AppKit configuration import
  console.log('\n⚙️  AppKit Configuration Test:');
  try {
    const configModule = await import('./src/config/index.js');
    console.log('  ✅ Config module imported successfully');
    console.log('  Project ID:', configModule.projectId);
    console.log('  Networks count:', configModule.networks?.length || 0);

    if (configModule.networks) {
      configModule.networks.forEach((network: any, index: number) => {
        console.log(`  Network ${index}:`, {
          id: network.id,
          name: network.name,
          testnet: network.testnet,
          chainIdType: typeof network.id
        });
      });
    }
  } catch (error: any) {
    console.error('  ❌ Config import failed:', error.message);
    console.error('  Stack:', error.stack);
  }

  // Test modal creation (without actually showing it)
  console.log('\n🎭 AppKit Modal Test:');
  if (typeof window === 'undefined') {
    console.log('  ℹ️  Skipping modal test - running in Node.js environment (DOM not available)');
    console.log('  ℹ️  Modal initialization would work in browser environment');
  } else {
    try {
      const { modal } = await import('./src/config/index.js');
      console.log('  ✅ Modal export available');
      console.log('  Modal exists:', !!modal);

      if (modal) {
        console.log('  Modal has open method:', typeof (modal as any).open === 'function');
      }
    } catch (error: any) {
      console.error('  ❌ Modal test failed:', error.message);
    }
  }

  // Check for common issues
  console.log('\n🚨 Potential Issues Detected:');

  const issues = [];

  // Issue 1: No NEXT_PUBLIC_PROJECT_ID
  if (!process.env.NEXT_PUBLIC_PROJECT_ID) {
    issues.push('❌ NEXT_PUBLIC_PROJECT_ID not set - using production fallback');
  }

  // Issue 2: Using production project ID in development
  if (process.env.NEXT_PUBLIC_PROJECT_ID === '122878b95737e1300958ec73a8c0b61a') {
    issues.push('⚠️  Using production project ID in development - may cause connectivity issues');
  }

  // Issue 3: No MetaMask detected
  if (typeof window !== 'undefined' && !(window as any).ethereum) {
    issues.push('❌ MetaMask not detected - extension may not be installed');
  }

  // Issue 4: BigInt in network IDs
  if (typeof window !== 'undefined') {
    try {
      const configModule = await import('./src/config/index.js');
      if (configModule.networks) {
        const hasBigIntChains = configModule.networks.some((n: any) => typeof n.id === 'bigint');
        if (hasBigIntChains) {
          issues.push('❌ BigInt chain IDs detected - may cause wallet registry issues');
        }
      }
    } catch {
      // Ignore import errors for this check
    }
  }

  if (issues.length === 0) {
    console.log('  ✅ No obvious issues detected');
  } else {
    issues.forEach(issue => console.log('  ', issue));
  }

  console.log('\n💡 Recommendations:');
  console.log('  1. Create a separate Reown project for development');
  console.log('  2. Add development domains to project settings');
  console.log('  3. Ensure MetaMask extension is installed and enabled');
  console.log('  4. Check browser console for detailed error messages');
  console.log('  5. Try connecting with WalletConnect (QR code) as fallback');

  console.log('\n🔗 Useful Links:');
  console.log('  Reown AppKit: https://reown.com/appkit');
  console.log('  Create Project: https://cloud.reown.com/');
  console.log('  MetaMask: https://metamask.io/download/');
}

testAppKitConnection().catch(console.error);