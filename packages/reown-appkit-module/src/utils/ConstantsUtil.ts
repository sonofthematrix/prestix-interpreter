/* eslint-disable @typescript-eslint/prefer-optional-chain */
import type { ChainNamespace } from '@reown/appkit-common'

export const API_URL = 'https://rpc.walletconnect.org/v1/json-rpc'

export const ConstantsUtil = {
  WC_NAME_SUFFIX: '.reown.id',
  WC_NAME_SUFFIX_LEGACY: '.wcn.id',
  BLOCKCHAIN_API_RPC_URL: 'https://rpc.walletconnect.org',
  PULSE_API_URL: 'https://pulse.walletconnect.org',
  W3M_API_URL: 'https://api.web3modal.org',
  /* Connector IDs */
  CONNECTOR_ID: {
    WALLET_CONNECT: 'walletConnect',
    INJECTED: 'injected',
    WALLET_STANDARD: 'announced',
    COINBASE: 'coinbaseWallet',
    COINBASE_SDK: 'coinbaseWalletSDK',
    BASE_ACCOUNT: 'baseAccount',
    SAFE: 'safe',
    LEDGER: 'ledger',
    OKX: 'okx',
    EIP6963: 'eip6963',
    AUTH: 'AUTH'
  },
  CONNECTOR_NAMES: {
    AUTH: 'Auth'
  },
  AUTH_CONNECTOR_SUPPORTED_CHAINS: ['eip155', 'solana'] as ChainNamespace[],
  LIMITS: {
    PENDING_TRANSACTIONS: 99
  },
  CHAIN: {
    EVM: 'eip155',
    SOLANA: 'solana',
    POLKADOT: 'polkadot',
    BITCOIN: 'bip122',
    TON: 'ton'
  } as const satisfies Record<string, ChainNamespace>,
  CHAIN_NAME_MAP: {
    eip155: 'EVM Networks',
    solana: 'Solana',
    polkadot: 'Polkadot',
    bip122: 'Bitcoin',
    cosmos: 'Cosmos',
    sui: 'Sui',
    stacks: 'Stacks',
    ton: 'TON'
  } as const satisfies Record<ChainNamespace, string>,
  ADAPTER_TYPES: {
    BITCOIN: 'bitcoin',
    SOLANA: 'solana',
    WAGMI: 'wagmi',
    ETHERS: 'ethers',
    ETHERS5: 'ethers5',
    TON: 'ton',
    UNIVERSAL: 'universal'
  } as const satisfies Record<string, string>,
  USDT_CONTRACT_ADDRESSES: [
    // Mainnet
    '0xdac17f958d2ee523a2206206994597c13d831ec7',
    // Polygon
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    // Avalanche
    '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
    // Cosmos
    '0x919C1c267BC06a7039e03fcc2eF738525769109c',
    // Celo
    '0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e',
    // Binance
    '0x55d398326f99059fF775485246999027B3197955',
    // Arbitrum
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9'
  ],
  SOLANA_SPL_TOKEN_ADDRESSES: {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
  },
  HTTP_STATUS_CODES: {
    SERVER_ERROR: 500,
    TOO_MANY_REQUESTS: 429,
    SERVICE_UNAVAILABLE: 503,
    FORBIDDEN: 403
  },
  UNSUPPORTED_NETWORK_NAME: 'Unknown Network',
  SECURE_SITE_SDK_ORIGIN:
    (typeof process !== 'undefined' && typeof process.env !== 'undefined'
      ? process.env['NEXT_PUBLIC_SECURE_SITE_ORIGIN']
      : undefined) || 'https://secure.walletconnect.org',
  REMOTE_FEATURES_ALERTS: {
    MULTI_WALLET_NOT_ENABLED: {
      DEFAULT: {
        displayMessage: 'Multi-Wallet Not Enabled',
        debugMessage:
          'Multi-wallet support is not enabled. Please enable it in your AppKit configuration at cloud.reown.com.'
      },
      CONNECTIONS_HOOK: {
        displayMessage: 'Multi-Wallet Not Enabled',
        debugMessage:
          'Multi-wallet support is not enabled. Please enable it in your AppKit configuration at cloud.reown.com to use the useAppKitConnections hook.'
      },
      CONNECTION_HOOK: {
        displayMessage: 'Multi-Wallet Not Enabled',
        debugMessage:
          'Multi-wallet support is not enabled. Please enable it in your AppKit configuration at cloud.reown.com to use the useAppKitConnection hook.'
      }
    },
    HEADLESS_NOT_ENABLED: {
      DEFAULT: {
        displayMessage: '',
        debugMessage:
          'Headless support is not enabled. Please enable it with the features.headless option in the AppKit configuration and make sure your current plan supports it.'
      }
    }
  },
  IS_DEVELOPMENT: typeof process !== 'undefined' && process.env['NODE_ENV'] === 'development',
  DEFAULT_ALLOWED_ANCESTORS: [
    'http://localhost:*',
    'https://localhost:*',
    'http://127.0.0.1:*',
    'https://127.0.0.1:*',
    'https://*.pages.dev',
    'https://*.vercel.app',
    'https://*.ngrok-free.app',
    'https://secure-mobile.walletconnect.com',
    'https://secure-mobile.walletconnect.org'
  ] as string[],
  /* Connector names */
  METMASK_CONNECTOR_NAME: 'MetaMask',
  TRUST_CONNECTOR_NAME: 'Trust Wallet',
  SOLFLARE_CONNECTOR_NAME: 'Solflare',
  PHANTOM_CONNECTOR_NAME: 'Phantom',
  COIN98_CONNECTOR_NAME: 'Coin98',
  MAGIC_EDEN_CONNECTOR_NAME: 'Magic Eden',
  BACKPACK_CONNECTOR_NAME: 'Backpack',
  BITGET_CONNECTOR_NAME: 'Bitget Wallet',
  FRONTIER_CONNECTOR_NAME: 'Frontier',
  XVERSE_CONNECTOR_NAME: 'Xverse Wallet',
  LEATHER_CONNECTOR_NAME: 'Leather',
  OKX_CONNECTOR_NAME: 'OKX Wallet',
  BINANCE_CONNECTOR_NAME: 'Binance Wallet',
  EIP155: 'eip155',
  ADD_CHAIN_METHOD: 'wallet_addEthereumChain',
  EIP6963_ANNOUNCE_EVENT: 'eip6963:announceProvider',
  EIP6963_REQUEST_EVENT: 'eip6963:requestProvider',
  CONNECTOR_RDNS_MAP: {
    coinbaseWallet: 'com.coinbase.wallet',
    coinbaseWalletSDK: 'com.coinbase.wallet'
  } as Record<string, string>,
  CONNECTOR_TYPE_EXTERNAL: 'EXTERNAL',
  CONNECTOR_TYPE_WALLET_CONNECT: 'WALLET_CONNECT',
  CONNECTOR_TYPE_INJECTED: 'INJECTED',
  CONNECTOR_TYPE_ANNOUNCED: 'ANNOUNCED',
  CONNECTOR_TYPE_AUTH: 'AUTH',
  CONNECTOR_TYPE_MULTI_CHAIN: 'MULTI_CHAIN',
  CONNECTOR_TYPE_W3M_AUTH: 'AUTH',
  MELD_PUBLIC_KEY: process.env.NEXT_PUBLIC_MELD_PUBLIC_KEY || '',
  ONRAMP_PROVIDERS: [
    {
      label: 'Meld',
      name: 'meld' as const,
      feeRange: '0.99% - 2.99%',
      url: 'https://app.meld.com',
      supportedChains: ['eip155:1', 'eip155:137', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp']
    }
  ],
  // Time constants (in milliseconds)
  ONE_SEC_MS: 1000,
  TEN_SEC_MS: 10000,
  FOUR_MINUTES_MS: 240000,
  // Slippage tolerance
  CONVERT_SLIPPAGE_TOLERANCE: 0.5, // 0.5%
  // Chain namespace support
  NAMES_SUPPORTED_CHAIN_NAMESPACES: ['eip155', 'solana', 'polkadot', 'bip122', 'ton'] as ChainNamespace[],
  PAY_WITH_EXCHANGE_SUPPORTED_CHAIN_NAMESPACES: ['eip155', 'solana'] as ChainNamespace[],
  // Token addresses
  NATIVE_TOKEN_ADDRESS: {
    eip155: '0x0000000000000000000000000000000000000000',
    solana: 'So11111111111111111111111111111111111111112',
    bip122: '',
    polkadot: '',
    ton: ''
  } as Record<ChainNamespace, string>,
  SOLANA_NATIVE_TOKEN_ADDRESS: 'So11111111111111111111111111111111111111112',
  // Suggested tokens for swap
  SUGGESTED_TOKENS_BY_CHAIN: {} as Record<string, string[]>,
  SWAP_SUGGESTED_TOKENS: [] as string[],
  // Account types
  DEFAULT_ACCOUNT_TYPES: ['eoa', 'smartAccount'] as const,
  // SIWX defaults
  SIWX_DEFAULTS: {
    statement: 'Sign in with Ethereum',
    uri: '',
    version: '1',
    chainId: 1,
    nonce: '',
    issuedAt: '',
    expirationTime: '',
    notBefore: '',
    requestId: '',
    resources: []
  },
  // Default remote features (same as DEFAULT_FEATURES but mutable)
  DEFAULT_REMOTE_FEATURES: {
    analytics: true,
    email: true,
    socials: ['google', 'apple', 'x', 'github', 'discord', 'facebook'],
    emailShowWallets: true,
    emailShowSocials: true,
    emailSocials: ['google', 'apple', 'x', 'github', 'discord', 'facebook'],
    emailSocialsShowWallets: true,
    emailSocialsShowSocials: true,
    socialsShowWallets: true,
    socialsShowSocials: true,
    walletsShowWallets: true,
    walletsShowSocials: true,
    emailShowEmail: true,
    socialsShowEmail: true,
    walletsShowEmail: true,
    emailSocialsShowEmail: true,
    onramp: true,
    swap: true,
    pay: true,
    smartAccounts: true,
    siwe: true,
    siwx: true
  },
  // Connect method order
  DEFAULT_CONNECT_METHOD_ORDER: ['qrcode', 'mobile', 'browser', 'email', 'social'] as const,
  // Mandatory wallet IDs on mobile
  MANDATORY_WALLET_IDS_ON_MOBILE: [] as string[],
  DEFAULT_FEATURES: {
    analytics: true,
    email: true,
    socials: ['google', 'apple', 'x', 'github', 'discord', 'facebook'] as ('google' | 'apple' | 'x' | 'github' | 'discord' | 'facebook')[],
    emailShowWallets: true,
    emailShowSocials: true,
    emailSocials: ['google', 'apple', 'x', 'github', 'discord', 'facebook'],
    emailSocialsShowWallets: true,
    emailSocialsShowSocials: true,
    socialsShowWallets: true,
    socialsShowSocials: true,
    walletsShowWallets: true,
    walletsShowSocials: true,
    emailShowEmail: true,
    socialsShowEmail: true,
    walletsShowEmail: true,
    emailSocialsShowEmail: true,
    onramp: true,
    swap: true,
    pay: true,
    smartAccounts: true,
    siwe: true,
    siwx: true,
    siwxMultiChain: true,
    siwxBitcoin: true,
    siwxSolana: true,
    siwxPolkadot: true,
    siwxTon: true,
    siwxStacks: true,
    siwxCosmos: true,
    siwxSui: true,
    siwxNear: true,
    siwxAptos: true,
    siwxTezos: true,
    siwxCardano: true,
    siwxCelo: true,
    siwxPolygon: true,
    siwxAvalanche: true,
    siwxOptimism: true,
    siwxArbitrum: true,
    siwxBase: true,
    siwxBnb: true,
    siwxFantom: true,
    siwxGnosis: true,
    siwxMantle: true,
    siwxMetis: true,
    siwxMoonbeam: true,
    siwxMoonriver: true,
    siwxOasis: true,
    siwxPalm: true,
    siwxPolygonZkEvm: true,
    siwxScroll: true,
    siwxZkSync: true,
    siwxZkSyncEra: true,
    siwxZkSyncLite: true
  }
}

// Export individual constants for direct imports
export const MELD_PUBLIC_KEY = ConstantsUtil.MELD_PUBLIC_KEY
export const ONRAMP_PROVIDERS = ConstantsUtil.ONRAMP_PROVIDERS
