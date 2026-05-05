// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./RWAMarketplaceFixedV2.sol";

/**
 * @title RWAMarketplaceUpgradeableSetter
 * @dev Upgrade contract that adds setTokenFactory404 setter function
 * to the existing RWAMarketplaceFixedV2 contract.
 *
 * This contract inherits from RWAMarketplaceFixedV2 and only adds the setter function
 * without changing any existing functionality.
 *
 * @author Tokenizin
 */
contract RWAMarketplaceUpgradeableSetter is RWAMarketplaceFixedV2 {
    // Add UPGRADER_ROLE constant for UUPS upgrades
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // Payment token support inherited from RWAMarketplaceFixedV2

    // Token registration mapping
    mapping(uint256 => address) public registeredTokenAddresses;

    // Events for setter functions
    event TokenFactory404Updated(address indexed oldFactory, address indexed newFactory);
    event AssetRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event TokenFactoryUpdated(address indexed oldFactory, address indexed newFactory);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event MarketplaceFeeUpdated(uint256 oldFee, uint256 newFee);
    event TokenAddressRegistered(uint256 indexed assetId, address indexed tokenAddress);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the upgradeable marketplace with setter functions
     * Enhanced version with payment token support
     */
    function initialize(
        address assetRegistry_,
        address tokenFactory_,
        address feeRecipient_,
        address tokenFactory404_,
        address[] memory initialPaymentTokens_,
        address admin_,
        string memory tokenUriBase_
    ) external override initializer {
        // Call internal initialize function (same as parent)
        _initialize(
            assetRegistry_,
            tokenFactory_,
            feeRecipient_,
            tokenFactory404_,
            initialPaymentTokens_,
            admin_,
            tokenUriBase_
        );

        // Additional initialization if needed for setter version
        // (Payment tokens already set up by parent)
    }

    /**
     * @dev Register token address for an asset (admin only)
     * @param assetId The asset ID from the registry
     * @param tokenAddress The token contract address
     */
    function registerTokenAddress(uint256 assetId, address tokenAddress)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(tokenAddress != address(0), "RWAMarketplace: invalid token address");
        require(assetId > 0, "RWAMarketplace: invalid asset ID");

        registeredTokenAddresses[assetId] = tokenAddress;
        emit TokenAddressRegistered(assetId, tokenAddress);
    }

    /**
     * @dev Get registered token address for an asset
     * @param assetId The asset ID from the registry
     * @return The registered token address, or address(0) if not registered
     */
    function getRegisteredTokenAddress(uint256 assetId) external view returns (address) {
        return registeredTokenAddresses[assetId];
    }

    /**
     * @dev Set ERC404 factory address (admin only)
     * @param newFactory404 New ERC404 factory address
     * @notice This function is added in this upgrade to allow runtime configuration
     * of the ERC404 factory address, enabling the marketplace to work with ERC404 tokens.
     */
    function setTokenFactory404(address newFactory404) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFactory404 != address(0), "RWAMarketplace: invalid factory address");
        address oldFactory = assetFactory404;
        assetFactory404 = newFactory404;
        emit TokenFactory404Updated(oldFactory, newFactory404);
    }

    /**
     * @dev Set asset registry address (admin only)
     * @param newRegistry New asset registry address
     * @notice This function allows updating the asset registry address at runtime.
     */
    function setAssetRegistry(address newRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRegistry != address(0), "RWAMarketplace: invalid registry address");
        address oldRegistry = address(assetRegistry);
        assetRegistry = IRWAAssetRegistry(newRegistry);
        emit AssetRegistryUpdated(oldRegistry, newRegistry);
    }

    /**
     * @dev Set ERC20 token factory address (admin only)
     * @param newFactory New ERC20 token factory address
     * @notice This function allows updating the ERC20 token factory address at runtime.
     */
    function setTokenFactory(address newFactory) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFactory != address(0), "RWAMarketplace: invalid factory address");
        address oldFactory = assetFactory;
        assetFactory = newFactory;
        emit TokenFactoryUpdated(oldFactory, newFactory);
    }

    /**
     * @dev Set fee recipient address (admin only)
     * @param newRecipient New fee recipient address
     * @notice This function allows updating the fee recipient address at runtime.
     */
    function setFeeRecipient(address newRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newRecipient != address(0), "RWAMarketplace: invalid recipient address");
        address oldRecipient = feeRecipient;
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(oldRecipient, newRecipient);
    }

    /**
     * @dev Set marketplace fee (admin only)
     * @param newFee New marketplace fee in basis points
     * @notice This function allows updating the marketplace fee at runtime.
     */
    function setMarketplaceFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newFee <= 10000, "RWAMarketplace: fee cannot exceed 100%");
        uint256 oldFee = marketplaceFee;
        marketplaceFee = newFee;
        emit MarketplaceFeeUpdated(oldFee, newFee);
    }

    // Getter functions for new configuration (existing getters already available in base contract)
    function getTokenFactory404() external view returns (address) {
        return assetFactory404;
    }

    function getAssetRegistry() external view returns (address) {
        return address(assetRegistry);
    }

    function getTokenFactory() external view returns (address) {
        return assetFactory;
    }

    function getFeeRecipient() external view returns (address) {
        return feeRecipient;
    }
    
}