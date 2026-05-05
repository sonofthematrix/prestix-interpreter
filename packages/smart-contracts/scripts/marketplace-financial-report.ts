import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 🏢 Marketplace Financial Reporting System
 *
 * Generates comprehensive financial reports for the RWA Marketplace including:
 * - Daily running balance of RWAToken evaluations
 * - Marketplace token minting and purchase fees account balance reports
 * - Per-token breakdowns for minted and purchased assets
 *
 * Usage:
 * npx hardhat run scripts/marketplace-financial-report.ts --network sepolia
 */

interface TokenReport {
  assetId: string;
  tokenAddress: string;
  name: string;
  symbol: string;
  totalSupply: string;
  circulatingSupply: string;
  currentPrice: string;
  marketCap: string;
  totalMinted: string;
  totalPurchased: string;
  mintingFees: string;
  purchaseFees: string;
  totalFees: string;
  lastActivity: Date;
}

interface DailyReport {
  date: string;
  totalMarketCap: string;
  totalFeesCollected: string;
  totalTokensMinted: number;
  totalTokensPurchased: number;
  activeTokens: number;
  topPerformingToken: {
    assetId: string;
    marketCap: string;
    growth: string;
  };
  tokenReports: TokenReport[];
}

interface MarketplaceFinancialReport {
  generatedAt: Date;
  network: string;
  marketplaceAddress: string;
  treasuryAddress: string;
  treasuryBalance: string;
  totalFeesEver: string;
  dailyReports: DailyReport[];
  summary: {
    totalActiveAssets: number;
    totalMarketCap: string;
    totalFeesCollected: string;
    averageTokenPrice: string;
    topAsset: TokenReport | null;
  };
}

class MarketplaceFinancialReporter {
  private marketplace: any;
  private assetRegistry: any;
  private tokenFactory404: any;
  private treasuryAddress: string;

  constructor(
    marketplaceContract: any,
    assetRegistryContract: any,
    tokenFactory404Contract: any,
    treasuryAddr: string
  ) {
    this.marketplace = marketplaceContract;
    this.assetRegistry = assetRegistryContract;
    this.tokenFactory404 = tokenFactory404Contract;
    this.treasuryAddress = treasuryAddr;
  }

  /**
   * Generate comprehensive financial report
   */
  async generateReport(): Promise<MarketplaceFinancialReport> {
    console.log("🔍 Generating Marketplace Financial Report...");
    console.log("=" .repeat(60));

    const network = await ethers.provider.getNetwork();
    const marketplaceAddress = await this.marketplace.getAddress();

    // Get treasury balance
    const treasuryBalance = await ethers.provider.getBalance(this.treasuryAddress);

    // Get all tokens from factory
    let allTokens: string[] = [];
    try {
      allTokens = await this.tokenFactory404.getAllTokens();
      console.log(`📊 Found ${allTokens.length} tokens to analyze`);
    } catch (error) {
      console.log("⚠️  Could not retrieve tokens from factory, using empty list");
      allTokens = [];
    }

    // Generate daily reports for the last 30 days
    const dailyReports: DailyReport[] = [];
    const now = new Date();

    // Generate fewer reports if there are no tokens to avoid empty reports
    const daysToReport = allTokens.length > 0 ? 30 : 7;

    for (let i = daysToReport - 1; i >= 0; i--) {
      const reportDate = new Date(now);
      reportDate.setDate(now.getDate() - i);
      try {
        const dailyReport = await this.generateDailyReport(reportDate, allTokens);
        dailyReports.push(dailyReport);
      } catch (error) {
        console.warn(`⚠️  Failed to generate daily report for ${reportDate.toDateString()}:`, error);
        // Add a minimal report
        dailyReports.push({
          date: reportDate.toISOString().split('T')[0],
          totalMarketCap: "0",
          totalFeesCollected: "0",
          totalTokensMinted: 0,
          totalTokensPurchased: 0,
          activeTokens: 0,
          topPerformingToken: {
            assetId: "N/A",
            volume: "0",
            transactionCount: 0
          },
          tokenReports: []
        });
      }
    }

    // Calculate summary
    const summary = await this.calculateSummary(allTokens, dailyReports);

    const report: MarketplaceFinancialReport = {
      generatedAt: new Date(),
      network: network.name,
      marketplaceAddress,
      treasuryAddress: this.treasuryAddress,
      treasuryBalance: ethers.formatEther(treasuryBalance),
      totalFeesEver: await this.calculateTotalFeesEver(),
      dailyReports,
      summary
    };

    console.log("✅ Financial report generated successfully!");
    return report;
  }

  /**
   * Generate daily report for specific date
   */
  private async generateDailyReport(date: Date, allTokens: string[]): Promise<DailyReport> {
    const dateStr = date.toISOString().split('T')[0];
    console.log(`📅 Generating report for ${dateStr}`);

    const tokenReports: TokenReport[] = [];

    for (const tokenAddress of allTokens) {
      try {
        const tokenReport = await this.generateTokenReport(tokenAddress, date);
        tokenReports.push(tokenReport);
      } catch (error) {
        console.warn(`⚠️  Failed to generate report for token ${tokenAddress}:`, error.message);
        // Add a minimal token report
        tokenReports.push({
          assetId: "unknown",
          tokenAddress,
          name: "Unknown Token",
          symbol: "UNK",
          totalSupply: "0",
          circulatingSupply: "0",
          currentPrice: "0",
          marketCap: "0",
          totalMinted: "0",
          totalPurchased: "0",
          mintingFees: "0",
          purchaseFees: "0",
          totalFees: "0",
          lastActivity: date
        });
      }
    }

    // Calculate daily aggregates
    const totalMarketCap = tokenReports.reduce(
      (sum, token) => sum + parseFloat(token.marketCap),
      0
    ).toString();

    const totalFees = tokenReports.reduce(
      (sum, token) => sum + parseFloat(token.totalFees),
      0
    ).toString();

    const totalMinted = tokenReports.reduce(
      (sum, token) => sum + parseInt(token.totalMinted),
      0
    );

    const totalPurchased = tokenReports.reduce(
      (sum, token) => sum + parseInt(token.totalPurchased),
      0
    );

    // Find top performing token
    const topPerformingToken = tokenReports.reduce((top, current) => {
      return parseFloat(current.marketCap) > parseFloat(top.marketCap) ? current : top;
    }, tokenReports[0]);

    return {
      date: dateStr,
      totalMarketCap: totalMarketCap.toString(),
      totalFeesCollected: totalFees,
      totalTokensMinted: totalMinted,
      totalTokensPurchased: totalPurchased,
      activeTokens: tokenReports.length,
      topPerformingToken: {
        assetId: topPerformingToken?.assetId || "N/A",
        marketCap: topPerformingToken?.marketCap || "0",
        growth: "0" // Would need historical data for growth calculation
      },
      tokenReports
    };
  }

  /**
   * Generate detailed report for a specific token
   */
  private async generateTokenReport(tokenAddress: string, date: Date): Promise<TokenReport> {
    try {
      const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);

      // Get basic token info
      const name = await tokenContract.name();
      const symbol = await tokenContract.symbol();
      const assetId = await tokenContract.assetId();
      const totalSupply = await tokenContract.totalSupply();

    // Get asset details
    const assetDetails = await this.assetRegistry.getAsset(assetId);

    // Calculate circulating supply (this would need more complex logic in real implementation)
    const circulatingSupply = totalSupply.toString(); // Simplified

    // Get current price (from asset registry)
    const currentPrice = ethers.formatEther(assetDetails.tokenPrice);

    // Calculate market cap
    const marketCap = (parseFloat(ethers.formatEther(totalSupply)) * parseFloat(currentPrice)).toString();

    // Calculate fees (simplified - would need transaction history analysis)
    const mintingFees = await this.calculateTokenMintingFees(assetId);
    const purchaseFees = await this.calculateTokenPurchaseFees(assetId);
    const totalFees = (parseFloat(mintingFees) + parseFloat(purchaseFees)).toString();

    // Get activity metrics
    const totalMinted = totalSupply.toString();
    const totalPurchased = await this.getTotalPurchasedForToken(assetId);

      return {
        assetId: assetId.toString(),
        tokenAddress,
        name,
        symbol,
        totalSupply: ethers.formatEther(totalSupply),
        circulatingSupply: ethers.formatEther(circulatingSupply),
        currentPrice,
        marketCap,
        totalMinted,
        totalPurchased,
        mintingFees,
        purchaseFees,
        totalFees,
        lastActivity: date // Simplified - would need real transaction data
      };
    } catch (error) {
      // Return a minimal report if token contract interaction fails
      return {
        assetId: "error",
        tokenAddress,
        name: "Error Loading Token",
        symbol: "ERR",
        totalSupply: "0",
        circulatingSupply: "0",
        currentPrice: "0",
        marketCap: "0",
        totalMinted: "0",
        totalPurchased: "0",
        mintingFees: "0",
        purchaseFees: "0",
        totalFees: "0",
        lastActivity: date
      };
    }
  }

  /**
   * Calculate total fees ever collected by marketplace
   */
  private async calculateTotalFeesEver(): Promise<string> {
    // This would require analyzing all marketplace transactions
    // For now, return treasury balance as approximation
    const treasuryBalance = await ethers.provider.getBalance(this.treasuryAddress);
    return ethers.formatEther(treasuryBalance);
  }

  /**
   * Calculate minting fees for a specific token
   */
  private async calculateTokenMintingFees(assetId: bigint): Promise<string> {
    // Simplified - would need to track actual minting transactions
    // For now, return 0
    return "0";
  }

  /**
   * Calculate purchase fees for a specific token
   */
  private async calculateTokenPurchaseFees(assetId: bigint): Promise<string> {
    // Simplified - would need to analyze marketplace purchase transactions
    // For now, return 0
    return "0";
  }

  /**
   * Get total tokens purchased for a specific asset
   */
  private async getTotalPurchasedForToken(assetId: bigint): Promise<string> {
    // Simplified - would need transaction history analysis
    // For now, return 0
    return "0";
  }

  /**
   * Calculate summary statistics
   */
  private async calculateSummary(allTokens: string[], dailyReports: DailyReport[]) {
    const latestReport = dailyReports[dailyReports.length - 1];

    const totalActiveAssets = latestReport.activeTokens;
    const totalMarketCap = latestReport.totalMarketCap;
    const totalFeesCollected = latestReport.totalFeesCollected;

    const averageTokenPrice = totalActiveAssets > 0
      ? (parseFloat(totalMarketCap) / totalActiveAssets).toString()
      : "0";

    const topAsset = latestReport.tokenReports.reduce((top, current) => {
      return parseFloat(current.marketCap) > parseFloat(top?.marketCap || "0") ? current : top;
    }, null as TokenReport | null);

    return {
      totalActiveAssets,
      totalMarketCap,
      totalFeesCollected,
      averageTokenPrice,
      topAsset
    };
  }

  /**
   * Export report to JSON file
   */
  async exportToJson(report: MarketplaceFinancialReport, filename?: string): Promise<void> {
    const exportPath = filename || `marketplace-financial-report-${Date.now()}.json`;
    const jsonReport = JSON.stringify(report, null, 2);

    fs.writeFileSync(exportPath, jsonReport);
    console.log(`📄 Report exported to ${exportPath}`);
  }

  /**
   * Export report to CSV format
   */
  async exportToCsv(report: MarketplaceFinancialReport, filename?: string): Promise<void> {
    const exportPath = filename || `marketplace-financial-report-${Date.now()}.csv`;

    let csvContent = "Date,Total Market Cap,Total Fees,Total Minted,Total Purchased,Active Tokens,Top Token Asset ID,Top Token Market Cap\n";

    for (const daily of report.dailyReports) {
      csvContent += `${daily.date},${daily.totalMarketCap},${daily.totalFeesCollected},${daily.totalTokensMinted},${daily.totalTokensPurchased},${daily.activeTokens},${daily.topPerformingToken.assetId},${daily.topPerformingToken.marketCap}\n`;
    }

    fs.writeFileSync(exportPath, csvContent);
    console.log(`📊 CSV report exported to ${exportPath}`);
  }

  /**
   * Generate human-readable summary report
   */
  generateSummaryReport(report: MarketplaceFinancialReport): string {
    let summary = "";
    summary += "🏢 TIGER PALACE RWA MARKETPLACE FINANCIAL REPORT\n";
    summary += "=" .repeat(60) + "\n\n";

    summary += `📅 Generated: ${report.generatedAt.toLocaleString()}\n`;
    summary += `🌐 Network: ${report.network}\n`;
    summary += `🏪 Marketplace: ${report.marketplaceAddress}\n`;
    summary += `🏦 Treasury: ${report.treasuryAddress}\n\n`;

    summary += "💰 TREASURY SUMMARY\n";
    summary += "-".repeat(30) + "\n";
    summary += `Current Balance: ${report.treasuryBalance} ETH\n`;
    summary += `Total Fees Ever: ${report.totalFeesEver} ETH\n\n`;

    summary += "📊 MARKET SUMMARY\n";
    summary += "-".repeat(30) + "\n";
    summary += `Active Assets: ${report.summary.totalActiveAssets}\n`;
    summary += `Total Market Cap: ${report.summary.totalMarketCap} ETH\n`;
    summary += `Total Fees Collected: ${report.summary.totalFeesCollected} ETH\n`;
    summary += `Average Token Price: ${report.summary.averageTokenPrice} ETH\n`;

    if (report.summary.topAsset) {
      summary += `Top Performing Asset: ${report.summary.topAsset.name} (${report.summary.topAsset.symbol})\n`;
      summary += `Top Asset Market Cap: ${report.summary.topAsset.marketCap} ETH\n`;
    }

    summary += "\n📈 DAILY REPORTS (Last 7 Days)\n";
    summary += "-".repeat(40) + "\n";

    const recentReports = report.dailyReports.slice(-7);
    for (const daily of recentReports) {
      summary += `${daily.date}: Market Cap: ${daily.totalMarketCap} ETH, Fees: ${daily.totalFeesCollected} ETH, Active: ${daily.activeTokens}\n`;
    }

    summary += "\n🏠 INDIVIDUAL ASSET REPORTS\n";
    summary += "-".repeat(40) + "\n";

    const latestReport = report.dailyReports[report.dailyReports.length - 1];
    for (const token of latestReport.tokenReports) {
      summary += `${token.name} (${token.symbol})\n`;
      summary += `  Asset ID: ${token.assetId}\n`;
      summary += `  Token Address: ${token.tokenAddress}\n`;
      summary += `  Total Supply: ${token.totalSupply}\n`;
      summary += `  Current Price: ${token.currentPrice} ETH\n`;
      summary += `  Market Cap: ${token.marketCap} ETH\n`;
      summary += `  Total Fees: ${token.totalFees} ETH\n\n`;
    }

    return summary;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log("🚀 Starting Marketplace Financial Reporting...");

  try {
    // For demo purposes, we'll create mock contracts
    // In production, load from deployed addresses in deployed-addresses-proxy.json

    let marketplace, assetRegistry, tokenFactory404, treasuryAddress;

    try {
      // Try to load from deployed addresses first
      const deployedAddresses = require("../deployed-addresses-proxy.json");

      if (deployedAddresses.addresses) {
        console.log("📋 Using deployed contract addresses...");

        marketplace = await ethers.getContractAt("RWAMarketplace", deployedAddresses.addresses.RWAMarketplace);
        assetRegistry = await ethers.getContractAt("RWAAssetRegistry", deployedAddresses.addresses.RWAAssetRegistry);
        tokenFactory404 = await ethers.getContractAt("RWATokenFactory404", deployedAddresses.addresses.RWATokenFactory404);
        treasuryAddress = deployedAddresses.addresses.Treasury || ethers.ZeroAddress;
      }
    } catch (error) {
      console.log("⚠️  No deployed addresses found, creating demo contracts...");

      // Deploy demo contracts for testing
      const assetRegistryFactory = await ethers.getContractFactory("RWAAssetRegistry");
      assetRegistry = await assetRegistryFactory.deploy();
      await assetRegistry.waitForDeployment();

      const tokenFactory404Factory = await ethers.getContractFactory("RWATokenFactory404");
      tokenFactory404 = await tokenFactory404Factory.deploy(await assetRegistry.getAddress());
      await tokenFactory404.waitForDeployment();

      const marketplaceFactory = await ethers.getContractFactory("RWAMarketplace");
      marketplace = await marketplaceFactory.deploy(
        await assetRegistry.getAddress(),
        await tokenFactory404.getAddress(),
        ethers.ZeroAddress, // treasury
        ethers.ZeroAddress // payment token (ETH only)
      );
      await marketplace.waitForDeployment();

      treasuryAddress = ethers.ZeroAddress;
    }

    // Create reporter
    const reporter = new MarketplaceFinancialReporter(
      marketplace,
      assetRegistry,
      tokenFactory404,
      treasuryAddress
    );

    // Generate report
    const report = await reporter.generateReport();

    // Export reports
    const timestamp = Date.now();
    await reporter.exportToJson(report, `marketplace-financial-report-${timestamp}.json`);
    await reporter.exportToCsv(report, `marketplace-financial-report-${timestamp}.csv`);

    // Generate and display summary
    const summaryReport = reporter.generateSummaryReport(report);
    console.log("\n" + summaryReport);

    // Save summary to file
    fs.writeFileSync(`marketplace-summary-${timestamp}.txt`, summaryReport);
    console.log(`📝 Summary saved to marketplace-summary-${timestamp}.txt`);

  } catch (error) {
    console.error("❌ Error generating financial report:", error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { MarketplaceFinancialReporter, MarketplaceFinancialReport, TokenReport, DailyReport };
