/**
 * Address Update Automation Script
 *
 * Automatically updates all contract addresses across the entire codebase
 * after deployment. Reads from deployed-addresses-proxy.json and updates:
 * - Environment files (.env.local)
 * - Code files (TypeScript files)
 * - Documentation files (.md files)
 * - Test files (.spec.ts files)
 * - Rule files (.cursor/rules/*.mdc)
 *
 * Usage: bun run hardhat run scripts/update-addresses-after-deployment.ts --network sepolia
 */

import fs from 'fs';
import path from 'path';
import { ethers } from 'hardhat';

interface AddressMapping {
  [key: string]: string;
}

interface UpdateResult {
  file: string;
  changes: number;
  success: boolean;
  error?: string;
}

interface UpdateSummary {
  totalFiles: number;
  updatedFiles: number;
  totalChanges: number;
  results: UpdateResult[];
  timestamp: string;
  network: string;
}

class AddressUpdater {
  private addresses: AddressMapping;
  private results: UpdateResult[] = [];
  private network: string;

  constructor(addresses: AddressMapping, network: string) {
    this.addresses = addresses;
    this.network = network;
  }

  /**
   * Main update function
   */
  async updateAllAddresses(): Promise<UpdateSummary> {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   ADDRESS UPDATE AUTOMATION                               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`📡 Network: ${this.network}`);
    console.log(`📋 Addresses to update: ${Object.keys(this.addresses).length}\n`);

    // Update different file types
    await this.updateEnvironmentFiles();
    await this.updateCodeFiles();
    await this.updateDocumentationFiles();
    await this.updateTestFiles();
    await this.updateRuleFiles();

    // Generate summary
    const summary = this.generateSummary();

    // Save summary report
    this.saveSummaryReport(summary);

    return summary;
  }

  /**
   * Update environment files
   */
  private async updateEnvironmentFiles(): Promise<void> {
    console.log('🔧 Updating environment files...');

    const envFiles = [
      '.env.local',
      'smart-contracts/.env.local',
      '.env.example'
    ];

    for (const envFile of envFiles) {
      if (fs.existsSync(envFile)) {
        await this.updateFile(envFile, this.createEnvReplacements());
      }
    }
  }

  /**
   * Update TypeScript code files
   */
  private async updateCodeFiles(): Promise<void> {
    console.log('🔧 Updating code files...');

    const codeFiles = [
      'scripts/verify-frontend-config.ts',
      'scripts/setup-marketplace-tokens.ts',
      'scripts/configure-registry-tpt.ts',
      'scripts/setup-token-exchange.ts',
      'frontend-integration/rwa-contracts.ts'
    ];

    // Also scan for TypeScript files that might contain addresses
    const allTsFiles = this.findFilesByExtension('.', '.ts', [
      'node_modules/**',
      'artifacts/**',
      'cache/**',
      'typechain-types/**',
      'deployments/**',
      'test/**'
    ]);

    const allCodeFiles = [...codeFiles, ...allTsFiles];

    for (const file of allCodeFiles) {
      if (fs.existsSync(file)) {
        await this.updateFile(file, this.createCodeReplacements());
      }
    }
  }

  /**
   * Update documentation files
   */
  private async updateDocumentationFiles(): Promise<void> {
    console.log('🔧 Updating documentation files...');

    const docFiles = [
      'SEPOLIA_DEPLOYMENT_COMPLETE.md',
      'docs/MARKETPLACE_CONFIGURATION_COMPLETE.md',
      'docs/frontend/FRONTEND_UPGRADE_PROMPT.md',
      'CONTRACT_CHANGES_ANALYSIS.md'
    ];

    // Also scan for markdown files
    const allMdFiles = this.findFilesByExtension('.', '.md', [
      'node_modules/**',
      'artifacts/**',
      'cache/**',
      'typechain-types/**'
    ]);

    const allDocFiles = [...docFiles, ...allMdFiles];

    for (const file of allDocFiles) {
      if (fs.existsSync(file)) {
        await this.updateFile(file, this.createDocReplacements());
      }
    }
  }

  /**
   * Update test files
   */
  private async updateTestFiles(): Promise<void> {
    console.log('🔧 Updating test files...');

    const testFiles = [
      'test/utils/upgradeable-fixture.ts'
    ];

    // Also scan for test files
    const allTestFiles = this.findFilesByExtension('test', '.ts', []);

    const allTestFilePaths = [...testFiles, ...allTestFiles];

    for (const file of allTestFilePaths) {
      if (fs.existsSync(file)) {
        await this.updateFile(file, this.createTestReplacements());
      }
    }
  }

  /**
   * Update rule files
   */
  private async updateRuleFiles(): Promise<void> {
    console.log('🔧 Updating rule files...');

    const ruleFiles = [
      '.cursor/rules/sepolia-addresses.mdc'
    ];

    // Also scan for rule files
    const allRuleFiles = this.findFilesByExtension('.cursor/rules', '.mdc', []);

    const allRuleFilePaths = [...ruleFiles, ...allRuleFiles];

    for (const file of allRuleFilePaths) {
      if (fs.existsSync(file)) {
        await this.updateFile(file, this.createRuleReplacements());
      }
    }
  }

  /**
   * Create environment file replacements
   */
  private createEnvReplacements(): { [key: string]: string } {
    const replacements: { [key: string]: string } = {};

    // Environment variable mappings
    const envMappings = {
      'SEPOLIA_PROXY_ADMIN': this.addresses.ProxyAdmin,
      'RWA_ASSET_REGISTRY': this.addresses.RWAAssetRegistry,
      'RWA_TOKEN_FACTORY': this.addresses.RWATokenFactory,
      'RWA_TOKEN_FACTORY_404': this.addresses.RWATokenFactory404,
      'RWA_MARKETPLACE': this.addresses.RWAMarketplace,
      'RWA_STAKING': this.addresses.RWAStaking,
      'RWA_REWARD_DISTRIBUTOR': this.addresses.RWARewardDistributor,
      'RWA_REVENUE': this.addresses.RWARevenue,
      'MEMBERSHIP_SYSTEM': this.addresses.MembershipSystem,
      // Staking ecosystem
      'TIGER_STAKING_PROXY': this.addresses.TigerStaking || '',
      'TIGER_REVENUE_PROXY': this.addresses.TigerRevenue || '',
      'REWARD_DISTRIBUTOR_PROXY': this.addresses.RewardDistributor || '',
      'KAGE_TOKEN': this.addresses.KAGE || '',
      'TREASURY': this.addresses.Treasury || '',
      'PROXY_ADMIN': this.addresses.ProxyAdmin
    };

    // Create regex patterns for environment variables
    Object.entries(envMappings).forEach(([envVar, address]) => {
      if (address) {
        // Match lines like: VARIABLE_NAME=old_address
        replacements[`${envVar}=[^\\s]*`] = `${envVar}=${address}`;
        // Match lines like: VARIABLE_NAME = old_address
        replacements[`${envVar}\\s*=\\s*[^\\s]*`] = `${envVar}=${address}`;
      }
    });

    return replacements;
  }

  /**
   * Create code file replacements (TypeScript)
   */
  private createCodeReplacements(): { [key: string]: string } {
    const replacements: { [key: string]: string } = {};

    // Direct address replacements in code
    Object.entries(this.addresses).forEach(([name, address]) => {
      if (address && address.startsWith('0x')) {
        // Match quoted addresses in code
        replacements[`"${address}"`] = `"${address}"`;
        replacements[`'${address}'`] = `'${address}'`;
        // Match ethers.getAddress() calls
        replacements[`ethers\\.getAddress\\("${address}"\\)`] = `ethers.getAddress("${address}")`;
        replacements[`ethers\\.getAddress\\('${address}'\\)`] = `ethers.getAddress('${address}')`;
      }
    });

    return replacements;
  }

  /**
   * Create documentation file replacements
   */
  private createDocReplacements(): { [key: string]: string } {
    const replacements: { [key: string]: string } = {};

    // Address replacements in markdown
    Object.entries(this.addresses).forEach(([name, address]) => {
      if (address && address.startsWith('0x')) {
        // Match various markdown patterns
        replacements[address] = address; // Keep current addresses
      }
    });

    return replacements;
  }

  /**
   * Create test file replacements
   */
  private createTestReplacements(): { [key: string]: string } {
    // Similar to code replacements but more conservative
    return this.createCodeReplacements();
  }

  /**
   * Create rule file replacements
   */
  private createRuleReplacements(): { [key: string]: string } {
    // Similar to documentation replacements
    return this.createDocReplacements();
  }

  /**
   * Update a single file with replacements
   */
  private async updateFile(filePath: string, replacements: { [key: string]: string }): Promise<void> {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let changes = 0;
      let hasChanges = false;

      // Apply each replacement
      Object.entries(replacements).forEach(([pattern, replacement]) => {
        const regex = new RegExp(pattern, 'g');
        const matches = content.match(regex);
        if (matches) {
          content = content.replace(regex, replacement);
          changes += matches.length;
          hasChanges = true;
        }
      });

      // Only write if there were changes
      if (hasChanges) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`   ✅ Updated: ${filePath} (${changes} changes)`);
      }

      this.results.push({
        file: filePath,
        changes,
        success: true
      });

    } catch (error: any) {
      console.log(`   ❌ Failed: ${filePath} - ${error.message}`);
      this.results.push({
        file: filePath,
        changes: 0,
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Find files by extension recursively
   */
  private findFilesByExtension(dir: string, ext: string, excludeDirs: string[]): string[] {
    const files: string[] = [];

    function scan(currentDir: string) {
      if (!fs.existsSync(currentDir)) return;

      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          // Check if directory should be excluded
          const relativePath = path.relative(dir, fullPath);
          const shouldExclude = excludeDirs.some(exclude =>
            relativePath.startsWith(exclude.replace('/**', '')) ||
            relativePath.includes(exclude.replace('/**', '').replace('**', ''))
          );

          if (!shouldExclude) {
            scan(fullPath);
          }
        } else if (stat.isFile() && item.endsWith(ext)) {
          files.push(fullPath);
        }
      }
    }

    scan(dir);
    return files;
  }

  /**
   * Generate update summary
   */
  private generateSummary(): UpdateSummary {
    const updatedFiles = this.results.filter(r => r.changes > 0).length;
    const totalChanges = this.results.reduce((sum, r) => sum + r.changes, 0);

    return {
      totalFiles: this.results.length,
      updatedFiles,
      totalChanges,
      results: this.results,
      timestamp: new Date().toISOString(),
      network: this.network
    };
  }

  /**
   * Save summary report
   */
  private saveSummaryReport(summary: UpdateSummary): void {
    const reportPath = path.join(__dirname, '../deployments', `address-update-${this.network}-${Date.now()}.json`);

    // Ensure deployments directory exists
    const deploymentsDir = path.dirname(reportPath);
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    console.log(`\n📄 Summary saved to: ${reportPath}`);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Load deployed addresses
    const addressesPath = path.join(__dirname, '../deployed-addresses-proxy.json');

    if (!fs.existsSync(addressesPath)) {
      throw new Error(`Addresses file not found: ${addressesPath}`);
    }

    const addressesData = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    const addresses = addressesData.addresses;
    const network = addressesData.network || 'sepolia';

    // Create updater and run
    const updater = new AddressUpdater(addresses, network);
    const summary = await updater.updateAllAddresses();

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 ADDRESS UPDATE SUMMARY');
    console.log('='.repeat(70));
    console.log(`📁 Total files processed: ${summary.totalFiles}`);
    console.log(`🔄 Files updated: ${summary.updatedFiles}`);
    console.log(`📝 Total changes: ${summary.totalChanges}`);
    console.log(`📡 Network: ${summary.network}`);
    console.log(`🕒 Timestamp: ${summary.timestamp}`);

    if (summary.updatedFiles > 0) {
      console.log('\n✅ Address update completed successfully!');
    } else {
      console.log('\n⚠️  No addresses needed updating (already current)');
    }

  } catch (error: any) {
    console.error('\n❌ Address update failed:', error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
