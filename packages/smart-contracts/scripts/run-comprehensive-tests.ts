#!/usr/bin/env ts-node

/**
 * Comprehensive Test Runner Script
 *
 * Executes all smart contract tests in logical order with:
 * - Parallel execution where safe
 * - Sequential execution for dependent tests
 * - Test result aggregation and reporting
 * - Failure analysis and context
 * - Execution time tracking
 * - Multiple execution modes
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Test execution result
interface TestResult {
  suite: string;
  command: string;
  success: boolean;
  duration: number;
  output: string;
  errorOutput: string;
  exitCode: number;
}

// Test execution statistics
interface TestStats {
  totalSuites: number;
  passedSuites: number;
  failedSuites: number;
  totalDuration: number;
  averageDuration: number;
  successRate: number;
}

// Test suite configuration
interface TestSuite {
  name: string;
  description: string;
  command: string;
  args: string[];
  dependencies: string[]; // Must run after these suites
  parallelGroup?: string; // Can run in parallel with other suites in same group
  timeout: number; // Timeout in seconds
  retries: number; // Number of retry attempts
}

// Comprehensive test suites configuration
const TEST_SUITES: TestSuite[] = [
  // Phase 1: Unit Tests (Fast, Isolated - Parallel Execution)
  {
    name: 'unit-marketplace',
    description: 'Marketplace unit tests (custody, USDC integration)',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/marketplace-token-custody.spec.ts', 'test/usdc-integration.spec.ts'],
    dependencies: [],
    parallelGroup: 'unit',
    timeout: 300,
    retries: 1
  },
  {
    name: 'unit-token-factory',
    description: 'Token factory unit tests (ERC404 creation)',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/rwa-token-factory-404.spec.ts', 'test/rwa-token-factory-404-fixed.spec.ts'],
    dependencies: [],
    parallelGroup: 'unit',
    timeout: 300,
    retries: 1
  },
  {
    name: 'unit-security',
    description: 'Security audit fixes validation',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/security-audit-fixes.spec.ts'],
    dependencies: [],
    parallelGroup: 'unit',
    timeout: 300,
    retries: 1
  },

  // Phase 2: Integration Tests (Sequential - Contract Dependencies)
  {
    name: 'integration-ecosystem',
    description: 'Full ecosystem integration tests',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/ecosystem-integration.spec.ts', 'test/ecosystem-performance.spec.ts'],
    dependencies: ['unit-marketplace', 'unit-token-factory'],
    timeout: 600,
    retries: 2
  },
  {
    name: 'integration-staking',
    description: 'Staking and revenue distribution integration',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/integration/end-to-end-security-fixes.spec.ts', 'test/integration/dividend-staking-integration.spec.ts'],
    dependencies: ['integration-ecosystem'],
    timeout: 600,
    retries: 2
  },

  // Phase 3: End-to-End Tests (Sequential - Full Workflows)
  {
    name: 'e2e-marketplace',
    description: 'Complete marketplace E2E workflows',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/e2e/tiger-palace-marketplace-comprehensive.spec.ts'],
    dependencies: ['integration-staking'],
    timeout: 900,
    retries: 2
  },
  {
    name: 'e2e-token-lifecycle',
    description: 'Token lifecycle E2E tests',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/e2e/rwa-marketplace-token-lifecycle.spec.ts'],
    dependencies: ['e2e-marketplace'],
    timeout: 900,
    retries: 2
  },

  // Phase 4: Staking Tests (Can run in parallel with E2E)
  {
    name: 'staking-core',
    description: 'Core staking functionality tests',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/rwa-staking-integration.spec.ts', 'test/minimal-staking-test.spec.ts'],
    dependencies: ['integration-staking'],
    parallelGroup: 'staking',
    timeout: 600,
    retries: 1
  },
  {
    name: 'staking-revenue',
    description: 'Revenue distribution and claiming',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/tiger-revenue-enhanced-coverage.spec.ts', 'test/revenue-distribution-tier-testing.spec.ts'],
    dependencies: ['integration-staking'],
    parallelGroup: 'staking',
    timeout: 600,
    retries: 1
  },
  {
    name: 'staking-rewards',
    description: 'Reward distributor functionality',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/reward-distributor-contract.spec.ts', 'test/reward-distributor-error-emergency-tests.spec.ts'],
    dependencies: ['integration-staking'],
    parallelGroup: 'staking',
    timeout: 600,
    retries: 1
  },

  // Phase 5: Advanced Staking Tests (Sequential after basic staking)
  {
    name: 'staking-advanced',
    description: 'Advanced staking features and edge cases',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/tiger-unified-staking-enhanced.spec.ts', 'test/tiger-staking-refactored.spec.ts'],
    dependencies: ['staking-core', 'staking-revenue', 'staking-rewards'],
    timeout: 600,
    retries: 1
  },
  {
    name: 'staking-emergency',
    description: 'Staking emergency scenarios and error handling',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/tiger-staking-error-emergency-tests.spec.ts', 'test/simple-error-emergency-tests.spec.ts'],
    dependencies: ['staking-advanced'],
    timeout: 600,
    retries: 1
  },

  // Phase 6: Revenue Allocation Tests (Can run in parallel with advanced staking)
  {
    name: 'revenue-allocation',
    description: 'Revenue allocation algorithms and tier testing',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/advanced-revenue-allocation.spec.ts', 'test/enhanced-revenue-allocation.spec.ts', 'test/comprehensive-revenue-tier-testing.spec.ts'],
    dependencies: ['staking-revenue'],
    parallelGroup: 'revenue',
    timeout: 600,
    retries: 1
  },

  // Phase 7: Production Scenario Tests (Final validation)
  {
    name: 'production-scenarios',
    description: 'Production-like usage scenarios and realistic testing',
    command: 'bun',
    args: ['run', 'hardhat', 'test', 'test/realistic-production-scenarios.spec.ts', 'test/core-contracts-focused.spec.ts'],
    dependencies: ['e2e-token-lifecycle', 'staking-emergency', 'revenue-allocation'],
    timeout: 900,
    retries: 2
  }
];

// Execution modes
type ExecutionMode = 'fast' | 'comprehensive' | 'coverage' | 'ci';

// Test runner class
class ComprehensiveTestRunner {
  private results: TestResult[] = [];
  private startTime: number = 0;
  private mode: ExecutionMode;

  constructor(mode: ExecutionMode = 'comprehensive') {
    this.mode = mode;
  }

  /**
   * Run all test suites in logical order
   */
  async runAllSuites(): Promise<boolean> {
    console.log('\n🚀 COMPREHENSIVE TEST SUITE EXECUTION');
    console.log('=====================================\n');

    console.log(`📋 Execution Mode: ${this.mode.toUpperCase()}`);
    console.log(`🎯 Test Suites: ${TEST_SUITES.length}`);
    console.log(`⏱️  Estimated Duration: ${this.estimateTotalDuration()} minutes\n`);

    this.startTime = Date.now();

    try {
      // Adjust test suites based on mode
      const suitesToRun = this.getSuitesForMode();

      // Execute suites in dependency order
      const success = await this.executeSuitesInOrder(suitesToRun);

      // Generate final report
      this.generateFinalReport();

      return success;
    } catch (error) {
      console.error('❌ Test execution failed:', error);
      this.generateFinalReport();
      return false;
    }
  }

  /**
   * Get test suites for current execution mode
   */
  private getSuitesForMode(): TestSuite[] {
    switch (this.mode) {
      case 'fast':
        // Only critical tests
        return TEST_SUITES.filter(suite =>
          ['unit-marketplace', 'unit-token-factory', 'integration-ecosystem', 'e2e-marketplace'].includes(suite.name)
        );

      case 'coverage':
        // All tests with coverage enabled
        return TEST_SUITES.map(suite => ({
          ...suite,
          args: [...suite.args, '--coverage']
        }));

      case 'ci':
        // CI mode - all tests but with different timeouts
        return TEST_SUITES.map(suite => ({
          ...suite,
          timeout: suite.timeout * 1.5 // 50% more time for CI
        }));

      case 'comprehensive':
      default:
        return TEST_SUITES;
    }
  }

  /**
   * Execute test suites in dependency order
   */
  private async executeSuitesInOrder(suites: TestSuite[]): Promise<boolean> {
    const completedSuites = new Set<string>();
    const runningSuites = new Map<string, Promise<TestResult>>();
    let allSuccessful = true;

    // Continue until all suites are completed
    while (completedSuites.size < suites.length) {
      // Find suites that can be executed (dependencies met)
      const readySuites = suites.filter(suite =>
        !completedSuites.has(suite.name) &&
        !runningSuites.has(suite.name) &&
        suite.dependencies.every(dep => completedSuites.has(dep))
      );

      if (readySuites.length === 0) {
        // Wait for running suites to complete
        if (runningSuites.size > 0) {
          console.log(`⏳ Waiting for ${runningSuites.size} running test suite(s)...`);
          const results = await Promise.all(runningSuites.values());

          for (const result of results) {
            runningSuites.delete(result.suite);
            completedSuites.add(result.suite);
            this.results.push(result);

            if (!result.success) {
              allSuccessful = false;
              console.log(`❌ Suite failed: ${result.suite}`);
            } else {
              console.log(`✅ Suite completed: ${result.suite} (${result.duration}ms)`);
            }
          }
        } else {
          // Deadlock - no suites can run
          console.error('❌ Deadlock detected - circular dependencies or missing suites');
          return false;
        }
      } else {
        // Start parallel execution within the same group
        const suitesByGroup = this.groupSuitesByParallelExecution(readySuites);

        for (const group of suitesByGroup) {
          if (group.length === 1) {
            // Single suite - execute directly
            const suite = group[0];
            console.log(`🎬 Starting: ${suite.name} - ${suite.description}`);
            const promise = this.executeTestSuite(suite);
            runningSuites.set(suite.name, promise);
          } else {
            // Multiple suites in same group - execute in parallel
            console.log(`🎬 Starting parallel group: ${group.map(s => s.name).join(', ')}`);
            const promises = group.map(suite => {
              console.log(`  ├── ${suite.name} - ${suite.description}`);
              return this.executeTestSuite(suite);
            });

            // Wait for all in group to complete
            const groupResults = await Promise.all(promises);

            for (const result of groupResults) {
              completedSuites.add(result.suite);
              this.results.push(result);

              if (!result.success) {
                allSuccessful = false;
                console.log(`❌ Suite failed: ${result.suite}`);
              } else {
                console.log(`✅ Suite completed: ${result.suite} (${result.duration}ms)`);
              }
            }
          }
        }
      }
    }

    return allSuccessful;
  }

  /**
   * Group suites by parallel execution capability
   */
  private groupSuitesByParallelExecution(suites: TestSuite[]): TestSuite[][] {
    const groups: { [key: string]: TestSuite[] } = {};
    const sequentialSuites: TestSuite[] = [];

    for (const suite of suites) {
      if (suite.parallelGroup) {
        if (!groups[suite.parallelGroup]) {
          groups[suite.parallelGroup] = [];
        }
        groups[suite.parallelGroup].push(suite);
      } else {
        sequentialSuites.push(suite);
      }
    }

    // Return groups as arrays, with sequential suites as individual groups
    const result: TestSuite[][] = Object.values(groups);
    sequentialSuites.forEach(suite => result.push([suite]));

    return result;
  }

  /**
   * Execute a single test suite with retry logic
   */
  private async executeTestSuite(suite: TestSuite): Promise<TestResult> {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= suite.retries + 1; attempt++) {
      try {
        const result = await this.runCommand(suite, startTime);

        if (result.success) {
          return result;
        }

        if (attempt <= suite.retries) {
          console.log(`⏳ Retrying ${suite.name} (attempt ${attempt + 1}/${suite.retries + 1})...`);
          await this.sleep(2000); // Wait 2 seconds between retries
        } else {
          return result; // Final failure
        }
      } catch (error) {
        if (attempt <= suite.retries) {
          console.log(`⏳ Retrying ${suite.name} due to error (attempt ${attempt + 1}/${suite.retries + 1})...`);
          await this.sleep(2000);
        } else {
          return {
            suite: suite.name,
            command: [suite.command, ...suite.args].join(' '),
            success: false,
            duration: Date.now() - startTime,
            output: '',
            errorOutput: `Execution failed: ${error}`,
            exitCode: -1
          };
        }
      }
    }

    // Should never reach here
    throw new Error(`Unexpected error in executeTestSuite for ${suite.name}`);
  }

  /**
   * Run a command and capture output
   */
  private async runCommand(suite: TestSuite, startTime: number): Promise<TestResult> {
    return new Promise((resolve) => {
      const command = suite.command;
      const args = suite.args;
      const fullCommand = [command, ...args].join(' ');

      console.log(`🔧 Executing: ${fullCommand}`);

      const child = spawn(command, args, {
        cwd: path.join(__dirname, '..'),
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
      });

      let output = '';
      let errorOutput = '';

      // Capture stdout
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      // Capture stderr
      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Timeout reached for ${suite.name}, terminating...`);
        child.kill('SIGTERM');

        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }, suite.timeout * 1000);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        const success = code === 0;

        resolve({
          suite: suite.name,
          command: fullCommand,
          success,
          duration,
          output,
          errorOutput,
          exitCode: code || 0
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        resolve({
          suite: suite.name,
          command: fullCommand,
          success: false,
          duration,
          output,
          errorOutput: `Spawn error: ${error.message}`,
          exitCode: -1
        });
      });
    });
  }

  /**
   * Generate final comprehensive report
   */
  private generateFinalReport(): void {
    const stats = this.calculateStats();
    const totalDuration = Date.now() - this.startTime;

    console.log('\n📊 COMPREHENSIVE TEST EXECUTION REPORT');
    console.log('=====================================\n');

    console.log('EXECUTION SUMMARY:');
    console.log(`  📋 Mode: ${this.mode.toUpperCase()}`);
    console.log(`  🎯 Suites Executed: ${stats.totalSuites}`);
    console.log(`  ✅ Passed: ${stats.passedSuites}`);
    console.log(`  ❌ Failed: ${stats.failedSuites}`);
    console.log(`  📈 Success Rate: ${stats.successRate}%`);
    console.log(`  ⏱️  Total Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`  📏 Average Duration: ${stats.averageDuration}ms per suite\n`);

    if (stats.failedSuites > 0) {
      console.log('FAILED SUITES:');
      const failedResults = this.results.filter(r => !r.success);
      for (const result of failedResults) {
        console.log(`  ❌ ${result.suite} (${result.duration}ms)`);
        if (result.errorOutput) {
          console.log(`     Error: ${result.errorOutput.split('\n')[0]}`);
        }
      }
      console.log('');
    }

    console.log('PERFORMANCE BREAKDOWN:');
    const suiteResults = this.results.sort((a, b) => b.duration - a.duration);
    for (const result of suiteResults.slice(0, 5)) {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${result.suite}: ${result.duration}ms`);
    }

    if (stats.successRate === 100) {
      console.log('\n🎉 ALL TESTS PASSED! Ready for deployment.');
    } else {
      console.log(`\n⚠️  ${stats.failedSuites} test suite(s) failed. Please review and fix.`);
    }

    console.log('\n💾 Detailed results saved to: test-execution-report.json\n');

    // Save detailed results
    this.saveDetailedReport();
  }

  /**
   * Calculate execution statistics
   */
  private calculateStats(): TestStats {
    const totalSuites = this.results.length;
    const passedSuites = this.results.filter(r => r.success).length;
    const failedSuites = totalSuites - passedSuites;
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const averageDuration = totalSuites > 0 ? Math.round(totalDuration / totalSuites) : 0;
    const successRate = totalSuites > 0 ? Math.round((passedSuites / totalSuites) * 100) : 0;

    return {
      totalSuites,
      passedSuites,
      failedSuites,
      totalDuration,
      averageDuration,
      successRate
    };
  }

  /**
   * Save detailed execution report
   */
  private saveDetailedReport(): void {
    const reportPath = path.join(__dirname, '..', 'test-execution-report.json');
    const report = {
      execution: {
        mode: this.mode,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString(),
        totalDuration: Date.now() - this.startTime
      },
      summary: this.calculateStats(),
      results: this.results.map(result => ({
        ...result,
        // Truncate output for file size
        output: result.output.length > 1000 ? result.output.substring(0, 1000) + '...' : result.output,
        errorOutput: result.errorOutput.length > 1000 ? result.errorOutput.substring(0, 1000) + '...' : result.errorOutput
      }))
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  /**
   * Estimate total execution duration
   */
  private estimateTotalDuration(): number {
    const totalSeconds = TEST_SUITES.reduce((sum, suite) => sum + suite.timeout, 0);
    return Math.round(totalSeconds / 60);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
if (require.main === module) {
  const mode = (process.argv[2] as ExecutionMode) || 'comprehensive';

  if (!['fast', 'comprehensive', 'coverage', 'ci'].includes(mode)) {
    console.error('❌ Invalid mode. Use: fast, comprehensive, coverage, or ci');
    process.exit(1);
  }

  const runner = new ComprehensiveTestRunner(mode);

  runner.runAllSuites()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export { ComprehensiveTestRunner, type TestResult, type TestSuite, type ExecutionMode };