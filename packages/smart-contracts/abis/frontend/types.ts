// Auto-generated TypeScript types for TigerPalace RWA Marketplace Ecosystem
// Generated at: 2025-11-30T21:08:05.499Z
// Network: sepolia (Chain ID: 11155111)

export interface ContractAddresses {
  ProxyAdmin: string;
  TokenizinToken: string;
  RWAAssetRegistry: string;
  RWATokenFactory: string;
  RWAMarketplace: string;
  RWAStaking: string;
  RWARewardDistributor: string;
  RWARevenue: string;
  MembershipSystem: string;
}

export const CONTRACT_ADDRESSES: ContractAddresses = {
  ProxyAdmin: "0xB8AD57FC91066Bba784186A307D9b0271ce4d789",
  TokenizinToken: "0x5E53F7C9b586eE12CA8A579456af2a6093141D69",
  RWAAssetRegistry: "0xA1fb017a8c89cCB76F63d2244C4a228964B50D80",
  RWATokenFactory: "0x25Ea8960676D017811039481A39516a7E7112133",
  RWAMarketplace: "0x5295d340a0B06A2552C2169E5D238849550ea9Fe",
  RWAStaking: "0x83897dE9eF0c7fc3003fD9602231963D1649B357",
  RWARewardDistributor: "0xEd4D6FdE0B663BAA5a0bc8DC3a50493D984FA833",
  RWARevenue: "0xd64867B8840c09e6Bc448fd2d70C0EA7b1E3D889",
  MembershipSystem: "0xef48e58ca2411A098F09Ac85ECe400A4f6FF03DA",
};

export const NETWORK_CONFIG = {
  name: "sepolia",
  chainId: 11155111,
};

// Export contract addresses by network
export const NETWORK_ADDRESSES: Record<string, ContractAddresses> = {
  sepolia: CONTRACT_ADDRESSES,
};
