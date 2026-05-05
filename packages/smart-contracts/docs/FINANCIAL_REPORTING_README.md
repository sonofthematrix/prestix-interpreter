# 🏢 Marketplace Financial Reporting System

Comprehensive financial reporting and analytics system for the Tiger Palace RWA Marketplace, providing detailed insights into token valuations, fee collections, and market performance.

## 📊 Overview

The financial reporting system provides three levels of analysis:

1. **Basic Financial Reports** - Daily balance snapshots and fee summaries
2. **Advanced Analytics** - Transaction-level analysis with blockchain data
3. **Real-time Dashboard** - Live monitoring with periodic updates

## 🚀 Quick Start

### Basic Financial Report
```bash
# Generate basic financial report
bun run report:financial

# Output files:
# - marketplace-financial-report-[timestamp].json
# - marketplace-financial-report-[timestamp].csv
# - marketplace-summary-[timestamp].txt
```

### Advanced Analytics Report
```bash
# Generate comprehensive blockchain analysis
bun run report:financial:advanced

# Output files:
# - advanced-marketplace-analytics-[timestamp].json
# - marketplace-daily-snapshots-[timestamp].csv
# - marketplace-executive-summary-[timestamp].txt
# - asset-report-[assetId]-[timestamp].txt (per asset)
```

### Live Dashboard
```bash
# Start real-time dashboard (updates every 30 seconds)
bun run dashboard

# Press Ctrl+C to stop
```

## 📈 Report Types

### 1. Basic Financial Report (`marketplace-financial-report.ts`)

Provides daily running balances and fee summaries:

- **Treasury Balance** - Current ETH balance in marketplace treasury
- **Fee Collections** - Total fees collected over time
- **Market Cap Tracking** - Daily valuation of all RWA tokens
- **Asset Performance** - Individual token metrics and KPIs
- **Export Formats** - JSON, CSV, and human-readable text

#### Sample Output:
```
🏢 TIGER PALACE RWA MARKETPLACE FINANCIAL REPORT
============================================================

📅 Generated: 11/30/2025, 1:33:09 PM
🌐 Network: hardhat
🏪 Marketplace: 0xB9bcC66DcE89F6c4bfb03ed8a9E6EF7d447F2061

💰 TREASURY SUMMARY
Current Balance: 0.0 ETH
Total Fees Ever: 0.0 ETH

📊 MARKET SUMMARY
Active Assets: 0
Total Market Cap: 0 ETH
Total Fees Collected: 0 ETH
```

### 2. Advanced Analytics (`advanced-marketplace-financial-report.ts`)

Deep blockchain analysis including:

- **Transaction Analysis** - Every marketplace transaction with gas costs
- **Fee Breakdown** - Minting vs. purchase fees per asset
- **Holder Analytics** - Token distribution and top holders
- **Network Health** - Gas prices, block times, TPS
- **Historical Trends** - Price changes, volume analysis
- **Asset Performance** - Detailed per-token financials

#### Key Metrics Tracked:
- Transaction volume and frequency
- Fee collection efficiency
- Token holder distribution
- Market capitalization trends
- Network performance metrics

### 3. Real-time Dashboard (`marketplace-dashboard.ts`)

Live monitoring interface:

- **Market Overview** - Total assets, market cap, 24h volume
- **Top Assets** - Leaderboard by market capitalization
- **Fee Analytics** - Collection trends and projections
- **Network Health** - Gas prices and transaction throughput
- **Auto-updates** - Refreshes every 30 seconds

#### Dashboard Features:
```
🏢 TIGER PALACE RWA MARKETPLACE DASHBOARD
📅 11/30/2025, 1:33:09 PM
============================================================

📊 MARKET OVERVIEW
Total Assets:        5
Total Market Cap:    125.50 ETH
24h Volume:         12.30 ETH
24h Fees:           0.31 ETH

🏆 TOP ASSETS BY MARKET CAP
Rank  Symbol    Name                Market Cap    24h Vol
1     MLA       Miami Luxury Apt     45.20        5.20
2     BEV       Beachfront Villa     32.10        3.80
```

## 📊 Data Sources

### Blockchain Data
- **Marketplace Transactions** - Purchase events with fees
- **Token Factory Events** - Minting transactions
- **Asset Registry** - Property valuations and metadata
- **Treasury Balances** - Fee collection tracking

### Calculated Metrics
- **Market Capitalization** - Token supply × current price
- **Fee Efficiency** - Fees collected vs. transaction volume
- **Holder Concentration** - Gini coefficient of token distribution
- **Network Costs** - Average gas fees per transaction

## 🔧 Configuration

### Contract Addresses
Reports automatically detect deployed contracts from `deployed-addresses-proxy.json`:

```json
{
  "network": "sepolia",
  "addresses": {
    "RWAMarketplace": "0xB9bcC66DcE89F6c4bfb03ed8a9E6EF7d447F2061",
    "RWAAssetRegistry": "0xf499a41F3dAeC24dae0a4E40dC965dB89E28fb28",
    "RWATokenFactory404": "0x7a6f7dE826064903f2e419833b9633560217FEe2"
  }
}
```

### Analysis Period
- **Basic Reports**: Last 30 days of data
- **Advanced Reports**: Configurable block range analysis
- **Dashboard**: Rolling 24-hour windows

## 📁 Output Files

### Basic Report Files
- `marketplace-financial-report-[timestamp].json` - Complete structured data
- `marketplace-financial-report-[timestamp].csv` - Spreadsheet-compatible data
- `marketplace-summary-[timestamp].txt` - Human-readable executive summary

### Advanced Analytics Files
- `advanced-marketplace-analytics-[timestamp].json` - Comprehensive blockchain analysis
- `marketplace-daily-snapshots-[timestamp].csv` - Daily aggregated metrics
- `marketplace-executive-summary-[timestamp].txt` - Executive-level insights
- `asset-report-[assetId]-[timestamp].txt` - Individual asset deep-dive

### Dashboard
- **Console Output**: Real-time terminal display
- **No persistent files**: Designed for live monitoring

## 🎯 Use Cases

### For Marketplace Operators
- **Revenue Tracking** - Monitor fee collection and treasury growth
- **Asset Performance** - Identify top-performing RWA tokens
- **Market Health** - Track overall marketplace activity and user engagement

### For Investors
- **Token Valuation** - Historical price and market cap analysis
- **Fee Transparency** - Understand platform costs and fee structures
- **Risk Assessment** - Analyze token holder concentration and liquidity

### For Developers
- **Transaction Analysis** - Debug marketplace interactions and gas costs
- **Performance Monitoring** - Track contract efficiency and network health
- **Data Export** - Structured data for further analysis and reporting

## 🔒 Security Considerations

- **Read-Only Operations** - Reports only query blockchain data, no transactions
- **No Private Keys** - Uses default Hardhat/Infura providers
- **Data Validation** - All calculations include error handling and fallbacks
- **Rate Limiting** - Respects RPC provider limits with configurable delays

## 🚨 Error Handling

The reporting system includes comprehensive error handling:

- **Network Issues** - Automatic retries and fallback data
- **Contract Changes** - Graceful degradation when contracts lack expected methods
- **Data Gaps** - Placeholder values for missing historical data
- **Export Failures** - Continues operation even if file writes fail

## 📈 Future Enhancements

### Planned Features
- **Price Oracles** - Integration with Chainlink for accurate valuations
- **Yield Analytics** - Track staking rewards and dividend distributions
- **Cross-Chain Support** - Multi-network marketplace analysis
- **API Endpoints** - REST API for programmatic access
- **Email Reports** - Automated daily/weekly report delivery

### Integration Opportunities
- **Frontend Dashboards** - Real-time data feeds for DApps
- **Trading Interfaces** - Live price and volume data
- **Portfolio Trackers** - Individual user investment analytics
- **Risk Management** - Automated alerts for market anomalies

## 🆘 Troubleshooting

### Common Issues

**"No deployed addresses found"**
- Ensure `deployed-addresses-proxy.json` exists and contains valid addresses
- Run contract deployment first: `bun run deploy:sepolia`

**"Failed to analyze marketplace transactions"**
- Check network connectivity and RPC provider
- Verify contract addresses are correct for the network

**"Empty reports generated"**
- No marketplace activity yet - reports will populate as transactions occur
- Check if contracts are properly initialized

**"Dashboard not updating"**
- Check network connection
- Verify RPC provider supports WebSocket connections
- Restart dashboard if updates stop

### Debug Mode
Enable verbose logging by setting environment variable:
```bash
DEBUG=marketplace:* bun run report:financial
```

## 📞 Support

For issues with the financial reporting system:

1. Check the troubleshooting section above
2. Verify contract deployments are current
3. Ensure network connectivity and RPC access
4. Review generated log files for specific error messages

The system is designed to be robust and provide meaningful reports even with partial data availability.
