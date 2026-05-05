// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IRWAToken404
 * @dev Interface for ERC-404 RWA tokens (semi-fungible)
 * @dev Note: Cannot extend both IERC20 and IERC721 due to function signature conflicts
 * @dev Instead, we define the functions we need explicitly
 * @author Tokenizin
 */
interface IRWAToken404 {
    // ERC-404 Events
    event ConvertedToNFT(address indexed owner, uint256 tokenId, uint256 amount);
    event ConvertedToFungible(address indexed owner, uint256 tokenId, uint256 amount);
    event NFTTransferred(address indexed from, address indexed to, uint256 tokenId);
    
    // ERC721 Events (redefined to avoid conflict with ERC20)
    event Transfer721(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval721(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll721(address indexed owner, address indexed operator, bool approved);

    // Standard RWA Token Functions
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

    // ERC-404 Specific Functions
    function convertToNFT() external;
    function convertToFungible() external;
    function nftExists() external view returns (bool);
    function nftOwner() external view returns (address);
    function nftTokenId() external pure returns (uint256);

    // ERC20 Functions (with different names to avoid conflicts)
    function tokenBalanceOf(address account) external view returns (uint256);
    function tokenTransfer(address to, uint256 amount) external returns (bool);
    function tokenApprove(address spender, uint256 amount) external returns (bool);
    function tokenTransferFrom(address from, address to, uint256 amount) external returns (bool);
    // Note: totalSupply() and allowance() are inherited from ERC20, not redeclared here

    // ERC721 Functions
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function transferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function tokenURI(uint256 tokenId) external view returns (string memory);
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

/**
 * @title IRWATokenFactory404
 * @dev Interface for creating ERC-404 RWA tokens
 * @author Tokenizin
 */
interface IRWATokenFactory404 {
    event TokenCreated(
        uint256 indexed assetId,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 totalSupply,
        string tokenURI
    );

    function createToken404(
        uint256 assetId,
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        address owner,
        string calldata tokenURI
    ) external returns (address tokenAddress);
    
    function createToken404WithMarketplace(
        uint256 assetId,
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        address owner,
        address marketplace,
        string calldata tokenURI
    ) external returns (address tokenAddress);
    
    function getTokenAddress(uint256 assetId) external view returns (address);
    function getAssetId(address tokenAddress) external view returns (uint256);
    function isValidToken(address tokenAddress) external view returns (bool);
    function getAllTokens() external view returns (address[] memory);
    function isToken404(address tokenAddress) external view returns (bool);

    // Management helpers
    function mintTokens(uint256 assetId, address to, uint256 amount) external;
    function burnTokens(uint256 assetId, address from, uint256 amount) external;
    function updateAssetValue(uint256 assetId, uint256 newValue) external;
    function distributeDividends(uint256 assetId, uint256 amount) external;
}

