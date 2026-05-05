// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title RWARewardDistributor
 * @dev Manages TokenizinToken reward pool for RWA staking ecosystem
 * @author Tokenizin
 */
contract RWARewardDistributor is AccessControl, Pausable, ReentrancyGuard {
    using SafeMath for uint256;

    // Roles
    bytes32 public constant REWARD_MANAGER_ROLE = keccak256("REWARD_MANAGER_ROLE");
    bytes32 public constant REVENUE_COLLECTOR_ROLE = keccak256("REVENUE_COLLECTOR_ROLE");

    // Token and contract addresses
    IERC20 public tokenizinToken;
    address public rwaStakingAddress;
    address public rwaRevenueAddress;
    address public treasuryAddress;

    // Reward pool management
    uint256 public totalRewardPool;
    uint256 public distributedRewards;
    uint256 public pendingRewards;
    
    // Revenue collection
    uint256 public totalRevenueCollected;
    uint256 public marketplaceFeesCollected;
    uint256 public propertyDividendsCollected;

    // RWA Token dividend tracking
    mapping(address => uint256) public tokenDividendPool; // tokenAddress => total dividends allocated
    mapping(address => mapping(address => uint256)) public tokenHolderDividendClaims; // token => holder => claimed amount
    mapping(address => uint256) public tokenDividendDistributed; // token => total distributed
    mapping(uint256 => address) public assetIdToToken; // assetId => tokenAddress (for reverse lookup)

    // Events
    event RewardsAdded(uint256 amount, string source);
    event RewardsDistributed(uint256 amount, address to);
    event RevenueCollected(uint256 amount, string source);
    event ContractAddressesUpdated(address TigerStaking, address rwaRevenue, address treasury);
    event EmergencyWithdrawal(address token, uint256 amount);
    event PropertyDividendReceived(uint256 indexed assetId, address indexed tokenAddress, uint256 amount);
    event DividendClaimRecorded(address indexed tokenAddress, address indexed holder, uint256 amount);
    event DividendDistributedToStaker(address indexed tokenAddress, address indexed holder, uint256 amount);

    constructor(
        address _tokenizinToken,
        address _treasury,
        uint256 _initialRewardPool
    ) {
        require(_tokenizinToken != address(0), "RWARewardDistributor: invalid token address");
        require(_treasury != address(0), "RWARewardDistributor: invalid treasury address");

        tokenizinToken = IERC20(_tokenizinToken);
        treasuryAddress = _treasury;
        totalRewardPool = _initialRewardPool;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REWARD_MANAGER_ROLE, msg.sender);
        _grantRole(REVENUE_COLLECTOR_ROLE, msg.sender);
    }

    /**
     * @dev Initialize the contract with contract addresses
     */
    function initialize(
        address _rwaStaking,
        address _rwaRevenue,
        address _treasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_rwaStaking != address(0), "RWARewardDistributor: invalid staking address");
        require(_rwaRevenue != address(0), "RWARewardDistributor: invalid revenue address");
        require(_treasury != address(0), "RWARewardDistributor: invalid treasury address");

        rwaStakingAddress = _rwaStaking;
        rwaRevenueAddress = _rwaRevenue;
        treasuryAddress = _treasury;

        emit ContractAddressesUpdated(_rwaStaking, _rwaRevenue, _treasury);
    }

    /**
     * @dev Add rewards to the pool
     */
    function addRewards(uint256 amount, string memory source) external onlyRole(REWARD_MANAGER_ROLE) whenNotPaused {
        require(amount > 0, "RWARewardDistributor: invalid amount");
        require(tokenizinToken.balanceOf(address(this)) >= amount, "RWARewardDistributor: insufficient balance");

        totalRewardPool = totalRewardPool.add(amount);
        pendingRewards = pendingRewards.add(amount);

        emit RewardsAdded(amount, source);
    }

    /**
     * @dev Distribute rewards to staking contract
     */
    function distributeRewards(uint256 amount) external onlyRole(REWARD_MANAGER_ROLE) whenNotPaused nonReentrant {
        require(amount > 0, "RWARewardDistributor: invalid amount");
        require(amount <= pendingRewards, "RWARewardDistributor: insufficient pending rewards");
        require(rwaStakingAddress != address(0), "RWARewardDistributor: staking address not set");

        // Transfer tokens to staking contract
        require(tokenizinToken.transfer(rwaStakingAddress, amount), "RWARewardDistributor: transfer failed");

        distributedRewards = distributedRewards.add(amount);
        pendingRewards = pendingRewards.sub(amount);

        emit RewardsDistributed(amount, rwaStakingAddress);
    }

    /**
     * @dev Collect marketplace fees and add to reward pool
     */
    function collectMarketplaceFees(uint256 amount) external onlyRole(REVENUE_COLLECTOR_ROLE) whenNotPaused {
        require(amount > 0, "RWARewardDistributor: invalid amount");
        require(tokenizinToken.balanceOf(address(this)) >= amount, "RWARewardDistributor: insufficient balance");

        marketplaceFeesCollected = marketplaceFeesCollected.add(amount);
        totalRevenueCollected = totalRevenueCollected.add(amount);
        totalRewardPool = totalRewardPool.add(amount);
        pendingRewards = pendingRewards.add(amount);

        emit RevenueCollected(amount, "marketplace_fees");
    }

    /**
     * @dev Collect property dividends and add to reward pool
     */
    function collectPropertyDividends(uint256 amount) external onlyRole(REVENUE_COLLECTOR_ROLE) whenNotPaused {
        require(amount > 0, "RWARewardDistributor: invalid amount");
        require(tokenizinToken.balanceOf(address(this)) >= amount, "RWARewardDistributor: insufficient balance");

        propertyDividendsCollected = propertyDividendsCollected.add(amount);
        totalRevenueCollected = totalRevenueCollected.add(amount);
        totalRewardPool = totalRewardPool.add(amount);
        pendingRewards = pendingRewards.add(amount);

        emit RevenueCollected(amount, "property_dividends");
    }

    /**
     * @dev Distribute property revenue to stakers via RWARevenue contract
     */
    function distributePropertyRevenue(uint256 amount) external onlyRole(REWARD_MANAGER_ROLE) whenNotPaused nonReentrant {
        require(amount > 0, "RWARewardDistributor: invalid amount");
        require(rwaRevenueAddress != address(0), "RWARewardDistributor: revenue address not set");
        require(tokenizinToken.balanceOf(address(this)) >= amount, "RWARewardDistributor: insufficient balance");

        // Transfer tokens to revenue contract for distribution to stakers
        require(tokenizinToken.transfer(rwaRevenueAddress, amount), "RWARewardDistributor: transfer failed");

        emit RewardsDistributed(amount, rwaRevenueAddress);
    }

    /**
     * @dev Receive property dividends from RWA token contracts
     * @param assetId The asset ID associated with the token
     * @param tokenAddress The RWA token contract address
     * @param amount The dividend amount in TPT tokens
     */
    function receivePropertyDividends(
        uint256 assetId,
        address tokenAddress,
        uint256 amount
    ) external whenNotPaused {
        require(assetId > 0, "RWARewardDistributor: invalid asset ID");
        require(tokenAddress != address(0), "RWARewardDistributor: invalid token address");
        require(amount > 0, "RWARewardDistributor: invalid amount");
        require(tokenizinToken.balanceOf(address(this)) >= amount, "RWARewardDistributor: insufficient balance");

        // Track dividend pool for this token
        tokenDividendPool[tokenAddress] = tokenDividendPool[tokenAddress].add(amount);
        assetIdToToken[assetId] = tokenAddress;

        // Update total property dividends collected
        propertyDividendsCollected = propertyDividendsCollected.add(amount);
        totalRevenueCollected = totalRevenueCollected.add(amount);
        totalRewardPool = totalRewardPool.add(amount);
        pendingRewards = pendingRewards.add(amount);

        emit PropertyDividendReceived(assetId, tokenAddress, amount);
        emit RevenueCollected(amount, "property_dividends");
    }

    /**
     * @dev Internal function to record a dividend claim for a token holder
     * @param tokenAddress The RWA token contract address
     * @param holder The token holder address
     * @param amount The dividend amount claimed
     */
    function _recordDividendClaim(
        address tokenAddress,
        address holder,
        uint256 amount
    ) internal {
        tokenHolderDividendClaims[tokenAddress][holder] = tokenHolderDividendClaims[tokenAddress][holder].add(amount);
        tokenDividendDistributed[tokenAddress] = tokenDividendDistributed[tokenAddress].add(amount);
        distributedRewards = distributedRewards.add(amount);
        pendingRewards = pendingRewards.sub(amount);

        emit DividendClaimRecorded(tokenAddress, holder, amount);
    }

    /**
     * @dev Record a dividend claim for a token holder (external, called by staking contract)
     * @param tokenAddress The RWA token contract address
     * @param holder The token holder address
     * @param amount The dividend amount claimed
     */
    function recordDividendClaim(
        address tokenAddress,
        address holder,
        uint256 amount
    ) external whenNotPaused {
        require(tokenAddress != address(0), "RWARewardDistributor: invalid token address");
        require(holder != address(0), "RWARewardDistributor: invalid holder address");
        require(amount > 0, "RWARewardDistributor: invalid amount");
        // Only staking contract can record claims
        require(msg.sender == rwaStakingAddress, "RWARewardDistributor: unauthorized");

        _recordDividendClaim(tokenAddress, holder, amount);
    }

    /**
     * @dev Distribute dividends to a token holder (called by staking contract)
     * @param tokenAddress The RWA token contract address
     * @param holder The token holder address
     * @param amount The dividend amount to distribute
     */
    function distributeDividendToStaker(
        address tokenAddress,
        address holder,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        require(tokenAddress != address(0), "RWARewardDistributor: invalid token address");
        require(holder != address(0), "RWARewardDistributor: invalid holder address");
        require(amount > 0, "RWARewardDistributor: invalid amount");
        require(msg.sender == rwaStakingAddress, "RWARewardDistributor: unauthorized");
        require(tokenizinToken.balanceOf(address(this)) >= amount, "RWARewardDistributor: insufficient balance");

        // Record the claim
        _recordDividendClaim(tokenAddress, holder, amount);

        // Transfer TPT tokens to holder
        require(tokenizinToken.transfer(holder, amount), "RWARewardDistributor: transfer failed");

        emit DividendDistributedToStaker(tokenAddress, holder, amount);
    }

    /**
     * @dev Get claimable dividends for a token holder
     * @param tokenAddress The RWA token contract address
     * @param holder The token holder address
     * @return The total amount of dividends claimed by this holder
     */
    function getClaimableDividends(
        address tokenAddress,
        address holder
    ) external view returns (uint256) {
        // This returns the total claimed amount
        // Actual claimable amount should be calculated by staking contract based on stake
        return tokenHolderDividendClaims[tokenAddress][holder];
    }

    /**
     * @dev Get dividend pool statistics for a token
     * @param tokenAddress The RWA token contract address
     * @return totalAllocated Total dividends allocated to this token
     * @return totalDistributed Total dividends distributed for this token
     * @return available Available dividends for distribution
     */
    function getTokenDividendStats(address tokenAddress) external view returns (
        uint256 totalAllocated,
        uint256 totalDistributed,
        uint256 available
    ) {
        totalAllocated = tokenDividendPool[tokenAddress];
        totalDistributed = tokenDividendDistributed[tokenAddress];
        available = totalAllocated.sub(totalDistributed);
    }

    /**
     * @dev Get token address for an asset ID
     * @param assetId The asset ID
     * @return The token contract address (zero address if not found)
     */
    function getTokenAddressByAssetId(uint256 assetId) external view returns (address) {
        return assetIdToToken[assetId];
    }

    /**
     * @dev Check if sufficient dividends are available for a token
     * @param tokenAddress The RWA token contract address
     * @param amount The amount to check
     * @return True if sufficient dividends are available
     */
    function hasSufficientDividends(address tokenAddress, uint256 amount) external view returns (bool) {
        uint256 available = tokenDividendPool[tokenAddress].sub(tokenDividendDistributed[tokenAddress]);
        return available >= amount && tokenizinToken.balanceOf(address(this)) >= amount;
    }

    /**
     * @dev Get available balance for distribution
     */
    function getAvailableBalance() external view returns (uint256) {
        return tokenizinToken.balanceOf(address(this));
    }

    /**
     * @dev Get reward pool statistics
     */
    function getRewardPoolStats() external view returns (
        uint256 _totalRewardPool,
        uint256 _distributedRewards,
        uint256 _pendingRewards,
        uint256 _totalRevenueCollected,
        uint256 _marketplaceFeesCollected,
        uint256 _propertyDividendsCollected
    ) {
        return (
            totalRewardPool,
            distributedRewards,
            pendingRewards,
            totalRevenueCollected,
            marketplaceFeesCollected,
            propertyDividendsCollected
        );
    }

    /**
     * @dev Update contract addresses
     */
    function updateAddresses(
        address _rwaStaking,
        address _rwaRevenue,
        address _treasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_rwaStaking != address(0)) {
            rwaStakingAddress = _rwaStaking;
        }
        if (_rwaRevenue != address(0)) {
            rwaRevenueAddress = _rwaRevenue;
        }
        if (_treasury != address(0)) {
            treasuryAddress = _treasury;
        }

        emit ContractAddressesUpdated(rwaStakingAddress, rwaRevenueAddress, treasuryAddress);
    }

    /**
     * @dev Emergency withdrawal of tokens
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount > 0, "RWARewardDistributor: invalid amount");
        
        if (token == address(0)) {
            // Withdraw ETH
            require(amount <= address(this).balance, "RWARewardDistributor: insufficient ETH balance");
            (bool success, ) = payable(treasuryAddress).call{value: amount}("");
            require(success, "RWARewardDistributor: ETH transfer failed");
        } else {
            // Withdraw ERC20 tokens
            IERC20 tokenContract = IERC20(token);
            require(amount <= tokenContract.balanceOf(address(this)), "RWARewardDistributor: insufficient token balance");
            require(tokenContract.transfer(treasuryAddress, amount), "RWARewardDistributor: token transfer failed");
        }

        emit EmergencyWithdrawal(token, amount);
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
     * @dev Allow contract to receive ETH
     */
    receive() external payable {
        // ETH can be converted to TPT tokens for rewards
    }
}
