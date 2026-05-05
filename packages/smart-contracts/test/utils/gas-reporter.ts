/**
 * Gas Reporter Utility
 * 
 * Collects gas metrics from all test files and generates comprehensive reports
 */

import fs from "fs";
import path from "path";

export interface GasMetric {
  testFile: string;
  testName: string;
  operation: string;
  gasUsed: number;
  parameters?: any;
  timestamp: number;
}

const METRICS_FILE = path.join(process.cwd(), ".gas-metrics.json");

class GasReporter {
  private metrics: GasMetric[] = [];
  private static instance: GasReporter;

  private constructor() {
    // Load existing metrics from file
    this.loadMetrics();
  }

  static getInstance(): GasReporter {
    if (!GasReporter.instance) {
      GasReporter.instance = new GasReporter();
    }
    return GasReporter.instance;
  }

  /**
   * Load metrics from file
   */
  private loadMetrics(): void {
    try {
      if (fs.existsSync(METRICS_FILE)) {
        const data = fs.readFileSync(METRICS_FILE, "utf-8");
        this.metrics = JSON.parse(data);
      }
    } catch (e) {
      // If file doesn't exist or is invalid, start fresh
      this.metrics = [];
    }
  }

  /**
   * Save metrics to file
   */
  private saveMetrics(): void {
    try {
      fs.writeFileSync(METRICS_FILE, JSON.stringify(this.metrics, null, 2), "utf-8");
    } catch (e) {
      console.warn("Failed to save gas metrics:", e);
    }
  }

  /**
   * Record a gas metric
   */
  record(
    testFile: string,
    testName: string,
    operation: string,
    gasUsed: number,
    parameters?: any
  ): void {
    this.metrics.push({
      testFile,
      testName,
      operation,
      gasUsed,
      parameters,
      timestamp: Date.now(),
    });
    // Persist immediately
    this.saveMetrics();
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): GasMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics by test file
   */
  getMetricsByFile(testFile: string): GasMetric[] {
    return this.metrics.filter((m) => m.testFile === testFile);
  }

  /**
   * Get metrics by operation type
   */
  getMetricsByOperation(operation: string): GasMetric[] {
    return this.metrics.filter((m) => m.operation.toLowerCase().includes(operation.toLowerCase()));
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
    try {
      if (fs.existsSync(METRICS_FILE)) {
        fs.unlinkSync(METRICS_FILE);
      }
    } catch (e) {
      // Ignore errors
    }
  }

  /**
   * Generate comprehensive gas report
   */
  generateReport(): string {
    if (this.metrics.length === 0) {
      return "No gas metrics recorded.";
    }

    const report: string[] = [];
    report.push("# Comprehensive Gas Report - All Test Suites\n");
    report.push(`**Generated:** ${new Date().toLocaleString()}\n`);
    report.push(`**Total Operations Tested:** ${this.metrics.length}\n`);
    report.push(`**Total Gas Consumed:** ${this.metrics.reduce((sum, m) => sum + m.gasUsed, 0).toLocaleString()} gas\n`);

    // Group by test file
    const byFile = new Map<string, GasMetric[]>();
    this.metrics.forEach((metric) => {
      const file = metric.testFile;
      if (!byFile.has(file)) {
        byFile.set(file, []);
      }
      byFile.get(file)!.push(metric);
    });

    // Summary by test file
    report.push("## Summary by Test File\n");
    report.push("| Test File | Operations | Total Gas | Avg Gas |");
    report.push("|-----------|------------|-----------|---------|");
    
    byFile.forEach((metrics, file) => {
      const totalGas = metrics.reduce((sum, m) => sum + m.gasUsed, 0);
      const avgGas = Math.round(totalGas / metrics.length);
      report.push(`| ${file} | ${metrics.length} | ${totalGas.toLocaleString()} | ${avgGas.toLocaleString()} |`);
    });

    // Summary by operation type
    report.push("\n## Summary by Operation Type\n");
    const byOperation = new Map<string, GasMetric[]>();
    this.metrics.forEach((metric) => {
      const opType = this.getOperationType(metric.operation);
      if (!byOperation.has(opType)) {
        byOperation.set(opType, []);
      }
      byOperation.get(opType)!.push(metric);
    });

    report.push("| Operation Type | Count | Total Gas | Avg Gas | Min Gas | Max Gas |");
    report.push("|----------------|-------|-----------|---------|---------|---------|");
    
    byOperation.forEach((metrics, opType) => {
      const totalGas = metrics.reduce((sum, m) => sum + m.gasUsed, 0);
      const avgGas = Math.round(totalGas / metrics.length);
      const minGas = Math.min(...metrics.map((m) => m.gasUsed));
      const maxGas = Math.max(...metrics.map((m) => m.gasUsed));
      report.push(`| ${opType} | ${metrics.length} | ${totalGas.toLocaleString()} | ${avgGas.toLocaleString()} | ${minGas.toLocaleString()} | ${maxGas.toLocaleString()} |`);
    });

    // Detailed breakdown by test file
    report.push("\n## Detailed Breakdown by Test File\n");
    
    byFile.forEach((metrics, file) => {
      report.push(`### ${file}\n`);
      report.push("| Operation | Gas Used | Test Name | Parameters |");
      report.push("|-----------|----------|-----------|------------|");
      
      metrics.forEach((metric) => {
        const params = metric.parameters 
          ? JSON.stringify(metric.parameters).substring(0, 50) + "..."
          : "-";
        report.push(`| ${metric.operation} | ${metric.gasUsed.toLocaleString()} | ${metric.testName} | ${params} |`);
      });
      
      report.push("");
    });

    // Top 10 most expensive operations
    report.push("## Top 10 Most Expensive Operations\n");
    report.push("| Rank | Operation | Gas Used | Test File | Test Name |");
    report.push("|------|-----------|----------|-----------|-----------|");
    
    const sorted = [...this.metrics].sort((a, b) => b.gasUsed - a.gasUsed);
    sorted.slice(0, 10).forEach((metric, index) => {
      report.push(`| ${index + 1} | ${metric.operation} | ${metric.gasUsed.toLocaleString()} | ${metric.testFile} | ${metric.testName} |`);
    });

    // Top 10 least expensive operations
    report.push("\n## Top 10 Least Expensive Operations\n");
    report.push("| Rank | Operation | Gas Used | Test File | Test Name |");
    report.push("|------|-----------|----------|-----------|-----------|");
    
    sorted.reverse().slice(0, 10).forEach((metric, index) => {
      if (metric.gasUsed > 0) {
        report.push(`| ${index + 1} | ${metric.operation} | ${metric.gasUsed.toLocaleString()} | ${metric.testFile} | ${metric.testName} |`);
      }
    });

    // Gas efficiency recommendations
    report.push("\n## Gas Efficiency Analysis\n");
    
    const stakeOps = this.getMetricsByOperation("stake");
    const revenueOps = this.getMetricsByOperation("revenue");
    const poolOps = this.getMetricsByOperation("pool");
    
    if (stakeOps.length > 0) {
      const avgStakeGas = Math.round(stakeOps.reduce((sum, m) => sum + m.gasUsed, 0) / stakeOps.length);
      report.push(`- **Staking Operations:** Average ${avgStakeGas.toLocaleString()} gas across ${stakeOps.length} operations`);
    }
    
    if (revenueOps.length > 0) {
      const avgRevenueGas = Math.round(revenueOps.reduce((sum, m) => sum + m.gasUsed, 0) / revenueOps.length);
      report.push(`- **Revenue Operations:** Average ${avgRevenueGas.toLocaleString()} gas across ${revenueOps.length} operations`);
    }
    
    if (poolOps.length > 0) {
      const avgPoolGas = Math.round(poolOps.reduce((sum, m) => sum + m.gasUsed, 0) / poolOps.length);
      report.push(`- **Pool Operations:** Average ${avgPoolGas.toLocaleString()} gas across ${poolOps.length} operations`);
    }

    report.push("\n## Recommendations\n");
    report.push("1. **Batch Operations:** Group multiple operations when possible to benefit from warm storage");
    report.push("2. **Large Stakes:** Gas cost is independent of stake amount - encourage larger stakes");
    report.push("3. **Revenue Allocation:** System scales excellently - gas cost decreases per user");
    report.push("4. **View Functions:** Use view functions for read operations (zero gas cost)");

    return report.join("\n");
  }

  /**
   * Categorize operation type
   */
  private getOperationType(operation: string): string {
    const op = operation.toLowerCase();
    if (op.includes("stake")) return "Staking";
    if (op.includes("revenue") || op.includes("allocate")) return "Revenue Allocation";
    if (op.includes("pool")) return "Pool Management";
    if (op.includes("claim") || op.includes("reward")) return "Claim/Rewards";
    if (op.includes("withdraw")) return "Withdrawal";
    if (op.includes("read") || op.includes("view") || op.includes("get")) return "View Functions";
    if (op.includes("create") || op.includes("deploy")) return "Creation/Deployment";
    return "Other";
  }

  /**
   * Export metrics to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

export const gasReporter = GasReporter.getInstance();

/**
 * Helper function to measure gas and record it
 */
export async function measureAndRecordGas(
  testFile: string,
  testName: string,
  operation: string,
  txPromise: Promise<any>,
  parameters?: any
): Promise<{ gasUsed: number; receipt: any }> {
  const tx = await txPromise;

  // Handle view functions vs transactions
  if (tx.wait && typeof tx.wait === "function") {
    // This is a transaction
    const receipt = await tx.wait();
    const gasUsed = Number(receipt.gasUsed);

    // Record the metric
    gasReporter.record(testFile, testName, operation, gasUsed, parameters);

    return { gasUsed, receipt };
  } else {
    // View function - record as 0 gas
    gasReporter.record(testFile, testName, operation, 0, parameters);
    return { gasUsed: 0, receipt: null };
  }
}

