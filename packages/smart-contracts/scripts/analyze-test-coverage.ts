#!/usr/bin/env ts-node

/**
 * Test Coverage Analysis Script
 *
 * Analyzes test coverage for all Solidity contracts by:
 * 1. Discovering all contracts in the contracts directory
 * 2. Analyzing test files to determine what they cover
 * 3. Generating coverage reports and identifying gaps
 * 4. Recommending new tests for untested contracts
 */

import * as fs from 'fs';
import * as path from 'path';

// Contract categories and their file patterns
interface ContractInfo {
  name: string;
  path: string;
  category: string;
  tested: boolean;
  testFiles: string[];
  coverage: 'full' | 'partial' | 'none';
  priority: 'high' | 'medium' | 'low';
}

// Test file analysis results
interface TestAnalysis {
  file: string;
  contracts: string[];
  testType: 'unit' | 'integration' | 'e2e' | 'security';
  lines: number;
  description: string;
}

// Coverage report structure
interface CoverageReport {
  summary: {
    totalContracts: number;
    testedContracts: number;
    untestedContracts: number;
    coveragePercentage: number;
  };
  contracts: ContractInfo[];
  recommendations: string[];
  testMapping: { [contractName: string]: string[] };
}

class TestCoverageAnalyzer {
  private contracts: ContractInfo[] = [];
  private testAnalyses: TestAnalysis[] = [];

  constructor() {
    this.discoverContracts();
    this.analyzeTestFiles();
    this.matchContractsToTests();
  }

  /**
   * Discover all Solidity contracts in the contracts directory
   */
  private discoverContracts(): void {
    const contractsDir = path.join(__dirname, '..', 'contracts');

    const walkDirectory = (dir: string, category: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && file !== 'archived') {
          // Recurse into subdirectories
          walkDirectory(filePath, file);
        } else if (file.endsWith('.sol')) {
          // Extract contract name from filename
          const contractName = file.replace('.sol', '');

          this.contracts.push({
            name: contractName,
            path: path.relative(path.join(__dirname, '..'), filePath),
            category: category,
            tested: false,
            testFiles: [],
            coverage: 'none',
            priority: this.getContractPriority(contractName, category)
          });
        }
      }
    };

    walkDirectory(contractsDir, 'core');
  }

  /**
   * Determine testing priority for a contract
   */
  private getContractPriority(contractName: string, category: string): 'high' | 'medium' | 'low' {
    // High priority contracts (core marketplace functionality)
    const highPriority = [
      'RWAMarketplace',
      'RWAAssetRegistry',
      'RWATokenFactory404',
      'RWAStaking',
      'RWARewardDistributor',
      'TigerPalaceToken'
    ];

    // Medium priority contracts (supporting infrastructure)
    const mediumPriority = [
      'RWARevenue',
      'MembershipSystem',
      'TokenExchange',
      'RWATokenFactory'
    ];

    if (highPriority.some(name => contractName.includes(name))) {
      return 'high';
    }

    if (mediumPriority.some(name => contractName.includes(name))) {
      return 'medium';
    }

    // Libraries, utilities, proxies are lower priority
    return 'low';
  }

  /**
   * Analyze all test files to understand what they cover
   */
  private analyzeTestFiles(): void {
    const testDir = path.join(__dirname, '..', 'test');

    const walkTestDirectory = (dir: string) => {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          walkTestDirectory(filePath);
        } else if (file.endsWith('.spec.ts')) {
          this.analyzeTestFile(filePath);
        }
      }
    };

    walkTestDirectory(testDir);
  }

  /**
   * Analyze a single test file to determine what contracts it covers
   */
  private analyzeTestFile(filePath: string): void {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const relativePath = path.relative(path.join(__dirname, '..'), filePath);

    // Extract contract names from test file
    const contracts: string[] = [];
    const contractPatterns = [
      /RWAAssetRegistry/g,
      /RWAMarketplace/g,
      /RWATokenFactory/g,
      /RWAStaking/g,
      /RWARevenue/g,
      /RWARewardDistributor/g,
      /TigerPalaceToken/g,
      /MembershipSystem/g,
      /TokenExchange/g,
      /ChainlinkPriceOracle/g
    ];

    for (const pattern of contractPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        // Extract unique contract names
        matches.forEach(match => {
          if (!contracts.includes(match)) {
            contracts.push(match);
          }
        });
      }
    }

    // Determine test type from file path and content
    let testType: 'unit' | 'integration' | 'e2e' | 'security' = 'unit';

    if (relativePath.includes('/e2e/') || content.includes('End-to-End') || content.includes('E2E')) {
      testType = 'e2e';
    } else if (relativePath.includes('/integration/') || content.includes('Integration')) {
      testType = 'integration';
    } else if (content.includes('Security') || content.includes('Audit') || relativePath.includes('security')) {
      testType = 'security';
    }

    // Extract description from JSDoc comments
    let description = '';
    const jsdocMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^*\n]+)/);
    if (jsdocMatch) {
      description = jsdocMatch[1].trim();
    }

    this.testAnalyses.push({
      file: relativePath,
      contracts: contracts,
      testType: testType,
      lines: lines.length,
      description: description
    });
  }

  /**
   * Match contracts to their test coverage
   */
  private matchContractsToTests(): void {
    // Create mapping of contracts to test files
    const contractTestMap: { [contractName: string]: string[] } = {};

    for (const test of this.testAnalyses) {
      for (const contract of test.contracts) {
        if (!contractTestMap[contract]) {
          contractTestMap[contract] = [];
        }
        if (!contractTestMap[contract].includes(test.file)) {
          contractTestMap[contract].push(test.file);
        }
      }
    }

    // Update contract coverage based on test mapping
    for (const contract of this.contracts) {
      const testFiles = contractTestMap[contract.name] || [];

      contract.testFiles = testFiles;
      contract.tested = testFiles.length > 0;

      if (testFiles.length >= 3) {
        contract.coverage = 'full';
      } else if (testFiles.length >= 1) {
        contract.coverage = 'partial';
      } else {
        contract.coverage = 'none';
      }
    }
  }

  /**
   * Generate comprehensive coverage report
   */
  public generateReport(): CoverageReport {
    const totalContracts = this.contracts.length;
    const testedContracts = this.contracts.filter(c => c.tested).length;
    const untestedContracts = totalContracts - testedContracts;
    const coveragePercentage = totalContracts > 0 ? (testedContracts / totalContracts) * 100 : 0;

    // Generate recommendations for untested contracts
    const recommendations: string[] = [];
    const untested = this.contracts.filter(c => !c.tested);

    for (const contract of untested) {
      const priority = contract.priority;
      const category = contract.category;

      let recommendation = '';

      switch (contract.name) {
        case 'RWAAssetRegistry':
          recommendation = 'Create rwa-asset-registry.spec.ts - Test asset registration, updates, status changes, and access control';
          break;
        case 'RWAMarketplaceUpgradeableSetter':
          recommendation = 'Create marketplace-upgradeable.spec.ts - Test initialization, upgrades, role management for upgradeable marketplace';
          break;
        case 'MembershipSystem':
          recommendation = 'Create membership-system.spec.ts - Test membership tiers, benefits, access control, and upgrade mechanics';
          break;
        case 'TokenExchange':
          recommendation = 'Create token-exchange.spec.ts - Test token swaps, liquidity provision, pricing algorithms';
          break;
        default:
          if (category === 'proxy') {
            recommendation = `Create proxy-${contract.name.toLowerCase()}.spec.ts - Test proxy deployment, upgrades, and admin functionality`;
          } else if (category === 'libraries') {
            recommendation = `Create ${contract.name.toLowerCase()}.spec.ts - Test library functions and utilities`;
          } else {
            recommendation = `Create ${contract.name.toLowerCase()}.spec.ts - Test ${contract.name} functionality`;
          }
      }

      recommendations.push(recommendation);
    }

    // Create test mapping
    const testMapping: { [contractName: string]: string[] } = {};
    for (const contract of this.contracts) {
      if (contract.testFiles.length > 0) {
        testMapping[contract.name] = contract.testFiles;
      }
    }

    return {
      summary: {
        totalContracts,
        testedContracts,
        untestedContracts,
        coveragePercentage: Math.round(coveragePercentage * 100) / 100
      },
      contracts: this.contracts,
      recommendations,
      testMapping
    };
  }

  /**
   * Print coverage report to console
   */
  public printReport(): void {
    const report = this.generateReport();

    console.log('\n📊 SMART CONTRACT TEST COVERAGE ANALYSIS');
    console.log('========================================\n');

    console.log('SUMMARY:');
    console.log(`  📁 Total Contracts: ${report.summary.totalContracts}`);
    console.log(`  ✅ Tested Contracts: ${report.summary.testedContracts}`);
    console.log(`  ❌ Untested Contracts: ${report.summary.untestedContracts}`);
    console.log(`  📈 Coverage: ${report.summary.coveragePercentage}%\n`);

    console.log('CONTRACT COVERAGE DETAILS:');
    console.log('-------------------------');

    const byCategory = this.groupByCategory(report.contracts);

    for (const [category, contracts] of Object.entries(byCategory)) {
      console.log(`\n📂 ${category.toUpperCase()}:`);

      for (const contract of contracts) {
        const status = contract.tested ?
          (contract.coverage === 'full' ? '✅' : '⚠️') : '❌';
        const coverage = contract.coverage === 'full' ? 'FULL' :
                        contract.coverage === 'partial' ? 'PARTIAL' : 'NONE';
        const priority = contract.priority.toUpperCase();

        console.log(`  ${status} ${contract.name} (${coverage}) [${priority}]`);

        if (contract.testFiles.length > 0) {
          console.log(`    📄 Tests: ${contract.testFiles.join(', ')}`);
        }
      }
    }

    if (report.recommendations.length > 0) {
      console.log('\n🎯 RECOMMENDATIONS FOR MISSING COVERAGE:');
      console.log('-------------------------------------');

      for (const recommendation of report.recommendations) {
        console.log(`  • ${recommendation}`);
      }
    }

    console.log('\n📋 TEST FILE SUMMARY:');
    console.log('-------------------');

    const testStats = this.getTestStatistics();
    console.log(`  📄 Total Test Files: ${testStats.totalFiles}`);
    console.log(`  🧪 Unit Tests: ${testStats.byType.unit}`);
    console.log(`  🔗 Integration Tests: ${testStats.byType.integration}`);
    console.log(`  🌐 E2E Tests: ${testStats.byType.e2e}`);
    console.log(`  🔒 Security Tests: ${testStats.byType.security}`);
    console.log(`  📏 Average Lines per Test: ${testStats.averageLines}`);

    console.log('\n✅ Analysis Complete!\n');
  }

  /**
   * Group contracts by category
   */
  private groupByCategory(contracts: ContractInfo[]): { [category: string]: ContractInfo[] } {
    const groups: { [category: string]: ContractInfo[] } = {};

    for (const contract of contracts) {
      if (!groups[contract.category]) {
        groups[contract.category] = [];
      }
      groups[contract.category].push(contract);
    }

    return groups;
  }

  /**
   * Get test file statistics
   */
  private getTestStatistics(): {
    totalFiles: number;
    byType: { unit: number; integration: number; e2e: number; security: number };
    averageLines: number;
  } {
    const byType = { unit: 0, integration: 0, e2e: 0, security: 0 };
    let totalLines = 0;

    for (const test of this.testAnalyses) {
      byType[test.testType]++;
      totalLines += test.lines;
    }

    return {
      totalFiles: this.testAnalyses.length,
      byType,
      averageLines: Math.round(totalLines / this.testAnalyses.length)
    };
  }

  /**
   * Save report to JSON file
   */
  public saveReport(): void {
    const report = this.generateReport();
    const reportPath = path.join(__dirname, '..', 'test-coverage-report.json');

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved to: ${reportPath}`);
  }
}

// Main execution
if (require.main === module) {
  const analyzer = new TestCoverageAnalyzer();
  analyzer.printReport();
  analyzer.saveReport();
}

export { TestCoverageAnalyzer, type CoverageReport, type ContractInfo, type TestAnalysis };