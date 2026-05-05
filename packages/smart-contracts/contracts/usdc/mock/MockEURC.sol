// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockEURC
 * @dev Simplified EURC mock for testing purposes
 * Compatible with Solidity 0.8.x
 * This is a simplified version for testing - use official Circle EURC on Sepolia for production
 */
contract MockEURC is ERC20, Ownable {
    uint8 private constant _decimals = 6; // EURC uses 6 decimals

    constructor() ERC20("Mock Euro Coin", "EURC") Ownable() {
        // Mint initial supply to deployer
        _mint(msg.sender, 1000000 * 10**6); // 1M EURC
    }

    /**
     * @dev Returns the number of decimals used
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to an address (for testing)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from an address (for testing)
     */
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}

