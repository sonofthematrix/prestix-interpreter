// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IRWAToken
 * @dev Interface for RWA tokens representing fractional ownership
 * @author Tokenizin
 */
interface IRWAToken is IERC20 {
    // Events
    event TokensMinted(address indexed to, uint256 amount, uint256 assetId);
    event TokensBurned(address indexed from, uint256 amount, uint256 assetId);
    event AssetValueUpdated(uint256 indexed assetId, uint256 newValue);
    event DividendDistributed(uint256 indexed assetId, uint256 totalAmount, uint256 perToken);
    event DividendClaimed(address indexed holder, uint256 amount);

    // Functions
    function assetId() external view returns (uint256);
    function assetValue() external view returns (uint256);
    function totalDividendsDistributed() external view returns (uint256);
    function dividendPerToken() external view returns (uint256);
    function claimableDividend(address holder) external view returns (uint256);
    
    function mint(address to, uint256 amount) external;
    function burn(address from, uint256 amount) external;
    function updateAssetValue(uint256 newValue) external;
    function distributeDividends(uint256 amount) external;
    function claimDividend() external;
    
    function getHolders() external view returns (address[] memory);
    function getHolderCount() external view returns (uint256);
    function getHolderBalance(address holder) external view returns (uint256);
}

/**
 * @title IRWATokenFactory
 * @dev Interface for creating RWA tokens
 * @author Tokenizin
 */
interface IRWATokenFactory {
    event TokenCreated(
        uint256 indexed assetId,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 totalSupply
    );

    function createToken(
        uint256 assetId,
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        address owner
    ) external returns (address tokenAddress);
    
    function getTokenAddress(uint256 assetId) external view returns (address);
    function getAssetId(address tokenAddress) external view returns (uint256);
    function isValidToken(address tokenAddress) external view returns (bool);
    function getAllTokens() external view returns (address[] memory);

    // Management helpers (used by marketplace and admins)
    function mintTokens(uint256 assetId, address to, uint256 amount) external;
    function burnTokens(uint256 assetId, address from, uint256 amount) external;
    function updateAssetValue(uint256 assetId, uint256 newValue) external;
    function distributeDividends(uint256 assetId, uint256 amount) external;
}
