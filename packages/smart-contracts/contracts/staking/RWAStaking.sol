// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title IRWARevenue
 * @dev Interface for RWARevenue contract
 */
interface IRWARevenue {
    function allocateRevenue(uint256 poolId, uint256 amount, string memory source) external;
    function poolRevenueAllocated(uint256 poolId) external view returns (uint256);
    function poolRevenueDistributed(uint256 poolId) external view returns (uint256);
    function allocateRWADividends(address tokenAddress, uint256 poolId, uint256 amount) external;
    function getRWAPoolDividends(address tokenAddress, uint256 poolId) external view returns (uint256);
}

/**
 * @title IRWARewardDistributor
 * @dev Interface for RewardDistributor contract
 */
interface IRWARewardDistributor {
    function distributeDividendToStaker(address tokenAddress, address holder, uint256 amount) external;
    function recordDividendClaim(address tokenAddress, address holder, uint256 amount) external;
    function getTokenDividendStats(address tokenAddress) external view returns (uint256 totalAllocated, uint256 totalDistributed, uint256 available);
    function hasSufficientDividends(address tokenAddress, uint256 amount) external view returns (bool);
}

/**
 * @title IPaymentTokenConversionService
 * @dev Interface for payment token conversion service
 */
interface IPaymentTokenConversionService {
    function getTPTPrice() external view returns (uint256);
}

/**
 * @title RWAStaking
 * @dev Multi-pool staking contract for TigerPalaceToken with duration-based tiers
 * @author Tokenizin
 */
contract RWAStaking is AccessControl, Pausable, ReentrancyGuard {
    using SafeMath for uint256;

    // Roles
    bytes32 public constant POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");
    bytes32 public constant REWARD_MANAGER_ROLE = keccak256("REWARD_MANAGER_ROLE");

    // Token and contract addresses
    IERC20 public tokenizinToken;
    address public rwaRevenueAddress;
    address public rewardDistributorAddress;
    address public paymentTokenConversionService;

    // Pool configuration
    struct PoolConfig {
        uint256 poolId;
        string name;
        uint256 duration; // in seconds
        uint256 multiplier; // basis points (10000 = 100%)
        uint256 minStake; // minimum stake amount required
        bool active;
        uint256 totalStaked;
        uint256 totalRewards;
    }

    // User stake information
    struct UserStake {
        uint256 amount;
        uint256 startTime;
        uint256 endTime;
        uint256 poolId;
        bool claimed;
        uint256 pendingRewards;
    }

    // RWA Token Staking
    struct RWATokenStake {
        address tokenAddress;      // RWA token contract address
        uint256 amount;            // Staked token amount
        uint256 poolId;            // Staking pool ID (determines APY)
        uint256 startTime;         // Staking start timestamp
        uint256 lastDividendTime;  // Last dividend calculation time
        uint256 accumulatedDividends; // Total dividends accumulated
        bool active;               // Whether stake is active
    }

    // State variables
    mapping(uint256 => PoolConfig) public pools;
    mapping(address => UserStake[]) public userStakes;
    mapping(uint256 => uint256) public poolRewardRates;
    mapping(uint256 => address[]) public poolStakers; // Track stakers per pool
    
    // RWA Token Staking state
    mapping(address => RWATokenStake[]) public rwaTokenStakes; // user => stakes
    mapping(address => bool) public supportedRWATokens; // tokenAddress => isSupported
    mapping(address => mapping(uint256 => address[])) public rwaTokenPoolStakers; // tokenAddress => poolId => stakers
    
    uint256 public nextPoolId = 1;
    uint256 public totalStaked;
    uint256 public totalRewardsDistributed;
    uint256 public totalRWATokensStaked; // Total RWA tokens staked across all tokens

    // Events
    event PoolCreated(uint256 poolId, string name, uint256 duration, uint256 multiplier, uint256 minStake);
    event StakeCreated(address indexed user, uint256 stakeId, uint256 poolId, uint256 amount, uint256 duration);
    event StakeClaimed(address indexed user, uint256 stakeId, uint256 amount, uint256 rewards);
    event RewardsDistributed(uint256 poolId, uint256 amount);
    event PoolConfigUpdated(uint256 poolId, bool active, uint256 multiplier, uint256 minStake);
    event RWATokenStaked(address indexed user, uint256 stakeId, address indexed tokenAddress, uint256 poolId, uint256 amount);
    event RWATokenUnstaked(address indexed user, uint256 stakeId, address indexed tokenAddress, uint256 amount, uint256 dividends);
    event RWADividendsClaimed(address indexed user, uint256 stakeId, address indexed tokenAddress, uint256 amount);
    event RWATokenSupported(address indexed tokenAddress, bool supported);

    constructor(
        address _tigerPalaceToken,
        address _rwaRevenue,
        address _rewardDistributor
    ) {
        require(_tigerPalaceToken != address(0), "RWAStaking: invalid token address");
        require(_rwaRevenue != address(0), "RWAStaking: invalid revenue address");
        require(_rewardDistributor != address(0), "RWAStaking: invalid distributor address");

        tokenizinToken = IERC20(_tigerPalaceToken);
        rwaRevenueAddress = _rwaRevenue;
        rewardDistributorAddress = _rewardDistributor;

        // Setup roles
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(POOL_MANAGER_ROLE, msg.sender);
        _grantRole(REWARD_MANAGER_ROLE, msg.sender);

        // Create default pools
        _createDefaultPools();
    }

    /**
     * @dev Create default staking pools with different durations
     * @dev Multiplier represents bonus percentage: 10000 = 0%, 10500 = 5%, 12000 = 20%, etc.
     */
    function _createDefaultPools() internal {
        // 1 month pool - minimum 100 TPT, 5% bonus reward
        _createPool("1 Month Staking", 30 days, 10500, 100 ether); // 5% bonus
        
        // 3 months pool - minimum 500 TPT, 20% bonus reward
        _createPool("3 Months Staking", 90 days, 12000, 500 ether); // 20% bonus
        
        // 6 months pool - minimum 1000 TPT, 50% bonus reward
        _createPool("6 Months Staking", 180 days, 15000, 1000 ether); // 50% bonus
        
        // 12 months pool - minimum 2000 TPT, 100% bonus reward
        _createPool("12 Months Staking", 365 days, 20000, 2000 ether); // 100% bonus
    }

    /**
     * @dev Create a new staking pool
     */
    function createPool(
        string memory name,
        uint256 duration,
        uint256 multiplier,
        uint256 minStake
    ) external onlyRole(POOL_MANAGER_ROLE) returns (uint256) {
        return _createPool(name, duration, multiplier, minStake);
    }

    /**
     * @dev Internal function to create a pool
     */
    function _createPool(
        string memory name,
        uint256 duration,
        uint256 multiplier,
        uint256 minStake
    ) internal returns (uint256) {
        require(duration > 0, "RWAStaking: invalid duration");
        require(multiplier >= 10000, "RWAStaking: multiplier too low");
        require(minStake > 0, "RWAStaking: invalid minStake");

        uint256 poolId = nextPoolId++;
        pools[poolId] = PoolConfig({
            poolId: poolId,
            name: name,
            duration: duration,
            multiplier: multiplier,
            minStake: minStake,
            active: true,
            totalStaked: 0,
            totalRewards: 0
        });

        emit PoolCreated(poolId, name, duration, multiplier, minStake);
        return poolId;
    }

    /**
     * @dev Stake tokens in a specific pool
     */
    function stake(uint256 poolId, uint256 amount) external whenNotPaused nonReentrant {
        require(pools[poolId].active, "RWAStaking: pool not active");
        require(amount > 0, "RWAStaking: invalid amount");
        require(amount >= pools[poolId].minStake, "RWAStaking: below minimum stake");
        require(tokenizinToken.balanceOf(msg.sender) >= amount, "RWAStaking: insufficient balance");

        // Transfer tokens from user
        require(tokenizinToken.transferFrom(msg.sender, address(this), amount), "RWAStaking: transfer failed");

        // Create user stake
        uint256 stakeId = userStakes[msg.sender].length;
        uint256 endTime = block.timestamp.add(pools[poolId].duration);
        
        userStakes[msg.sender].push(UserStake({
            amount: amount,
            startTime: block.timestamp,
            endTime: endTime,
            poolId: poolId,
            claimed: false,
            pendingRewards: 0
        }));

        // Track staker in pool (add if not already present)
        bool isNewStaker = true;
        for (uint256 i = 0; i < poolStakers[poolId].length; i++) {
            if (poolStakers[poolId][i] == msg.sender) {
                isNewStaker = false;
                break;
            }
        }
        if (isNewStaker) {
            poolStakers[poolId].push(msg.sender);
        }

        // Update pool and global totals
        pools[poolId].totalStaked = pools[poolId].totalStaked.add(amount);
        totalStaked = totalStaked.add(amount);

        emit StakeCreated(msg.sender, stakeId, poolId, amount, pools[poolId].duration);
    }

    /**
     * @dev Claim rewards for a specific stake
     */
    function claimRewards(uint256 stakeId) external whenNotPaused nonReentrant {
        require(stakeId < userStakes[msg.sender].length, "RWAStaking: invalid stake ID");
        
        UserStake storage userStake = userStakes[msg.sender][stakeId];
        require(!userStake.claimed, "RWAStaking: already claimed");
        require(block.timestamp >= userStake.endTime, "RWAStaking: stake not matured");

        // Calculate rewards based on pool multiplier and duration
        uint256 rewards = _calculateRewards(userStake);
        require(rewards > 0, "RWAStaking: no rewards to claim");

        // Update stake state
        userStake.claimed = true;
        userStake.pendingRewards = rewards;

        // Update pool and global totals
        pools[userStake.poolId].totalRewards = pools[userStake.poolId].totalRewards.add(rewards);
        totalRewardsDistributed = totalRewardsDistributed.add(rewards);

        // Transfer rewards to user
        require(tokenizinToken.transfer(msg.sender, rewards), "RWAStaking: reward transfer failed");

        emit StakeClaimed(msg.sender, stakeId, userStake.amount, rewards);
    }

    /**
     * @dev Calculate rewards for a stake
     * @dev Multiplier represents bonus percentage: 10000 = 0%, 10500 = 5%, 12000 = 20%, etc.
     * @dev Formula: reward = amount * (multiplier - 10000) / 10000
     * @dev Example: 1000 tokens with 12000 multiplier = 1000 * (12000 - 10000) / 10000 = 200 tokens reward
     */
    function _calculateRewards(UserStake memory userStake) internal view returns (uint256) {
        // multiplier represents % bonus: 10000 = 0%, 12000 = 20%, etc.
        uint256 bonusRate = pools[userStake.poolId].multiplier.sub(10000);
        uint256 reward = userStake.amount.mul(bonusRate).div(10000);
        return reward;
    }

    /**
     * @dev Get user's stake information
     */
    function getUserStake(address user, uint256 stakeId) external view returns (UserStake memory) {
        require(stakeId < userStakes[user].length, "RWAStaking: invalid stake ID");
        return userStakes[user][stakeId];
    }

    /**
     * @dev Get user's total stakes
     */
    function getUserStakes(address user) external view returns (UserStake[] memory) {
        return userStakes[user];
    }

    /**
     * @dev Get user's pending rewards for a specific stake
     */
    function getPendingRewards(address user, uint256 stakeId) external view returns (uint256) {
        require(stakeId < userStakes[user].length, "RWAStaking: invalid stake ID");
        
        UserStake memory userStake = userStakes[user][stakeId];
        if (userStake.claimed || block.timestamp < userStake.endTime) {
            return 0;
        }
        
        return _calculateRewards(userStake);
    }

    /**
     * @dev Get pool information
     */
    function getPool(uint256 poolId) external view returns (PoolConfig memory) {
        return pools[poolId];
    }

    /**
     * @dev Get all pools
     */
    function getAllPools() external view returns (PoolConfig[] memory) {
        PoolConfig[] memory allPools = new PoolConfig[](nextPoolId - 1);
        for (uint256 i = 1; i < nextPoolId; i++) {
            allPools[i - 1] = pools[i];
        }
        return allPools;
    }

    /**
     * @dev Update pool configuration
     */
    function updatePoolConfig(
        uint256 poolId,
        bool active,
        uint256 multiplier,
        uint256 minStake
    ) external onlyRole(POOL_MANAGER_ROLE) {
        require(poolId > 0 && poolId < nextPoolId, "RWAStaking: invalid pool ID");
        require(multiplier >= 10000, "RWAStaking: multiplier too low");
        require(minStake > 0, "RWAStaking: invalid minStake");

        pools[poolId].active = active;
        pools[poolId].multiplier = multiplier;
        pools[poolId].minStake = minStake;

        emit PoolConfigUpdated(poolId, active, multiplier, minStake);
    }

    /**
     * @dev Distribute rewards to a specific pool
     */
    function distributeRewards(uint256 poolId, uint256 amount) external onlyRole(REWARD_MANAGER_ROLE) whenNotPaused {
        require(poolId > 0 && poolId < nextPoolId, "RWAStaking: invalid pool ID");
        require(amount > 0, "RWAStaking: invalid amount");
        require(tokenizinToken.balanceOf(address(this)) >= amount, "RWAStaking: insufficient balance");

        pools[poolId].totalRewards = pools[poolId].totalRewards.add(amount);
        totalRewardsDistributed = totalRewardsDistributed.add(amount);

        emit RewardsDistributed(poolId, amount);
    }

    /**
     * @dev Get contract statistics
     */
    function getStats() external view returns (
        uint256 _totalStaked,
        uint256 _totalRewardsDistributed,
        uint256 _poolCount
    ) {
        return (totalStaked, totalRewardsDistributed, nextPoolId - 1);
    }

    /**
     * @dev Update contract addresses
     */
    function updateAddresses(
        address _rwaRevenue,
        address _rewardDistributor
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_rwaRevenue != address(0)) {
            rwaRevenueAddress = _rwaRevenue;
        }
        if (_rewardDistributor != address(0)) {
            rewardDistributorAddress = _rewardDistributor;
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
     * @dev Allow contract to receive ETH
     */
    receive() external payable {
        // ETH can be converted to TPT tokens for rewards
    }

    /**
     * @dev Allocate revenue to a pool (wrapper for RWARevenue.allocateRevenue)
     * @param poolId The pool ID to allocate revenue to
     * @param amount The amount of revenue to allocate
     */
    function allocateRevenue(
        uint256 poolId,
        uint256 amount,
        bool /* distributeImmediately - unused, kept for compatibility */
    ) external whenNotPaused {
        require(poolId > 0 && poolId < nextPoolId, "RWAStaking: invalid pool ID");
        require(amount > 0, "RWAStaking: invalid amount");
        require(rwaRevenueAddress != address(0), "RWAStaking: revenue address not set");

        IRWARevenue revenueContract = IRWARevenue(rwaRevenueAddress);
        
        // Check if revenue contract has enough balance
        // If not, try to transfer from this contract (staking contract) if it has tokens
        uint256 revenueBalance = tokenizinToken.balanceOf(rwaRevenueAddress);
        if (revenueBalance < amount) {
            uint256 needed = amount.sub(revenueBalance);
            uint256 stakingBalance = tokenizinToken.balanceOf(address(this));
            
            // If staking contract has enough, transfer to revenue contract
            // Note: Revenue contract should have max wallet exemption set in test setup
            if (stakingBalance >= needed) {
                require(
                    tokenizinToken.transfer(rwaRevenueAddress, needed),
                    "RWAStaking: transfer to revenue contract failed"
                );
            } else {
                // Otherwise, try to transfer from caller (they must have approved this contract)
                // First transfer what we have from staking contract
                uint256 fromCaller = needed.sub(stakingBalance);
                if (stakingBalance > 0) {
                    require(
                        tokenizinToken.transfer(rwaRevenueAddress, stakingBalance),
                        "RWAStaking: transfer to revenue contract failed"
                    );
                }
                // Then transfer remaining from caller directly to revenue contract (bypassing staking contract)
                // This avoids max wallet issues - caller transfers directly
                require(
                    tokenizinToken.transferFrom(msg.sender, rwaRevenueAddress, fromCaller),
                    "RWAStaking: insufficient tokens in revenue contract or from caller"
                );
            }
        }

        // Call allocateRevenue on RWARevenue contract
        // This requires RWAStaking to have REVENUE_MANAGER_ROLE on RWARevenue
        revenueContract.allocateRevenue(poolId, amount, "staking");
    }

    /**
     * @dev Get pending revenue for a user in a specific pool (time-weighted distribution)
     * @param poolId The pool ID
     * @param user The user address
     * @return The pending revenue amount for the user
     */
    function getPendingRevenue( 
        uint256 poolId,
        address user
    ) external view returns (uint256) {
        require(poolId > 0 && poolId < nextPoolId, "RWAStaking: invalid pool ID");
        require(rwaRevenueAddress != address(0), "RWAStaking: revenue address not set");

        IRWARevenue revenueContract = IRWARevenue(rwaRevenueAddress);
        
        // Get allocated and distributed revenue for this pool
        uint256 allocated = revenueContract.poolRevenueAllocated(poolId);
        uint256 distributed = revenueContract.poolRevenueDistributed(poolId);
        uint256 availableRevenue = allocated.sub(distributed);

        if (availableRevenue == 0) {
            return 0;
        }

        // Calculate time-weighted stake for the user
        uint256 userTimeWeightedStake = 0;
        uint256 totalTimeWeightedStake = 0;

        // Iterate through all users to calculate total time-weighted stake
        // Note: This is a simplified version - in production, you'd want to cache this
        for (uint256 i = 0; i < userStakes[user].length; i++) {
            UserStake memory userStake = userStakes[user][i];
            if (userStake.poolId == poolId && !userStake.claimed && block.timestamp >= userStake.startTime) {
                uint256 stakeDuration = block.timestamp.sub(userStake.startTime);
                uint256 timeWeighted = userStake.amount.mul(stakeDuration);
                userTimeWeightedStake = userTimeWeightedStake.add(timeWeighted);
            }
        }

        // Calculate total time-weighted stake for all users in this pool
        // This is expensive but necessary for accurate distribution
        // In production, consider caching or using a different approach
        address[] memory allUsers = _getAllStakersInPool(poolId);
        for (uint256 i = 0; i < allUsers.length; i++) {
            for (uint256 j = 0; j < userStakes[allUsers[i]].length; j++) {
                UserStake memory poolStake = userStakes[allUsers[i]][j];
                if (poolStake.poolId == poolId && !poolStake.claimed && block.timestamp >= poolStake.startTime) {
                    uint256 stakeDuration = block.timestamp.sub(poolStake.startTime);
                    uint256 timeWeighted = poolStake.amount.mul(stakeDuration);
                    totalTimeWeightedStake = totalTimeWeightedStake.add(timeWeighted);
                }
            }
        }

        if (totalTimeWeightedStake == 0) {
            return 0;
        }

        // Calculate user's share: (userTimeWeightedStake / totalTimeWeightedStake) * availableRevenue
        return userTimeWeightedStake.mul(availableRevenue).div(totalTimeWeightedStake);
    }

    /**
     * @dev Get all stakers in a pool (helper function)
     * @param poolId The pool ID
     * @return Array of staker addresses
     */
    function _getAllStakersInPool(uint256 poolId) internal view returns (address[] memory) {
        return poolStakers[poolId];
    }

    // ============ RWA Token Staking Functions ============

    /**
     * @dev Enable or disable support for an RWA token
     * @param tokenAddress The RWA token contract address
     * @param supported Whether the token is supported for staking
     */
    function setSupportedRWAToken(address tokenAddress, bool supported) external onlyRole(POOL_MANAGER_ROLE) {
        require(tokenAddress != address(0), "RWAStaking: invalid token address");
        supportedRWATokens[tokenAddress] = supported;
        emit RWATokenSupported(tokenAddress, supported);
    }

    /**
     * @dev Stake RWA tokens to earn dividends based on staking tier APY
     * @param tokenAddress The RWA token contract address
     * @param amount The amount of tokens to stake
     * @param poolId The staking pool ID (determines APY)
     */
    function stakeRWATokens(
        address tokenAddress,
        uint256 amount,
        uint256 poolId
    ) external whenNotPaused nonReentrant {
        require(supportedRWATokens[tokenAddress], "RWAStaking: token not supported");
        require(amount > 0, "RWAStaking: invalid amount");
        require(poolId > 0 && poolId < nextPoolId, "RWAStaking: invalid pool ID");
        require(pools[poolId].active, "RWAStaking: pool not active");

        IERC20 rwaToken = IERC20(tokenAddress);
        require(rwaToken.balanceOf(msg.sender) >= amount, "RWAStaking: insufficient balance");
        require(rwaToken.transferFrom(msg.sender, address(this), amount), "RWAStaking: transfer failed");

        // Create stake
        uint256 stakeId = rwaTokenStakes[msg.sender].length;
        rwaTokenStakes[msg.sender].push(RWATokenStake({
            tokenAddress: tokenAddress,
            amount: amount,
            poolId: poolId,
            startTime: block.timestamp,
            lastDividendTime: block.timestamp,
            accumulatedDividends: 0,
            active: true
        }));

        // Track stakers per token and pool
        address[] storage stakers = rwaTokenPoolStakers[tokenAddress][poolId];
        bool alreadyStaker = false;
        for (uint256 i = 0; i < stakers.length; i++) {
            if (stakers[i] == msg.sender) {
                alreadyStaker = true;
                break;
            }
        }
        if (!alreadyStaker) {
            stakers.push(msg.sender);
        }

        totalRWATokensStaked = totalRWATokensStaked.add(amount);

        emit RWATokenStaked(msg.sender, stakeId, tokenAddress, poolId, amount);
    }

    /**
     * @dev Unstake RWA tokens and claim accumulated dividends
     * @param stakeId The stake ID to unstake
     */
    function unstakeRWATokens(uint256 stakeId) external whenNotPaused nonReentrant {
        require(stakeId < rwaTokenStakes[msg.sender].length, "RWAStaking: invalid stake ID");
        
        RWATokenStake storage stakeRWAToken = rwaTokenStakes[msg.sender][stakeId];
        require(stakeRWAToken.active, "RWAStaking: stake not active");

        // Update dividend accumulation
        _updateDividendAccumulation(msg.sender, stakeId);

        uint256 amount = stakeRWAToken.amount;
        uint256 dividends = stakeRWAToken.accumulatedDividends;
        address tokenAddress = stakeRWAToken.tokenAddress;

        // Mark stake as inactive
        stakeRWAToken.active = false;

        // Transfer tokens back to user
        IERC20 rwaToken = IERC20(tokenAddress);
        require(rwaToken.transfer(msg.sender, amount), "RWAStaking: token transfer failed");

        // Claim dividends if any
        if (dividends > 0) {
            _claimRWADividendsInternal(msg.sender, stakeId, dividends);
        }

        totalRWATokensStaked = totalRWATokensStaked.sub(amount);

        emit RWATokenUnstaked(msg.sender, stakeId, tokenAddress, amount, dividends);
    }

    /**
     * @dev Calculate accumulated dividends for an RWA token stake
     * @param user The user address
     * @param stakeId The stake ID
     * @return The accumulated dividend amount
     */
    function calculateAccumulatedDividends(
        address user,
        uint256 stakeId
    ) external view returns (uint256) {
        require(stakeId < rwaTokenStakes[user].length, "RWAStaking: invalid stake ID");
        RWATokenStake memory stakeRWAToken = rwaTokenStakes[user][stakeId];
        return _calculateAccumulatedDividends(stakeRWAToken);
    }

    /**
     * @dev Claim dividends for an RWA token stake (tokens remain staked)
     * @param stakeId The stake ID
     */
    function claimRWADividends(uint256 stakeId) external whenNotPaused nonReentrant {
        require(stakeId < rwaTokenStakes[msg.sender].length, "RWAStaking: invalid stake ID");
        RWATokenStake storage stakeRWAToken = rwaTokenStakes[msg.sender][stakeId];
        require(stakeRWAToken.active, "RWAStaking: stake not active");

        // Update dividend accumulation
        _updateDividendAccumulation(msg.sender, stakeId);

        uint256 dividends = stakeRWAToken.accumulatedDividends;
        require(dividends > 0, "RWAStaking: no dividends to claim");

        // Reset accumulated dividends and update last dividend time
        stakeRWAToken.accumulatedDividends = 0;
        stakeRWAToken.lastDividendTime = block.timestamp;

        // Claim dividends
        _claimRWADividendsInternal(msg.sender, stakeId, dividends);
    }

    /**
     * @dev Internal function to update dividend accumulation for a stake
     * @param user The user address
     * @param stakeId The stake ID
     */
    function _updateDividendAccumulation(address user, uint256 stakeId) internal {
        RWATokenStake storage stakeRWAToken = rwaTokenStakes[user][stakeId];
        if (!stakeRWAToken.active) return;

        uint256 newDividends = _calculateAccumulatedDividends(stakeRWAToken);
        stakeRWAToken.accumulatedDividends = stakeRWAToken.accumulatedDividends.add(newDividends);
        stakeRWAToken.lastDividendTime = block.timestamp;
    }

    /**
     * @dev Calculate accumulated dividends for a stake based on APY
     * @param stakeRWAToken The stake to calculate dividends for
     * @return The new dividends accumulated since last update (not including existing accumulated)
     */
    function _calculateAccumulatedDividends(RWATokenStake memory stakeRWAToken) internal view returns (uint256) {
        if (!stakeRWAToken.active || stakeRWAToken.lastDividendTime >= block.timestamp) {
            return 0;
        }

        PoolConfig memory pool = pools[stakeRWAToken.poolId];
        if (!pool.active) {
            return 0; // Pool is inactive, no dividends
        }

        uint256 poolAPY = pool.multiplier; // e.g., 12000 = 20% APY (as bonus percentage)
        
        // Calculate APY rate: multiplier represents bonus percentage
        // For dividend calculation, we use the bonus rate as the APY
        uint256 apyRate = poolAPY.sub(10000); // e.g., 12000 - 10000 = 2000 (20%)
        
        if (apyRate == 0) {
            return 0; // No APY bonus, no dividends
        }
        
        // Calculate time elapsed
        uint256 timeElapsed = block.timestamp.sub(stakeRWAToken.lastDividendTime);
        uint256 secondsPerYear = 365 days;
        
        // Use high-precision calculation to avoid rounding errors
        // Formula: (amount * apyRate * timeElapsed) / (10000 * secondsPerYear)
        // Multiply numerator first to maintain precision
        uint256 numerator = stakeRWAToken.amount.mul(apyRate).mul(timeElapsed);
        uint256 denominator = uint256(10000).mul(secondsPerYear);
        
        return numerator.div(denominator);
    }

    /**
     * @dev Internal function to claim RWA dividends through RewardDistributor
     * @param user The user address
     * @param stakeId The stake ID
     * @param amount The dividend amount to claim
     */
    function _claimRWADividendsInternal(
        address user,
        uint256 stakeId,
        uint256 amount
    ) internal {
        RWATokenStake memory stakeRWAToken = rwaTokenStakes[user][stakeId];
        
        IRWARewardDistributor distributor = IRWARewardDistributor(rewardDistributorAddress);
        
        // Verify sufficient dividends are available
        require(
            distributor.hasSufficientDividends(stakeRWAToken.tokenAddress, amount),
            "RWAStaking: insufficient dividends available"
        );
        
        // Distribute dividends through RewardDistributor
        distributor.distributeDividendToStaker(stakeRWAToken.tokenAddress, user, amount);

        emit RWADividendsClaimed(user, stakeId, stakeRWAToken.tokenAddress, amount);
    }

    /**
     * @dev Get user's RWA token stake information
     * @param user The user address
     * @param stakeId The stake ID
     * @return The stake information
     */
    function getRWATokenStake(address user, uint256 stakeId) external view returns (RWATokenStake memory) {
        require(stakeId < rwaTokenStakes[user].length, "RWAStaking: invalid stake ID");
        return rwaTokenStakes[user][stakeId];
    }

    /**
     * @dev Get all RWA token stakes for a user
     * @param user The user address
     * @return Array of stake information
     */
    function getUserRWATokenStakes(address user) external view returns (RWATokenStake[] memory) {
        return rwaTokenStakes[user];
    }

    /**
     * @dev Get stakers for a specific RWA token and pool
     * @param tokenAddress The RWA token contract address
     * @param poolId The pool ID
     * @return Array of staker addresses
     */
    function getRWATokenPoolStakers(address tokenAddress, uint256 poolId) external view returns (address[] memory) {
        return rwaTokenPoolStakers[tokenAddress][poolId];
    }

    /**
     * @dev Claim dividends for multiple RWA token stakes in one transaction
     * @param stakeIds Array of stake IDs to claim dividends for
     */
    function claimRWADividendsBatch(uint256[] calldata stakeIds) external whenNotPaused nonReentrant {
        require(stakeIds.length > 0, "RWAStaking: empty stake IDs");
        require(stakeIds.length <= 50, "RWAStaking: too many stakes"); // Gas limit protection

        uint256 totalDividends = 0;

        for (uint256 i = 0; i < stakeIds.length; i++) {
            uint256 stakeId = stakeIds[i];
            require(stakeId < rwaTokenStakes[msg.sender].length, "RWAStaking: invalid stake ID");
            
            RWATokenStake storage stakeRWAToken = rwaTokenStakes[msg.sender][stakeId];
            require(stakeRWAToken.active, "RWAStaking: stake not active");

            // Update dividend accumulation
            _updateDividendAccumulation(msg.sender, stakeId);

            uint256 dividends = stakeRWAToken.accumulatedDividends;
            if (dividends > 0) {
                totalDividends = totalDividends.add(dividends);
                
                // Reset accumulated dividends and update last dividend time
                stakeRWAToken.accumulatedDividends = 0;
                stakeRWAToken.lastDividendTime = block.timestamp;

                // Claim dividends
                _claimRWADividendsInternal(msg.sender, stakeId, dividends);
            }
        }

        require(totalDividends > 0, "RWAStaking: no dividends to claim");
    }

    /**
     * @dev Get total accumulated dividends for all active RWA token stakes
     * @param user The user address
     * @return totalDividends Total accumulated dividends across all stakes
     */
    function getTotalAccumulatedDividends(address user) external view returns (uint256 totalDividends) {
        RWATokenStake[] memory stakes = rwaTokenStakes[user];
        
        for (uint256 i = 0; i < stakes.length; i++) {
            RWATokenStake memory stakeRWAToken = stakes[i];
            if (stakeRWAToken.active) {
                uint256 newDividends = _calculateAccumulatedDividends(stakeRWAToken);
                totalDividends = totalDividends.add(stakeRWAToken.accumulatedDividends).add(newDividends);
            }
        }
    }

    /**
     * @dev Get detailed stake information with current dividend accumulation
     * @param user The user address
     * @param stakeId The stake ID
     * @return stakeInfo The stake information
     * @return currentDividends Current accumulated dividends (including new since last update)
     */
    function getRWATokenStakeWithDividends(
        address user,
        uint256 stakeId
    ) external view returns (RWATokenStake memory stakeInfo, uint256 currentDividends) {
        require(stakeId < rwaTokenStakes[user].length, "RWAStaking: invalid stake ID");
        stakeInfo = rwaTokenStakes[user][stakeId];
        currentDividends = stakeInfo.accumulatedDividends;

        if (stakeInfo.active) {
            uint256 newDividends = _calculateAccumulatedDividends(stakeInfo);
            currentDividends = currentDividends.add(newDividends);
        }
    }

    /**
     * @dev Get total staked amount for a user across all RWA tokens
     * @param user The user address
     * @return totalStakedTPT Total amount staked in TPT
     * @return activeStakes Number of active stakes
     */
    function getUserRWATokenStakingSummary(address user) external view returns (
        uint256 totalStakedTPT,    
        uint256 activeStakes
    ) {
        RWATokenStake[] memory stakes = rwaTokenStakes[user];
        
        for (uint256 i = 0; i < stakes.length; i++) {
            RWATokenStake memory stakeRWAToken = stakes[i];
            if (stakeRWAToken.active) {
                totalStakedTPT = totalStakedTPT.add(stakeRWAToken.amount);
                activeStakes = activeStakes.add(1);
            }
        }
    }

    /**
     * @dev Get total staked amount for a specific RWA token and pool
     * @param tokenAddress The RWA token contract address
     * @param poolId The pool ID
     * @return totalStakedTPT Total amount staked in TPT for this token/pool combination
     * @return stakerCount Number of unique stakers
     * @return totalStakedUSD Total staked value in USD for this token/pool combination
     */
    function getRWATokenPoolStats(
        address tokenAddress,
        uint256 poolId
    ) external view returns (
        uint256 totalStakedTPT,    
        uint256 stakerCount,
        uint256 totalStakedUSD
    ) {
        address[] memory stakers = rwaTokenPoolStakers[tokenAddress][poolId];
        stakerCount = stakers.length;
        
        for (uint256 i = 0; i < stakers.length; i++) {
            RWATokenStake[] memory userStakesTPT = rwaTokenStakes[stakers[i]];
            for (uint256 j = 0; j < userStakesTPT.length; j++) {
                if (userStakesTPT[j].active && 
                    userStakesTPT[j].tokenAddress == tokenAddress && 
                    userStakesTPT[j].poolId == poolId) {   
                    totalStakedTPT = totalStakedTPT.add(userStakesTPT[j].amount);
                    totalStakedUSD = totalStakedUSD.add(userStakesTPT[j].amount.mul(_getTokenPriceUSD()));
                }
            }
        }   
    }

    function _getTokenPriceUSD() internal view returns (uint256) {
        return IPaymentTokenConversionService(paymentTokenConversionService).getTPTPrice();
    }

    function _getPaymentTokenConversionService() internal view returns (IPaymentTokenConversionService) {
        return IPaymentTokenConversionService(paymentTokenConversionService);
    }
}
