// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IRWAMarketplace.sol";
import "../interfaces/IRWAAssetRegistry.sol";
import "../interfaces/IRWAToken.sol";
import "../interfaces/IRWAToken404.sol";
import "../core/RWATokenFactory.sol";

/**
 * @title RWAMarketplace
 * @dev Marketplace for trading RWA tokens with support for ETH and ERC20 (USDC) payments
 *
 * PRIMARY MARKET: Uses registry asset prices (assetRegistry.getAsset(assetId).tokenPrice)
 * SECONDARY MARKET: Uses listing prices (created by sellers)
 *
 * @notice All primary market purchases use REGISTRY PRICES, not listing prices
 * @notice Listings are for secondary market trading only
 * @author Tokenizin
 */
contract RWAMarketplace is IRWAMarketplace, AccessControl, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    // Roles
    bytes32 public constant MARKETPLACE_ADMIN_ROLE = keccak256("MARKETPLACE_ADMIN_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    // State variables
    IRWAAssetRegistry public immutable assetRegistry;
    address public immutable tokenFactory;
    address public tokenFactory404; // ERC404 factory (can be set by admin)
    
    // PRIMARY MARKET: Direct purchases from registry assets (uses registry prices)
    // SECONDARY MARKET: P2P trading via listings (uses listing prices set by sellers)
    Counters.Counter private _listingIdCounter;
    mapping(uint256 => Listing) private _listings;
    mapping(uint256 => uint256[]) private _assetListings; // assetId => listingIds
    mapping(address => uint256[]) private _sellerListings; // seller => listingIds
    
    uint256 private _marketplaceFeePercentage = 250; // 2.5% in basis points
    uint256 private constant MAX_FEE_PERCENTAGE = 1000; // 10% max fee
    uint256 private constant BASIS_POINTS = 10000;
    
    address private _feeRecipient;
    uint256 private _collectedFees;
    
    // Payment token support
    address public paymentToken; // USDC address (0x0 means ETH only)
    mapping(address => uint256) private _collectedFeesERC20; // ERC20 token => collected fees

    // Events
    event DepositPurchased(
        uint256 indexed assetId,
        address indexed buyer,
        uint256 tokenAmount,
        uint256 totalCost,
        uint256 timestamp
    );
    
    event TokensPurchasedWithERC20(
        uint256 indexed assetId,
        address indexed buyer,
        address indexed paymentToken,
        uint256 tokenAmount,
        uint256 totalCost,
        uint256 timestamp
    );
    
    event ListingCreated(
        uint256 indexed listingId,
        uint256 indexed assetId,
        address indexed seller,
        uint256 tokenAmount,
        uint256 pricePerToken
    );
    
    event TokenFactory404Updated(address indexed newFactory404);

    /**
     * @dev Constructor
     */
    constructor(
        address assetRegistry_,
        address tokenFactory_,
        address feeRecipient,
        address paymentToken_, // USDC address (address(0) for ETH only)
        address tokenFactory404_ // ERC404 factory (address(0) if not used)
    ) {
        require(assetRegistry_ != address(0), "RWAMarketplace: invalid asset registry");
        require(tokenFactory_ != address(0), "RWAMarketplace: invalid token factory");
        require(feeRecipient != address(0), "RWAMarketplace: invalid fee recipient");

        assetRegistry = IRWAAssetRegistry(assetRegistry_);
        tokenFactory = tokenFactory_;
        tokenFactory404 = tokenFactory404_;
        _feeRecipient = feeRecipient;
        paymentToken = paymentToken_;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MARKETPLACE_ADMIN_ROLE, msg.sender);
        _grantRole(FEE_MANAGER_ROLE, msg.sender);

        _listingIdCounter.increment(); // Start from 1
    }

    /**
     * @dev PRIMARY MARKET: Purchase tokens directly from the registry asset using ETH
     * @notice Uses REGISTRY PRICE (assetRegistry.getAsset(assetId).tokenPrice) for consistent pricing
     * @notice NEVER uses listing prices - this is for new token purchases from issuer
     * @notice Creates tokens if they don't exist, transfers from asset owner if ERC404
     */
    function purchaseTokens(
        uint256 assetId,
        uint256 tokenAmount
    ) external payable override nonReentrant whenNotPaused {
        require(tokenAmount > 0, "RWAMarketplace: invalid token amount");
        require(paymentToken == address(0), "RWAMarketplace: use purchaseTokensWithERC20 for token payments");

        // Get asset details from REGISTRY (authoritative source)
        IRWAAssetRegistry.AssetDetails memory asset = assetRegistry.getAsset(assetId);
        require(asset.status == 1, "RWAMarketplace: asset not active");
        // tokenAmount is in wei, convert to token units for comparison
        require(asset.availableTokens >= tokenAmount.div(1e18), "RWAMarketplace: insufficient tokens available");

        // Calculate costs using REGISTRY PRICE (NOT listing price)
        // This ensures consistent pricing for primary market purchases
        (uint256 totalCost, uint256 marketplaceFee) = calculatePurchaseCost(assetId, tokenAmount);
        require(msg.value >= totalCost, "RWAMarketplace: insufficient payment");

        // Get or create token contract
        address tokenAddress = _getTokenAddress(assetId);
        uint256 tokenAssetId = assetId; // Default to registry assetId
        bool isERC404 = false;
        
        if (tokenAddress == address(0)) {
            // Create token if it doesn't exist (or find existing ERC404)
            tokenAddress = _createToken(asset);
            // Check if the returned token is an ERC404 token
            if (tokenFactory404 != address(0)) {
                isERC404 = IRWATokenFactory404(tokenFactory404).isValidToken(tokenAddress);
                if (isERC404) {
                    // Get the token's actual assetId (may differ from registry assetId)
                    tokenAssetId = IRWAToken404(tokenAddress).assetId();
                }
            }
        } else {
            // Token exists - check if it's ERC404
            if (tokenFactory404 != address(0)) {
                isERC404 = IRWATokenFactory404(tokenFactory404).isValidToken(tokenAddress);
                if (isERC404) {
                    // Get the token's actual assetId (may differ from registry assetId)
                    tokenAssetId = IRWAToken404(tokenAddress).assetId();
                }
            }
        }

        // Transfer or mint tokens to buyer
        if (isERC404) {
            // For ERC404 tokens: Transfer from marketplace (marketplace holds tokens)
            // Check marketplace has sufficient balance
            uint256 marketplaceBalance = IERC20(tokenAddress).balanceOf(address(this));
            require(marketplaceBalance >= tokenAmount, "RWAMarketplace: insufficient marketplace token balance");
            // Marketplace must own the tokens to transfer them directly
            IERC20(tokenAddress).transfer(msg.sender, tokenAmount);
        } else {
            // Use ERC20 factory to mint (use registry assetId)
        RWATokenFactory(tokenFactory).mintTokens(assetId, msg.sender, tokenAmount);
        }

        // Update registry availability (will auto-update status if sold out)
        // tokenAmount is in wei, convert to token units
        assetRegistry.updateTokenAvailability(assetId, tokenAmount.div(1e18));

        // Transfer payment to asset owner and collect fees
        uint256 ownerPayment = totalCost.sub(marketplaceFee);
        (bool okOwner, ) = payable(asset.owner).call{value: ownerPayment}("");
        require(okOwner, "RWAMarketplace: owner payout failed");
        _collectedFees = _collectedFees.add(marketplaceFee);

        // Refund excess payment
        if (msg.value > totalCost) {
            (bool okRefund, ) = payable(msg.sender).call{value: msg.value.sub(totalCost)}("");
            require(okRefund, "RWAMarketplace: refund failed");
        }

        emit TokensPurchased(assetId, msg.sender, tokenAmount, totalCost, block.timestamp);
    }

    /**
     * @dev Purchase tokens directly from the primary market using ERC20 (USDC)
     */
    function purchaseTokensWithERC20(
        uint256 assetId,
        uint256 tokenAmount
    ) external nonReentrant whenNotPaused {
        require(tokenAmount > 0, "RWAMarketplace: invalid token amount");
        require(paymentToken != address(0), "RWAMarketplace: ERC20 payments not enabled");

        IERC20 token = IERC20(paymentToken);

        // Get asset details from REGISTRY (authoritative source)
        IRWAAssetRegistry.AssetDetails memory asset = assetRegistry.getAsset(assetId);
        require(asset.status == 1, "RWAMarketplace: asset not active");
        // tokenAmount is in wei, convert to token units for comparison
        require(asset.availableTokens >= tokenAmount.div(1e18), "RWAMarketplace: insufficient tokens available");

        // Calculate costs using REGISTRY PRICE (NOT listing price)
        // This ensures consistent pricing for primary market purchases
        (uint256 totalCost, uint256 marketplaceFee) = calculatePurchaseCost(assetId, tokenAmount);
        
        // Check allowance and balance
        require(token.balanceOf(msg.sender) >= totalCost, "RWAMarketplace: insufficient token balance");
        require(token.allowance(msg.sender, address(this)) >= totalCost, "RWAMarketplace: insufficient token allowance");

        // Get or create token contract
        address tokenAddress = _getTokenAddress(assetId);
        uint256 tokenAssetId = assetId; // Default to registry assetId
        bool isERC404 = false;
        
        if (tokenAddress == address(0)) {
            // Create token if it doesn't exist (or find existing ERC404)
            tokenAddress = _createToken(asset);
            // Check if the returned token is an ERC404 token
            if (tokenFactory404 != address(0)) {
                isERC404 = IRWATokenFactory404(tokenFactory404).isValidToken(tokenAddress);
                if (isERC404) {
                    // Get the token's actual assetId (may differ from registry assetId)
                    tokenAssetId = IRWAToken404(tokenAddress).assetId();
                }
            }
        } else {
            // Token exists - check if it's ERC404
            if (tokenFactory404 != address(0)) {
                isERC404 = IRWATokenFactory404(tokenFactory404).isValidToken(tokenAddress);
                if (isERC404) {
                    // Get the token's actual assetId (may differ from registry assetId)
                    tokenAssetId = IRWAToken404(tokenAddress).assetId();
                }
            }
        }

        // Transfer or mint tokens to buyer
        if (isERC404) {
            // For ERC404 tokens: Transfer from marketplace (marketplace holds tokens)
            // Check marketplace has sufficient balance
            uint256 marketplaceBalance = IERC20(tokenAddress).balanceOf(address(this));
            require(marketplaceBalance >= tokenAmount, "RWAMarketplace: insufficient marketplace token balance");
            // Marketplace must own the tokens to transfer them directly
            IERC20(tokenAddress).transfer(msg.sender, tokenAmount);
        } else {
            // Use ERC20 factory to mint (use registry assetId)
        RWATokenFactory(tokenFactory).mintTokens(assetId, msg.sender, tokenAmount);
        }

        // Update registry availability (will auto-update status if sold out)
        // tokenAmount is in wei, convert to token units
        assetRegistry.updateTokenAvailability(assetId, tokenAmount.div(1e18));

        // Transfer payment tokens from buyer
        uint256 ownerPayment = totalCost.sub(marketplaceFee);
        token.safeTransferFrom(msg.sender, asset.owner, ownerPayment);
        token.safeTransferFrom(msg.sender, address(this), marketplaceFee);
        _collectedFeesERC20[paymentToken] = _collectedFeesERC20[paymentToken].add(marketplaceFee);

        emit TokensPurchasedWithERC20(assetId, msg.sender, paymentToken, tokenAmount, totalCost, block.timestamp);
    }

    /**
     * @dev Set payment token address (USDC)
     */
    function setPaymentToken(address newPaymentToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldToken = paymentToken;
        paymentToken = newPaymentToken;
        emit PaymentTokenUpdated(oldToken, newPaymentToken);
    }

    /**
     * @dev Get payment token address
     */
    function getPaymentToken() external view returns (address) {
        return paymentToken;
    }

    // ... existing code continues ...
    
    /**
     * @dev SECONDARY MARKET: Create a listing for P2P token trading
     * @notice Sellers set their own prices via listing.pricePerToken
     * @notice Different from primary market which uses registry prices
     */
    function createListing(
        uint256 assetId,
        uint256 tokenAmount,
        uint256 pricePerToken
    ) external override nonReentrant whenNotPaused returns (uint256 listingId) {
        require(tokenAmount > 0, "RWAMarketplace: invalid token amount");
        require(pricePerToken > 0, "RWAMarketplace: invalid price");

        // Verify token exists for the asset
        address tokenAddress = _getTokenAddress(assetId);
        require(tokenAddress != address(0), "RWAMarketplace: token not found");

        // Verify seller owns enough tokens
        IRWAToken token = IRWAToken(tokenAddress);
        require(token.balanceOf(msg.sender) >= tokenAmount, "RWAMarketplace: insufficient token balance");

        // Transfer tokens to marketplace (escrow)
        require(token.transferFrom(msg.sender, address(this), tokenAmount), "RWAMarketplace: transfer failed");

        // Create listing
        listingId = _listingIdCounter.current();
        _listingIdCounter.increment();

        _listings[listingId] = Listing({
            id: listingId,
            assetId: assetId,
            seller: msg.sender,
            tokenAmount: tokenAmount,
            pricePerToken: pricePerToken,
            active: true,
            createdAt: block.timestamp
        });

        _assetListings[assetId].push(listingId);
        _sellerListings[msg.sender].push(listingId);

        emit TokensListed(listingId, assetId, msg.sender, tokenAmount, pricePerToken);
    }

    /**
     * @dev SECONDARY MARKET: Buy tokens from a P2P trading listing using ETH
     * @notice Uses LISTING PRICE (listing.pricePerToken) set by seller
     * @notice Different from primary market which uses registry prices
     */
    function buyFromListing(
        uint256 listingId,
        uint256 tokenAmount
    ) external payable override nonReentrant whenNotPaused {
        Listing storage listing = _listings[listingId];
        require(listing.active, "RWAMarketplace: listing not active");
        require(listing.tokenAmount >= tokenAmount, "RWAMarketplace: insufficient tokens in listing");

        uint256 totalPrice = tokenAmount.mul(listing.pricePerToken);
        uint256 marketplaceFee = totalPrice.mul(_marketplaceFeePercentage).div(BASIS_POINTS);
        uint256 totalCost = totalPrice.add(marketplaceFee);

        require(msg.value >= totalCost, "RWAMarketplace: insufficient payment");

        // Get token contract
        address tokenAddress = _getTokenAddress(listing.assetId);
        IRWAToken token = IRWAToken(tokenAddress);

        // Transfer tokens from escrow to buyer
        require(token.transfer(msg.sender, tokenAmount), "RWAMarketplace: token transfer failed");

        // Update listing
        listing.tokenAmount = listing.tokenAmount.sub(tokenAmount);
        if (listing.tokenAmount == 0) {
            listing.active = false;
        }

        // Transfer payment to seller and collect fees
        (bool okSeller, ) = payable(listing.seller).call{value: totalPrice}("");
        require(okSeller, "RWAMarketplace: seller payout failed");
        _collectedFees = _collectedFees.add(marketplaceFee);

        // Refund excess payment
        if (msg.value > totalCost) {
            (bool okRefund, ) = payable(msg.sender).call{value: msg.value.sub(totalCost)}("");
            require(okRefund, "RWAMarketplace: refund failed");
        }

        emit TokensSold(listingId, listing.assetId, listing.seller, msg.sender, tokenAmount, totalPrice);
    }

    /**
     * @dev Cancel a listing and return tokens to seller
     */
    function cancelListing(uint256 listingId) external override nonReentrant whenNotPaused {
        Listing storage listing = _listings[listingId];
        require(listing.active, "RWAMarketplace: listing not active");
        require(listing.seller == msg.sender, "RWAMarketplace: not the seller");

        // Return tokens to seller
        address tokenAddress = _getTokenAddress(listing.assetId);
        IRWAToken token = IRWAToken(tokenAddress);
        require(token.transfer(msg.sender, listing.tokenAmount), "RWAMarketplace: token return failed");

        // Deactivate listing
        listing.active = false;

        emit ListingCancelled(listingId, msg.sender);
    }

    /**
     * @dev Calculate purchase cost including fees using REGISTRY PRICE ONLY
     * @notice PRIMARY MARKET: Always uses asset registry price, NEVER listing prices
     * @notice This ensures consistent pricing for new token purchases
     */
    function calculatePurchaseCost(
        uint256 assetId,
        uint256 tokenAmount
    ) public view override returns (uint256 totalCost, uint256 marketplaceFee) {
        // ALWAYS use registry price for primary market purchases
        IRWAAssetRegistry.AssetDetails memory asset = assetRegistry.getAsset(assetId);

        // Validate asset exists and is active
        require(asset.status == 1, "RWAMarketplace: asset not active in registry");
        require(asset.tokenPrice > 0, "RWAMarketplace: invalid token price in registry");

        // Calculate using REGISTRY price (NOT listing price)
        // tokenAmount is in wei (e.g., 100e18 for 100 tokens), divide by 1e18 to get token units
        uint256 basePrice = tokenAmount.mul(asset.tokenPrice).div(1e18);
        marketplaceFee = basePrice.mul(_marketplaceFeePercentage).div(BASIS_POINTS);
        totalCost = basePrice.add(marketplaceFee);

        return (totalCost, marketplaceFee);
    }

    /**
     * @dev Get active listing details
     */
    function getActiveListing(uint256 listingId) external view override returns (Listing memory) {
        Listing memory listing = _listings[listingId];
        require(listing.active, "RWAMarketplace: listing not active");
        return listing;
    }

    /**
     * @dev Get all listings for an asset
     */
    function getListingsByAsset(uint256 assetId) external view override returns (Listing[] memory) {
        uint256[] memory listingIds = _assetListings[assetId];
        uint256 activeCount = 0;

        // Count active listings
        for (uint256 i = 0; i < listingIds.length; i++) {
            if (_listings[listingIds[i]].active) {
                activeCount++;
            }
        }

        // Build array of active listings
        Listing[] memory activeListings = new Listing[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < listingIds.length; i++) {
            if (_listings[listingIds[i]].active) {
                activeListings[index] = _listings[listingIds[i]];
                index++;
            }
        }

        return activeListings;
    }

    /**
     * @dev Get all listings by a seller
     */
    function getListingsBySeller(address seller) external view override returns (Listing[] memory) {
        uint256[] memory listingIds = _sellerListings[seller];
        uint256 activeCount = 0;

        // Count active listings
        for (uint256 i = 0; i < listingIds.length; i++) {
            if (_listings[listingIds[i]].active) {
                activeCount++;
            }
        }

        // Build array of active listings
        Listing[] memory activeListings = new Listing[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < listingIds.length; i++) {
            if (_listings[listingIds[i]].active) {
                activeListings[index] = _listings[listingIds[i]];
                index++;
            }
        }

        return activeListings;
    }

    /**
     * @dev Get marketplace fee percentage
     */
    function getMarketplaceFee() external view override returns (uint256) {
        return _marketplaceFeePercentage;
    }

    /**
     * @dev Set marketplace fee percentage
     */
    function setMarketplaceFee(uint256 newFeePercentage) external override onlyRole(FEE_MANAGER_ROLE) {
        require(newFeePercentage <= MAX_FEE_PERCENTAGE, "RWAMarketplace: fee too high");
        _marketplaceFeePercentage = newFeePercentage;
        emit MarketplaceFeeUpdated(newFeePercentage);
    }

    /**
     * @dev Withdraw collected fees (ETH)
     */
    function withdrawFees() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 amount = _collectedFees;
        require(amount > 0, "RWAMarketplace: no fees to withdraw");
        
        _collectedFees = 0;
        (bool success, ) = payable(_feeRecipient).call{value: amount}("");
        require(success, "RWAMarketplace: fee transfer failed");
    }

    /**
     * @dev Withdraw collected fees (ERC20)
     */
    function withdrawFeesERC20(address tokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tokenAddress != address(0), "RWAMarketplace: invalid token address");
        uint256 amount = _collectedFeesERC20[tokenAddress];
        require(amount > 0, "RWAMarketplace: no fees to withdraw");
        
        _collectedFeesERC20[tokenAddress] = 0;
        IERC20(tokenAddress).safeTransfer(_feeRecipient, amount);
    }

    /**
     * @dev Get collected fees for ERC20 token
     */
    function getCollectedFeesERC20(address tokenAddress) external view returns (uint256) {
        return _collectedFeesERC20[tokenAddress];
    }

    /**
     * @dev Emergency pause
     */
    function emergencyPause() external override onlyRole(MARKETPLACE_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Get token address for an asset
     * Checks both ERC20 factory and ERC404 factory
     */
    function _getTokenAddress(uint256 assetId) internal view returns (address) {
        // First check ERC20 factory
        address tokenAddress = IRWATokenFactory(tokenFactory).getTokenAddress(assetId);
        if (tokenAddress != address(0)) {
            return tokenAddress;
        }
        
        // If not found and ERC404 factory is set, check ERC404 factory
        if (tokenFactory404 != address(0)) {
            tokenAddress = IRWATokenFactory404(tokenFactory404).getTokenAddress(assetId);
        }
        
        return tokenAddress;
    }
    
    /**
     * @dev Find existing ERC404 token by matching metadata (name, symbol, owner)
     * This helps resolve assetId mismatches between registry and existing tokens
     */
    function _findExistingToken404(
        IRWAAssetRegistry.AssetDetails memory asset
    ) internal view returns (address) {
        if (tokenFactory404 == address(0)) {
            return address(0);
        }
        
        IRWATokenFactory404 factory404 = IRWATokenFactory404(tokenFactory404);
        address[] memory allTokens = factory404.getAllTokens();
        
        // Iterate through all ERC404 tokens to find a match
        for (uint256 i = 0; i < allTokens.length; i++) {
            address tokenAddress = allTokens[i];
            
            // Skip if token is not valid
            if (!factory404.isValidToken(tokenAddress)) {
                continue;
            }
            
            // Get token metadata
            IRWAToken404 token = IRWAToken404(tokenAddress);
            
            // Compare name (case-insensitive comparison via keccak256)
            bytes32 tokenNameHash = keccak256(bytes(token.name()));
            bytes32 assetNameHash = keccak256(bytes(asset.title));
            
            // Match if name matches
            if (tokenNameHash == assetNameHash) {
                // Additional check: verify owner matches if possible
                // Note: We can't directly check owner from token, but we can verify it's a valid token
                return tokenAddress;
            }
        }
        
        return address(0);
    }

    /**
     * @dev Create a new token for an asset
     * First checks for existing ERC404 tokens matching the asset metadata
     * Only creates a new token if no existing token is found
     */
    function _createToken(IRWAAssetRegistry.AssetDetails memory asset) internal returns (address) {
        // First, try to find an existing ERC404 token matching this asset
        address existingToken404 = _findExistingToken404(asset);
        if (existingToken404 != address(0)) {
            // Found existing token - return it instead of creating new one
            return existingToken404;
        }
        
        // If ERC404 factory is set, create ERC404 token and mint to marketplace
        if (tokenFactory404 != address(0)) {
            // Convert totalTokens from token units to wei (ERC404 tokens use 18 decimals)
            uint256 totalSupplyWei = uint256(asset.totalTokens) * 1e18;
            return IRWATokenFactory404(tokenFactory404).createToken404WithMarketplace(
                asset.id,
                asset.title,
                "RWA",
                totalSupplyWei,
                asset.owner,
                address(this), // Marketplace is the recipient
                _uintToString(asset.id) // Simple tokenURI for now  
            );
        }
        
        // No existing token found and no ERC404 factory, create new ERC20 token via factory
        // Name: asset.title, Symbol: fixed "RWA" (can be customized later)
        return IRWATokenFactory(tokenFactory).createToken(
            asset.id,
            asset.title,
            "RWA",
            asset.totalTokens,
            asset.owner
        );
    }
    
    /**
     * @dev Set ERC404 factory address (admin only)
     */
    function setTokenFactory404(address newFactory404) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tokenFactory404 = newFactory404;
        emit TokenFactory404Updated(newFactory404);
    }
    
    /**
     * @dev Get ERC404 factory address
     */
    function getTokenFactory404() external view returns (address) {
        return tokenFactory404;
    }

    /**
     * @dev Update fee recipient
     */
    function setFeeRecipient(address newFeeRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeRecipient != address(0), "RWAMarketplace: invalid fee recipient");
        _feeRecipient = newFeeRecipient;
    }

    /**
     * @dev Get collected fees amount (ETH)
     */
    function getCollectedFees() external view returns (uint256) {
        return _collectedFees;
    }

    /**
     * @dev Get fee recipient
     */
    function getFeeRecipient() external view returns (address) {
        return _feeRecipient;
    }
    
    /**
     * @dev Convert uint256 to string
     */
    function _uintToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
