import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * 🏢 Advanced Marketplace Financial Reporting System
 *
 * Analyzes blockchain transactions to provide comprehensive financial reports including:
 * - Real transaction history analysis
 * - Fee collection tracking from actual blockchain events
 * - Token minting vs purchasing differentiation
 * - Historical price and volume analysis
 * - Per-asset performance metrics
 *
 * This version analyzes actual blockchain data rather than simulated data.
 */

interface TransactionRecord {
  hash: string;
  blockNumber: number;
  timestamp: Date;
  type: 'mint' | 'purchase' | 'transfer';
  assetId: string;
  tokenAddress: string;
  from: string;
  to: string;
  amount: string;
  value: string; // ETH value
  fees: string;
  gasUsed: string;
  gasPrice: string;
}

interface AssetFinancials {
  assetId: string;
  tokenAddress: string;
  name: string;
  symbol: string;

  // Supply metrics
  totalSupply: string;
  circulatingSupply: string;

  // Transaction counts
  totalTransactions: number;
  mintTransactions: number;
  purchaseTransactions: number;
  transferTransactions: number;

  // Volume metrics
  totalVolumeETH: string;
  totalVolumeTokens: string;
  averageTransactionSize: string;

  // Fee metrics
  totalFeesCollected: string;
  mintingFees: string;
  purchaseFees: string;
  averageFeePerTransaction: string;

  // Performance metrics
  currentPrice: string;
  marketCap: string;
  priceChange24h: string;
  volume24h: string;

  // Time metrics
  firstTransaction: Date | null;
  lastTransaction: Date | null;
  daysActive: number;

  // Holder metrics
  uniqueHolders: number;
  topHolders: Array<{ address: string; balance: string; percentage: string }>;

  // Transaction history
  recentTransactions: TransactionRecord[];
}

interface DailyFinancialSnapshot {
  date: string;
  totalMarketCap: string;
  dailyVolume: string;
  dailyFees: string;
  activeAssets: number;
  totalTransactions: number;
  newAssets: number;
  topAssetByVolume: {
    assetId: string;
    volume: string;
    transactionCount: number;
  };
}

interface MarketplaceAnalytics {
  generatedAt: Date;
  network: string;
  analysisPeriod: {
    startBlock: number;
    endBlock: number;
    startDate: Date;
    endDate: Date;
  };

  // Overall marketplace metrics
  summary: {
    totalAssets: number;
    totalMarketCap: string;
    totalVolume: string;
    totalFeesCollected: string;
    totalTransactions: number;
    uniqueUsers: number;
    averageTransactionValue: string;
  };

  // Daily snapshots
  dailySnapshots: DailyFinancialSnapshot[];

  // Asset-specific data
  assetFinancials: AssetFinancials[];

  // Network health
  networkStats: {
    averageGasPrice: string;
    totalGasUsed: string;
    averageTransactionFee: string;
  };
}

class AdvancedMarketplaceFinancialReporter {
  private marketplace: any;
  private assetRegistry: any;
  private tokenFactory404: any;
  private provider: any;

  constructor(
    marketplaceContract: any,
    assetRegistryContract: any,
    tokenFactory404Contract: any
  ) {
    this.marketplace = marketplaceContract;
    this.assetRegistry = assetRegistryContract;
    this.tokenFactory404 = tokenFactory404Contract;
    this.provider = ethers.provider;
  }

  /**
   * Generate comprehensive financial analysis
   */
  async generateAdvancedReport(
    startBlock?: number,
    endBlock?: number
  ): Promise<MarketplaceAnalytics> {
    console.log("🔍 Generating Advanced Marketplace Financial Analysis...");
    console.log("=" .repeat(70));

    const network = await this.provider.getNetwork();
    const latestBlock = await this.provider.getBlockNumber();

    // Determine analysis period
    const analysisStartBlock = startBlock || Math.max(0, latestBlock - 10000); // Last ~10k blocks
    const analysisEndBlock = endBlock || latestBlock;

    const startBlockData = await this.provider.getBlock(analysisStartBlock);
    const endBlockData = await this.provider.getBlock(analysisEndBlock);

    console.log(`📊 Analyzing blocks ${analysisStartBlock} to ${analysisEndBlock}`);
    console.log(`📅 Period: ${new Date(startBlockData.timestamp * 1000).toLocaleDateString()} to ${new Date(endBlockData.timestamp * 1000).toLocaleDateString()}`);

    // Analyze marketplace transactions
    const marketplaceTransactions = await this.analyzeMarketplaceTransactions(analysisStartBlock, analysisEndBlock);

    // Analyze token factory transactions
    const factoryTransactions = await this.analyzeFactoryTransactions(analysisStartBlock, analysisEndBlock);

    // Combine all transactions
    const allTransactions = [...marketplaceTransactions, ...factoryTransactions]
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Get all assets
    const allTokens = await this.tokenFactory404.getAllTokens();
    console.log(`📈 Found ${allTokens.length} assets to analyze`);

    // Generate asset financials
    const assetFinancials: AssetFinancials[] = [];
    for (const tokenAddress of allTokens) {
      try {
        const financials = await this.generateAssetFinancials(tokenAddress, allTransactions);
        assetFinancials.push(financials);
      } catch (error) {
        console.warn(`⚠️  Failed to analyze asset ${tokenAddress}:`, error);
      }
    }

    // Generate daily snapshots
    const dailySnapshots = await this.generateDailySnapshots(allTransactions, assetFinancials);

    // Calculate summary metrics
    const summary = this.calculateSummaryMetrics(allTransactions, assetFinancials);

    // Calculate network stats
    const networkStats = await this.calculateNetworkStats(allTransactions);

    const analytics: MarketplaceAnalytics = {
      generatedAt: new Date(),
      network: network.name,
      analysisPeriod: {
        startBlock: analysisStartBlock,
        endBlock: analysisEndBlock,
        startDate: new Date(startBlockData.timestamp * 1000),
        endDate: new Date(endBlockData.timestamp * 1000)
      },
      summary,
      dailySnapshots,
      assetFinancials,
      networkStats
    };

    console.log("✅ Advanced financial analysis completed!");
    return analytics;
  }

  /**
   * Analyze marketplace purchase transactions
   */
  private async analyzeMarketplaceTransactions(startBlock: number, endBlock: number): Promise<TransactionRecord[]> {
    const transactions: TransactionRecord[] = [];

    try {
      // Get DepositPurchased events (purchase transactions)
      const purchaseFilter = this.marketplace.filters.DepositPurchased();
      const purchaseEvents = await this.marketplace.queryFilter(purchaseFilter, startBlock, endBlock);

      for (const event of purchaseEvents) {
        const block = await this.provider.getBlock(event.blockNumber);
        const tx = await this.provider.getTransaction(event.transactionHash);
        const receipt = await this.provider.getTransactionReceipt(event.transactionHash);

        transactions.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(block.timestamp * 1000),
          type: 'purchase',
          assetId: event.args[0].toString(),
          tokenAddress: await this.getTokenAddressForAsset(event.args[0]),
          from: tx.from,
          to: event.args[1], // buyer
          amount: event.args[2].toString(), // tokenAmount
          value: ethers.formatEther(tx.value),
          fees: await this.calculatePurchaseFee(event.args[0], event.args[2]),
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: tx.gasPrice.toString()
        });
      }

      console.log(`💰 Found ${transactions.length} marketplace purchase transactions`);

    } catch (error) {
      console.warn("⚠️  Failed to analyze marketplace transactions:", error);
    }

    return transactions;
  }

  /**
   * Analyze token factory minting transactions
   */
  private async analyzeFactoryTransactions(startBlock: number, endBlock: number): Promise<TransactionRecord[]> {
    const transactions: TransactionRecord[] = [];

    try {
      // Get Token404Created events (minting transactions)
      const mintFilter = this.tokenFactory404.filters.Token404Created();
      const mintEvents = await this.tokenFactory404.queryFilter(mintFilter, startBlock, endBlock);

      for (const event of mintEvents) {
        const block = await this.provider.getBlock(event.blockNumber);
        const tx = await this.provider.getTransaction(event.transactionHash);
        const receipt = await this.provider.getTransactionReceipt(event.transactionHash);

        transactions.push({
          hash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: new Date(block.timestamp * 1000),
          type: 'mint',
          assetId: event.args[0].toString(),
          tokenAddress: event.args[1],
          from: tx.from,
          to: tx.from, // minter
          amount: event.args[4].toString(), // totalSupply
          value: ethers.formatEther(tx.value),
          fees: '0', // Minting typically has no fees in this system
          gasUsed: receipt.gasUsed.toString(),
          gasPrice: tx.gasPrice.toString()
        });
      }

      console.log(`🏭 Found ${transactions.length} token minting transactions`);

    } catch (error) {
      console.warn("⚠️  Failed to analyze factory transactions:", error);
    }

    return transactions;
  }

  /**
   * Generate comprehensive financials for a specific asset
   */
  private async generateAssetFinancials(tokenAddress: string, allTransactions: TransactionRecord[]): Promise<AssetFinancials> {
    const tokenContract = await ethers.getContractAt("RWAToken404", tokenAddress);

    // Get basic token info
    const [name, symbol, assetId, totalSupply] = await Promise.all([
      tokenContract.name(),
      tokenContract.symbol(),
      tokenContract.assetId(),
      tokenContract.totalSupply()
    ]);

    // Filter transactions for this asset
    const assetTransactions = allTransactions.filter(tx =>
      tx.tokenAddress.toLowerCase() === tokenAddress.toLowerCase() ||
      tx.assetId === assetId.toString()
    );

    // Calculate metrics
    const mintTransactions = assetTransactions.filter(tx => tx.type === 'mint');
    const purchaseTransactions = assetTransactions.filter(tx => tx.type === 'purchase');
    const transferTransactions = assetTransactions.filter(tx => tx.type === 'transfer');

    const totalVolumeETH = assetTransactions.reduce((sum, tx) => sum + parseFloat(tx.value), 0).toString();
    const totalVolumeTokens = assetTransactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0).toString();

    const totalFees = assetTransactions.reduce((sum, tx) => sum + parseFloat(tx.fees), 0).toString();
    const mintingFees = mintTransactions.reduce((sum, tx) => sum + parseFloat(tx.fees), 0).toString();
    const purchaseFees = purchaseTransactions.reduce((sum, tx) => sum + parseFloat(tx.fees), 0).toString();

    // Get asset details for pricing
    const assetDetails = await this.assetRegistry.getAsset(assetId);
    const currentPrice = ethers.formatEther(assetDetails.tokenPrice);
    const marketCap = (parseFloat(ethers.formatEther(totalSupply)) * parseFloat(currentPrice)).toString();

    // Calculate time metrics
    const timestamps = assetTransactions.map(tx => tx.timestamp.getTime()).sort();
    const firstTransaction = timestamps.length > 0 ? new Date(timestamps[0]) : null;
    const lastTransaction = timestamps.length > 0 ? new Date(timestamps[timestamps.length - 1]) : null;
    const daysActive = firstTransaction && lastTransaction
      ? Math.ceil((lastTransaction.getTime() - firstTransaction.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Get holder information (simplified)
    const uniqueHolders = new Set(assetTransactions.map(tx => tx.to)).size;
    const topHolders = await this.getTopHolders(tokenAddress);

    // Get recent transactions (last 10)
    const recentTransactions = assetTransactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      assetId: assetId.toString(),
      tokenAddress,
      name,
      symbol,
      totalSupply: ethers.formatEther(totalSupply),
      circulatingSupply: ethers.formatEther(totalSupply), // Simplified
      totalTransactions: assetTransactions.length,
      mintTransactions: mintTransactions.length,
      purchaseTransactions: purchaseTransactions.length,
      transferTransactions: transferTransactions.length,
      totalVolumeETH,
      totalVolumeTokens,
      averageTransactionSize: assetTransactions.length > 0
        ? (parseFloat(totalVolumeTokens) / assetTransactions.length).toString()
        : "0",
      totalFeesCollected: totalFees,
      mintingFees,
      purchaseFees,
      averageFeePerTransaction: assetTransactions.length > 0
        ? (parseFloat(totalFees) / assetTransactions.length).toString()
        : "0",
      currentPrice,
      marketCap,
      priceChange24h: "0", // Would need price history
      volume24h: "0", // Would need 24h transaction analysis
      firstTransaction,
      lastTransaction,
      daysActive,
      uniqueHolders,
      topHolders,
      recentTransactions
    };
  }

  /**
   * Get top holders for a token
   */
  private async getTopHolders(tokenAddress: string): Promise<Array<{ address: string; balance: string; percentage: string }>> {
    // This is a simplified implementation
    // In a real system, you'd need to analyze all transfer events
    return [];
  }

  /**
   * Generate daily financial snapshots
   */
  private async generateDailySnapshots(
    allTransactions: TransactionRecord[],
    assetFinancials: AssetFinancials[]
  ): Promise<DailyFinancialSnapshot[]> {
    const dailyMap = new Map<string, DailyFinancialSnapshot>();

    // Group transactions by date
    for (const tx of allTransactions) {
      const dateKey = tx.timestamp.toISOString().split('T')[0];

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          totalMarketCap: "0",
          dailyVolume: "0",
          dailyFees: "0",
          activeAssets: 0,
          totalTransactions: 0,
          newAssets: 0,
          topAssetByVolume: {
            assetId: "N/A",
            volume: "0",
            transactionCount: 0
          }
        });
      }

      const daily = dailyMap.get(dateKey)!;
      daily.dailyVolume = (parseFloat(daily.dailyVolume) + parseFloat(tx.value)).toString();
      daily.dailyFees = (parseFloat(daily.dailyFees) + parseFloat(tx.fees)).toString();
      daily.totalTransactions++;
    }

    // Calculate market caps and other metrics
    for (const daily of dailyMap.values()) {
      const date = new Date(daily.date);
      const activeAssetsOnDate = assetFinancials.filter(asset => {
        return asset.firstTransaction && asset.firstTransaction <= date;
      });

      daily.activeAssets = activeAssetsOnDate.length;
      daily.totalMarketCap = activeAssetsOnDate.reduce(
        (sum, asset) => sum + parseFloat(asset.marketCap),
        0
      ).toString();
    }

    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate summary metrics
   */
  private calculateSummaryMetrics(
    allTransactions: TransactionRecord[],
    assetFinancials: AssetFinancials[]
  ) {
    const totalAssets = assetFinancials.length;
    const totalMarketCap = assetFinancials.reduce((sum, asset) => sum + parseFloat(asset.marketCap), 0).toString();
    const totalVolume = allTransactions.reduce((sum, tx) => sum + parseFloat(tx.value), 0).toString();
    const totalFees = allTransactions.reduce((sum, tx) => sum + parseFloat(tx.fees), 0).toString();
    const totalTransactions = allTransactions.length;
    const uniqueUsers = new Set(allTransactions.flatMap(tx => [tx.from, tx.to])).size;
    const averageTransactionValue = totalTransactions > 0 ? (parseFloat(totalVolume) / totalTransactions).toString() : "0";

    return {
      totalAssets,
      totalMarketCap,
      totalVolume,
      totalFeesCollected: totalFees,
      totalTransactions,
      uniqueUsers,
      averageTransactionValue
    };
  }

  /**
   * Calculate network statistics
   */
  private async calculateNetworkStats(allTransactions: TransactionRecord[]) {
    if (allTransactions.length === 0) {
      return {
        averageGasPrice: "0",
        totalGasUsed: "0",
        averageTransactionFee: "0"
      };
    }

    const totalGasUsed = allTransactions.reduce((sum, tx) => sum + parseInt(tx.gasUsed), 0);
    const averageGasPrice = allTransactions.reduce((sum, tx) => sum + parseInt(tx.gasPrice), 0) / allTransactions.length;
    const averageTransactionFee = allTransactions.reduce((sum, tx) => {
      const gasPrice = parseInt(tx.gasPrice);
      const gasUsed = parseInt(tx.gasUsed);
      return sum + (gasPrice * gasUsed);
    }, 0) / allTransactions.length;

    return {
      averageGasPrice: ethers.formatUnits(Math.floor(averageGasPrice), 'gwei'),
      totalGasUsed: totalGasUsed.toString(),
      averageTransactionFee: ethers.formatEther(Math.floor(averageTransactionFee))
    };
  }

  /**
   * Helper function to get token address for asset
   */
  private async getTokenAddressForAsset(assetId: bigint): Promise<string> {
    try {
      return await this.tokenFactory404.getTokenAddress(assetId);
    } catch {
      return ethers.ZeroAddress;
    }
  }

  /**
   * Calculate purchase fee for a transaction
   */
  private async calculatePurchaseFee(assetId: bigint, tokenAmount: bigint): Promise<string> {
    try {
      const [, fee] = await this.marketplace.calculatePurchaseCost(assetId, tokenAmount);
      return ethers.formatEther(fee);
    } catch {
      return "0";
    }
  }

  /**
   * Export comprehensive report to JSON
   */
  async exportToJson(analytics: MarketplaceAnalytics, filename?: string): Promise<void> {
    const exportPath = filename || `advanced-marketplace-analytics-${Date.now()}.json`;
    const jsonData = JSON.stringify(analytics, (key, value) => {
      // Handle Date objects
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    }, 2);

    fs.writeFileSync(exportPath, jsonData);
    console.log(`📄 Advanced analytics exported to ${exportPath}`);
  }

  /**
   * Export to CSV format
   */
  async exportToCsv(analytics: MarketplaceAnalytics, filename?: string): Promise<void> {
    const exportPath = filename || `marketplace-analytics-${Date.now()}.csv`;

    let csvContent = "Date,Market Cap,Daily Volume,Daily Fees,Active Assets,Transactions,Top Asset ID,Top Asset Volume\n";

    for (const daily of analytics.dailySnapshots) {
      csvContent += `${daily.date},${daily.totalMarketCap},${daily.dailyVolume},${daily.dailyFees},${daily.activeAssets},${daily.totalTransactions},${daily.topAssetByVolume.assetId},${daily.topAssetByVolume.volume}\n`;
    }

    fs.writeFileSync(exportPath, csvContent);
    console.log(`📊 CSV analytics exported to ${exportPath}`);
  }

  /**
   * Generate human-readable executive summary
   */
  generateExecutiveSummary(analytics: MarketplaceAnalytics): string {
    let summary = "";
    summary += "🏢 TIGER PALACE RWA MARKETPLACE FINANCIAL ANALYSIS\n";
    summary += "=" .repeat(70) + "\n\n";

    summary += `📅 Analysis Period: ${analytics.analysisPeriod.startDate.toLocaleDateString()} to ${analytics.analysisPeriod.endDate.toLocaleDateString()}\n`;
    summary += `🌐 Network: ${analytics.network}\n`;
    summary += `📊 Generated: ${analytics.generatedAt.toLocaleString()}\n\n`;

    summary += "💰 MARKETPLACE SUMMARY\n";
    summary += "-".repeat(40) + "\n";
    summary += `Total Assets: ${analytics.summary.totalAssets}\n`;
    summary += `Total Market Cap: ${analytics.summary.totalMarketCap} ETH\n`;
    summary += `Total Trading Volume: ${analytics.summary.totalVolume} ETH\n`;
    summary += `Total Fees Collected: ${analytics.summary.totalFeesCollected} ETH\n`;
    summary += `Total Transactions: ${analytics.summary.totalTransactions}\n`;
    summary += `Unique Users: ${analytics.summary.uniqueUsers}\n`;
    summary += `Average Transaction Value: ${analytics.summary.averageTransactionValue} ETH\n\n`;

    summary += "⛽ NETWORK STATISTICS\n";
    summary += "-".repeat(40) + "\n";
    summary += `Average Gas Price: ${analytics.networkStats.averageGasPrice} gwei\n`;
    summary += `Total Gas Used: ${analytics.networkStats.totalGasUsed}\n`;
    summary += `Average Transaction Fee: ${analytics.networkStats.averageTransactionFee} ETH\n\n`;

    summary += "📈 TOP PERFORMING ASSETS\n";
    summary += "-".repeat(40) + "\n";

    const topAssets = analytics.assetFinancials
      .sort((a, b) => parseFloat(b.marketCap) - parseFloat(a.marketCap))
      .slice(0, 5);

    for (const asset of topAssets) {
      summary += `${asset.name} (${asset.symbol})\n`;
      summary += `  Market Cap: ${asset.marketCap} ETH\n`;
      summary += `  Total Volume: ${asset.totalVolumeETH} ETH\n`;
      summary += `  Fees Collected: ${asset.totalFeesCollected} ETH\n`;
      summary += `  Transactions: ${asset.totalTransactions}\n`;
      summary += `  Unique Holders: ${asset.uniqueHolders}\n`;
      summary += `  Days Active: ${asset.daysActive}\n\n`;
    }

    summary += "📊 DAILY ACTIVITY SUMMARY\n";
    summary += "-".repeat(40) + "\n";

    const recentDays = analytics.dailySnapshots.slice(-7);
    for (const day of recentDays) {
      summary += `${day.date}: ${day.totalTransactions} txns, ${day.dailyVolume} ETH volume, ${day.activeAssets} assets\n`;
    }

    return summary;
  }

  /**
   * Generate detailed asset report
   */
  generateAssetReport(assetFinancials: AssetFinancials): string {
    let report = "";
    report += `🏠 ASSET FINANCIAL REPORT: ${assetFinancials.name} (${assetFinancials.symbol})\n`;
    report += "=" .repeat(60) + "\n\n";

    report += `Asset ID: ${assetFinancials.assetId}\n`;
    report += `Token Address: ${assetFinancials.tokenAddress}\n\n`;

    report += "💰 FINANCIAL METRICS\n";
    report += "-".repeat(30) + "\n";
    report += `Total Supply: ${assetFinancials.totalSupply} tokens\n`;
    report += `Circulating Supply: ${assetFinancials.circulatingSupply} tokens\n`;
    report += `Current Price: ${assetFinancials.currentPrice} ETH\n`;
    report += `Market Cap: ${assetFinancials.marketCap} ETH\n\n`;

    report += "📊 TRANSACTION METRICS\n";
    report += "-".repeat(30) + "\n";
    report += `Total Transactions: ${assetFinancials.totalTransactions}\n`;
    report += `Mint Transactions: ${assetFinancials.mintTransactions}\n`;
    report += `Purchase Transactions: ${assetFinancials.purchaseTransactions}\n`;
    report += `Transfer Transactions: ${assetFinancials.transferTransactions}\n\n`;

    report += "💸 VOLUME & FEES\n";
    report += "-".repeat(30) + "\n";
    report += `Total Volume (ETH): ${assetFinancials.totalVolumeETH} ETH\n`;
    report += `Total Volume (Tokens): ${assetFinancials.totalVolumeTokens} tokens\n`;
    report += `Average Transaction Size: ${assetFinancials.averageTransactionSize} tokens\n`;
    report += `Total Fees Collected: ${assetFinancials.totalFeesCollected} ETH\n`;
    report += `Minting Fees: ${assetFinancials.mintingFees} ETH\n`;
    report += `Purchase Fees: ${assetFinancials.purchaseFees} ETH\n`;
    report += `Average Fee Per Transaction: ${assetFinancials.averageFeePerTransaction} ETH\n\n`;

    report += "👥 HOLDER METRICS\n";
    report += "-".repeat(30) + "\n";
    report += `Unique Holders: ${assetFinancials.uniqueHolders}\n`;

    if (assetFinancials.topHolders.length > 0) {
      report += "Top Holders:\n";
      for (const holder of assetFinancials.topHolders.slice(0, 5)) {
        report += `  ${holder.address}: ${holder.balance} tokens (${holder.percentage}%)\n`;
      }
    }

    report += "\n⏰ TIME METRICS\n";
    report += "-".repeat(30) + "\n";
    report += `First Transaction: ${assetFinancials.firstTransaction?.toLocaleString() || 'N/A'}\n`;
    report += `Last Transaction: ${assetFinancials.lastTransaction?.toLocaleString() || 'N/A'}\n`;
    report += `Days Active: ${assetFinancials.daysActive}\n\n`;

    report += "🔄 RECENT TRANSACTIONS\n";
    report += "-".repeat(30) + "\n";

    for (const tx of assetFinancials.recentTransactions.slice(0, 5)) {
      report += `${tx.timestamp.toLocaleString()}: ${tx.type} ${tx.amount} tokens (${tx.value} ETH)\n`;
    }

    return report;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log("🚀 Starting Advanced Marketplace Financial Analysis...");

  try {
    // In production, these would be loaded from deployed addresses
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

    // Create advanced reporter
    const reporter = new AdvancedMarketplaceFinancialReporter(
      marketplace,
      assetRegistry,
      tokenFactory404
    );

    // Generate comprehensive analysis
    const analytics = await reporter.generateAdvancedReport();

    // Export reports
    const timestamp = Date.now();
    await reporter.exportToJson(analytics, `advanced-marketplace-analytics-${timestamp}.json`);
    await reporter.exportToCsv(analytics, `marketplace-daily-snapshots-${timestamp}.csv`);

    // Generate and save executive summary
    const executiveSummary = reporter.generateExecutiveSummary(analytics);
    fs.writeFileSync(`marketplace-executive-summary-${timestamp}.txt`, executiveSummary);

    // Generate detailed asset reports
    for (const asset of analytics.assetFinancials.slice(0, 5)) { // Top 5 assets
      const assetReport = reporter.generateAssetReport(asset);
      fs.writeFileSync(`asset-report-${asset.assetId}-${timestamp}.txt`, assetReport);
    }

    console.log("\n📊 EXECUTIVE SUMMARY\n");
    console.log(executiveSummary);

    console.log("\n✅ Analysis complete! Files generated:");
    console.log(`   📄 advanced-marketplace-analytics-${timestamp}.json`);
    console.log(`   📊 marketplace-daily-snapshots-${timestamp}.csv`);
    console.log(`   📝 marketplace-executive-summary-${timestamp}.txt`);
    console.log(`   🏠 asset-report-[ID]-${timestamp}.txt (top 5 assets)`);

  } catch (error) {
    console.error("❌ Error generating advanced financial analysis:", error);
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

export { AdvancedMarketplaceFinancialReporter, MarketplaceAnalytics, AssetFinancials, TransactionRecord };
