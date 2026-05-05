// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IRWAAssetRegistry.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title RWAAssetRegistryUpgradeable
 * @dev Upgradeable Registry for Real World Assets with tokenization support
 * @author Tokenizin
 */
contract RWAAssetRegistryUpgradeable is
    Initializable,
    IRWAAssetRegistry,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    // Roles
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // State variables
    CountersUpgradeable.Counter private _assetIdCounter;
    mapping(uint256 => AssetDetails) private _assets;
    mapping(address => uint256[]) private _assetsByOwner;
    mapping(string => uint256[]) private _assetsByType;
    uint256[] private _activeAssets;

    // Constants
    uint256 public constant MAX_DESCRIPTION_LENGTH = 1000;
    uint256 public constant MAX_TITLE_LENGTH = 200;
    uint256 public constant MIN_TOKEN_PRICE = 1e15; // 0.001 ETH minimum
    uint256 public constant MAX_TOTAL_TOKENS = 1e9; // 1 billion max tokens

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the upgradeable contract
     */
    function initialize(address admin) public initializer {
        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ASSET_MANAGER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

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

        assetId = _assetIdCounter.current();
        _assetIdCounter.increment();

        require(_assets[assetId].id == 0, "RWAAssetRegistry: asset already registered");

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
     * @dev Get asset details
     */
    function getAsset(uint256 assetId) external view override returns (AssetDetails memory) {
        require(_assets[assetId].id != 0, "RWAAssetRegistry: asset not found");
        return _assets[assetId];
    }

    /**
     * @dev Update asset status
     */
    function updateAssetStatus(uint256 assetId, uint8 status) external override onlyRole(MARKETPLACE_ROLE) whenNotPaused {
        require(_assets[assetId].id != 0, "RWAAssetRegistry: asset not found");
        require(status >= 0 && status <= 3, "RWAAssetRegistry: invalid status");

        _assets[assetId].status = status;
        _assets[assetId].updatedAt = uint64(block.timestamp);

        emit AssetStatusChanged(assetId, status);
    }

    /**
     * @dev Update token availability
     */
    function updateTokenAvailability(uint256 assetId, uint256 soldAmount) external override onlyRole(MARKETPLACE_ROLE) whenNotPaused {
        require(_assets[assetId].id != 0, "RWAAssetRegistry: asset not found");
        require(soldAmount <= _assets[assetId].availableTokens, "RWAAssetRegistry: insufficient tokens");

        _assets[assetId].availableTokens -= uint64(soldAmount);
        _assets[assetId].soldTokens += uint64(soldAmount);
        _assets[assetId].updatedAt = uint64(block.timestamp);

        emit TokenAvailabilityUpdated(assetId, uint64(_assets[assetId].availableTokens), uint64(_assets[assetId].soldTokens));
    }

    /**
     * @dev Update asset (price and token price)
     */
    function updateAsset(uint256 assetId, uint256 newPrice, uint256 newTokenPrice) external override onlyRole(ASSET_MANAGER_ROLE) whenNotPaused {
        require(_assets[assetId].id != 0, "RWAAssetRegistry: asset not found");
        require(newPrice > 0, "RWAAssetRegistry: invalid price");
        require(newTokenPrice >= MIN_TOKEN_PRICE, "RWAAssetRegistry: token price too low");

        _assets[assetId].price = uint128(newPrice);
        _assets[assetId].tokenPrice = uint128(newTokenPrice);
        _assets[assetId].updatedAt = uint64(block.timestamp);

        emit AssetPriceUpdated(assetId, uint128(newPrice), uint128(newTokenPrice));
    }

    /**
     * @dev Get assets by owner
     */
    function getAssetsByOwner(address owner) external view override returns (uint256[] memory) {
        return _assetsByOwner[owner];
    }

    /**
     * @dev Get assets by type
     */
    function getAssetsByType(string calldata assetType) external view returns (uint256[] memory) {
        return _assetsByType[assetType];
    }

    /**
     * @dev Get all active assets (alias for getAllActiveAssets)
     */
    function getActiveAssets() external view returns (uint256[] memory) {
        return _activeAssets;
    }

    /**
     * @dev Get all active assets
     */
    function getAllActiveAssets() external view returns (uint256[] memory) {
        return _activeAssets;
    }

    /**
     * @dev Check if asset is active
     */
    function isAssetActive(uint256 assetId) external view returns (bool) {
        return _assets[assetId].id != 0 && _assets[assetId].status == 1; // ACTIVE = 1
    }

    /**
     * @dev Get token price value
     */
    function getTokenPriceValue(uint256 assetId) external view returns (uint256) {
        require(_assets[assetId].id != 0, "RWAAssetRegistry: asset not found");
        return _assets[assetId].tokenPrice;
    }

    /**
     * @dev Get available tokens
     */
    function getAvailableTokens(uint256 assetId) external view returns (uint256) {
        require(_assets[assetId].id != 0, "RWAAssetRegistry: asset not found");
        return _assets[assetId].availableTokens;
    }

    /**
     * @dev Get asset status
     */
    function getAssetStatus(uint256 assetId) external view override returns (uint8) {
        require(_assets[assetId].id != 0, "RWAAssetRegistry: asset not found");
        return _assets[assetId].status;
    }

    /**
     * @dev Transfer asset ownership
     */
    function transferAsset(uint256 assetId, address newOwner) external override onlyRole(ASSET_MANAGER_ROLE) whenNotPaused {
        require(_assets[assetId].id != 0, "RWAAssetRegistry: asset not found");
        require(newOwner != address(0), "RWAAssetRegistry: invalid owner");

        address oldOwner = _assets[assetId].owner;
        _assets[assetId].owner = newOwner;
        _assets[assetId].updatedAt = uint64(block.timestamp);

        // Update owner mappings
        _assetsByOwner[oldOwner] = _removeFromArray(_assetsByOwner[oldOwner], assetId);
        _assetsByOwner[newOwner].push(assetId);

        emit AssetTransferred(assetId, oldOwner, newOwner);
    }

    /**
     * @dev Remove element from array (helper function)
     */
    function _removeFromArray(uint256[] storage array, uint256 element) private returns (uint256[] storage) {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == element) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
        return array;
    }

    /**
     * @dev Get next asset ID
     */
    function getNextAssetId() external view returns (uint256) {
        return _assetIdCounter.current();
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Authorize contract upgrades
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    /**
     * @dev Get contract version
     */
    function version() external pure returns (string memory) {
        return "1.0.0";
    }
}