/**
 * Compliance Validator Service
 *
 * Validates blockchain operations for regulatory compliance
 * Includes KYC/AML checks, sanctions screening, and business rule validation
 *
 * @author Tokenizin
 */

import { ethers } from 'ethers';

export interface ComplianceCheckResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
  requiresManualReview: boolean;
  checkDetails?: Record<string, any>;
}

export interface AssetRegistrationParams {
  title: string;
  description: string;
  assetType: string;
  location: string;
  price: string;
  tokenPrice: string;
  totalTokens: number;
  owner: string;
  metadata?: Record<string, any>;
}

export class ComplianceValidator {
  // OFAC Sanctioned addresses (sample - in production use real API)
  private sanctionedAddresses: Set<string> = new Set([
    '0x7F367cC41522cE07553e823bf3be79A889DEbe1B',
    // Add more sanctioned addresses
  ]);

  // Minimum requirements for asset registration
  private readonly MIN_TOKEN_PRICE = ethers.parseEther('0.001'); // 0.001 ETH
  private readonly MAX_TOTAL_TOKENS = 1_000_000_000; // 1 billion
  private readonly MIN_TOTAL_TOKENS = 1;

  /**
   * Validate asset registration parameters
   */
  async validateAssetRegistration(params: AssetRegistrationParams): Promise<ComplianceCheckResult> {
    const violations: string[] = [];
    const warnings: string[] = [];
    let requiresManualReview = false;

    // 1. Title validation
    if (!params.title || params.title.length < 5) {
      violations.push('Asset title must be at least 5 characters long');
    }
    if (params.title.length > 200) {
      violations.push('Asset title must not exceed 200 characters');
    }

    // 2. Description validation
    if (!params.description || params.description.length < 20) {
      violations.push('Asset description must be at least 20 characters long');
    }
    if (params.description.length > 1000) {
      violations.push('Asset description must not exceed 1000 characters');
    }

    // 3. Asset type validation
    const validAssetTypes = [
      'REAL_ESTATE',
      'COMMERCIAL_PROPERTY',
      'RESIDENTIAL_PROPERTY',
      'LAND',
      'YACHT',
      'VEHICLE',
      'ARTWORK',
      'COLLECTIBLE',
    ];
    if (!validAssetTypes.includes(params.assetType)) {
      violations.push(`Invalid asset type. Must be one of: ${validAssetTypes.join(', ')}`);
    }

    // 4. Location validation
    if (!params.location || params.location.length < 3) {
      violations.push('Asset location must be specified');
    }

    // 5. Price validation
    try {
      const price = BigInt(params.price);
      if (price <= 0) {
        violations.push('Asset price must be greater than 0');
      }
      if (price > ethers.parseEther('1000000')) {
        warnings.push('Asset price exceeds 1M ETH - requires manual review');
        requiresManualReview = true;
      }
    } catch {
      violations.push('Invalid price format');
    }

    // 6. Token price validation
    try {
      const tokenPrice = BigInt(params.tokenPrice);
      if (tokenPrice < this.MIN_TOKEN_PRICE) {
        violations.push(`Token price must be at least ${ethers.formatEther(this.MIN_TOKEN_PRICE)} ETH`);
      }
    } catch {
      violations.push('Invalid token price format');
    }

    // 7. Total tokens validation
    if (params.totalTokens < this.MIN_TOTAL_TOKENS) {
      violations.push(`Total tokens must be at least ${this.MIN_TOTAL_TOKENS}`);
    }
    if (params.totalTokens > this.MAX_TOTAL_TOKENS) {
      violations.push(`Total tokens must not exceed ${this.MAX_TOTAL_TOKENS}`);
    }

    // 8. Price/token consistency check
    try {
      const price = BigInt(params.price);
      const tokenPrice = BigInt(params.tokenPrice);
      const calculatedPrice = tokenPrice * BigInt(params.totalTokens);

      if (price < calculatedPrice) {
        violations.push('Asset price must be >= (token price × total tokens)');
      }
    } catch {
      // Already caught above
    }

    // 9. Owner address validation
    if (!ethers.isAddress(params.owner)) {
      violations.push('Invalid owner address format');
    } else {
      // Check if owner is sanctioned
      const ownerCheckResult = await this.checkAddress(params.owner);
      if (!ownerCheckResult.passed) {
        violations.push(...ownerCheckResult.violations);
        requiresManualReview = true;
      }
    }

    // 10. High-value asset manual review
    try {
      const price = BigInt(params.price);
      if (price > ethers.parseEther('100000')) {
        warnings.push('High-value asset (>100K ETH) requires enhanced due diligence');
        requiresManualReview = true;
      }
    } catch {
      // Already caught above
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      requiresManualReview,
      checkDetails: {
        timestamp: new Date().toISOString(),
        checks: [
          'title_validation',
          'description_validation',
          'asset_type_validation',
          'location_validation',
          'price_validation',
          'token_price_validation',
          'total_tokens_validation',
          'price_consistency_check',
          'owner_address_validation',
          'sanctions_screening',
        ],
      },
    };
  }

  /**
   * Check if an address is compliant
   */
  async checkAddress(address: string): Promise<ComplianceCheckResult> {
    const violations: string[] = [];
    const warnings: string[] = [];
    let requiresManualReview = false;

    // 1. Format validation
    if (!ethers.isAddress(address)) {
      violations.push('Invalid Ethereum address format');
      return {
        passed: false,
        violations,
        warnings,
        requiresManualReview: false,
      };
    }

    // 2. Normalize address
    const normalizedAddress = ethers.getAddress(address);

    // 3. Sanctions screening
    if (this.sanctionedAddresses.has(normalizedAddress.toLowerCase())) {
      violations.push('Address is on sanctions list (OFAC)');
      requiresManualReview = true;
    }

    // 4. Zero address check
    if (normalizedAddress === ethers.ZeroAddress) {
      violations.push('Zero address not allowed');
    }

    // 5. Contract check (in production, check if address is a contract)
    // For now, we'll skip this as it requires RPC call

    // 6. Check against internal blacklist
    const blacklisted = await this.checkInternalBlacklist(normalizedAddress);
    if (blacklisted) {
      violations.push('Address is on internal blacklist');
      requiresManualReview = true;
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      requiresManualReview,
      checkDetails: {
        address: normalizedAddress,
        timestamp: new Date().toISOString(),
        checks: ['format', 'sanctions', 'zero_address', 'internal_blacklist'],
      },
    };
  }

  /**
   * Validate token transfer
   */
  async validateTokenTransfer(params: {
    from: string;
    to: string;
    amount: number;
    tokenAddress: string;
  }): Promise<ComplianceCheckResult> {
    const violations: string[] = [];
    const warnings: string[] = [];
    let requiresManualReview = false;

    // 1. Validate addresses
    const fromCheck = await this.checkAddress(params.from);
    const toCheck = await this.checkAddress(params.to);

    if (!fromCheck.passed) {
      violations.push(`Sender address compliance check failed: ${fromCheck.violations.join(', ')}`);
    }

    if (!toCheck.passed) {
      violations.push(`Recipient address compliance check failed: ${toCheck.violations.join(', ')}`);
    }

    // 2. Amount validation
    if (params.amount <= 0) {
      violations.push('Transfer amount must be greater than 0');
    }

    // 3. Large transfer warning
    if (params.amount > 1_000_000) {
      warnings.push('Large token transfer (>1M tokens) requires manual review');
      requiresManualReview = true;
    }

    // 4. Self-transfer check
    if (params.from.toLowerCase() === params.to.toLowerCase()) {
      warnings.push('Self-transfer detected');
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      requiresManualReview,
    };
  }

  /**
   * Validate marketplace listing
   */
  async validateMarketplaceListing(params: {
    seller: string;
    assetId: number;
    tokenAmount: number;
    pricePerToken: string;
  }): Promise<ComplianceCheckResult> {
    const violations: string[] = [];
    const warnings: string[] = [];
    let requiresManualReview = false;

    // 1. Seller address check
    const sellerCheck = await this.checkAddress(params.seller);
    if (!sellerCheck.passed) {
      violations.push(...sellerCheck.violations);
    }

    // 2. Token amount validation
    if (params.tokenAmount <= 0) {
      violations.push('Token amount must be greater than 0');
    }

    // 3. Price validation
    try {
      const pricePerToken = BigInt(params.pricePerToken);
      if (pricePerToken < this.MIN_TOKEN_PRICE) {
        violations.push(`Price per token must be at least ${ethers.formatEther(this.MIN_TOKEN_PRICE)} ETH`);
      }

      // Total listing value check
      const totalValue = pricePerToken * BigInt(params.tokenAmount);
      if (totalValue > ethers.parseEther('10000')) {
        warnings.push('High-value listing (>10K ETH) requires manual review');
        requiresManualReview = true;
      }
    } catch {
      violations.push('Invalid price format');
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      requiresManualReview,
    };
  }

  /**
   * Validate wallet registration
   */
  async validateWalletRegistration(params: {
    walletAddress: string;
    userId: string;
    walletType: string;
  }): Promise<ComplianceCheckResult> {
    const violations: string[] = [];
    const warnings: string[] = [];

    // 1. Address compliance check
    const addressCheck = await this.checkAddress(params.walletAddress);
    if (!addressCheck.passed) {
      violations.push(...addressCheck.violations);
    }

    // 2. Wallet type validation
    const validWalletTypes = ['MetaMask', 'WalletConnect', 'Coinbase', 'Trust', 'Rainbow', 'Custom'];
    if (!validWalletTypes.includes(params.walletType)) {
      warnings.push(`Unknown wallet type: ${params.walletType}`);
    }

    // 3. User ID validation
    if (!params.userId || params.userId.length === 0) {
      violations.push('User ID is required');
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      requiresManualReview: addressCheck.requiresManualReview,
    };
  }

  /**
   * Check internal blacklist
   */
  private async checkInternalBlacklist(address: string): Promise<boolean> {
    // In production, check against database
    // For now, return false (not blacklisted)
    return false;
  }

  /**
   * Add address to sanctions list (admin only)
   */
  addToSanctionsList(address: string): void {
    const normalized = ethers.getAddress(address);
    this.sanctionedAddresses.add(normalized.toLowerCase());
  }

  /**
   * Remove address from sanctions list (admin only)
   */
  removeFromSanctionsList(address: string): void {
    const normalized = ethers.getAddress(address);
    this.sanctionedAddresses.delete(normalized.toLowerCase());
  }

  /**
   * Get all sanctioned addresses
   */
  getSanctionedAddresses(): string[] {
    return Array.from(this.sanctionedAddresses);
  }

  /**
   * Validate transaction parameters before execution
   */
  async validateTransaction(params: {
    from: string;
    to: string;
    value?: string;
    data?: string;
    gasLimit?: number;
  }): Promise<ComplianceCheckResult> {
    const violations: string[] = [];
    const warnings: string[] = [];
    let requiresManualReview = false;

    // 1. From address check
    const fromCheck = await this.checkAddress(params.from);
    if (!fromCheck.passed) {
      violations.push(`Sender compliance failed: ${fromCheck.violations.join(', ')}`);
    }

    // 2. To address check
    const toCheck = await this.checkAddress(params.to);
    if (!toCheck.passed) {
      violations.push(`Recipient compliance failed: ${toCheck.violations.join(', ')}`);
    }

    // 3. Value check
    if (params.value) {
      try {
        const value = BigInt(params.value);
        if (value > ethers.parseEther('1000')) {
          warnings.push('High-value transaction (>1000 ETH) requires manual review');
          requiresManualReview = true;
        }
      } catch {
        violations.push('Invalid transaction value');
      }
    }

    // 4. Gas limit check
    if (params.gasLimit && params.gasLimit > 10_000_000) {
      warnings.push('Very high gas limit detected');
    }

    return {
      passed: violations.length === 0,
      violations,
      warnings,
      requiresManualReview,
    };
  }

  /**
   * Generate compliance report for an address
   */
  async generateAddressComplianceReport(address: string): Promise<{
    address: string;
    complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_REVIEW';
    checks: Record<string, boolean>;
    violations: string[];
    warnings: string[];
    generatedAt: Date;
  }> {
    const result = await this.checkAddress(address);

    return {
      address: ethers.getAddress(address),
      complianceStatus: result.passed
        ? 'COMPLIANT'
        : result.requiresManualReview
        ? 'REQUIRES_REVIEW'
        : 'NON_COMPLIANT',
      checks: {
        formatValid: ethers.isAddress(address),
        notSanctioned: !this.sanctionedAddresses.has(address.toLowerCase()),
        notZeroAddress: address.toLowerCase() !== ethers.ZeroAddress.toLowerCase(),
        notBlacklisted: !(await this.checkInternalBlacklist(address)),
      },
      violations: result.violations,
      warnings: result.warnings,
      generatedAt: new Date(),
    };
  }
}
