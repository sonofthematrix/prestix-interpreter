// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IRWAMarketplace
 * @dev Interface for the RWA Marketplace trading engine
 * @author Tokenizin
 */
interface IRWAMarketplace {
    // Events
    event TokensPurchased(
        uint256 indexed assetId,
        address indexed buyer,
        uint256 tokenAmount,
        uint256 totalCost,
        uint256 timestamp
    );
    
    event TokensListed(
        uint256 indexed listingId,
        uint256 indexed assetId,
        address indexed seller,
        uint256 tokenAmount,
        uint256 pricePerToken
    );
    
    event TokensSold(
        uint256 indexed listingId,
        uint256 indexed assetId,
        address indexed seller,
        address buyer,
        uint256 tokenAmount,
        uint256 totalPrice
    );
    
    event ListingCancelled(uint256 indexed listingId, address indexed seller);
    
    event MarketplaceFeeUpdated(uint256 newFeePercentage);
    
    event PaymentTokenUpdated(address indexed oldToken, address indexed newToken);

    // Structs
    struct Listing {
        uint256 id;
        uint256 assetId;
        address seller;
        uint256 tokenAmount;
        uint256 pricePerToken;
        bool active;
        uint256 createdAt;
    }

    struct PurchaseInfo {
        uint256 assetId;
        address buyer;
        uint256 tokenAmount;
        uint256 totalCost;
        uint256 marketplaceFee;
        uint256 timestamp;
    }

    // Functions
    function purchaseTokens(uint256 assetId, uint256 tokenAmount) external payable;
    
    function createListing(
        uint256 assetId,
        uint256 tokenAmount,
        uint256 pricePerToken
    ) external returns (uint256 listingId);
    
    function buyFromListing(uint256 listingId, uint256 tokenAmount) external payable;
    function cancelListing(uint256 listingId) external;
    
    function getActiveListing(uint256 listingId) external view returns (Listing memory);
    function getListingsByAsset(uint256 assetId) external view returns (Listing[] memory);
    function getListingsBySeller(address seller) external view returns (Listing[] memory);
    
    function calculatePurchaseCost(uint256 assetId, uint256 tokenAmount) 
        external view returns (uint256 totalCost, uint256 marketplaceFee);
    
    function getMarketplaceFee() external view returns (uint256);
    function setMarketplaceFee(uint256 newFeePercentage) external;
    
    function withdrawFees() external;
    function emergencyPause() external;
    function unpause() external;
}
