/**
 * AppKit Controllers Utils Shim
 * 
 * Provides utility functions that @reown/appkit-pay might need
 */

export const formatBalance = (balance: string | number, decimals: number = 18): string => {
  return String(balance);
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const BalanceUtil = {
  format: formatBalance,
  parse: (value: string) => value,
} as any;

export const executeSocialLogin = async () => {
  throw new Error('Social login not implemented in shim');
};

export const CoreHelperUtil = {
  parseChainId: (chainId: string | number) => String(chainId),
  getChainId: () => null,
} as any;

export default {
  formatBalance,
  formatAddress,
  BalanceUtil,
  executeSocialLogin,
  CoreHelperUtil,
};
