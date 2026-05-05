/**
 * TigerPalaceToken ABI
 * Auto-generated from smart-contracts/abis/frontend/TigerPalaceToken.json
 * DO NOT EDIT MANUALLY - This file is auto-generated
 */

export default {
  abi: {
  "name": "TigerPalaceToken",
  "address": "0x0000000000000000000000000000000000000000",
  "abi": [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function transfer(address, uint256) returns (bool)",
    "function transferFrom(address, address, uint256) returns (bool)",
    "function approve(address, uint256) returns (bool)",
    "function allowance(address, address) view returns (uint256)",
    "function buyTax() view returns (uint256)",
    "function sellTax() view returns (uint256)",
    "function treasuryAddress() view returns (address)",
    "function rewardDistributorAddress() view returns (address)",
    "function isExemptFromTax(address) view returns (bool)",
    "function isExemptFromMaxWallet(address) view returns (bool)",
    "function convertPropertyRevenueToRewards(uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
    "event TaxUpdated(uint256 buyTax, uint256 sellTax)",
    "event RevenueConverted(uint256 amount, address to)"
  ],
  "network": "unknown",
  "chainId": 0,
  "deployedAt": "2025-10-31T16:41:03.231Z"
},
} as const;
