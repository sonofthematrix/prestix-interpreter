/**
 * RWA Marketplace Deployment Info
 * Update this file after deploying the marketplace contract
 */

export default {
  address: process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7',
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111'), // Sepolia
  network: process.env.NEXT_PUBLIC_NETWORK || 'sepolia',
  deployedAt: process.env.NEXT_PUBLIC_MARKETPLACE_DEPLOYED_AT || '',
  deploymentTx: process.env.NEXT_PUBLIC_MARKETPLACE_DEPLOYMENT_TX || '',
};

