// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title RWARevenue
 * @dev Manages revenue distribution from property dividends and marketplace fees to stakers
 * @author Tokenizin
 */
contract RWARevenue is AccessControl, Pausable, ReentrancyGuard {
    using SafeMath for uint256;

    // Roles
    bytes32 public constant REVENUE_MANAGER_ROLE = keccak256("REVENUE_MANAGER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    // Token and contract addresses
    IERC20 public tokenizinToken;
    address public rwaStakingAddress;
    address public rewardDistributorAddress;

    // Revenue tracking
    uint256 public totalRevenueAllocated;
    uint256 public totalRevenueDistributed;
    uint256 public pendingRevenue;
    
    // Pool revenue tracking
    mapping(uint256 => uint256) public poolRevenueAllocated;
    mapping(uint256 => uint256) public poolRevenueDistributed;
    
    // RWA Token dividend tracking
    mapping(address => mapping(uint256 => uint256)) public rwaTokenPoolDividends; // tokenAddress => poolId => allocated
    mapping(address => mapping(uint256 => uint256)) public rwaTokenPoolDistributed; // tokenAddress => poolId => distributed
    mapping(address => uint256) public rwaTokenTotalDividends; // tokenAddress => total allocated
    
    // Revenue sources
    uint256 public propertyDividendsReceived;
    uint256 public marketplaceFeesReceived;
    uint256 public stakingRewardsReceived;

    // Events
    event RevenueAllocated(uint256 poolId, uint256 amount, string source);
    event RevenueDistributed(uint256 poolId, uint256 amount);
    event PropertyDividendsReceived(uint256 amount);
    event MarketplaceFeesReceived(uint256 amount);
    event StakingRewardsReceived(uint256 amount);
    event ContractAddressesUpdated(address TigerStaking, address rewardDistributor);
    event RWADividendsAllocated(address indexed tokenAddress, uint256 poolId, uint256 amount);
    event RWADividendsDistributed(address indexed tokenAddress, uint256 poolId, uint256 amount);

    constructor(
        address _tokenizinToken,
        address _rewardDistributor
    ) {
        require(_tokenizinToken != address(0), "RWARevenue: invalid token address");
        require(_rewardDistributor != address(0), "RWARevenue: invalid distributor address");

        tokenizinToken = IERC20(_tokenizinToken);
        rewardDistributorAddress = _rewardDistributor;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(REVENUE_MANAGER_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
    }

    /**
     * @dev Initialize the contract with staking address
     */
    function initialize(address _rwaStaking) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_rwaStaking != address(0), "RWARevenue: invalid staking address");
        rwaStakingAddress = _rwaStaking;
        emit ContractAddressesUpdated(_rwaStaking, rewardDistributorAddress);
    }

    /**
     * @dev Allocate revenue to a specific staking pool
     */
    function allocateRevenue(uint256 poolId, uint256 amount, string memory source) external onlyRole(REVENUE_MANAGER_ROLE) whenNotPaused {
        require(poolId > 0, "RWARevenue: invalid pool ID");
        require(amount > 0, "RWARevenue: invalid amount");
        require(tokenizinToken.balanceOf(address(this)) >= amount, "RWARevenue: insufficient balance");

        poolRevenueAllocated[poolId] = poolRevenueAllocated[poolId].add(amount);
        totalRevenueAllocated = totalRevenueAllocated.add(amount);
        pendingRevenue = pendingRevenue.add(amount);

        emit RevenueAllocated(poolId, amount, source);
    }

    /**
     * @dev Distribute revenue to stakers in a specific pool
     */
    function distributeRevenue(uint256 poolId, uint256 amount) external onlyRole(DISTRIBUTOR_ROLE) whenNotPaused nonReentrant {
        require(poolId > 0, "RWARevenue: invalid pool ID");
        require(amount > 0, "RWARevenue: invalid amount");
        require(amount <= poolRevenueAllocated[poolId], "RWARevenue: insufficient allocated revenue");
        require(rwaStakingAddress != address(0), "RWARevenue: staking address not set");

        // Transfer tokens to staking contract for distribution
        require(tokenizinToken.transfer(rwaStakingAddress, amount), "RWARevenue: transfer failed");

        poolRevenueDistributed[poolId] = poolRevenueDistributed[poolId].add(amount);
        totalRevenueDistributed = totalRevenueDistributed.add(amount);
        pendingRevenue = pendingRevenue.sub(amount);

        emit RevenueDistributed(poolId, amount);
    }

    /**
     * @dev Receive property dividends from RWAToken contracts
     */
    function receivePropertyDividends(uint256 amount) external onlyRole(REVENUE_MANAGER_ROLE) whenNotPaused {
        require(amount > 0, "RWARevenue: invalid amount");
        require(tokenizinToken.balanceOf(address(this)) >= amount, "RWARevenue: insufficient balance");

        propertyDividendsReceived = propertyDividendsReceived.add(amount);
        totalRevenueAllocated = totalRevenueAllocated.add(amount);
        pendingRevenue = pendingRevenue.add(amount);

        emit PropertyDividendsReceived(amount);
    }

    /**
     * @dev Receive marketplace fees
     */
    function receiveMarketplaceFees(uint256 amount) external onlyRole(REVENUE_MANAGER_ROLE) whenNotPaused {
        require(amount > 0, "RWARevenue: invalid amount");
        require(tokenizinToken.balanceOf(address(this)) >= amount, "RWARevenue: insufficient balance");

        marketplaceFeesReceived = marketplaceFeesReceived.add(amount);
        totalRevenueAllocated = totalRevenueAllocated.add(amount);
        pendingRevenue = pendingRevenue.add(amount);

        emit MarketplaceFeesReceived(amount);
    }

    /**
     * @dev Receive staking rewards from RewardDistributor
     */
    function receiveStakingRewards(uint256 amount) external onlyRole(REVENUE_MANAGER_ROLE) whenNotPaused {
        require(amount > 0, "RWARevenue: invalid amount");
        require(tokenizinToken.balanceOf(address(this)) >= amount, "RWARevenue: insufficient balance");

        stakingRewardsReceived = stakingRewardsReceived.add(amount);
        totalRevenueAllocated = totalRevenueAllocated.add(amount);
        pendingRevenue = pendingRevenue.add(amount);

        emit StakingRewardsReceived(amount);
    }

    /**
     * @dev Distribute marketplace fees to all pools based on their stake weights
     */
    function distributeMarketplaceFees(uint256 totalAmount) external onlyRole(DISTRIBUTOR_ROLE) whenNotPaused {
        require(totalAmount > 0, "RWARevenue: invalid amount");
        require(rwaStakingAddress != address(0), "RWARevenue: staking address not set");

        // This would typically call the staking contract to get pool weights
        // and distribute proportionally, but for now we'll just allocate to pending
        pendingRevenue = pendingRevenue.add(totalAmount);
        totalRevenueAllocated = totalRevenueAllocated.add(totalAmount);

        emit MarketplaceFeesReceived(totalAmount);
    }

    /**
     * @dev Allocate dividends to RWA token staking pools
     * @param tokenAddress The RWA token contract address
     * @param poolId The staking pool ID
     * @param amount The dividend amount to allocate
     */
    function allocateRWADividends(
        address tokenAddress,
        uint256 poolId,
        uint256 amount
    ) external onlyRole(REVENUE_MANAGER_ROLE) whenNotPaused {
        require(tokenAddress != address(0), "RWARevenue: invalid token address");
        require(poolId > 0, "RWARevenue: invalid pool ID");
        require(amount > 0, "RWARevenue: invalid amount");
        require(tokenizinToken.balanceOf(address(this)) >= amount, "RWARevenue: insufficient balance");

        rwaTokenPoolDividends[tokenAddress][poolId] = rwaTokenPoolDividends[tokenAddress][poolId].add(amount);
        rwaTokenTotalDividends[tokenAddress] = rwaTokenTotalDividends[tokenAddress].add(amount);
        totalRevenueAllocated = totalRevenueAllocated.add(amount);
        pendingRevenue = pendingRevenue.add(amount);

        emit RWADividendsAllocated(tokenAddress, poolId, amount);
    }

    /**
     * @dev Get allocated dividends for a specific RWA token and pool
     * @param tokenAddress The RWA token contract address
     * @param poolId The staking pool ID
     * @return The allocated dividend amount
     */
    function getRWAPoolDividends(
        address tokenAddress,
        uint256 poolId
    ) external view returns (uint256) {
        return rwaTokenPoolDividends[tokenAddress][poolId];
    }

    /**
     * @dev Get RWA token dividend statistics
     * @param tokenAddress The RWA token contract address
     * @param poolId The staking pool ID
     * @return allocated Total dividends allocated to this token/pool
     * @return distributed Total dividends distributed for this token/pool
     * @return available Available dividends for distribution
     */
    function getRWATokenPoolStats(
        address tokenAddress,
        uint256 poolId
    ) external view returns (
        uint256 allocated,
        uint256 distributed,
        uint256 available
    ) {
        allocated = rwaTokenPoolDividends[tokenAddress][poolId];
        distributed = rwaTokenPoolDistributed[tokenAddress][poolId];
        available = allocated.sub(distributed);
    }

    /**
     * @dev Get revenue statistics for a specific pool
     */
    function getPoolRevenueStats(uint256 poolId) external view returns (
        uint256 allocated,
        uint256 distributed,
        uint256 pending
    ) {
        allocated = poolRevenueAllocated[poolId];
        distributed = poolRevenueDistributed[poolId];
        pending = allocated.sub(distributed);
    }

    /**
     * @dev Get overall revenue statistics
     */
    function getRevenueStats() external view returns (
        uint256 _totalAllocated,
        uint256 _totalDistributed,
        uint256 _pendingRevenue,
        uint256 _propertyDividends,
        uint256 _marketplaceFees,
        uint256 _stakingRewards
    ) {
        return (
            totalRevenueAllocated,
            totalRevenueDistributed,
            pendingRevenue,
            propertyDividendsReceived,
            marketplaceFeesReceived,
            stakingRewardsReceived
        );
    }

    /**
     * @dev Update contract addresses
     */
    function updateAddresses(
        address _rwaStaking,
        address _rewardDistributor
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_rwaStaking != address(0)) {
            rwaStakingAddress = _rwaStaking;
        }
        if (_rewardDistributor != address(0)) {
            rewardDistributorAddress = _rewardDistributor;
        }

        emit ContractAddressesUpdated(rwaStakingAddress, rewardDistributorAddress);
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
        // ETH can be converted to TPT tokens for revenue distribution
    }
}
