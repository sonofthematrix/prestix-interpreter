// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IRWAToken.sol";
import "./RWAToken.sol";

/**
 * @title RWATokenFactory
 * @dev Factory contract for creating ERC20 RWA tokens
 * @author Tokenizin
 */
contract RWATokenFactory is AccessControl, Pausable {
    error InvalidAssetId();
    error InvalidName();
    error InvalidSymbol();
    error InvalidSupply();
    error InvalidOwner();
    error TokenExists();
    error TokenNotFound();
    
    bytes32 public constant TOKEN_CREATOR_ROLE = keccak256("TOKEN_CREATOR_ROLE");
    
    mapping(uint256 => address) private _assetToToken;
    mapping(address => uint256) private _tokenToAsset;
    mapping(address => bool) private _validTokens;
    address[] private _allTokens;
    
    event TokenCreated(
        uint256 indexed assetId,
        address indexed tokenAddress,
        string name,
        string symbol,
        uint256 totalSupply
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(TOKEN_CREATOR_ROLE, msg.sender);
    }

    function createToken(
        uint256 assetId,
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        address owner
    ) external onlyRole(TOKEN_CREATOR_ROLE) whenNotPaused returns (address tokenAddress) {
        _validateParams(assetId, name, symbol, totalSupply, owner);
        
        RWAToken token = new RWAToken(name, symbol, assetId, totalSupply, owner);
        tokenAddress = address(token);
        
        _assetToToken[assetId] = tokenAddress;
        _tokenToAsset[tokenAddress] = assetId;
        _validTokens[tokenAddress] = true;
        _allTokens.push(tokenAddress);
        
        token.grantRole(token.MINTER_ROLE(), address(this));
        token.grantRole(token.BURNER_ROLE(), address(this));
        token.grantRole(token.ASSET_MANAGER_ROLE(), address(this));
        
        emit TokenCreated(assetId, tokenAddress, name, symbol, totalSupply);
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
        RWAToken(payable(token)).mint(to, amount);
    }

    function burnTokens(uint256 assetId, address from, uint256 amount) external onlyRole(TOKEN_CREATOR_ROLE) {
        address token = _getTokenAddress(assetId);
        RWAToken(payable(token)).burn(from, amount);
    }

    function updateAssetValue(uint256 assetId, uint256 newValue) external onlyRole(TOKEN_CREATOR_ROLE) {
        address token = _getTokenAddress(assetId);
        RWAToken(payable(token)).updateAssetValue(newValue);
    }

    function distributeDividends(uint256 assetId, uint256 amount) external onlyRole(TOKEN_CREATOR_ROLE) {
        address token = _getTokenAddress(assetId);
        RWAToken(payable(token)).distributeDividends(amount);
    }

    function _validateParams(
        uint256 assetId,
        string calldata name,
        string calldata symbol,
        uint256 totalSupply,
        address owner
    ) private view {
        if (assetId == 0) revert InvalidAssetId();
        if (bytes(name).length == 0) revert InvalidName();
        if (bytes(symbol).length == 0) revert InvalidSymbol();
        if (totalSupply == 0) revert InvalidSupply();
        if (owner == address(0)) revert InvalidOwner();
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
