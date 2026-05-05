// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IGamingIntegration
 * @dev Interface for gaming platform integrations (PAM, QTech, etc.)
 * @author Tokenizin
 */
interface IGamingIntegration {
    // Events
    event FundsTransferredToGaming(
        address indexed user,
        uint256 amount,
        string platform,
        string externalUserId
    );
    
    event GamingReturnsProcessed(
        address indexed user,
        uint256 amount,
        string platform,
        int256 netChange
    );
    
    event GamingSessionStarted(
        address indexed user,
        string sessionId,
        string platform,
        uint256 initialBalance
    );
    
    event GamingSessionEnded(
        address indexed user,
        string sessionId,
        uint256 finalBalance,
        int256 netResult
    );
    
    event PlatformRegistered(string platformId, address integrationContract, bool isActive);

    // Structs
    struct GamingAccount {
        string externalUserId;
        string platform;
        uint256 currentBalance;
        uint256 totalDeposited;
        uint256 totalWithdrawn;
        int256 lifetimePnL;
        uint256 lastSyncTime;
        bool isActive;
    }

    struct GamingSession {
        string sessionId;
        address user;
        string platform;
        uint256 startTime;
        uint256 endTime;
        uint256 initialBalance;
        uint256 finalBalance;
        int256 netResult;
        string status; // ACTIVE, COMPLETED, ABORTED
    }

    struct PlatformConfig {
        string platformId;
        address integrationContract;
        uint256 minTransferAmount;
        uint256 maxTransferAmount;
        uint256 feePercentage;
        bool isActive;
        bool requiresKYC;
    }

    // Functions
    function registerGamingAccount(
        address user,
        string calldata platform,
        string calldata externalUserId
    ) external;
    
    function transferToGaming(
        address user,
        uint256 amount,
        string calldata platform
    ) external returns (bool success);
    
    function processGamingReturn(
        address user,
        uint256 amount,
        string calldata platform,
        string calldata sessionId
    ) external;
    
    function startGamingSession(
        address user,
        string calldata platform,
        uint256 initialBalance
    ) external returns (string memory sessionId);
    
    function endGamingSession(
        string calldata sessionId,
        uint256 finalBalance
    ) external;
    
    function getGamingAccount(address user, string calldata platform) 
        external view returns (GamingAccount memory);
    
    function getGamingSession(string calldata sessionId) 
        external view returns (GamingSession memory);
    
    function getUserGamingSessions(address user) 
        external view returns (GamingSession[] memory);
    
    function getPlatformConfig(string calldata platformId) 
        external view returns (PlatformConfig memory);
    
    function registerPlatform(
        string calldata platformId,
        address integrationContract,
        uint256 minTransfer,
        uint256 maxTransfer,
        uint256 feePercentage,
        bool requiresKYC
    ) external;
    
    function updatePlatformStatus(string calldata platformId, bool isActive) external;
    function syncUserBalance(address user, string calldata platform) external;
    
    function calculateTransferFee(string calldata platform, uint256 amount) 
        external view returns (uint256);
    
    function getActivePlatforms() external view returns (string[] memory);
}
