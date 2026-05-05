/**
 * Gas Measurement Helpers
 * 
 * Utility functions for measuring gas in tests
 */

import { measureAndRecordGas, gasReporter } from "./gas-reporter";

/**
 * Measure gas for a transaction and record it
 * Automatically extracts test file and test name from Mocha context
 */
export async function measureGas(
  operation: string,
  txPromise: Promise<any>,
  parameters?: any
): Promise<{ gasUsed: number; receipt: any }> {
  // Get test context from Mocha
  let testName = "unknown";
  let testFile = "unknown";
  
  try {
    // Try to access Mocha's test runner (available in Hardhat tests)
    const mocha = (global as any).mocha || (global as any).window?.mocha;
    
    if (mocha && mocha.suite) {
      // Get current test from Mocha's test runner
      const currentTest = mocha.suite.suites
        .flatMap((suite: any) => suite.tests || [])
        .find((test: any) => test.pending === false && test.state === undefined);
      
      if (currentTest) {
        testName = currentTest.title || "unknown";
        
        // Build full test name with parent suite names
        let fullName = testName;
        let parent: any = currentTest.parent;
        while (parent && parent.title) {
          fullName = `${parent.title} > ${fullName}`;
          parent = parent.parent;
        }
        testName = fullName;
      }
      
      // Try to get test file from suite
      const rootSuite = mocha.suite;
      if (rootSuite && rootSuite.file) {
        testFile = rootSuite.file;
      }
    }
    
    // Fallback: Use Error stack trace to find test name
    if (testName === "unknown" || testFile === "unknown") {
      const error = new Error();
      const stack = error.stack || "";
      const stackLines = stack.split("\n");
      
      // Find the first stack frame that references a .spec.ts file
      let testFilePath: string | null = null;
      let testLineNum: number | null = null;
      
      // Try multiple stack trace patterns
      for (const line of stackLines) {
        // Pattern 1: "at Context.<anonymous> (file.spec.ts:123:45)"
        // Pattern 2: "at measureGas (file.spec.ts:123:45)"
        // Pattern 3: "at Object.<anonymous> (file.spec.ts:123:45)"
        // Pattern 4: "    at file.spec.ts:123:45" (some formats)
        let match = line.match(/\((.+\.spec\.ts):(\d+):(\d+)\)/);
        if (!match) {
          match = line.match(/at\s+.+\s+\((.+\.spec\.ts):(\d+):(\d+)\)/);
        }
        if (!match) {
          match = line.match(/\s+at\s+(.+\.spec\.ts):(\d+):(\d+)/);
        }
        if (!match) {
          match = line.match(/(.+\.spec\.ts):(\d+):(\d+)/);
        }
        
        if (match) {
          testFilePath = match[1];
          testLineNum = parseInt(match[2]);
          break;
        }
      }
      
      if (testFilePath && testLineNum !== null) {
        // Normalize the file path
        const path = require("path");
        const normalizedPath = path.isAbsolute(testFilePath) 
          ? testFilePath 
          : path.join(process.cwd(), testFilePath);
        
        // Store full path for file reading, but extract filename for reporting
        const fullPath = normalizedPath;
        
        // Read the test file to extract test name
        try {
          const fs = require("fs");
          
          if (fs.existsSync(fullPath)) {
            const fileContent = fs.readFileSync(fullPath, "utf-8");
            const lines = fileContent.split("\n");
            const lineNum = testLineNum - 1;
            
            // Set testFile to the filename for reporting
            testFile = path.basename(fullPath);
            
            // Look backwards for it(" or test(" or specify(" patterns
            // Check up to 100 lines back to find the test definition
            for (let i = Math.min(lineNum, lines.length - 1); i >= Math.max(0, lineNum - 100); i--) {
              const line = lines[i];
              
              // Match: it("test name", ...) or it('test name', ...) or it(`test name`, ...)
              // Also handle: it("test name", async function() { ... })
              const itMatch = line.match(/(?:it|test|specify)\s*\(\s*["'`]([^"'`]+)["'`]/);
              if (itMatch) {
                testName = itMatch[1];
                
                // Build full test name with describe blocks
                const describeNames: string[] = [];
                
                // Look backwards for describe blocks (up to 200 lines to catch nested describes)
                for (let j = i - 1; j >= Math.max(0, i - 200); j--) {
                  const descLine = lines[j];
                  
                  // Match: describe("suite name", ...) or describe('suite name', ...)
                  const descMatch = descLine.match(/describe\s*\(\s*["'`]([^"'`]+)["'`]/);
                  if (descMatch) {
                    describeNames.unshift(descMatch[1]);
                  }
                  
                  // Stop if we hit another it/test/specify (we've gone too far)
                  if (descLine.match(/(?:it|test|specify)\s*\(/)) {
                    break;
                  }
                }
                
                // Combine describe names with test name
                if (describeNames.length > 0) {
                  testName = `${describeNames.join(" > ")} > ${testName}`;
                }
                
                break;
              }
            }
          } else {
            // Try relative path from process.cwd()
            const relativePath = path.join(process.cwd(), testFilePath);
            if (fs.existsSync(relativePath)) {
              // Set testFile to the filename for reporting
              testFile = path.basename(relativePath);
              // Retry with relative path
              const fileContent = fs.readFileSync(relativePath, "utf-8");
              const lines = fileContent.split("\n");
              const lineNum = testLineNum - 1;
              
              for (let i = Math.min(lineNum, lines.length - 1); i >= Math.max(0, lineNum - 100); i--) {
                const line = lines[i];
                const itMatch = line.match(/(?:it|test|specify)\s*\(\s*["'`]([^"'`]+)["'`]/);
                if (itMatch) {
                  testName = itMatch[1];
                  break;
                }
              }
            }
          }
        } catch (e) {
          // Ignore file reading errors, keep "unknown"
        }
      }
      
    }
    
  } catch (e) {
    // If all methods fail, use defaults
    testName = "unknown";
    testFile = "unknown";
  }
  
  // Extract filename from path (handle both full paths and filenames)
  let fileName = testFile;
  if (testFile !== "unknown") {
    const path = require("path");
    // If it's already just a filename, use it; otherwise extract basename
    if (testFile.includes("/") || testFile.includes("\\")) {
      fileName = path.basename(testFile);
    } else {
      fileName = testFile;
    }
  }
  
  return measureAndRecordGas(
    fileName,
    testName,
    operation,
    txPromise,
    parameters
  );
}

/**
 * Measure gas and log it
 */
export async function measureGasWithLog(
  operation: string,
  txPromise: Promise<any>,
  parameters?: any
): Promise<{ gasUsed: number; receipt: any }> {
  const result = await measureGas(operation, txPromise, parameters);
  console.log(`🔥 ${operation}: ${result.gasUsed.toLocaleString()} gas`);
  return result;
}

/**
 * Get all recorded metrics (for reporting)
 */
export function getAllGasMetrics() {
  return gasReporter.getAllMetrics();
}

/**
 * Clear all metrics (useful for test cleanup)
 */
export function clearGasMetrics() {
  gasReporter.clear();
}

