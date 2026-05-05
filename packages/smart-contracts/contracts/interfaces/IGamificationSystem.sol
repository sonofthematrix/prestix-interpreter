// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IGamificationSystem
 * @dev Interface for the Tokenizin Gamification and Rewards System
 * @author Tokenizin
 */
interface IGamificationSystem {
    // Events
    event AchievementUnlocked(address indexed user, uint256 indexed achievementId, uint256 reward);
    event RewardClaimed(address indexed user, uint256 amount, string rewardType);
    event StreakUpdated(address indexed user, uint256 newStreak, uint256 bonusEarned);
    event LevelUp(address indexed user, uint256 newLevel, uint256 bonusReward);
    event QuestCompleted(address indexed user, uint256 indexed questId, uint256 reward);

    // Structs
    struct UserProfile {
        uint256 level;
        uint256 experience;
        uint256 totalRewards;
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 lastActivityDate;
        uint256 questsCompleted;
        uint256 achievementsUnlocked;
        bool[] achievements;
    }

    struct Achievement {
        uint256 id;
        string name;
        string description;
        uint256 rewardAmount;
        string category; // INVESTMENT, GAMING, SOCIAL, MILESTONE
        uint256 targetValue;
        bool isActive;
    }

    struct Quest {
        uint256 id;
        string name;
        string description;
        uint256 rewardAmount;
        uint256 experience;
        string questType; // DAILY, WEEKLY, MONTHLY, SPECIAL
        uint256 targetValue;
        uint256 deadline;
        bool isActive;
    }

    struct RewardPool {
        uint256 totalPool;
        uint256 distributedAmount;
        uint256 remainingAmount;
        uint256 lastUpdateTime;
    }

    // Functions
    function getUserProfile(address user) external view returns (UserProfile memory);
    function getUserLevel(address user) external view returns (uint256);
    function getUserExperience(address user) external view returns (uint256);
    
    function addExperience(address user, uint256 amount, string calldata activity) external;
    function updateStreak(address user) external;
    function checkAndUnlockAchievements(address user) external;
    
    function createAchievement(
        string calldata name,
        string calldata description,
        uint256 rewardAmount,
        string calldata category,
        uint256 targetValue
    ) external returns (uint256 achievementId);
    
    function createQuest(
        string calldata name,
        string calldata description,
        uint256 rewardAmount,
        uint256 experience,
        string calldata questType,
        uint256 targetValue,
        uint256 deadline
    ) external returns (uint256 questId);
    
    function completeQuest(address user, uint256 questId) external;
    function claimReward(uint256 amount, string calldata rewardType) external;
    
    function getAchievement(uint256 achievementId) external view returns (Achievement memory);
    function getQuest(uint256 questId) external view returns (Quest memory);
    function getUserAchievements(address user) external view returns (uint256[] memory);
    function getUserActiveQuests(address user) external view returns (uint256[] memory);
    
    function calculateLevelFromExperience(uint256 experience) external pure returns (uint256);
    function getExperienceForNextLevel(uint256 currentLevel) external pure returns (uint256);
    
    function getRewardPool() external view returns (RewardPool memory);
    function addToRewardPool(uint256 amount) external;
    function distributeDailyRewards() external;
}
