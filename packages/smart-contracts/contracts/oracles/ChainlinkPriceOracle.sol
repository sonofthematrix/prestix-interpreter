// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Chainlink AggregatorV3Interface - simplified version for compatibility
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
    function description() external view returns (string memory);
    function version() external view returns (uint256);
    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
}

/**
 * @title ChainlinkPriceOracle
 * @dev Wrapper for Chainlink price feeds to convert ETH prices to payment tokens
 * @author Tokenizin
 */
contract ChainlinkPriceOracle {
    // Sepolia Chainlink Price Feed Addresses
    // ETH/USD: 0x694AA1769357215DE4FAC081bf1f309aDC325306
    // USDC/USD: Not available on Sepolia (use ETH/USD and assume 1:1 for USDC)
    // EURC/USD: Not available on Sepolia (use ETH/USD and assume 1:1 for EURC)
    
    AggregatorV3Interface public immutable ethUsdPriceFeed;
    
    // For Sepolia, we'll use ETH/USD and assume stablecoins are 1:1 with USD
    // In production, use actual USDC/USD and EURC/USD feeds
    uint256 private constant STABLECOIN_DECIMALS = 6; // USDC/EURC use 6 decimals
    uint256 private constant ETH_DECIMALS = 18;
    uint256 private constant PRICE_FEED_DECIMALS = 8; // Chainlink feeds use 8 decimals
    
    constructor(address _ethUsdPriceFeed) {
        require(_ethUsdPriceFeed != address(0), "ChainlinkPriceOracle: invalid price feed");
        ethUsdPriceFeed = AggregatorV3Interface(_ethUsdPriceFeed);
    }
    
    /**
     * @dev Get latest ETH/USD price from Chainlink
     */
    function getEthUsdPrice() public view returns (uint256) {
        (
            uint80 roundId,
            int256 price,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        ) = ethUsdPriceFeed.latestRoundData();
        
        require(price > 0, "ChainlinkPriceOracle: invalid price");
        require(updatedAt > 0, "ChainlinkPriceOracle: price feed stale");
        require(block.timestamp - updatedAt < 24 hours, "ChainlinkPriceOracle: price feed too old");
        
        // Price is in 8 decimals, convert to 18 decimals
        return uint256(price) * 10**(ETH_DECIMALS - PRICE_FEED_DECIMALS);
    }
    
    /**
     * @dev Convert ETH amount to USDC amount using Chainlink price feed
     * @param ethAmount Amount in ETH (wei, 18 decimals)
     * @return usdcAmount Amount in USDC (6 decimals)
     */
    function convertEthToUsdc(uint256 ethAmount) external view returns (uint256) {
        uint256 ethUsdPrice = getEthUsdPrice();
        // ethAmount (18 decimals) * ethUsdPrice (18 decimals) / 10^18 = USD amount (18 decimals)
        uint256 usdAmount = (ethAmount * ethUsdPrice) / 10**ETH_DECIMALS;
        // Convert to USDC (6 decimals): usdAmount (18 decimals) / 10^12 = USDC (6 decimals)
        return usdAmount / 10**(ETH_DECIMALS - STABLECOIN_DECIMALS);
    }
    
    /**
     * @dev Convert USDC amount to ETH amount using Chainlink price feed
     * @param usdcAmount Amount in USDC (6 decimals)
     * @return ethAmount Amount in ETH (wei, 18 decimals)
     */
    function convertUsdcToEth(uint256 usdcAmount) external view returns (uint256) {
        uint256 ethUsdPrice = getEthUsdPrice();
        // usdcAmount (6 decimals) * 10^12 = USD amount (18 decimals)
        uint256 usdAmount = usdcAmount * 10**(ETH_DECIMALS - STABLECOIN_DECIMALS);
        // USD amount (18 decimals) * 10^18 / ethUsdPrice (18 decimals) = ETH amount (18 decimals)
        return (usdAmount * 10**ETH_DECIMALS) / ethUsdPrice;
    }
    
    /**
     * @dev Convert ETH amount to EURC amount using Chainlink price feed
     * @param ethAmount Amount in ETH (wei, 18 decimals)
     * @return eurcAmount Amount in EURC (6 decimals)
     */
    function convertEthToEurc(uint256 ethAmount) external view returns (uint256) {
        // For now, use same conversion as USDC (1 USD = 1 EURC for testing)
        // In production, use EURC/USD feed or EUR/USD feed
        uint256 ethUsdPrice = getEthUsdPrice();
        // ethAmount (18 decimals) * ethUsdPrice (18 decimals) / 10^18 = USD amount (18 decimals)
        uint256 usdAmount = (ethAmount * ethUsdPrice) / 10**ETH_DECIMALS;
        // Convert to EURC (6 decimals): usdAmount (18 decimals) / 10^12 = EURC (6 decimals)
        return usdAmount / 10**(ETH_DECIMALS - STABLECOIN_DECIMALS);
    }
    
    /**
     * @dev Convert EURC amount to ETH amount using Chainlink price feed
     * @param eurcAmount Amount in EURC (6 decimals)
     * @return ethAmount Amount in ETH (wei, 18 decimals)
     */
    function convertEurcToEth(uint256 eurcAmount) external view returns (uint256) {
        // For now, use same conversion as USDC
        uint256 ethUsdPrice = getEthUsdPrice();
        // eurcAmount (6 decimals) * 10^12 = USD amount (18 decimals)
        uint256 usdAmount = eurcAmount * 10**(ETH_DECIMALS - STABLECOIN_DECIMALS);
        // USD amount (18 decimals) * 10^18 / ethUsdPrice (18 decimals) = ETH amount (18 decimals)
        return (usdAmount * 10**ETH_DECIMALS) / ethUsdPrice;
    }
}

