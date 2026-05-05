/**
 * Tiger Wallet Balances API
 * 
 * GET /api/tokenizin-wallet/balances
 * Get comprehensive balance data for Tiger wallet
 * Uses ONLY Infura RPC - no fallbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { Address, formatUnits, isAddress } from 'viem';
import { 
  createRPCClient, 
  getTokenBalanceRPC, 
  ERC20_ABI,
  CONTRACT_ADDRESSES 
} from '../../../../lib/services/contract-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('address') as Address | null;

    // Require wallet address for demo/testnet app
    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json({
        success: true,
        address: null,
        balances: {
          eth: '0',
          usdc: '0',
          eurc: '0',
          tpt: '0',
          totalUSDValue: '0',
        },
        accounts: [],
      });
    }

    // Create public client using Infura RPC only
    let publicClient;
    try {
      publicClient = createRPCClient();
    console.log('🔗 [Tokenizin Wallet API] Created Infura RPC client for Sepolia');
    } catch (rpcError: any) {
      console.error('❌ [Tokenizin Wallet API] Failed to create RPC client:', rpcError?.message || rpcError);
      
      // Check if error is due to missing INFURA_API_KEY
      const errorMessage = rpcError?.message || String(rpcError);
      const isInfuraError = errorMessage.includes('INFURA_API_KEY') || errorMessage.includes('must be configured');
      
      return NextResponse.json(
        {
          success: false,
          error: isInfuraError 
            ? 'INFURA_API_KEY or NEXT_PUBLIC_INFURA_API_KEY must be configured in environment variables'
            : 'Failed to create RPC client',
          errorDetails: isInfuraError 
            ? 'Please set INFURA_API_KEY or NEXT_PUBLIC_INFURA_API_KEY in your .env.local file'
            : errorMessage,
          balances: {
            eth: '0',
            usdc: '0',
            eurc: '0',
            tpt: '0',
            totalUSDValue: '0',
          },
          accounts: [],
        },
        { status: 500 }
      );
    }

    // Fetch balances from blockchain using Infura RPC only
    const walletAddr = walletAddress as Address;
    
    // Initialize balances
    let ethBalance = BigInt(0);
    let usdcBalance = BigInt(0);
    let eurcBalance = BigInt(0);
    let tptBalance = BigInt(0);
    
    // Initialize decimals
    let usdcDecimals = 6; // USDC typically uses 6 decimals
    let eurcDecimals = 6; // EURC typically uses 6 decimals
    let tptDecimals = 18; // TKNZN typically uses 18 decimals
    
    // Fetch ETH balance via Infura RPC
    try {
      console.log('🔍 [Tokenizin Wallet API] Fetching ETH balance from Infura RPC for:', walletAddr);
      ethBalance = await publicClient.getBalance({ address: walletAddr });
      console.log('✅ [Tokenizin Wallet API] ETH balance from Infura RPC:', ethBalance.toString(), 'Wei');
    } catch (error) {
      console.error('❌ [Tokenizin Wallet API] Error fetching ETH balance from Infura RPC:', error);
      throw error;
    }

    // Fetch token balances sequentially via Infura RPC only
    console.log('🔍 [Tokenizin Wallet API] Fetching token balances via Infura RPC (USDC, EURC, TKNZN)...');
    
    // Step 1: Fetch USDC balance
    console.log('🔍 [Tokenizin Wallet API] Step 1/3: Fetching USDC balance...');
    try {
      const usdcResult = await getTokenBalanceRPC(publicClient, CONTRACT_ADDRESSES.USDC, walletAddr, ERC20_ABI) as { balance: bigint; decimals: number; symbol?: string; name?: string };
      usdcBalance = usdcResult.balance;
      usdcDecimals = usdcResult.decimals;
      console.log(`✅ [Tokenizin Wallet API] USDC: ${usdcBalance.toString()} (${usdcDecimals} decimals, symbol: ${usdcResult.symbol as string || 'N/A'})`);
    } catch (usdcError: any) {
      console.error(`❌ [Tokenizin Wallet API] Failed to fetch USDC balance from Infura RPC: ${usdcError?.message || 'Unknown error'}`);
      throw usdcError;
    }
    
    // Step 2: Fetch EURC balance
    console.log('🔍 [Tokenizin Wallet API] Step 2/3: Fetching EURC balance...');
    try {
      const eurcResult = await getTokenBalanceRPC(publicClient, CONTRACT_ADDRESSES.EURC, walletAddr, ERC20_ABI) as { balance: bigint; decimals: number; symbol?: string; name?: string };
      eurcBalance = eurcResult.balance;
      eurcDecimals = eurcResult.decimals;
      console.log(`✅ [Tokenizin Wallet API] EURC: ${eurcBalance.toString()} (${eurcDecimals} decimals, symbol: ${eurcResult.symbol as string || 'N/A'})`);
    } catch (eurcError: any) {
      console.error(`❌ [Tokenizin Wallet API] Failed to fetch EURC balance from Infura RPC: ${eurcError?.message || 'Unknown error'}`);
      throw eurcError;
    }
    
    // Step 3: Fetch TKNZN balance
    console.log('🔍 [Tokenizin Wallet API] Step 3/3: Fetching TKNZN balance...');
    try {
      const tptResult = await getTokenBalanceRPC(publicClient, CONTRACT_ADDRESSES.TKNZN, walletAddr, ERC20_ABI) as { balance: bigint; decimals: number; symbol?: string; name?: string };
      tptBalance = tptResult.balance;
      tptDecimals = tptResult.decimals;
      console.log(`✅ [Tokenizin Wallet API] TKNZN: ${tptBalance.toString()} (${tptDecimals} decimals, symbol: ${tptResult.symbol as string || 'N/A'})`);
    } catch (tptError: any) {
      console.error(`❌ [Tokenizin Wallet API] Failed to fetch TKNZN balance from Infura RPC: ${tptError?.message || 'Unknown error'}`);
      throw tptError;
    }
    
    console.log('✅ [Tokenizin Wallet API] Completed token balance fetching via Infura RPC (ETH, USDC, EURC, TKNZN)');

    // Calculate formatted balances
    const totalETH = parseFloat(formatUnits(ethBalance, 18));
    const totalUSDC = parseFloat(formatUnits(usdcBalance, usdcDecimals));
    const totalEURC = parseFloat(formatUnits(eurcBalance, eurcDecimals));
    const totalTPT = parseFloat(formatUnits(tptBalance, tptDecimals));
    
    const accounts: Array<{
      address: string;
      type: string;
      balances: Array<{
        token: {
          address: string;
          symbol: string;
          name: string;
          decimals: number;
          type: string;
        };
        balance: string;
        balanceFormatted: string;
        usdValue?: number;
      }>;
    }> = [
      {
        address: walletAddress,
        type: 'eoa',
        balances: [],
      },
    ];

    // Add ETH to accounts balances
    if (ethBalance > BigInt(0)) {
      accounts[0].balances.push({
        token: {
          address: '0x0000000000000000000000000000000000000000',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          type: 'native',
        },
        balance: ethBalance.toString(),
        balanceFormatted: totalETH.toFixed(6),
        usdValue: totalETH * 3000, // Approximate ETH price
      });
    }

    // Add USDC to accounts balances
    if (usdcBalance > BigInt(0)) {
      accounts[0].balances.push({
        token: {
          address: CONTRACT_ADDRESSES.USDC,
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: usdcDecimals,
          type: 'erc20',
        },
        balance: usdcBalance.toString(),
        balanceFormatted: totalUSDC.toFixed(6),
        usdValue: totalUSDC,
      });
    }

    // Add EURC to accounts balances
    if (eurcBalance > BigInt(0)) {
      accounts[0].balances.push({
        token: {
          address: CONTRACT_ADDRESSES.EURC,
          symbol: 'EURC',
          name: 'Euro Coin',
          decimals: eurcDecimals,
          type: 'erc20',
        },
        balance: eurcBalance.toString(),
        balanceFormatted: totalEURC.toFixed(6),
        usdValue: totalEURC * 1.1, // Approximate EUR to USD conversion
      });
    }

    // Add TKNZN to accounts balances
    if (tptBalance > BigInt(0)) {
      accounts[0].balances.push({
        token: {
          address: CONTRACT_ADDRESSES.TKNZN,
          symbol: 'TKNZN',
          name: 'Tokenizin Token',
          decimals: tptDecimals,
          type: 'erc404',
        },
        balance: tptBalance.toString(),
        balanceFormatted: totalTPT.toFixed(6),
        usdValue: totalTPT * 0.01, // Approximate TKNZN price (adjust as needed)
      });
    }

    // Calculate total USD value
    const ethUSDValue = totalETH * 3000; // Approximate ETH price
    const usdcUSDValue = totalUSDC; // USDC is 1:1 with USD
    const eurcUSDValue = totalEURC * 1.1; // Approximate EUR to USD conversion
    const tptUSDValue = totalTPT * 0.01; // Approximate TKNZN price (adjust as needed)
    const totalUSDValue = ethUSDValue + usdcUSDValue + eurcUSDValue + tptUSDValue;

    // Log raw balances for debugging
    console.log('📊 [Tokenizin Wallet API] Raw balances:', {
      ethBalance: ethBalance.toString(),
      usdcBalance: usdcBalance.toString(),
      eurcBalance: eurcBalance.toString(),
      tptBalance: tptBalance.toString(),
      usdcDecimals,
      eurcDecimals,
      tptDecimals,
    });

    const response = {
      success: true,
      address: walletAddress,
      balances: {
        eth: totalETH.toFixed(6),
        usdc: totalUSDC.toFixed(6),
        eurc: totalEURC.toFixed(6),
        tpt: totalTPT.toFixed(6),
        totalUSDValue: totalUSDValue.toFixed(2),
      },
      accounts,
      network: {
        chainId: 11155111,
        name: 'Sepolia Testnet',
      },
      // Debug info (remove in production)
      _debug: {
        method: 'Infura RPC Only',
        rawBalances: {
          eth: ethBalance.toString(),
          usdc: usdcBalance.toString(),
          eurc: eurcBalance.toString(),
          tpt: tptBalance.toString(),
        },
        formattedBalances: {
          eth: totalETH,
          usdc: totalUSDC,
          eurc: totalEURC,
          tpt: totalTPT,
        },
        usdcDecimals,
        eurcDecimals,
        tptDecimals,
        usdcAddress: CONTRACT_ADDRESSES.USDC,
        eurcAddress: CONTRACT_ADDRESSES.EURC,
        tptAddress: CONTRACT_ADDRESSES.TKNZN,
      },
    };
    
    console.log('✅ [Tokenizin Wallet API] Balances response:', JSON.stringify(response, null, 2));
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ [Tokenizin Wallet API] Error fetching Tokenizin wallet balances:', error);
    
    // Check if error is due to missing INFURA_API_KEY
    const errorMessage = error?.message || String(error);
    const isInfuraError = errorMessage.includes('INFURA_API_KEY') || errorMessage.includes('must be configured');
    
    return NextResponse.json(
      {
        success: false,
        error: isInfuraError 
          ? 'INFURA_API_KEY or NEXT_PUBLIC_INFURA_API_KEY must be configured in environment variables'
          : 'Failed to fetch balances from Infura RPC',
        errorDetails: isInfuraError 
          ? 'Please set INFURA_API_KEY or NEXT_PUBLIC_INFURA_API_KEY in your .env.local file'
          : errorMessage,
        balances: {
          eth: '0',
          usdc: '0',
          eurc: '0',
          tpt: '0',
          totalUSDValue: '0',
        },
        accounts: [],
      },
      { status: 500 }
    );
  }
}
