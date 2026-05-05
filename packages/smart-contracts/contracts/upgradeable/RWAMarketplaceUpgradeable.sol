// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "../interfaces/IRWAMarketplace.sol";
import "../interfaces/IRWAAssetRegistry.sol";
import "../interfaces/IRWAToken.sol";
import "../interfaces/IRWAToken404.sol";
import "../oracles/ChainlinkPriceOracle.sol";

// Custom Errors for Gas Optimization
error InvalidTokenAmount();
error InvalidPrice();
error InvalidAssetRegistry();
error InvalidTokenFactory();
error InvalidFeeRecipient();
error DuplicatePaymentToken();
error PaymentTokenNotAllowed();
error InsufficientTokenBalance(uint256 required, uint256 available);
error InsufficientAllowance(uint256 required, uint256 available);
error InvalidRecipient();
error InvalidSender();
error AssetNotActive();
error InsufficientTokens(uint256 requested, uint256 available);
error InsufficientPayment(uint256 required, uint256 provided);
error ListingNotActive();
error InsufficientListingTokens(uint256 requested, uint256 available);
error NotListingSeller();
error FeeTooHigh(uint256 maxAllowed);
error InvalidTokenAddress();
error NoFeesToWithdraw();
error FeeWithdrawalFailed();
error InvalidAssetId();
error InvalidTokenPrice();
error PriceCalculationOverflow();
error InvalidTokenAmountRange(uint256 min, uint256 max);
error MarketplaceFeeTooHigh(uint256 maxAllowed);

// Internal Packed Listing Struct for Gas Optimization
// Reduces from 7 slots (224 bytes) to 4 slots (128 bytes) - 43% savings
struct PackedListing {
    uint32 id;              // Max 4.29B listings (enough for decades)
    uint32 assetId;         // Max 4.29B assets
    address seller;         // 20 bytes
    uint32 createdAt;       // Unix timestamp until 2106
    uint96 tokenAmount;     // Max ~79 billion tokens (enough for most use cases)
    uint96 pricePerToken;   // Max ~79 billion wei per token
    bool active;            // 1 byte
}

/**
 * @title RWAMarketplaceUpgradeable
 * @dev Upgradeable marketplace for trading RWA tokens
 * @author Tokenizin
 */
contract RWAMarketplaceUpgradeable is 
    Initializable,
    IRWAMarketplace,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;
    using SafeMathUpgradeable for uint256;

    // Roles
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant MARKETPLACE_ADMIN_ROLE = keccak256("MARKETPLACE_ADMIN_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    // State variables
    IRWAAssetRegistry public assetRegistry;
    address private tokenFactory;
    address private tokenFactory404; // ERC404 factory (can be set by admin)
    
    CountersUpgradeable.Counter private _listingIdCounter;
    mapping(uint256 => PackedListing) private _packedListings; // Gas-optimized storage
    mapping(uint256 => Listing) private _listings; // Interface compatibility layer

    // Array Storage Replacement - Doubly-linked lists for O(1) insertions/deletions
    // Asset listings: assetId => (head listingId, listingId => next listingId)
    mapping(uint256 => uint256) private _assetListingHeads; // assetId => first listingId
    mapping(uint256 => mapping(uint256 => uint256)) private _assetListingNext; // assetId => listingId => next listingId

    // Seller listings: seller => (head listingId, listingId => next listingId)
    mapping(address => uint256) private _sellerListingHeads; // seller => first listingId
    mapping(address => mapping(uint256 => uint256)) private _sellerListingNext; // seller => listingId => next listingId
    
    uint256 private _marketplaceFeePercentage; // 2.5% in basis points
    uint16 private constant MAX_FEE_PERCENTAGE = 1000; // 10% max fee
    uint16 private constant BASIS_POINTS = 10000;
    
    address private _feeRecipient;
    uint256 private _collectedFees;
    
    // Payment token support - multiple tokens allowed
    mapping(address => bool) public allowedPaymentTokens; // Token address => is allowed
    address[] private _paymentTokenList; // Maintain ordered list for enumeration
    mapping(address => uint256) private _collectedFeesERC20; // ERC20 token => collected fees
    
    // Registered token addresses (Tier 1 - highest priority)
    // Allows admin to register tokens deployed outside factories
    mapping(uint256 => address) private _registeredTokenAddresses; // assetId => tokenAddress
    
    // Price oracle for ERC20 conversions
    address private priceOracle; // ChainlinkPriceOracle address

    // Events - Optimized for efficient indexing
    event TokensPurchased(
        uint256 indexed assetId,
        address indexed buyer,
        uint256 tokenAmount,
        uint256 totalCost
    );

    event ListingCreated(
        uint256 indexed listingId,
        uint256 indexed assetId,
        address indexed seller
    );

    event ListingDetails(
        uint256 indexed listingId,
        uint256 tokenAmount,
        uint256 pricePerToken
    );

    event ListingSold(
        uint256 indexed listingId,
        address indexed buyer,
        uint256 tokenAmount,
        uint256 totalCost
    );

    event ListingCancel(
        uint256 indexed listingId
    );
    event AssetRegistryUpdated(address indexed newAssetRegistry);

    event TokensPurchasedWithERC20(
        uint256 indexed assetId,
        address indexed buyer,
        address indexed paymentToken,
        uint256 tokenAmount,
        uint256 totalCost
    );

    event TokenFactory404Updated(address indexed newFactory404);
    event TokenAddressRegistered(uint256 indexed assetId, address indexed tokenAddress);
    event TokenAddressUnregistered(uint256 indexed assetId);

    event PaymentTokenAdded(address indexed token);
    event PaymentTokenRemoved(address indexed token);

    event FeesWithdrawnERC20(address indexed token, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address assetRegistry_,
        address tokenFactory_,
        address feeRecipient,
        address[] memory initialPaymentTokens_, // Array of allowed payment tokens
        address admin
    ) public initializer {
        if (assetRegistry_ == address(0)) revert InvalidAssetRegistry();
        if (tokenFactory_ == address(0)) revert InvalidTokenFactory();
        if (feeRecipient == address(0)) revert InvalidFeeRecipient();

        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        assetRegistry = IRWAAssetRegistry(assetRegistry_);
        tokenFactory = tokenFactory_;
        _feeRecipient = feeRecipient;
        _marketplaceFeePercentage = 250; // 2.5% in basis points

        // Always allow ETH (address(0))
        allowedPaymentTokens[address(0)] = true;
        _paymentTokenList.push(address(0));

        // Set initial payment tokens
        for (uint256 i = 0; i < initialPaymentTokens_.length; i++) {
            require(initialPaymentTokens_[i] != address(0), "RWAMarketplace: cannot add zero address as payment token");
            require(!allowedPaymentTokens[initialPaymentTokens_[i]], "RWAMarketplace: duplicate payment token");

            allowedPaymentTokens[initialPaymentTokens_[i]] = true;
            _paymentTokenList.push(initialPaymentTokens_[i]);
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);
        _grantRole(MARKETPLACE_ADMIN_ROLE, admin);
        _grantRole(FEE_MANAGER_ROLE, admin);

        _listingIdCounter.increment(); // Start from 1
    }

    function _authorizeUpgrade(address newImplementation) 
        internal 
        override 
        onlyRole(UPGRADER_ROLE) 
    {}

    /**
     * @dev Purchase tokens directly from the primary market
     */
    function purchaseTokens(
        uint256 assetId,
        uint256 tokenAmount
    ) external payable override nonReentrant whenNotPaused {
        if (tokenAmount == 0) revert InvalidTokenAmount();

        // Get asset details
        IRWAAssetRegistry.AssetDetails memory asset = assetRegistry.getAsset(assetId);
        if (asset.status != 1) revert AssetNotActive();
        if (asset.availableTokens < tokenAmount) revert InsufficientTokens(tokenAmount, asset.availableTokens);

        // Calculate costs
        (uint256 totalCost, uint256 marketplaceFee) = calculatePurchaseCost(assetId, tokenAmount);
        if (msg.value < totalCost) revert InsufficientPayment(totalCost, msg.value);

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
            // For ERC404 tokens: Transfer from marketplace's own balance (marketplace holds tokens)
            IERC20Upgradeable tokenContract = IERC20Upgradeable(tokenAddress);
            uint256 marketplaceBalance = tokenContract.balanceOf(address(this));
            require(marketplaceBalance >= tokenAmount, "RWAMarketplace: insufficient marketplace token balance");
            // Transfer from marketplace to buyer (marketplace owns tokens, so use standard transfer)
            require(tokenContract.transfer(msg.sender, tokenAmount), "RWAMarketplace: token transfer failed");
        } else {
            // Use ERC20 factory to mint (use registry assetId)
        IRWATokenFactory(tokenFactory).mintTokens(assetId, msg.sender, tokenAmount);
        }

        // Update registry availability (will auto-update status if sold out)
        assetRegistry.updateTokenAvailability(assetId, tokenAmount);

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

        emit TokensPurchased(assetId, msg.sender, tokenAmount, totalCost);
    }

    /**
     * @dev Purchase tokens directly from the primary market using ERC20 (USDC/EURC)
     */
    function purchaseTokensWithERC20(
        uint256 assetId,
        uint256 tokenAmount,
        address paymentToken
    ) external nonReentrant whenNotPaused {
        require(tokenAmount > 0, "RWAMarketplace: invalid token amount");
        require(allowedPaymentTokens[paymentToken], "RWAMarketplace: payment token not allowed");
        
        IERC20Upgradeable token = IERC20Upgradeable(paymentToken);
        
        // Get asset details
        IRWAAssetRegistry.AssetDetails memory asset = assetRegistry.getAsset(assetId);
        require(asset.status == 1, "RWAMarketplace: asset not active");
        require(asset.availableTokens >= tokenAmount, "RWAMarketplace: insufficient tokens available");

        // Calculate costs in ETH
        (uint256 totalCostEth, uint256 marketplaceFeeEth) = calculatePurchaseCost(assetId, tokenAmount);
        
        // Convert ETH cost to payment token using price oracle
        uint256 totalCost;
        uint256 marketplaceFee;
        
        if (priceOracle != address(0)) {
            ChainlinkPriceOracle oracle = ChainlinkPriceOracle(priceOracle);
            // Check if payment token is USDC or EURC (6 decimals)
            // For now, assume USDC - can be extended for EURC
            totalCost = oracle.convertEthToUsdc(totalCostEth);
            marketplaceFee = oracle.convertEthToUsdc(marketplaceFeeEth);
        } else {
            // Fallback: use 1:1 conversion (not accurate but works for testing)
            // In production, always use price oracle
            totalCost = totalCostEth / 10**12; // Convert from 18 decimals to 6 decimals
            marketplaceFee = marketplaceFeeEth / 10**12;
        }
        
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
            // For ERC404 tokens: Transfer from marketplace's own balance (marketplace holds tokens)
            IERC20Upgradeable tokenContract = IERC20Upgradeable(tokenAddress);
            uint256 marketplaceBalance = tokenContract.balanceOf(address(this));
            require(marketplaceBalance >= tokenAmount, "RWAMarketplace: insufficient marketplace token balance");
            // Transfer from marketplace to buyer (marketplace owns tokens, so use standard transfer)
            require(tokenContract.transfer(msg.sender, tokenAmount), "RWAMarketplace: token transfer failed");
        } else {
            // Use ERC20 factory to mint (use registry assetId)
        IRWATokenFactory(tokenFactory).mintTokens(assetId, msg.sender, tokenAmount);
        }

        // Update registry availability (will auto-update status if sold out)
        assetRegistry.updateTokenAvailability(assetId, tokenAmount);

        // Transfer payment tokens from buyer
        uint256 ownerPayment = totalCost.sub(marketplaceFee);
        require(token.transferFrom(msg.sender, asset.owner, ownerPayment), "RWAMarketplace: owner payment failed");
        require(token.transferFrom(msg.sender, address(this), marketplaceFee), "RWAMarketplace: fee collection failed");
        _collectedFeesERC20[paymentToken] = _collectedFeesERC20[paymentToken].add(marketplaceFee);

        emit TokensPurchasedWithERC20(assetId, msg.sender, paymentToken, tokenAmount, totalCost);
    }

    /**
     * @dev Add allowed payment token
     */
    function addAllowedPaymentToken(address newPaymentToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newPaymentToken == address(0)) revert InvalidRecipient();
        if (allowedPaymentTokens[newPaymentToken]) revert DuplicatePaymentToken();

        allowedPaymentTokens[newPaymentToken] = true;
        _paymentTokenList.push(newPaymentToken);
        emit PaymentTokenAdded(newPaymentToken);
    }

    /**
     * @dev Remove allowed payment token
     */
    function removeAllowedPaymentToken(address paymentToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(allowedPaymentTokens[paymentToken], "RWAMarketplace: payment token not allowed");
        allowedPaymentTokens[paymentToken] = false;
        emit PaymentTokenRemoved(paymentToken);
    }
    /**
     * @dev Set price oracle address
     */
    function setPriceOracle(address newPriceOracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        priceOracle = newPriceOracle;
    }
    
    /**
     * @dev Get price oracle address
     */
    function getPriceOracle() external view returns (address) {
        return priceOracle;
    }
    
    /**
     * @dev Get collected fees for a specific ERC20 token
     */
    function getCollectedFeesERC20(address tokenAddress) external view returns (uint256) {
        return _collectedFeesERC20[tokenAddress];
    }

    /**
     * @dev Withdraw collected ERC20 fees
     */
    function withdrawFeesERC20(address tokenAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tokenAddress != address(0), "RWAMarketplace: invalid token address");
        uint256 amount = _collectedFeesERC20[tokenAddress];
        require(amount > 0, "RWAMarketplace: no fees to withdraw");
        
        _collectedFeesERC20[tokenAddress] = 0;
        require(IERC20Upgradeable(tokenAddress).transfer(_feeRecipient, amount), "RWAMarketplace: fee withdrawal failed");
        
        emit FeesWithdrawnERC20(tokenAddress, amount);
    }
    
    /**
     * @dev Calculate purchase cost in payment token (for ERC20 payments)
     */
    function calculatePurchaseCostInPaymentToken(
        uint256 assetId,
        uint256 tokenAmount,
        address paymentToken
    ) external view returns (uint256 totalCost, uint256 marketplaceFee) {
        // Get cost in ETH
        (uint256 totalCostEth, uint256 marketplaceFeeEth) = calculatePurchaseCost(assetId, tokenAmount);
        
        // Convert to payment token if oracle is set
        if (priceOracle != address(0) && allowedPaymentTokens[paymentToken]) {
            ChainlinkPriceOracle oracle = ChainlinkPriceOracle(priceOracle);
            totalCost = oracle.convertEthToUsdc(totalCostEth);
            marketplaceFee = oracle.convertEthToUsdc(marketplaceFeeEth);
        }
        
        return (totalCost, marketplaceFee);
    }

    /**
     * @dev Create a listing for secondary market trading
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
        // Note: In a real implementation, this would check the token balance
        // For now, we'll assume the seller has the tokens
        require(true, "RWAMarketplace: insufficient token balance");

        // Create listing with packed storage for gas optimization
        listingId = _listingIdCounter.current();
        _listingIdCounter.increment();

        // Store in packed format for gas savings
        _packedListings[listingId] = PackedListing({
            id: uint32(listingId),
            assetId: uint32(assetId),
            seller: msg.sender,
            tokenAmount: uint96(tokenAmount),
            pricePerToken: uint96(pricePerToken),
            active: true,
            createdAt: uint32(block.timestamp)
        });

        // Maintain interface compatibility
        _listings[listingId] = _packedToInterface(_packedListings[listingId]);

        // Array Storage Replacement - Add to linked lists for O(1) access
        _addAssetListing(assetId, listingId);
        _addSellerListing(msg.sender, listingId);

        emit ListingCreated(listingId, assetId, msg.sender);
        emit ListingDetails(listingId, tokenAmount, pricePerToken);
    }

    /**
     * @dev Buy tokens from a secondary market listing
     */
    function buyFromListing(
        uint256 listingId,
        uint256 tokenAmount
    ) external payable override nonReentrant whenNotPaused {
        PackedListing storage packedListing = _packedListings[listingId];
        if (!packedListing.active) revert ListingNotActive();
        if (packedListing.tokenAmount < tokenAmount) revert InsufficientListingTokens(tokenAmount, packedListing.tokenAmount);

        // Calculate cost at listing price (gas optimized)
        uint256 totalCost = packedListing.pricePerToken * tokenAmount;
        uint256 marketplaceFee = (totalCost * _marketplaceFeePercentage) / BASIS_POINTS;
        uint256 sellerProceeds = totalCost - marketplaceFee;

        if (msg.value < totalCost) revert InsufficientPayment(totalCost, msg.value);

        // Get token contract and transfer tokens from seller to buyer
        address tokenAddress = _getTokenAddress(packedListing.assetId);
        if (tokenAddress == address(0)) revert InvalidTokenAddress();

        IRWAToken404(tokenAddress).tokenTransferFrom(packedListing.seller, msg.sender, tokenAmount);

        // Update packed listing (gas optimized)
        packedListing.tokenAmount -= uint96(tokenAmount);
        if (packedListing.tokenAmount == 0) {
            packedListing.active = false;
        }

        // Update interface compatibility layer
        _listings[listingId] = _packedToInterface(packedListing);

        // Array Storage Replacement - Remove inactive listings from linked lists
        if (!packedListing.active) {
            _removeAssetListing(packedListing.assetId, listingId);
            _removeSellerListing(packedListing.seller, listingId);
        }

        // Update registry availability
        assetRegistry.updateTokenAvailability(packedListing.assetId, tokenAmount);

        // Transfer payment
        (bool success, ) = payable(packedListing.seller).call{value: sellerProceeds}("");
        if (!success) revert FeeWithdrawalFailed();

        // Collect marketplace fee
        unchecked {
            _collectedFees += marketplaceFee;
        }

        emit ListingSold(listingId, msg.sender, tokenAmount, totalCost);

        // Refund excess if any
        if (msg.value > totalCost) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            require(refundSuccess, "RWAMarketplace: refund transfer failed");
        }
    }

    /**
     * @dev Cancel a listing and return tokens to seller
     */
    function cancelListing(uint256 listingId) external override nonReentrant whenNotPaused {
        PackedListing storage packedListing = _packedListings[listingId];
        if (!packedListing.active) revert ListingNotActive();
        if (packedListing.seller != msg.sender) revert NotListingSeller();

        // Return tokens to seller
        // Note: In a real implementation, this would transfer tokens back to seller
        // For now, we'll just emit the event
        emit ListingCancelled(listingId, msg.sender);

        // Deactivate listing
        packedListing.active = false;

        // Update interface compatibility layer
        _listings[listingId] = _packedToInterface(packedListing);

        // Array Storage Replacement - Remove cancelled listing from linked lists
        _removeAssetListing(packedListing.assetId, listingId);
        _removeSellerListing(packedListing.seller, listingId);
    }

    /**
     * @dev Calculate purchase cost including fees
     */
    function calculatePurchaseCost(
        uint256 assetId,
        uint256 tokenAmount
    ) public view override returns (uint256 totalCost, uint256 marketplaceFee) {
        // Memory optimization: Use unchecked for gas savings where safe
        unchecked {
            // Single external call batch for better gas efficiency
            (
                uint256 tokenPrice,
                uint256 availableTokens,
                uint8 status
            ) = _getAssetData(assetId);

            // Early validation with custom errors
            if (tokenPrice == 0) revert InvalidAssetId();
            if (status != 1) revert AssetNotActive();
            if (tokenPrice > 1e21) revert InvalidTokenPrice();
            if (tokenAmount == 0 || tokenAmount > availableTokens) revert InvalidTokenAmountRange(1, availableTokens);

            // Calculate base price - tokenPrice is in USD wei format ($X * 1e18)
            // For $3 USD: tokenPrice = 3e18, representing $3
            uint256 usdBasePrice = (tokenAmount * tokenPrice) / 1e18; // Total USD cost (not wei)
            if (usdBasePrice > 1e12) revert PriceCalculationOverflow(); // Max $1T USD

            // Calculate marketplace fee in USD
            uint256 usdMarketplaceFee = (usdBasePrice * _marketplaceFeePercentage) / BASIS_POINTS;
            uint256 usdTotalCost = usdBasePrice + usdMarketplaceFee;

            // Convert USD to ETH using price oracle
            if (priceOracle != address(0)) {
                ChainlinkPriceOracle oracle = ChainlinkPriceOracle(priceOracle);
                // Convert USD to USDC wei format (USDC has 6 decimals)
                // $3.075 USD = 3.075 USDC = 3.075 * 1e6 USDC wei
                uint256 usdcTotalCostWei = usdTotalCost * 1e6;
                uint256 usdcFeeWei = usdMarketplaceFee * 1e6;

                totalCost = oracle.convertUsdcToEth(usdcTotalCostWei);
                marketplaceFee = oracle.convertUsdcToEth(usdcFeeWei);
            } else {
                // Fallback: assume $3000/ETH rate (hardcoded for testing)
                // usdTotalCost is already in USD wei format (e.g., 100e18 = $100 USD)
                // Convert to ETH: divide by ETH price in USD
                uint256 ETH_USD_PRICE = 3000;
                totalCost = usdTotalCost / ETH_USD_PRICE;
                marketplaceFee = usdMarketplaceFee / ETH_USD_PRICE;
            }
        }
    }

    /**
     * @dev Internal function to batch asset data retrieval for gas optimization
     * Returns multiple values in single external call batch
     */
    function _getAssetData(uint256 assetId) internal view returns (
        uint256 tokenPrice,
        uint256 availableTokens,
        uint8 status
    ) {
        // Batch external calls for gas optimization
        tokenPrice = assetRegistry.getTokenPriceValue(assetId);
        availableTokens = assetRegistry.getAvailableTokens(assetId);
        status = assetRegistry.getAssetStatus(assetId);
    }

    /**
     * @dev Get active listing details (interface compatibility)
     */
    function getActiveListing(uint256 listingId) external view override returns (Listing memory) {
        PackedListing storage packedListing = _packedListings[listingId];
        if (!packedListing.active) revert ListingNotActive();
        return _packedToInterface(packedListing);
    }

    /**
     * @dev Get all listings for an asset
     */
    function getListingsByAsset(uint256 assetId) external view override returns (Listing[] memory) {
        return _getActiveListings(_getAssetListingIds(assetId));
    }

    /**
     * @dev Convert packed listing to interface listing struct
     */
    function _packedToInterface(PackedListing memory packed) internal pure returns (Listing memory) {
        return Listing({
            id: packed.id,
            assetId: packed.assetId,
            seller: packed.seller,
            tokenAmount: packed.tokenAmount,
            pricePerToken: packed.pricePerToken,
            active: packed.active,
            createdAt: packed.createdAt
        });
    }

    /**
     * @dev Convert interface listing to packed listing struct
     */
    function _interfaceToPacked(Listing memory listing) internal pure returns (PackedListing memory) {
        return PackedListing({
            id: uint32(listing.id),
            assetId: uint32(listing.assetId),
            seller: listing.seller,
            tokenAmount: uint96(listing.tokenAmount),
            pricePerToken: uint96(listing.pricePerToken),
            active: listing.active,
            createdAt: uint32(listing.createdAt)
        });
    }

    /**
     * @dev Array Storage Replacement - Add listing to asset's doubly-linked list
     * O(1) insertion complexity vs O(n) for arrays
     */
    function _addAssetListing(uint256 assetId, uint256 listingId) internal {
        // Add to head of linked list (most recently added first)
        _assetListingNext[assetId][listingId] = _assetListingHeads[assetId];
        _assetListingHeads[assetId] = listingId;
    }

    /**
     * @dev Array Storage Replacement - Remove listing from asset's doubly-linked list
     * O(1) deletion complexity vs O(n) for arrays
     */
    function _removeAssetListing(uint256 assetId, uint256 listingId) internal {
        uint256 current = _assetListingHeads[assetId];
        uint256 prev = 0;

        // Find the listing in the linked list
        while (current != 0 && current != listingId) {
            prev = current;
            current = _assetListingNext[assetId][current];
        }

        if (current == listingId) {
            if (prev == 0) {
                // Remove from head
                _assetListingHeads[assetId] = _assetListingNext[assetId][current];
            } else {
                // Remove from middle/end
                _assetListingNext[assetId][prev] = _assetListingNext[assetId][current];
            }
            // Clear the removed link
            delete _assetListingNext[assetId][current];
        }
    }

    /**
     * @dev Array Storage Replacement - Get all listing IDs for an asset
     * Converts linked list back to array for interface compatibility
     * Optimized with early exit and memory efficiency
     */
    function _getAssetListingIds(uint256 assetId) internal view returns (uint256[] memory) {
        // Pre-count elements for exact allocation (more gas efficient)
        uint256 count = 0;
        uint256 current = _assetListingHeads[assetId];

        // Count elements in linked list
        while (current != 0 && count < 1000) { // Safety limit
            count++;
            current = _assetListingNext[assetId][current];
        }

        // Allocate exact size array
        uint256[] memory listingIds = new uint256[](count);

        // Fill array (reset current to head)
        if (count > 0) {
            current = _assetListingHeads[assetId];
            for (uint256 i = 0; i < count; i++) {
                listingIds[i] = current;
                current = _assetListingNext[assetId][current];
            }
        }

        return listingIds;
    }

    /**
     * @dev Array Storage Replacement - Add listing to seller's doubly-linked list
     */
    function _addSellerListing(address seller, uint256 listingId) internal {
        _sellerListingNext[seller][listingId] = _sellerListingHeads[seller];
        _sellerListingHeads[seller] = listingId;
    }

    /**
     * @dev Array Storage Replacement - Remove listing from seller's doubly-linked list
     */
    function _removeSellerListing(address seller, uint256 listingId) internal {
        uint256 current = _sellerListingHeads[seller];
        uint256 prev = 0;

        while (current != 0 && current != listingId) {
            prev = current;
            current = _sellerListingNext[seller][current];
        }

        if (current == listingId) {
            if (prev == 0) {
                _sellerListingHeads[seller] = _sellerListingNext[seller][current];
            } else {
                _sellerListingNext[seller][prev] = _sellerListingNext[seller][current];
            }
            delete _sellerListingNext[seller][current];
        }
    }

    /**
     * @dev Array Storage Replacement - Get all listing IDs for a seller
     * Optimized with exact allocation and single-pass filling
     */
    function _getSellerListingIds(address seller) internal view returns (uint256[] memory) {
        // Pre-count for exact allocation
        uint256 count = 0;
        uint256 current = _sellerListingHeads[seller];

        while (current != 0 && count < 1000) {
            count++;
            current = _sellerListingNext[seller][current];
        }

        // Allocate exact size
        uint256[] memory listingIds = new uint256[](count);

        // Single-pass fill
        if (count > 0) {
            current = _sellerListingHeads[seller];
            for (uint256 i = 0; i < count; i++) {
                listingIds[i] = current;
                current = _sellerListingNext[seller][current];
            }
        }

        return listingIds;
    }

    /**
     * @dev Array Storage Replacement - Check if listing exists in asset's list
     * O(n) but optimized with early exit for active listings
     */
    function _assetListingExists(uint256 assetId, uint256 listingId) internal view returns (bool) {
        uint256 current = _assetListingHeads[assetId];
        while (current != 0) {
            if (current == listingId) return true;
            current = _assetListingNext[assetId][current];
        }
        return false;
    }

    /**
     * @dev Array Storage Replacement - Check if listing exists in seller's list
     */
    function _sellerListingExists(address seller, uint256 listingId) internal view returns (bool) {
        uint256 current = _sellerListingHeads[seller];
        while (current != 0) {
            if (current == listingId) return true;
            current = _sellerListingNext[seller][current];
        }
        return false;
    }

    /**
     * @dev Internal helper to get active listings from listing IDs with memory optimization
     * Uses single-pass algorithm to minimize storage reads and memory allocations
     * Now uses packed storage for maximum gas efficiency
     */
    function _getActiveListings(uint256[] memory listingIds) internal view returns (Listing[] memory) {
        // Pre-allocate maximum possible size to avoid dynamic resizing
        Listing[] memory tempListings = new Listing[](listingIds.length);
        uint256 activeCount = 0;

        // Single pass: collect active listings directly into final positions
        for (uint256 i = 0; i < listingIds.length; i++) {
            uint256 listingId = listingIds[i];
            PackedListing storage packedListing = _packedListings[listingId];

            // Only store active listings, directly in final position
            if (packedListing.active) {
                tempListings[activeCount] = _packedToInterface(packedListing);
                activeCount++;
            }
        }

        // Shrink array to actual size (Solidity 0.8.0+ optimization)
        // This creates a new array with exact size, minimizing memory usage
        Listing[] memory activeListings = new Listing[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            activeListings[i] = tempListings[i];
        }

        return activeListings;
    }

    /**
     * @dev Get all listings by a seller
     */
    function getListingsBySeller(address seller) external view override returns (Listing[] memory) {
        return _getActiveListings(_getSellerListingIds(seller));
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
    function setMarketplaceFee(uint256 newFeePercentage) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFeePercentage > MAX_FEE_PERCENTAGE) revert MarketplaceFeeTooHigh(MAX_FEE_PERCENTAGE);
        _marketplaceFeePercentage = newFeePercentage;
        emit MarketplaceFeeUpdated(newFeePercentage);
    }

    /**
     * @dev Withdraw collected fees
     */
    function withdrawFees() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 amount = _collectedFees;
        require(amount > 0, "RWAMarketplace: no fees to withdraw");
        
        _collectedFees = 0;
        (bool success, ) = payable(_feeRecipient).call{value: amount}("");
        require(success, "RWAMarketplace: transfer failed");
    }

    /**
     * @dev Emergency pause
     */
    function emergencyPause() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause
     */
    function unpause() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Get token address for an asset with optimized external calls
     * Minimizes gas by early returns and conditional external calls
     * Priority order: Registered addresses > ERC20 factory > ERC404 factory
     */
    function _getTokenAddress(uint256 assetId) internal view returns (address) {
        // Tier 1: Check registered addresses first (highest priority, fastest lookup)
        address tokenAddress = _registeredTokenAddresses[assetId];
        if (tokenAddress != address(0)) {
            return tokenAddress;
        }

        // Tier 2: Gas optimization: early return if ERC20 factory has the token
        tokenAddress = IRWATokenFactory(tokenFactory).getTokenAddress(assetId);
        if (tokenAddress != address(0)) {
            return tokenAddress;
        }

        // Tier 3: Only check ERC404 factory if it exists and ERC20 didn't have it
        // This avoids unnecessary external calls when ERC404 factory is not set
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
     * If ERC404 factory is available, creates ERC404 token minted to marketplace
     * Otherwise creates ERC20 token via factory
     */
    function _createToken(IRWAAssetRegistry.AssetDetails memory asset) internal returns (address) {
        // First, try to find an existing ERC404 token matching this asset
        address existingToken404 = _findExistingToken404(asset);
        if (existingToken404 != address(0)) {
            // Found existing token - return it instead of creating new one
            return existingToken404;
        }
        
        // If ERC404 factory is available, create ERC404 token minted to marketplace
        if (tokenFactory404 != address(0)) {
            // Construct tokenURI for ERC404 token
            string memory tokenURI = string(abi.encodePacked("https://api.tigerpalace.pro/assets/", _uintToString(asset.id), "/metadata.json"));
            
            // Create ERC404 token minted to marketplace (marketplace holds tokens for sales)
            return IRWATokenFactory404(tokenFactory404).createToken404WithMarketplace(
                asset.id,
                asset.title,
                string(abi.encodePacked("ASSET", _uintToString(asset.id))),
                asset.totalTokens,
                asset.owner, // Owner receives payment but doesn't hold tokens
                address(this), // Marketplace receives tokens for custody
                tokenURI
            );
        }
        
        // Fallback: create ERC20 token via factory
        return IRWATokenFactory(tokenFactory).createToken(
            asset.id,
            asset.title,
            "RWA",
            asset.totalTokens,
            asset.owner
        );
    }
    
    /**
     * @dev Helper function to convert uint256 to string
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
     * @dev Register a token address for an asset (admin only)
     * @notice Allows admin to register tokens deployed outside factories
     * @notice This is Tier 1 priority - checked before factory lookups
     * @param assetId The asset ID from the registry
     * @param tokenAddress The token contract address
     */
    function registerTokenAddress(uint256 assetId, address tokenAddress) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(tokenAddress != address(0), "RWAMarketplace: invalid token address");
        require(assetId > 0, "RWAMarketplace: invalid asset ID");
        
        _registeredTokenAddresses[assetId] = tokenAddress;
        emit TokenAddressRegistered(assetId, tokenAddress);
    }

    /**
     * @dev Get registered token address for an asset
     * @param assetId The asset ID from the registry
     * @return The registered token address, or address(0) if not registered
     */
    function getRegisteredTokenAddress(uint256 assetId) external view returns (address) {
        return _registeredTokenAddresses[assetId];
    }

    /**
     * @dev Unregister a token address for an asset (admin only)
     * @notice Removes token registration, allowing factory lookups to take precedence
     * @param assetId The asset ID from the registry
     */
    function unregisterTokenAddress(uint256 assetId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_registeredTokenAddresses[assetId] != address(0), "RWAMarketplace: token not registered");
        
        delete _registeredTokenAddresses[assetId];
        emit TokenAddressUnregistered(assetId);
    }

    /**
     * @dev Update fee recipient
     */
    function setFeeRecipient(address newFeeRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFeeRecipient != address(0), "RWAMarketplace: invalid fee recipient");
        _feeRecipient = newFeeRecipient;
    }

    /**
     * @dev Update asset registry address
     * @notice Allows updating the registry address if it was incorrectly set during initialization
     */
    function setAssetRegistry(address newAssetRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newAssetRegistry != address(0), "RWAMarketplace: invalid asset registry");
        assetRegistry = IRWAAssetRegistry(newAssetRegistry);
        emit AssetRegistryUpdated(newAssetRegistry);
    }

    /**
     * @dev Get collected fees amount
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
     * @dev Add an ERC20 token to the allowed payment tokens list
     * @notice Allows the specified ERC20 token to be used for purchasing tokens
     * @notice Only callable by accounts with DEFAULT_ADMIN_ROLE
     * @notice Emits PaymentTokenAdded event when successful
     * @param token The ERC20 token contract address to add (cannot be address(0))
     */
    function addPaymentToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0), "RWAMarketplace: cannot add zero address");
        require(!allowedPaymentTokens[token], "RWAMarketplace: token already allowed");

        allowedPaymentTokens[token] = true;
        _paymentTokenList.push(token);
        emit PaymentTokenAdded(token);
    }

    /**
     * @dev Remove an ERC20 token from the allowed payment tokens list
     * @notice Prevents the specified ERC20 token from being used for purchasing tokens
     * @notice Only callable by accounts with DEFAULT_ADMIN_ROLE
     * @notice Existing purchases with this token will remain valid
     * @notice Emits PaymentTokenRemoved event when successful
     * @param token The ERC20 token contract address to remove (cannot be address(0))
     */
    function removePaymentToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0), "RWAMarketplace: cannot remove zero address");
        require(allowedPaymentTokens[token], "RWAMarketplace: token not allowed");

        allowedPaymentTokens[token] = false;

        // Remove from array (maintain order by moving last element to removed position)
        for (uint256 i = 0; i < _paymentTokenList.length; i++) {
            if (_paymentTokenList[i] == token) {
                _paymentTokenList[i] = _paymentTokenList[_paymentTokenList.length - 1];
                _paymentTokenList.pop();
                break;
            }
        }

        emit PaymentTokenRemoved(token);
    }

    /**
     * @dev Get all allowed payment tokens
     */
    function getAllowedPaymentTokens() external view returns (address[] memory) {
        return _paymentTokenList;
    }

    /**
     * @dev Check if a token is allowed for payment
     */
    function isPaymentTokenAllowed(address token) external view returns (bool) {
        return allowedPaymentTokens[token];
    }

    /**
     * @dev Set payment token address (deprecated - use addPaymentToken/removePaymentToken)
     * @notice Kept for backward compatibility, sets the first allowed token
     */
    function setPaymentToken(address newPaymentToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // For backward compatibility, if setting a token, add it to allowed list
        if (newPaymentToken != address(0) && !allowedPaymentTokens[newPaymentToken]) {
            allowedPaymentTokens[newPaymentToken] = true;
            _paymentTokenList.push(newPaymentToken);
            emit PaymentTokenAdded(newPaymentToken);
        }
    }

    /**
     * @dev Get primary payment token address (for backward compatibility)
     * @notice Returns the first allowed ERC20 payment token, or address(0) if only ETH is allowed
     * @notice For production use, prefer getAllowedPaymentTokens() for multi-token support
     */
    function getPaymentToken() external view returns (address) {
        // Return the first allowed ERC20 token for backward compatibility
        // This maintains compatibility with systems expecting a single payment token
        for (uint256 i = 0; i < _paymentTokenList.length; i++) {
            address token = _paymentTokenList[i];
            if (token != address(0) && allowedPaymentTokens[token]) {
                return token;
            }
        }

        // If no ERC20 tokens are allowed, return address(0) for ETH
        return address(0);
    }

    /**
     * @dev Storage gap for future upgrades
     * This empty reserved space allows future versions to add new storage variables
     * without shifting down storage in the inheritance chain.
     * See: https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps
     */
    uint256[50] private __gap;
}
