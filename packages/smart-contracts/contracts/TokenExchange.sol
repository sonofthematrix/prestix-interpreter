// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TokenExchange
 * @notice Exchange TPT tokens for RWA property tokens at fixed rates
 * @dev Implements token swapping with configurable exchange rates per property token
 */
contract TokenExchange is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // TPT token contract
    IERC20 public immutable tptToken;

    // Mapping from property token address => exchange rate (TPT per 1 property token with 18 decimals)
    // Example: 100e18 means 100 TPT per 1 property token
    mapping(address => uint256) public exchangeRates;

    // Mapping to track if a property token is enabled for exchange
    mapping(address => bool) public isPropertyTokenEnabled;

    // Array of all property tokens (for enumeration)
    address[] public propertyTokens;

    // Events
    event ExchangeExecuted(
        address indexed user,
        address indexed propertyToken,
        uint256 tptAmount,
        uint256 propertyTokenAmount,
        uint256 timestamp
    );

    event ExchangeRateSet(
        address indexed propertyToken,
        uint256 oldRate,
        uint256 newRate,
        uint256 timestamp
    );

    event PropertyTokenEnabled(
        address indexed propertyToken,
        bool enabled,
        uint256 timestamp
    );

    event TPTDeposited(
        address indexed depositor,
        uint256 amount,
        uint256 timestamp
    );

    event TPTWithdrawn(
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    event PropertyTokensWithdrawn(
        address indexed propertyToken,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    /**
     * @notice Constructor
     * @param _tptToken Address of TPT token contract
     */
    constructor(address _tptToken) {
        require(_tptToken != address(0), "Invalid TPT token address");
        tptToken = IERC20(_tptToken);
    }

    /**
     * @notice Set exchange rate for a property token
     * @param propertyToken Address of property token
     * @param rate Exchange rate (TPT per 1 property token with 18 decimals)
     */
    function setExchangeRate(address propertyToken, uint256 rate) external onlyOwner {
        require(propertyToken != address(0), "Invalid property token address");
        require(rate > 0, "Exchange rate must be greater than 0");

        uint256 oldRate = exchangeRates[propertyToken];
        exchangeRates[propertyToken] = rate;

        // Add to property tokens array if not already present
        if (!isPropertyTokenEnabled[propertyToken]) {
            propertyTokens.push(propertyToken);
        }

        emit ExchangeRateSet(propertyToken, oldRate, rate, block.timestamp);
    }

    /**
     * @notice Enable or disable a property token for exchange
     * @param propertyToken Address of property token
     * @param enabled Whether the token should be enabled
     */
    function setPropertyTokenEnabled(address propertyToken, bool enabled) external onlyOwner {
        require(propertyToken != address(0), "Invalid property token address");
        require(exchangeRates[propertyToken] > 0, "Exchange rate not set");

        isPropertyTokenEnabled[propertyToken] = enabled;

        emit PropertyTokenEnabled(propertyToken, enabled, block.timestamp);
    }

    /**
     * @notice Exchange TPT tokens for property tokens
     * @param propertyToken Address of property token to receive
     * @param tptAmount Amount of TPT to exchange
     * @return propertyTokenAmount Amount of property tokens received
     */
    function exchangeTPTForPropertyToken(
        address propertyToken,
        uint256 tptAmount
    ) external nonReentrant whenNotPaused returns (uint256 propertyTokenAmount) {
        require(propertyToken != address(0), "Invalid property token address");
        require(tptAmount > 0, "Amount must be greater than 0");
        require(isPropertyTokenEnabled[propertyToken], "Property token not enabled");

        uint256 rate = exchangeRates[propertyToken];
        require(rate > 0, "Exchange rate not set");

        // Calculate property token amount: (tptAmount * 1e18) / rate
        // This gives us the amount of property tokens with proper decimals
        propertyTokenAmount = (tptAmount * 1e18) / rate;
        require(propertyTokenAmount > 0, "Property token amount too small");

        // Check contract has enough property tokens
        IERC20 propertyTokenContract = IERC20(propertyToken);
        uint256 contractBalance = propertyTokenContract.balanceOf(address(this));
        require(contractBalance >= propertyTokenAmount, "Insufficient property token balance");

        // Transfer TPT from user to contract
        tptToken.safeTransferFrom(msg.sender, address(this), tptAmount);

        // Transfer property tokens from contract to user
        propertyTokenContract.safeTransfer(msg.sender, propertyTokenAmount);

        emit ExchangeExecuted(
            msg.sender,
            propertyToken,
            tptAmount,
            propertyTokenAmount,
            block.timestamp
        );

        return propertyTokenAmount;
    }

    /**
     * @notice Calculate how many property tokens will be received for a given TPT amount
     * @param propertyToken Address of property token
     * @param tptAmount Amount of TPT tokens
     * @return propertyTokenAmount Amount of property tokens that will be received
     */
    function calculateExchange(
        address propertyToken,
        uint256 tptAmount
    ) external view returns (uint256 propertyTokenAmount) {
        require(propertyToken != address(0), "Invalid property token address");
        require(tptAmount > 0, "Amount must be greater than 0");

        uint256 rate = exchangeRates[propertyToken];
        require(rate > 0, "Exchange rate not set");

        propertyTokenAmount = (tptAmount * 1e18) / rate;
        return propertyTokenAmount;
    }

    /**
     * @notice Get all property tokens
     * @return Array of property token addresses
     */
    function getPropertyTokens() external view returns (address[] memory) {
        return propertyTokens;
    }

    /**
     * @notice Get property token count
     * @return Number of property tokens
     */
    function getPropertyTokenCount() external view returns (uint256) {
        return propertyTokens.length;
    }

    /**
     * @notice Deposit TPT tokens to the contract (for liquidity)
     * @param amount Amount of TPT to deposit
     */
    function depositTPT(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        tptToken.safeTransferFrom(msg.sender, address(this), amount);

        emit TPTDeposited(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Withdraw TPT tokens from the contract (owner only)
     * @param amount Amount of TPT to withdraw
     */
    function withdrawTPT(uint256 amount) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");

        uint256 balance = tptToken.balanceOf(address(this));
        require(balance >= amount, "Insufficient TPT balance");

        tptToken.safeTransfer(msg.sender, amount);

        emit TPTWithdrawn(msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Withdraw property tokens from the contract (owner only)
     * @param propertyToken Address of property token
     * @param amount Amount to withdraw
     */
    function withdrawPropertyTokens(
        address propertyToken,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(propertyToken != address(0), "Invalid property token address");
        require(amount > 0, "Amount must be greater than 0");

        IERC20 propertyTokenContract = IERC20(propertyToken);
        uint256 balance = propertyTokenContract.balanceOf(address(this));
        require(balance >= amount, "Insufficient property token balance");

        propertyTokenContract.safeTransfer(msg.sender, amount);

        emit PropertyTokensWithdrawn(propertyToken, msg.sender, amount, block.timestamp);
    }

    /**
     * @notice Pause the contract (emergency stop)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Get TPT balance of this contract
     * @return TPT balance
     */
    function getTPTBalance() external view returns (uint256) {
        return tptToken.balanceOf(address(this));
    }

    /**
     * @notice Get property token balance of this contract
     * @param propertyToken Address of property token
     * @return Property token balance
     */
    function getPropertyTokenBalance(address propertyToken) external view returns (uint256) {
        require(propertyToken != address(0), "Invalid property token address");
        return IERC20(propertyToken).balanceOf(address(this));
    }
}
