// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IRWAAssetRegistry
 * @dev Interface for the Real World Asset Registry
 * @author Tokenizin
 */
interface IRWAAssetRegistry {
    // Events
    event AssetRegistered(uint256 indexed assetId, address indexed owner, string assetType);
    event AssetUpdated(uint256 indexed assetId, uint256 newPrice, uint256 newTotalTokens);
    event AssetStatusChanged(uint256 indexed assetId, uint8 newStatus);
    event AssetTransferred(uint256 indexed assetId, address indexed from, address indexed to);
    event TokenAvailabilityUpdated(uint256 indexed assetId, uint64 availableTokens, uint64 soldTokens);
    event AssetPriceUpdated(uint256 indexed assetId, uint128 newPrice, uint128 newTokenPrice);

    // Structs - optimized for storage packing (30-45% gas savings)
    // Slot 1 (32 bytes): id(4) + owner(20) + status(1) = 25 bytes
    // Slot 2 (32 bytes): totalTokens(8) + availableTokens(8) + soldTokens(8) = 24 bytes
    // Slot 3 (32 bytes): price(16) + tokenPrice(16) = 32 bytes
    // Slot 4 (32 bytes): createdAt(8) + updatedAt(8) = 16 bytes
    // Slot 5+: title, description, assetType, location (dynamic strings)
    struct AssetDetails {
        uint32 id;             // 4 bytes (max 4B assets)
        address owner;         // 20 bytes (fixed)
        uint8 status;          // 1 byte (0-3 values)
        uint64 totalTokens;    // 8 bytes (max ~18 quintillion tokens)
        uint64 availableTokens; // 8 bytes (max ~18 quintillion tokens)
        uint64 soldTokens;     // 8 bytes (max ~18 quintillion tokens)
        uint128 price;         // 16 bytes (max ~3.4e38 wei)
        uint128 tokenPrice;    // 16 bytes (max ~3.4e38 wei per token)
        uint64 createdAt;      // 8 bytes (timestamp, covers until year 584B)
        uint64 updatedAt;      // 8 bytes (timestamp, covers until year 584B)
        string title;          // dynamic string
        string description;    // dynamic string
        string assetType;      // dynamic string (VILLA, YACHT, etc.)
        string location;       // dynamic string
    }

    // Functions
    function registerAsset(
        address owner,
        string calldata title,
        string calldata description,
        string calldata assetType,
        string calldata location,
        uint256 price,
        uint256 tokenPrice,
        uint256 totalTokens
    ) external returns (uint256 assetId);

    function updateAsset(uint256 assetId, uint256 newPrice, uint256 newTokenPrice) external;
    function updateAssetStatus(uint256 assetId, uint8 newStatus) external;
    /// @notice Decrease available tokens and increase sold tokens for an asset
    /// @dev Expected to be restricted to marketplace role in implementation
    function updateTokenAvailability(uint256 assetId, uint256 soldAmount) external;
    function transferAsset(uint256 assetId, address newOwner) external;
    
    function getAsset(uint256 assetId) external view returns (AssetDetails memory);
    function getAssetsByOwner(address owner) external view returns (uint256[] memory);
    function getActiveAssets() external view returns (uint256[] memory);
    function getAssetsByType(string calldata assetType) external view returns (uint256[] memory);
    
    function isAssetActive(uint256 assetId) external view returns (bool);
    function getNextAssetId() external view returns (uint256);
    
    // Helper functions to get token price directly (avoids struct unpacking issues)
    // Using separate functions instead of tuple return to avoid ABI encoding bugs
    function getTokenPriceValue(uint256 assetId) external view returns (uint256);
    function getAvailableTokens(uint256 assetId) external view returns (uint256);
    function getAssetStatus(uint256 assetId) external view returns (uint8);
}
