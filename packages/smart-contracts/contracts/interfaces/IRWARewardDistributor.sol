// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IRWARewardDistributor
 * @dev Interface for RewardDistributor contract
 * @author Tokenizin
 */
interface IRWARewardDistributor {
    /**
     * @dev Receive property dividends from RWA token contracts
     */
    function receivePropertyDividends(
        uint256 assetId,
        address tokenAddress,
        uint256 amount
    ) external;

    /**
     * @dev Record a dividend claim for a token holder
     */
    function recordDividendClaim(
        address tokenAddress,
        address holder,
        uint256 amount
    ) external;

    /**
     * @dev Distribute dividends to a token holder (called by staking contract)
     */
    function distributeDividendToStaker(
        address tokenAddress,
        address holder,
        uint256 amount
    ) external;

    /**
     * @dev Get claimable dividends for a token holder
     */
    function getClaimableDividends(
        address tokenAddress,
        address holder
    ) external view returns (uint256);

    /**
     * @dev Get dividend pool statistics for a token
     */
    function getTokenDividendStats(address tokenAddress) external view returns (
        uint256 totalAllocated,
        uint256 totalDistributed,
        uint256 available
    );

    /**
     * @dev Check if sufficient dividends are available for a token
     */
    function hasSufficientDividends(address tokenAddress, uint256 amount) external view returns (bool);

    /**
     * @dev Get token address for an asset ID
     */
    function getTokenAddressByAssetId(uint256 assetId) external view returns (address);
}

