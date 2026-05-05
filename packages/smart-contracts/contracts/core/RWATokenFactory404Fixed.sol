// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IRWAToken404.sol";
import "../interfaces/IRWAAssetRegistry.sol";
import "./RWAToken404Fixed.sol"; // Using the latest fixed version

/**
 * @title RWATokenFactory404
 * @dev Factory contract for creating ERC-404 RWA tokens
 * @author Tokenizin
 */
contract RWATokenFactory404Fixed is AccessControl, Pausable {
    // Custom errors for gas optimization (Phase 1)
    error InvalidAssetId();
    error InvalidName();
    error InvalidSymbol();
    error InvalidSupply();
    error InvalidOwner();
    error InvalidTokenURI();
    error TokenExists();
    error TokenNotFound();
    error InsufficientAllowance(uint256 required, uint256 available);
    error InsufficientBalance(uint256 required, uint256 available);
    
    bytes32 public constant TOKEN_CREATOR_ROLE = keccak256("TOKEN_CREATOR_ROLE");
    
    mapping(uint256 => address) private _assetToToken;
    mapping(address => uint256) private _tokenToAsset;
    mapping(address => bool) private _validTokens;
    mapping(uint256 => address) private _assetToOwner;
    address[] private _allTokens;
    
    event Token404Created(
        uint256 indexed assetId,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 totalSupply,
        string tokenURI
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TOKEN_CREATOR_ROLE, msg.sender);
    }

    function createToken404(
        uint256 assetId,
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        address owner,
        string calldata tokenURI
    ) external onlyRole(TOKEN_CREATOR_ROLE) whenNotPaused returns (address tokenAddress) {
        return createToken404WithMarketplace(assetId, name, symbol, totalSupply, owner, address(0), tokenURI);
    }

    /**
     * @dev Create ERC404 token with optional marketplace custody
     * @param assetId The asset ID from the registry
     * @param name Token name
     * @param symbol Token symbol
     * @param totalSupply Total token supply
     * @param owner Asset owner (receives payment, may not hold tokens)
     * @param marketplace Marketplace address (if provided, tokens minted to marketplace; if address(0), tokens minted to owner)
     * @param tokenURI Metadata URI
     * @return tokenAddress Address of the created token contract
     */
    function createToken404WithMarketplace(
        uint256 assetId,
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        address owner,
        address marketplace,
        string calldata tokenURI
    ) public onlyRole(TOKEN_CREATOR_ROLE) whenNotPaused returns (address tokenAddress) {
        _validateParams(assetId, name, symbol, totalSupply, owner, tokenURI);
        
        // If marketplace provided, mint tokens to marketplace; otherwise mint to owner
        address tokenRecipient = (marketplace != address(0)) ? marketplace : owner;
        
        RWAToken404Fixed token = new RWAToken404Fixed(name, symbol, assetId, totalSupply, tokenRecipient, tokenURI);
        tokenAddress = address(token);
        
        _assetToToken[assetId] = tokenAddress;
        _tokenToAsset[tokenAddress] = assetId;
        _assetToOwner[assetId] = owner; // Store owner for payment purposes
        _validTokens[tokenAddress] = true;
        _allTokens.push(tokenAddress);
        
        token.grantRole(token.MINTER_ROLE(), address(this));
        token.grantRole(token.BURNER_ROLE(), address(this));
        token.grantRole(token.ASSET_MANAGER_ROLE(), address(this));

        // Only approve factory if tokens are minted to owner (for backward compatibility)
        // If tokens are minted to marketplace, no approval needed - marketplace owns tokens
        if (marketplace == address(0)) {
            token.approve(address(this), totalSupply);
        }

        emit Token404Created(assetId, tokenAddress, name, symbol, totalSupply, tokenURI);
    }

    function getTokenAddress(uint256 assetId) external view returns (address) {
        return _assetToToken[assetId];
    }

    function getAssetId(address tokenAddress) external view returns (uint256) {
        return _tokenToAsset[tokenAddress];
    }

    function isValidToken(address tokenAddress) external view returns (bool) {
        return _validTokens[tokenAddress];
    }

    function getAllTokens() external view returns (address[] memory) {
        return _allTokens;
    }

    function mintTokens(uint256 assetId, address to, uint256 amount) external onlyRole(TOKEN_CREATOR_ROLE) {
        address token = _getTokenAddress(assetId);
        RWAToken404Fixed tokenContract = RWAToken404Fixed(payable(token));

        // Get the asset owner (stored when token was created)
        address assetOwner = _assetToOwner[assetId];
        if (assetOwner == address(0)) revert TokenNotFound();

        // Gas optimized validation using custom errors
        uint256 allowance = tokenContract.allowance(assetOwner, address(this));
        if (allowance < amount) revert InsufficientAllowance(amount, allowance);

        uint256 ownerBalance = tokenContract.balanceOf(assetOwner);
        if (ownerBalance < amount) revert InsufficientBalance(amount, ownerBalance);

        // Transfer tokens from asset owner to buyer
        tokenContract.transferFrom(assetOwner, to, amount);
    }

    /**
     * @dev Emergency function to transfer tokens directly from factory to buyer
     * Bypasses the mintTokens balance check for ERC404 compatibility
     */
    function transferTokensDirect(address tokenAddress, address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        RWAToken404Fixed tokenContract = RWAToken404Fixed(payable(tokenAddress));

        // Check balance using tokenBalanceOf (reliable for ERC404)
        require(tokenContract.balanceOf(address(this)) >= amount, "RWATokenFactory404: insufficient tokens");

        // Transfer tokens directly
        tokenContract.transfer(to, amount);
    }

    function burnTokens(uint256 assetId, address from, uint256 amount) external onlyRole(TOKEN_CREATOR_ROLE) {
        address token = _getTokenAddress(assetId);
        RWAToken404Fixed(payable(token)).burn(from, amount);    }
    function updateAssetValue(uint256 assetId, uint256 newValue) external onlyRole(TOKEN_CREATOR_ROLE) {
        address token = _getTokenAddress(assetId);
        RWAToken404Fixed(payable(token)).updateAssetValue(newValue);
    }

    function distributeDividends(uint256 assetId, uint256 amount) external onlyRole(TOKEN_CREATOR_ROLE) {
        address token = _getTokenAddress(assetId);
        RWAToken404Fixed(payable(token)).distributeDividends(amount);
    }

    function _validateParams(
        uint256 assetId,
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        address owner,
        string calldata tokenURI
    ) private view {
        // Gas optimized validation using custom errors
        if (assetId == 0) revert InvalidAssetId();
        if (bytes(name).length == 0) revert InvalidName();
        if (bytes(symbol).length == 0) revert InvalidSymbol();
        if (totalSupply == 0) revert InvalidSupply();
        if (owner == address(0)) revert InvalidOwner();
        if (bytes(tokenURI).length == 0) revert InvalidTokenURI();
        if (_assetToToken[assetId] != address(0)) revert TokenExists();
    }

    function _getTokenAddress(uint256 assetId) private view returns (address) {
        address tokenAddress = _assetToToken[assetId];
        if (tokenAddress == address(0)) revert TokenNotFound();
        return tokenAddress;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}

