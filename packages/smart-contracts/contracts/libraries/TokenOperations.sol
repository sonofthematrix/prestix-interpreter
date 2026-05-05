// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../core/RWAToken404Fixed.sol";

/**
 * @title TokenOperations
 * @dev Library for ERC404 token operations to reduce contract size
 */
library TokenOperations {
    enum TokenType { ERC20, ERC404 }

    function mint(address token, TokenType tokenType, address to, uint256 amount) internal {
        require(tokenType == TokenType.ERC404, "TokenOperations: Only ERC404 supported");
        RWAToken404Fixed(payable(token)).mint(to, amount);
    }

    function burn(address token, TokenType tokenType, address from, uint256 amount) internal {
        require(tokenType == TokenType.ERC404, "TokenOperations: Only ERC404 supported");
        RWAToken404Fixed(payable(token)).burn(from, amount);
    }

    function updateAssetValue(address token, TokenType tokenType, uint256 newValue) internal {
        require(tokenType == TokenType.ERC404, "TokenOperations: Only ERC404 supported");
        RWAToken404Fixed(payable(token)).updateAssetValue(newValue);
    }

    function distributeDividends(address token, TokenType tokenType, uint256 amount) internal {
        require(tokenType == TokenType.ERC404, "TokenOperations: Only ERC404 supported");
        RWAToken404Fixed(payable(token)).distributeDividends(amount);
    }

    function grantRoles(address token, TokenType tokenType, address factory) internal {
        require(tokenType == TokenType.ERC404, "TokenOperations: Only ERC404 supported");
        RWAToken404Fixed t = RWAToken404Fixed(payable(token));
        t.grantRole(t.MINTER_ROLE(), factory);
        t.grantRole(t.BURNER_ROLE(), factory);
        t.grantRole(t.ASSET_MANAGER_ROLE(), factory);
    }
}

