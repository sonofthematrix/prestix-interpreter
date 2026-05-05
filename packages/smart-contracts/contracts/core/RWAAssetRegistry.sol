// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IRWAAssetRegistry.sol";   
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";

/**
 * @title RWAAssetRegistry
 * @dev Registry for Real World Assets with tokenization support
 * @author Tokenizin
 */
contract RWAAssetRegistry is IRWAAssetRegistry, AccessControl, Pausable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // Roles
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");

    // State variables
    Counters.Counter private _assetIdCounter;
    mapping(uint256 => AssetDetails) private _assets;
    mapping(address => uint256[]) private _assetsByOwner;
    mapping(string => uint256[]) private _assetsByType;
    uint256[] private _activeAssets;

    // Constants
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;
    uint256 public constant MAX_TITLE_LENGTH = 200;
    uint256 public constant MIN_TOKEN_PRICE = 1e15; // 0.001 ETH minimum
    uint256 public constant MAX_TOTAL_TOKENS = 1e9; // 1 billion max tokens

    /**
     * @dev Constructor sets up roles and initial state
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ASSET_MANAGER_ROLE, msg.sender);
        
        // Start asset IDs from 1
        _assetIdCounter.increment();
    }

    /**
     * @dev Register a new RWA asset
     */
    function registerAsset(
        address owner,
        string calldata title,
        string calldata description,
        string calldata assetType,
        string calldata location,
        uint256 price,
        uint256 tokenPrice,
        uint256 totalTokens
    ) external override onlyRole(ASSET_MANAGER_ROLE) whenNotPaused returns (uint256 assetId) {
        require(owner != address(0), "RWAAssetRegistry: invalid owner");
        require(bytes(title).length > 0 && bytes(title).length <= MAX_TITLE_LENGTH, "RWAAssetRegistry: invalid title");
        require(bytes(description).length <= MAX_DESCRIPTION_LENGTH, "RWAAssetRegistry: description too long");
        require(bytes(assetType).length > 0, "RWAAssetRegistry: invalid asset type");
        require(price > 0, "RWAAssetRegistry: invalid price");
        require(tokenPrice >= MIN_TOKEN_PRICE, "RWAAssetRegistry: token price too low");
        require(totalTokens > 0 && totalTokens <= MAX_TOTAL_TOKENS, "RWAAssetRegistry: invalid total tokens");
        // Note: price (ETH) and tokenPrice (TPT) are in different currencies, so no direct comparison

        assetId = _assetIdCounter.current();
        _assetIdCounter.increment();

        AssetDetails memory asset = AssetDetails({
            id: uint32(assetId),
            owner: owner,
            status: 1, // ACTIVE
            totalTokens: uint64(totalTokens),
            availableTokens: uint64(totalTokens),
            soldTokens: 0,
            price: uint128(price),
            tokenPrice: uint128(tokenPrice),
            createdAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp),
            title: title,
            description: description,
            assetType: assetType,
            location: location
        });

        _assets[assetId] = asset;
        _assetsByOwner[owner].push(assetId);
        _assetsByType[assetType].push(assetId);
        _activeAssets.push(assetId);

        emit AssetRegistered(assetId, owner, assetType);
    }

    /**
     * @dev Update asset pricing information
     */
    function updateAsset(
        uint256 assetId,
        uint256 newPrice,
        uint256 newTokenPrice
    ) external override whenNotPaused {
        AssetDetails storage asset = _assets[assetId];
        require(asset.id != 0, "RWAAssetRegistry: asset not found");
        require(
            msg.sender == asset.owner || hasRole(ASSET_MANAGER_ROLE, msg.sender),
            "RWAAssetRegistry: unauthorized"
        );
        require(newPrice > 0, "RWAAssetRegistry: invalid price");
        require(newTokenPrice >= MIN_TOKEN_PRICE, "RWAAssetRegistry: token price too low");

        asset.price = uint128(newPrice);
        asset.tokenPrice = uint128(newTokenPrice);
        asset.updatedAt = uint64(block.timestamp);

        emit AssetUpdated(assetId, newPrice, asset.totalTokens);
    }

    /**
     * @dev Update asset status
     */
    function updateAssetStatus(uint256 assetId, uint8 newStatus) external override whenNotPaused {
        AssetDetails storage asset = _assets[assetId];
        require(asset.id != 0, "RWAAssetRegistry: asset not found");

        // Enhanced authorization: owner, asset manager, or admin can update
        bool isAuthorized = msg.sender == asset.owner ||
                           hasRole(ASSET_MANAGER_ROLE, msg.sender) ||
                           hasRole(DEFAULT_ADMIN_ROLE, msg.sender);
        require(isAuthorized, "RWAAssetRegistry: unauthorized");

        // Enhanced status validation
        require(newStatus <= 3, "RWAAssetRegistry: invalid status");

        // Handle corrupted status values (e.g., 448) by allowing reset to valid status
        uint8 oldStatus = asset.status;
        if (oldStatus > 3) {
            // Corrupted status detected - reset to inactive for list management
            oldStatus = 0; // Treat as inactive for list management
        }

        asset.status = newStatus;
        asset.updatedAt = uint64(block.timestamp);

        // Update active assets list with corrected oldStatus
        if (oldStatus == 1 && newStatus != 1) {
            _removeFromActiveAssets(assetId);
        } else if (oldStatus != 1 && newStatus == 1) {
            _activeAssets.push(assetId);
        }

        emit AssetStatusChanged(assetId, newStatus);
    }

    /**
     * @dev Force update asset status (admin only) - for recovery from corruption
     */
    function forceUpdateAssetStatus(uint256 assetId, uint8 newStatus) external onlyRole(DEFAULT_ADMIN_ROLE) {
        AssetDetails storage asset = _assets[assetId];
        require(asset.id != 0, "RWAAssetRegistry: asset not found");
        require(newStatus <= 3, "RWAAssetRegistry: invalid status");

        uint8 oldStatus = asset.status;
        asset.status = newStatus;
        asset.updatedAt = uint64(block.timestamp);

        // Update active assets list
        if (oldStatus == 1 && newStatus != 1) {
            _removeFromActiveAssets(assetId);
        } else if (oldStatus != 1 && newStatus == 1) {
            _activeAssets.push(assetId);
        }

        emit AssetStatusChanged(assetId, newStatus);
    }

    /**
     * @dev Transfer asset ownership
     */
    function transferAsset(uint256 assetId, address newOwner) external override whenNotPaused {
        AssetDetails storage asset = _assets[assetId];
        require(asset.id != 0, "RWAAssetRegistry: asset not found");
        require(msg.sender == asset.owner, "RWAAssetRegistry: not owner");
        require(newOwner != address(0), "RWAAssetRegistry: invalid new owner");

        address oldOwner = asset.owner;
        asset.owner = newOwner;
        asset.updatedAt = uint64(block.timestamp);

        // Update owner mappings
        _removeFromOwnerAssets(oldOwner, assetId);
        _assetsByOwner[newOwner].push(assetId);

        emit AssetTransferred(assetId, oldOwner, newOwner);
    }

    /**
     * @dev Update token availability (called by marketplace)
     */
    function updateTokenAvailability(
        uint256 assetId,
        uint256 soldAmount
    ) external onlyRole(MARKETPLACE_ROLE) {
        AssetDetails storage asset = _assets[assetId];
        require(asset.id != 0, "RWAAssetRegistry: asset not found");
        require(asset.availableTokens >= soldAmount, "RWAAssetRegistry: insufficient tokens");

        asset.availableTokens = uint64(uint256(asset.availableTokens) - soldAmount);
        asset.soldTokens = uint64(uint256(asset.soldTokens) + soldAmount);
        asset.updatedAt = uint64(block.timestamp);

        // Update status if sold out
        if (uint256(asset.availableTokens) == 0 && asset.status == 1) {
            asset.status = 2; // SOLD_OUT
            _removeFromActiveAssets(assetId);
            emit AssetStatusChanged(assetId, 2);
        }
    }

    /**
     * @dev Get asset details
     */
    function getAsset(uint256 assetId) external view override returns (AssetDetails memory) {
        AssetDetails memory asset = _assets[assetId];
        require(asset.id != 0, "RWAAssetRegistry: asset not found");
        return asset;
    }

    /**
     * @dev Get assets by owner
     */
    function getAssetsByOwner(address owner) external view override returns (uint256[] memory) {
        return _assetsByOwner[owner];
    }

    /**
     * @dev Get active assets
     */
    function getActiveAssets() external view override returns (uint256[] memory) {
        return _activeAssets;
    }

    /**
     * @dev Get assets by type
     */
    function getAssetsByType(string calldata assetType) external view override returns (uint256[] memory) {
        return _assetsByType[assetType];
    }

    /**
     * @dev Check if asset is active
     */
    function isAssetActive(uint256 assetId) external view override returns (bool) {
        return _assets[assetId].status == 1;
    }

    /**
     * @dev Get next asset ID
     */
    function getNextAssetId() external view override returns (uint256) {
        return _assetIdCounter.current();
    }

    /**
     * @dev Get token price value (helper to avoid struct unpacking issues)
     * Using separate functions instead of tuple return to avoid ABI encoding bugs
     */
    function getTokenPriceValue(uint256 assetId) external view override returns (uint256) {
        AssetDetails memory asset = _assets[assetId];
        require(asset.id != 0, "RWAAssetRegistry: asset not found");
        return asset.tokenPrice;
    }
    
    /**
     * @dev Get available tokens (helper to avoid struct unpacking issues)
     */
    function getAvailableTokens(uint256 assetId) external view override returns (uint256) {
        AssetDetails memory asset = _assets[assetId];
        require(asset.id != 0, "RWAAssetRegistry: asset not found");
        return asset.availableTokens;
    }
    
    /**
     * @dev Get asset status (helper to avoid struct unpacking issues)
     */
    function getAssetStatus(uint256 assetId) external view override returns (uint8) {
        AssetDetails memory asset = _assets[assetId];
        require(asset.id != 0, "RWAAssetRegistry: asset not found");
        return asset.status;
    }

    /**
     * @dev Remove asset from active assets list
     */
    function _removeFromActiveAssets(uint256 assetId) private {
        for (uint256 i = 0; i < _activeAssets.length; i++) {
            if (_activeAssets[i] == assetId) {
                _activeAssets[i] = _activeAssets[_activeAssets.length - 1];
                _activeAssets.pop();
                break;
            }
        }
    }

    /**
     * @dev Remove asset from owner's asset list
     */
    function _removeFromOwnerAssets(address owner, uint256 assetId) private {
        uint256[] storage ownerAssets = _assetsByOwner[owner];
        for (uint256 i = 0; i < ownerAssets.length; i++) {
            if (ownerAssets[i] == assetId) {
                ownerAssets[i] = ownerAssets[ownerAssets.length - 1];
                ownerAssets.pop();
                break;
            }
        }
    }

    /**
     * @dev Pause contract (admin only)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract (admin only)
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Add marketplace role to address
     */
    function addMarketplace(address marketplace) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(MARKETPLACE_ROLE, marketplace);
    }

    /**
     * @dev Remove marketplace role from address
     */
    function removeMarketplace(address marketplace) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MARKETPLACE_ROLE, marketplace);
    }
}
