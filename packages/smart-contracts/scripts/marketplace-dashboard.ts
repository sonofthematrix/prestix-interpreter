import { ethers } from "hardhat";
import { AdvancedMarketplaceFinancialReporter } from "./advanced-marketplace-financial-report";

/**
 * 🏢 Marketplace Financial Dashboard
 *
 * Real-time dashboard for monitoring RWA marketplace financial metrics
 * Provides live updates on market cap, fees, volume, and asset performance
 */

interface DashboardMetrics {
  timestamp: Date;
  marketOverview: {
    totalAssets: number;
    totalMarketCap: string;
    totalVolume24h: string;
    totalFees24h: string;
    activeUsers24h: number;
  };
  topAssets: Array<{
    rank: number;
    assetId: string;
    name: string;
    symbol: string;
    marketCap: string;
    volume24h: string;
    priceChange24h: string;
    transactions24h: number;
  }>;
  feeAnalysis: {
    totalFeesEver: string;
    feesToday: string;
    feesThisWeek: string;
    feesThisMonth: string;
    averageFeePerTransaction: string;
    feeCollectionTrend: 'up' | 'down' | 'stable';
  };
  networkHealth: {
    gasPrice: string;
    blockTime: number;
    tps: number;
  };
}

class MarketplaceDashboard {
  private reporter: AdvancedMarketplaceFinancialReporter;
  private updateInterval: number;
  private isRunning: boolean = false;

  constructor(
    marketplaceContract: any,
    assetRegistryContract: any,
    tokenFactory404Contract: any,
    updateIntervalSeconds: number = 300 // 5 minutes default
  ) {
    this.reporter = new AdvancedMarketplaceFinancialReporter(
      marketplaceContract,
      assetRegistryContract,
      tokenFactory404Contract
    );
    this.updateInterval = updateIntervalSeconds * 1000;
  }

  /**
   * Start the dashboard with real-time updates
   */
  async start(): Promise<void> {
    console.log("🚀 Starting Marketplace Financial Dashboard...");
    console.log("Press Ctrl+C to stop\n");

    this.isRunning = true;

    // Initial dashboard display
    await this.displayDashboard();

    // Set up periodic updates
    const updateLoop = async () => {
      if (!this.isRunning) return;

      try {
        console.clear();
        await this.displayDashboard();
      } catch (error) {
        console.error("❌ Dashboard update error:", error);
      }

      if (this.isRunning) {
        setTimeout(updateLoop, this.updateInterval);
      }
    };

    setTimeout(updateLoop, this.updateInterval);
  }

  /**
   * Stop the dashboard
   */
  stop(): void {
    console.log("\n🛑 Stopping dashboard...");
    this.isRunning = false;
  }

  /**
   * Generate and display current dashboard metrics
   */
  private async displayDashboard(): Promise<void> {
    try {
      // Get last 24 hours of data (approximately)
      const latestBlock = await ethers.provider.getBlockNumber();
      const blocksPerDay = Math.floor((24 * 60 * 60) / 12); // Approximate blocks per day
      const startBlock = Math.max(0, latestBlock - blocksPerDay);

      const analytics = await this.reporter.generateAdvancedReport(startBlock, latestBlock);
      const metrics = await this.calculateDashboardMetrics(analytics);

      this.renderDashboard(metrics);

    } catch (error) {
      console.error("❌ Failed to generate dashboard:", error);
    }
  }

  /**
   * Calculate dashboard metrics from analytics data
   */
  private async calculateDashboardMetrics(analytics: any): Promise<DashboardMetrics> {
    const latestSnapshot = analytics.dailySnapshots[analytics.dailySnapshots.length - 1];
    const previousSnapshot = analytics.dailySnapshots[analytics.dailySnapshots.length - 2];

    // Calculate 24h volume (simplified)
    const volume24h = latestSnapshot ? latestSnapshot.dailyVolume : "0";

    // Calculate fee trends
    const feeTrend = this.calculateFeeTrend(analytics.dailySnapshots);

    // Get top assets by market cap
    const topAssets = analytics.assetFinancials
      .sort((a, b) => parseFloat(b.marketCap) - parseFloat(a.marketCap))
      .slice(0, 10)
      .map((asset, index) => ({
        rank: index + 1,
        assetId: asset.assetId,
        name: asset.name,
        symbol: asset.symbol,
        marketCap: asset.marketCap,
        volume24h: asset.volume24h,
        priceChange24h: asset.priceChange24h,
        transactions24h: Math.floor(asset.totalTransactions / Math.max(1, asset.daysActive)) // Rough daily average
      }));

    // Get network health metrics
    const networkHealth = await this.getNetworkHealth();

    return {
      timestamp: new Date(),
      marketOverview: {
        totalAssets: analytics.summary.totalAssets,
        totalMarketCap: analytics.summary.totalMarketCap,
        totalVolume24h: volume24h,
        totalFees24h: latestSnapshot?.dailyFees || "0",
        activeUsers24h: Math.floor(analytics.summary.uniqueUsers * 0.1) // Rough estimate
      },
      topAssets,
      feeAnalysis: {
        totalFeesEver: analytics.summary.totalFeesCollected,
        feesToday: latestSnapshot?.dailyFees || "0",
        feesThisWeek: this.calculateWeeklyFees(analytics.dailySnapshots),
        feesThisMonth: this.calculateMonthlyFees(analytics.dailySnapshots),
        averageFeePerTransaction: analytics.summary.averageTransactionValue,
        feeCollectionTrend: feeTrend
      },
      networkHealth
    };
  }

  /**
   * Calculate fee collection trend
   */
  private calculateFeeTrend(dailySnapshots: any[]): 'up' | 'down' | 'stable' {
    if (dailySnapshots.length < 2) return 'stable';

    const recent = dailySnapshots.slice(-7);
    const older = dailySnapshots.slice(-14, -7);

    const recentAvg = recent.reduce((sum, day) => sum + parseFloat(day.dailyFees), 0) / recent.length;
    const olderAvg = older.reduce((sum, day) => sum + parseFloat(day.dailyFees), 0) / older.length;

    if (recentAvg > olderAvg * 1.1) return 'up';
    if (recentAvg < olderAvg * 0.9) return 'down';
    return 'stable';
  }

  /**
   * Calculate weekly fees
   */
  private calculateWeeklyFees(dailySnapshots: any[]): string {
    const weekly = dailySnapshots.slice(-7);
    return weekly.reduce((sum, day) => sum + parseFloat(day.dailyFees), 0).toString();
  }

  /**
   * Calculate monthly fees
   */
  private calculateMonthlyFees(dailySnapshots: any[]): string {
    const monthly = dailySnapshots.slice(-30);
    return monthly.reduce((sum, day) => sum + parseFloat(day.dailyFees), 0).toString();
  }

  /**
   * Get current network health metrics
   */
  private async getNetworkHealth() {
    try {
      const feeData = await ethers.provider.getFeeData();
      const blockNumber = await ethers.provider.getBlockNumber();
      const currentBlock = await ethers.provider.getBlock(blockNumber);
      const previousBlock = await ethers.provider.getBlock(blockNumber - 1);

      const blockTime = currentBlock.timestamp - previousBlock.timestamp;
      const tps = 1 / blockTime; // Simplified TPS calculation

      return {
        gasPrice: ethers.formatUnits(feeData.gasPrice || 0, 'gwei'),
        blockTime,
        tps
      };
    } catch (error) {
      return {
        gasPrice: "0",
        blockTime: 12,
        tps: 0
      };
    }
  }

  /**
   * Render the dashboard to console
   */
  private renderDashboard(metrics: DashboardMetrics): void {
    console.log(`🏢 TIGER PALACE RWA MARKETPLACE DASHBOARD`);
    console.log(`📅 ${metrics.timestamp.toLocaleString()}`);
    console.log("=".repeat(80));
    console.log("");

    // Market Overview
    console.log("📊 MARKET OVERVIEW");
    console.log("-".repeat(50));
    console.log(`Total Assets:        ${metrics.marketOverview.totalAssets}`);
    console.log(`Total Market Cap:    ${this.formatCurrency(metrics.marketOverview.totalMarketCap)} ETH`);
    console.log(`24h Volume:         ${this.formatCurrency(metrics.marketOverview.totalVolume24h)} ETH`);
    console.log(`24h Fees:           ${this.formatCurrency(metrics.marketOverview.totalFees24h)} ETH`);
    console.log(`24h Active Users:   ${metrics.marketOverview.activeUsers24h}`);
    console.log("");

    // Top Assets
    console.log("🏆 TOP ASSETS BY MARKET CAP");
    console.log("-".repeat(50));
    console.log("Rank  Symbol    Name                      Market Cap      24h Vol    24h Tx");
    console.log("-".repeat(80));

    for (const asset of metrics.topAssets.slice(0, 5)) {
      const name = asset.name.substring(0, 20).padEnd(20);
      const symbol = asset.symbol.substring(0, 8).padEnd(8);
      console.log(`${asset.rank.toString().padStart(2)}    ${symbol} ${name} ${this.formatCurrency(asset.marketCap, 8)} ${this.formatCurrency(asset.volume24h, 8)} ${asset.transactions24h.toString().padStart(6)}`);
    }
    console.log("");

    // Fee Analysis
    console.log("💰 FEE ANALYSIS");
    console.log("-".repeat(50));
    console.log(`Total Fees Ever:     ${this.formatCurrency(metrics.feeAnalysis.totalFeesEver)} ETH`);
    console.log(`Fees Today:          ${this.formatCurrency(metrics.feeAnalysis.feesToday)} ETH`);
    console.log(`Fees This Week:      ${this.formatCurrency(metrics.feeAnalysis.feesThisWeek)} ETH`);
    console.log(`Fees This Month:     ${this.formatCurrency(metrics.feeAnalysis.feesThisMonth)} ETH`);
    console.log(`Avg Fee/Tx:          ${this.formatCurrency(metrics.feeAnalysis.averageFeePerTransaction)} ETH`);
    console.log(`Fee Trend:           ${this.getTrendIcon(metrics.feeAnalysis.feeCollectionTrend)} ${metrics.feeAnalysis.feeCollectionTrend}`);
    console.log("");

    // Network Health
    console.log("⛽ NETWORK HEALTH");
    console.log("-".repeat(50));
    console.log(`Gas Price:           ${metrics.networkHealth.gasPrice} gwei`);
    console.log(`Block Time:          ${metrics.networkHealth.blockTime}s`);
    console.log(`Transactions/sec:    ${metrics.networkHealth.tps.toFixed(2)}`);
    console.log("");

    console.log("🔄 Next update in 5 minutes... (Ctrl+C to stop)");
  }

  /**
   * Format currency values
   */
  private formatCurrency(value: string, maxLength: number = 12): string {
    const num = parseFloat(value);
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + "K";
    } else {
      return num.toFixed(4);
    }
  }

  /**
   * Get trend icon
   */
  private getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log("🚀 Starting Marketplace Dashboard...");

  try {
    // Deploy or get contracts (in production, these would be from deployed addresses)
    const assetRegistryFactory = await ethers.getContractFactory("RWAAssetRegistry");
    const assetRegistry = await assetRegistryFactory.deploy();
    await assetRegistry.waitForDeployment();

    const tokenFactory404Factory = await ethers.getContractFactory("RWATokenFactory404");
    const tokenFactory404 = await tokenFactory404Factory.deploy(await assetRegistry.getAddress());
    await tokenFactory404.waitForDeployment();

    const marketplaceFactory = await ethers.getContractFactory("RWAMarketplace");
    const marketplace = await marketplaceFactory.deploy(
      await assetRegistry.getAddress(),
      await tokenFactory404.getAddress(),
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );
    await marketplace.waitForDeployment();

    // Create and start dashboard
    const dashboard = new MarketplaceDashboard(
      marketplace,
      assetRegistry,
      tokenFactory404,
      30 // Update every 30 seconds for demo
    );

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      dashboard.stop();
      process.exit(0);
    });

    await dashboard.start();

  } catch (error) {
    console.error("❌ Error starting dashboard:", error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

export { MarketplaceDashboard, DashboardMetrics };
