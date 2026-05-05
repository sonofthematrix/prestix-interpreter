/**
 * @title USDC Contract Constants
 * @notice EIP-712 type hashes and constants for USDC (FiatToken) contracts
 * @dev These constants are used for signature verification in EIP-2612 (permit) and EIP-3009 (transfer/receive with authorization)
 */

export const USDC_CONSTANTS = {
  // EIP-2612 Permit Type Hash
  PERMIT_TYPEHASH: "0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9" as const,

  // EIP-3009 Transfer/Receive Authorization Type Hashes
  TRANSFER_WITH_AUTHORIZATION_TYPEHASH: "0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267" as const,
  RECEIVE_WITH_AUTHORIZATION_TYPEHASH: "0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8" as const,
  CANCEL_AUTHORIZATION_TYPEHASH: "0x158b0a9edf7a828aad02f63cd515c68ef2f50ba807396f6d12842833a1597429" as const,

  // EIP-712 Domain Separator (example - actual value depends on chain and contract address)
  // Format: keccak256(abi.encode(
  //   keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
  //   keccak256(bytes(name)),
  //   keccak256(bytes(version)),
  //   chainId,
  //   contractAddress
  // ))
  DOMAIN_SEPARATOR_EXAMPLE: "0xb90e5057db141a932946e64d09ccb7ffc9b00bd79fec26f698d29af0c83320a6" as const,

  // USDC Contract Addresses
  SEPOLIA_USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const,
  
  // USDC Token Details
  DECIMALS: 6, // USDC uses 6 decimals
  SYMBOL: "USDC",
  NAME: "USD Coin",
} as const;

/**
 * EIP-712 Domain Type Hash
 * keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)")
 */
export const EIP712_DOMAIN_TYPEHASH = 
  "0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f" as const;

/**
 * Helper function to get domain separator for a specific chain and contract
 * @param name Contract name
 * @param version Contract version
 * @param chainId Chain ID
 * @param contractAddress Contract address
 */
export function getDomainSeparator(
  name: string,
  version: string,
  chainId: number,
  contractAddress: string
): string {
  // This would need to be implemented with ethers.js or similar
  // For now, return the example value
  return USDC_CONSTANTS.DOMAIN_SEPARATOR_EXAMPLE;
}

/**
 * Type definitions for EIP-712 permit data
 */
export interface PermitData {
  owner: string;
  spender: string;
  value: string; // uint256 as hex string
  nonce: string; // uint256 as hex string
  deadline: string; // uint256 as hex string
}

/**
 * Type definitions for EIP-3009 transfer authorization data
 */
export interface TransferAuthorizationData {
  from: string;
  to: string;
  value: string; // uint256 as hex string
  validAfter: string; // uint256 as hex string
  validBefore: string; // uint256 as hex string
  nonce: string; // bytes32 as hex string
}

