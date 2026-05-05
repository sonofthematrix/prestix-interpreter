#!/usr/bin/env ts-node
/**
 * Generate Comprehensive Gas Report
 * 
 * Runs all tests and generates a comprehensive gas report
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { gasReporter } from "../test/utils/gas-reporter";

async function generateGasReport() {
  console.log("🚀 Starting comprehensive gas report generation...\n");

  // Load existing metrics (don't clear - they persist across test runs)
  // Metrics are saved to .gas-metrics.json by the gas reporter

  // List of test files to run
  const testFiles = [
    "test/ecosystem-performance.spec.ts",
    "test/ecosystem-integration.spec.ts",
    "test/core-contracts-focused.spec.ts",
    "test/enhanced-revenue-allocation.spec.ts",
    "test/rwa-staking-integration.spec.ts",
    "test/reward-distributor-contract.spec.ts",
    "test/tiger-revenue-enhanced-coverage.spec.ts",
    "test/tiger-staking-error-emergency-tests.spec.ts",
    "test/simple-staking-test.spec.ts",
    "test/minimal-staking-test.spec.ts",
  ];

  console.log(`📋 Running ${testFiles.length} test files...\n`);

  let totalPassed = 0;
  let totalFailed = 0;
  const results: Array<{ file: string; passed: number; failed: number }> = [];

  // Run each test file
  for (const testFile of testFiles) {
    try {
      console.log(`\n▶️  Running ${testFile}...`);
      const output = execSync(
        `cd ${process.cwd()} && bun test ${testFile} 2>&1 || true`,
        { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
      );

      // Parse test results
      const passMatch = output.match(/(\d+)\s+pass/);
      const failMatch = output.match(/(\d+)\s+fail/);
      const passed = passMatch ? parseInt(passMatch[1]) : 0;
      const failed = failMatch ? parseInt(failMatch[1]) : 0;

      totalPassed += passed;
      totalFailed += failed;
      results.push({ file: testFile, passed, failed });

      if (failed > 0) {
        console.log(`⚠️  ${testFile}: ${passed} passed, ${failed} failed`);
      } else {
        console.log(`✅ ${testFile}: ${passed} passed`);
      }
    } catch (error: any) {
      console.error(`❌ Error running ${testFile}:`, error.message);
      results.push({ file: testFile, passed: 0, failed: 1 });
      totalFailed++;
    }
  }

  // Generate comprehensive report
  console.log("\n📊 Generating comprehensive gas report...\n");

  // Load metrics from file (they were saved during test execution)
  const metricsFile = path.join(process.cwd(), ".gas-metrics.json");
  if (fs.existsSync(metricsFile)) {
    const savedMetrics = JSON.parse(fs.readFileSync(metricsFile, "utf-8"));
    // Clear and reload metrics
    gasReporter.clear();
    savedMetrics.forEach((m: any) => {
      gasReporter.record(m.testFile, m.testName, m.operation, m.gasUsed, m.parameters);
    });
  }

  const report = gasReporter.generateReport();

  // Add test summary to report
  const fullReport = `# Comprehensive Gas Report - All Test Suites

**Generated:** ${new Date().toLocaleString()}
**Total Tests:** ${totalPassed} passed, ${totalFailed} failed
**Test Files Run:** ${testFiles.length}

## Test Execution Summary

| Test File | Passed | Failed |
|-----------|--------|--------|
${results.map((r) => `| ${r.file} | ${r.passed} | ${r.failed} |`).join("\n")}

---

${report}

## Test Coverage Summary

- **Total Test Files:** ${testFiles.length}
- **Total Tests Passed:** ${totalPassed}
- **Total Tests Failed:** ${totalFailed}
- **Success Rate:** ${totalFailed === 0 ? "100%" : ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(2) + "%"}

## Notes

- All gas measurements are from actual test execution
- View functions are recorded as 0 gas
- Gas costs may vary based on network conditions
- This report includes all operations tested across all test suites
`;

  // Write report to file
  const reportPath = path.join(process.cwd(), "COMPREHENSIVE_GAS_REPORT.md");
  fs.writeFileSync(reportPath, fullReport, "utf-8");

  console.log(`\n✅ Comprehensive gas report generated: ${reportPath}`);
  console.log(`\n📈 Report Statistics:`);
  console.log(`   - Total Operations: ${gasReporter.getAllMetrics().length}`);
  console.log(`   - Total Gas: ${gasReporter.getAllMetrics().reduce((sum, m) => sum + m.gasUsed, 0).toLocaleString()}`);
  console.log(`   - Test Files: ${testFiles.length}`);
  console.log(`   - Tests Passed: ${totalPassed}`);
  console.log(`   - Tests Failed: ${totalFailed}`);

  // Also export JSON for programmatic access
  const jsonPath = path.join(process.cwd(), "gas-metrics.json");
  fs.writeFileSync(jsonPath, gasReporter.exportToJSON(), "utf-8");
  console.log(`\n📄 JSON metrics exported: ${jsonPath}`);

  return { totalPassed, totalFailed, metricsCount: gasReporter.getAllMetrics().length };
}

// Run if executed directly
if (require.main === module) {
  generateGasReport()
    .then(({ totalPassed, totalFailed }) => {
      process.exit(totalFailed > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error("❌ Error generating gas report:", error);
      process.exit(1);
    });
}

export { generateGasReport };

