// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../libraries/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../interfaces/IRWAToken.sol";

/**
 * @title RWAToken
 * @dev ERC20 token representing fractional ownership of a Real World Asset
 * @author Tokenizin
 */
contract RWAToken is IRWAToken, ERC20, AccessControl, Pausable {
    using SafeMath for uint256;

    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant ASSET_MANAGER_ROLE = keccak256("ASSET_MANAGER_ROLE");

    // Asset information
    uint256 private _assetId;
    uint256 private _assetValue;
    uint256 private _totalDividendsDistributed;
    uint256 private _dividendPerToken;
    
    // Dividend tracking
    mapping(address => uint256) private _dividendDebt;
    mapping(address => uint256) private _claimedDividends;
    
    // Token holders
    address[] private _holders;
    mapping(address => bool) private _isHolder;
    mapping(address => uint256) private _holderIndex;
    
    // TokenizinToken for dividend payments
    address public tokenizinToken;
    
    // RewardDistributor for dividend routing
    address public rewardDistributorAddress;

    // Events
    event DividendDistributed(uint256 amount, uint256 perToken); 
    event RewardsClaimed(address indexed holder, uint256 amount); 
    event UpdatedAssetValue(uint256 oldValue, uint256 newValue); 

    /**
     * @dev Constructor
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 assetId_,
        uint256 totalSupply_,
        address owner
    ) ERC20(name, symbol) {
        require(assetId_ > 0, "RWAToken: invalid asset ID");
        require(totalSupply_ > 0, "RWAToken: invalid total supply");
        require(owner != address(0), "RWAToken: invalid owner");

        _assetId = assetId_;
        
        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(MINTER_ROLE, owner);
        _grantRole(BURNER_ROLE, owner);
        _grantRole(ASSET_MANAGER_ROLE, owner);
        
        // Also grant DEFAULT_ADMIN_ROLE to the factory (msg.sender) so it can manage roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        // Model A: zero initial supply; mint via factory on demand
    }

    /**
     * @dev Returns the asset ID this token represents
     */
    function assetId() external view override returns (uint256) {
        return _assetId;
    }

    /**
     * @dev Returns the current asset value
     */
    function assetValue() external view override returns (uint256) {
        return _assetValue;
    }

    /**
     * @dev Returns total dividends distributed
     */
    function totalDividendsDistributed() external view override returns (uint256) {
        return _totalDividendsDistributed;
    }

    /**
     * @dev Returns dividend per token
     */
    function dividendPerToken() external view override returns (uint256) {
        return _dividendPerToken;
    }

    /**
     * @dev Calculate claimable dividend for a holder
     */
    function claimableDividend(address holder) public view override returns (uint256) {
        uint256 balance = balanceOf(holder);
        if (balance == 0) return 0;
        
        uint256 totalDividend = balance.mul(_dividendPerToken).div(1e18);
        uint256 debt = _dividendDebt[holder];
        
        return totalDividend > debt ? totalDividend.sub(debt) : 0;
    }

    /**
     * @dev Mint tokens to address
     */
    function mint(address to, uint256 amount) external override onlyRole(MINTER_ROLE) whenNotPaused {
        require(to != address(0), "RWAToken: mint to zero address");
        require(amount > 0, "RWAToken: invalid amount");
        
        // Update dividend debt before minting
        _updateDividendDebt(to);
        
        _mint(to, amount);
        _addHolder(to);
    }

    /**
     * @dev Burn tokens from address
     */
    function burn(address from, uint256 amount) external override onlyRole(BURNER_ROLE) whenNotPaused {
        require(from != address(0), "RWAToken: burn from zero address");
        require(amount > 0, "RWAToken: invalid amount");
        require(balanceOf(from) >= amount, "RWAToken: insufficient balance");
        
        // Claim any pending dividends before burning
        if (claimableDividend(from) > 0) {
            _claimDividend(from);
        }
        
        _burn(from, amount);
        
        // Remove from holders if balance becomes zero
        if (balanceOf(from) == 0) {
            _removeHolder(from);
        }
    }

    /**
     * @dev Update the asset value
     */
    function updateAssetValue(uint256 newValue) external override onlyRole(ASSET_MANAGER_ROLE) {
        require(newValue > 0, "RWAToken: invalid asset value");
        
        uint256 oldValue = _assetValue;
        _assetValue = newValue;
        
        emit AssetValueUpdated(oldValue, newValue);
    }

    /**
     * @dev Distribute dividends to all token holders
     * @dev Dividends are routed through RewardDistributor for staking integration
     */
    function distributeDividends(uint256 amount) external override onlyRole(ASSET_MANAGER_ROLE) whenNotPaused {
        require(amount > 0, "RWAToken: invalid dividend amount");
        require(totalSupply() > 0, "RWAToken: no tokens to distribute to");
        require(tokenizinToken != address(0), "RWAToken: TokenizinToken not set");
        require(rewardDistributorAddress != address(0), "RWAToken: RewardDistributor not set");

        // Transfer TPT tokens to RewardDistributor
        require(
            IERC20(tokenizinToken).transfer(rewardDistributorAddress, amount),
            "RWAToken: transfer to RewardDistributor failed"
        );
        
        // Notify RewardDistributor of dividend distribution
        // Using low-level call to avoid interface dependency
        (bool success, ) = rewardDistributorAddress.call(
            abi.encodeWithSignature(
                "receivePropertyDividends(uint256,address,uint256)",
                _assetId,
                address(this),
                amount
            )
        );
        require(success, "RWAToken: RewardDistributor notification failed");
        
        uint256 perToken = amount.mul(1e18).div(totalSupply());
        _dividendPerToken = _dividendPerToken.add(perToken);
        _totalDividendsDistributed = _totalDividendsDistributed.add(amount);
        
        emit DividendDistributed(amount, perToken);
    }

    /**
     * @dev Claim pending dividends
     */
    function claimDividend() external override whenNotPaused {
        _claimDividend(msg.sender);
    }

    /**
     * @dev Internal function to claim dividends
     */
    function _claimDividend(address holder) internal {
        uint256 claimable = claimableDividend(holder);
        require(claimable > 0, "RWAToken: no dividends to claim");
        require(tokenizinToken != address(0), "RWAToken: TokenizinToken not set");
        
        _dividendDebt[holder] = _dividendDebt[holder].add(claimable);
        _claimedDividends[holder] = _claimedDividends[holder].add(claimable);
        
        // Transfer dividend in TokenizinToken (TPT)
        require(
            IERC20(tokenizinToken).transfer(holder, claimable),
            "RWAToken: TPT transfer failed"
        );
        
        emit RewardsClaimed(holder, claimable);
    }
    
    /**
     * @dev Set TokenizinToken address for dividend payments
     */
    function setTokenizinToken(address _tokenizinToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_tokenizinToken != address(0), "RWAToken: invalid address");
        tokenizinToken = _tokenizinToken;
    }
    
    /**
     * @dev Set RewardDistributor address for dividend routing
     */
    function setRewardDistributor(address _rewardDistributor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_rewardDistributor != address(0), "RWAToken: invalid address");
        rewardDistributorAddress = _rewardDistributor;
    }

    /**
     * @dev Get all token holders
     */
    function getHolders() external view override returns (address[] memory) {
        return _holders;
    }

    /**
     * @dev Get number of token holders
     */
    function getHolderCount() external view override returns (uint256) {
        return _holders.length;
    }

    /**
     * @dev Get holder balance
     */
    function getHolderBalance(address holder) external view override returns (uint256) {
        return balanceOf(holder);
    }

    /**
     * @dev Override transfer to update holder tracking and dividend debt
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._beforeTokenTransfer(from, to, amount);
        
        if (from != address(0)) {
            _updateDividendDebt(from);
        }
        if (to != address(0)) {
            _updateDividendDebt(to);
            _addHolder(to);
        }
    }

    /**
     * @dev Override transfer to handle holder removal
     */
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        super._afterTokenTransfer(from, to, amount);
        
        // Remove from holders if balance becomes zero
        if (from != address(0) && balanceOf(from) == 0) {
            _removeHolder(from);
        }
    }

    /**
     * @dev Update dividend debt for a holder
     */
    function _updateDividendDebt(address holder) internal {
        uint256 balance = balanceOf(holder);
        _dividendDebt[holder] = balance.mul(_dividendPerToken).div(1e18);
    }

    /**
     * @dev Add holder to the holders array
     */
    function _addHolder(address holder) internal {
        if (!_isHolder[holder] && balanceOf(holder) > 0) {
            _holders.push(holder);
            _holderIndex[holder] = _holders.length - 1;
            _isHolder[holder] = true;
        }
    }

    /**
     * @dev Remove holder from the holders array
     */
    function _removeHolder(address holder) internal {
        if (_isHolder[holder]) {
            uint256 index = _holderIndex[holder];
            uint256 lastIndex = _holders.length - 1;
            
            if (index != lastIndex) {
                address lastHolder = _holders[lastIndex];
                _holders[index] = lastHolder;
                _holderIndex[lastHolder] = index;
            }
            
            _holders.pop();
            delete _holderIndex[holder];
            _isHolder[holder] = false;
        }
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
     * @dev Allow contract to receive ETH for dividend payments
     */
    receive() external payable {}

    /**
     * @dev Allow withdrawal of excess ETH
     */
    function withdrawETH(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount <= address(this).balance, "RWAToken: insufficient balance");
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "RWAToken: ETH transfer failed");
    }
}
