// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./RWAMarketplaceUpgradeableSetter.sol";

/**
 * @title RWAMarketplaceUpgradeableSetterV2
 * @dev Upgrade contract that adds payment token management functions
 * to the existing RWAMarketplaceUpgradeableSetter contract.
 *
 * New Features:
 * - addPaymentToken: Add new payment tokens after deployment
 * - removePaymentToken: Remove payment tokens
 * - getAllowedPaymentTokens: Get list of all allowed payment tokens
 *
 * @author Tokenizin
 */
contract RWAMarketplaceUpgradeableSetterV2 is RWAMarketplaceUpgradeableSetter {
    // Events for payment token management
    event PaymentTokenAdded(address indexed token);
    event PaymentTokenRemoved(address indexed token);

    // Additional storage for V2 (maintains upgrade compatibility)
    address[] private _v2PaymentTokenList; // Our own list to track additions

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Add a new payment token (admin only)
     * @param token The address of the payment token to add
     */
    function addPaymentToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0), "RWAMarketplace: invalid token address");
        require(!allowedPaymentTokens[token], "RWAMarketplace: token already allowed");

        allowedPaymentTokens[token] = true;
        _v2PaymentTokenList.push(token); // Track in our own list

        emit PaymentTokenAdded(token);
    }

    /**
     * @dev Remove a payment token (admin only)
     * @param token The address of the payment token to remove
     * @notice This marks the token as not allowed but doesn't remove from tracking
     */
    function removePaymentToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(token != address(0), "RWAMarketplace: cannot remove ETH");
        require(allowedPaymentTokens[token], "RWAMarketplace: token not allowed");

        allowedPaymentTokens[token] = false;

        emit PaymentTokenRemoved(token);
    }

    /**
     * @dev Get all allowed payment tokens
     * @return Array of allowed payment token addresses
     * @notice Returns tokens that are currently marked as allowed
     */
    function getAllowedPaymentTokens() external view returns (address[] memory) {
        // Build list from V2 additions only
        // (The original payment tokens from initialization are tracked privately)
        uint256 count = 0;
        
        // Count tokens added via V2
        for (uint256 i = 0; i < _v2PaymentTokenList.length; i++) {
            if (allowedPaymentTokens[_v2PaymentTokenList[i]]) {
                count++;
            }
        }

        // Build result array
        address[] memory result = new address[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < _v2PaymentTokenList.length; i++) {
            if (allowedPaymentTokens[_v2PaymentTokenList[i]]) {
                result[index] = _v2PaymentTokenList[i];
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Check if a specific payment token is allowed
     * @param token The address of the payment token to check
     * @return True if the token is allowed, false otherwise
     */
    function isPaymentTokenAllowed(address token) external view returns (bool) {
        return allowedPaymentTokens[token];
    }
}
