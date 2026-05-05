// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
// Optimized imports - removed unused interfaces to reduce bytecode size
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/introspection/ERC165.sol';
import '@openzeppelin/contracts/utils/introspection/IERC165.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/security/Pausable.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/utils/math/SafeMath.sol';
import '../interfaces/IRWAToken404.sol';

/**
 * @title RWAToken404Fixed
 * @dev Fixed version of ERC-404 RWA token with correct balanceOf implementation
 * @dev This version ensures blockchain explorers show correct token balances and holders
 */
contract RWAToken404Fixed is ERC20, ERC165, AccessControl, Pausable, ReentrancyGuard {
    using SafeMath for uint256;

    // Roles
    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');
    bytes32 public constant BURNER_ROLE = keccak256('BURNER_ROLE');
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256('ASSET_MANAGER_ROLE');

    // Asset information
    uint256 public immutable assetId;
    uint256 private _assetValue;
    uint256 private _totalDividendsDistributed;
    uint256 private _dividendPerToken;

    // ERC-404 State
    uint256 private _totalSupply;
    uint256 private constant NFT_TOKEN_ID = 1; // Single NFT per property (tokenId = 1)
    bool private _nftExists; // Whether the NFT has been minted

    // Minimal ERC721 state for Etherscan compatibility
    mapping(uint256 => address) private _tokenApprovals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => string) private _tokenURIs;

    // Dividend tracking
    mapping(address => uint256) private _dividendDebt;
    mapping(address => uint256) private _claimedDividends;

    // Token holders (for ERC20)
    address[] private _holders;
    mapping(address => bool) private _isHolder;
    mapping(address => uint256) private _holderIndex;

    // ERC-404: Track NFT ownership
    address private _nftOwner;

    // TokenizinToken for dividend payments
    address public tokenizinToken;

    // RewardDistributor for dividend routing
    address public rewardDistributorAddress;

    // Events
    event TokensMinted(address indexed to, uint256 amount, uint256 assetId);
    event TokensBurned(address indexed from, uint256 amount, uint256 assetId);
    event AssetValueUpdated(uint256 indexed assetId, uint256 oldValue, uint256 newValue);
    event DividendDistributed(uint256 indexed assetId, uint256 totalAmount, uint256 perToken);
    event DividendClaimed(address indexed holder, uint256 amount);

    // ERC-404 Events
    event ConvertedToNFT(address indexed owner, uint256 tokenId, uint256 amount);
    event ConvertedToFungible(address indexed owner, uint256 tokenId, uint256 amount);

    // Minimal ERC721 events for Etherscan compatibility
    event Transfer721(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval721(address indexed owner, address indexed approved, uint256 indexed tokenId);

    /**
     * @dev Constructor - simplified for smaller contract size
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 assetId_,
        uint256 totalSupply_,
        address owner,
        string memory tokenURI_
    ) ERC20(name_, symbol_) {
        require(assetId_ > 0, 'RWAToken404Fixed: invalid asset ID');
        require(totalSupply_ > 0, 'RWAToken404Fixed: invalid total supply');
        require(owner != address(0), 'RWAToken404Fixed: invalid owner');
        require(bytes(tokenURI_).length > 0, 'RWAToken404Fixed: invalid token URI');

        assetId = assetId_;
        _totalSupply = totalSupply_;
        _tokenURIs[NFT_TOKEN_ID] = tokenURI_;

        // Mint initial tokens to owner
        _mint(owner, totalSupply_);

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(MINTER_ROLE, owner);
        _grantRole(BURNER_ROLE, owner);
        _grantRole(ASSET_MANAGER_ROLE, owner);

        // Also grant DEFAULT_ADMIN_ROLE to the factory (msg.sender) so it can manage roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev FIXED: Correct balanceOf implementation for blockchain explorers
     * @dev This ensures explorers show correct token balances and holder counts
     */
    function balanceOf(address owner) public view override returns (uint256) {
        // Return the correct ERC20 balance - this ensures blockchain explorers
        // display accurate token holdings and holder statistics
        return super.balanceOf(owner);
    }

    /**
     * @dev ERC20 transfer function - ensures balances are updated correctly
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        return super.transfer(to, amount);
    }

    /**
     * @dev ERC20 transferFrom function
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        return super.transferFrom(from, to, amount);
    }

    // ============ ERC20 Overrides ============

    function _mint(address to, uint256 amount) internal override {
        super._mint(to, amount);
        _addHolder(to);
    }

    function _burn(address from, uint256 amount) internal override {
        super._burn(from, amount);
        _removeHolderIfEmpty(from);
    }

    // ============ ERC721 Functions (Simplified) ============

    function ownerOf(uint256 tokenId) public view returns (address) {
        require(tokenId == NFT_TOKEN_ID, "RWAToken404Fixed: invalid token ID");
        return _nftOwner;
    }

    // ============ Helper Functions ============

    function _addHolder(address account) private {
        if (!_isHolder[account] && account != address(0)) {
            _isHolder[account] = true;
            _holderIndex[account] = _holders.length;
            _holders.push(account);
        }
    }

    function _removeHolderIfEmpty(address account) private {
        if (balanceOf(account) == 0 && _isHolder[account]) {
            _isHolder[account] = false;
            uint256 index = _holderIndex[account];
            address lastHolder = _holders[_holders.length - 1];
            _holders[index] = lastHolder;
            _holderIndex[lastHolder] = index;
            _holders.pop();
        }
    }

    // ============ Admin Functions ============

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) whenNotPaused {
        require(from != address(0), 'RWAToken404Fixed: burn from zero address');
        require(amount > 0, 'RWAToken404Fixed: burn amount must be greater than 0');
        require(balanceOf(from) >= amount, 'RWAToken404Fixed: burn amount exceeds balance');
        require(!_nftExists, 'RWAToken404Fixed: cannot burn when NFT exists');

        _burn(from, amount);

        emit TokensBurned(from, amount, assetId);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function updateAssetValue(uint256 newValue) external onlyRole(ASSET_MANAGER_ROLE) {
        uint256 oldValue = _assetValue;
        _assetValue = newValue;
        emit AssetValueUpdated(assetId, oldValue, newValue);
    }

    function distributeDividends(uint256 amount) external onlyRole(ASSET_MANAGER_ROLE) {
        require(amount > 0, 'RWAToken404Fixed: dividend amount must be greater than 0');

        uint256 currentSupply = totalSupply();
        require(currentSupply > 0, 'RWAToken404Fixed: no tokens in circulation');
        require(tokenizinToken != address(0), 'RWAToken404Fixed: TokenizinToken not set');
        require(rewardDistributorAddress != address(0), 'RWAToken404Fixed: RewardDistributor not set');

        // Transfer TPT tokens to RewardDistributor
        require(
            IERC20(tokenizinToken).transfer(rewardDistributorAddress, amount),
            'RWAToken404Fixed: transfer to RewardDistributor failed'
        );

        // Notify RewardDistributor of dividend distribution
        // Using low-level call to avoid interface dependency
        (bool success, ) = rewardDistributorAddress.call(
            abi.encodeWithSignature('receivePropertyDividends(uint256,address,uint256)', assetId, address(this), amount)
        );
        require(success, 'RWAToken404Fixed: RewardDistributor notification failed');

        _totalDividendsDistributed = _totalDividendsDistributed + amount;
        _dividendPerToken = _dividendPerToken + (amount * 1e18) / currentSupply;

        emit DividendDistributed(assetId, amount, _dividendPerToken);
    }

    // ============ ERC-404 HYBRID CONVERSION FUNCTIONS ============
    // These enable the unique RWA behavior where fractional ownership
    // can be consolidated back into single NFT ownership

    /**
     * @dev Convert all ERC20 tokens to NFT ownership (ERC-404 → ERC-721)
     * @notice Only the owner of ALL tokens can perform this conversion
     * This enables the unique RWA behavior where fractional ownership can be consolidated back to NFT
     */
    function convertToNFT() external whenNotPaused {
        address caller = msg.sender;
        uint256 callerBalance = balanceOf(caller);
        uint256 totalSupply_ = totalSupply();

        // Must own 100% of all tokens to convert to NFT
        require(callerBalance == totalSupply_, 'RWAToken404Fixed: must own all tokens to convert');
        require(!_nftExists, 'RWAToken404Fixed: NFT already exists');

        // Burn all ERC20 tokens
        _burn(caller, callerBalance);

        // Mint NFT to caller
        _nftExists = true;
        _nftOwner = caller;

        emit ConvertedToNFT(caller, NFT_TOKEN_ID, callerBalance);
        emit Transfer721(address(0), caller, NFT_TOKEN_ID);
    }

    /**
     * @dev Convert NFT back to ERC20 tokens (ERC-721 → ERC-404)
     * @notice Only the NFT owner can perform this conversion
     * This enables the dynamic hybrid behavior of RWA tokens
     */
    function convertToFungible() external whenNotPaused {
        address caller = msg.sender;

        require(_nftExists, 'RWAToken404Fixed: NFT does not exist');
        require(_nftOwner == caller, 'RWAToken404Fixed: not NFT owner');

        // Calculate token amount based on asset value
        uint256 tokenAmount = _assetValue;
        require(tokenAmount > 0, 'RWAToken404Fixed: invalid asset value');

        // Burn NFT
        emit Transfer721(caller, address(0), NFT_TOKEN_ID);
        delete _nftOwner;
        _nftExists = false;

        // Mint ERC20 tokens to caller
        _mint(caller, tokenAmount);

        emit ConvertedToFungible(caller, NFT_TOKEN_ID, tokenAmount);
    }

    /**
     * @dev Check if NFT exists (ERC-404 hybrid state check)
     */
    function nftExists() external view returns (bool) {
        return _nftExists;
    }

    /**
     * @dev Get NFT owner (ERC-721 compatibility)
     */
    function nftOwner() external view returns (address) {
        return _nftOwner;
    }

    /**
     * @dev Get NFT token ID (always 1 for single NFT per property)
     */
    function nftTokenId() external pure returns (uint256) {
        return NFT_TOKEN_ID;
    }

    // ============ ERC165 Support ============

    function supportsInterface(bytes4 interfaceId) public view override(ERC165, AccessControl) returns (bool) {
        return
            interfaceId == type(IERC20).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
