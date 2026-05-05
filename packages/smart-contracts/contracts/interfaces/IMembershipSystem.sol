// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title IMembershipSystem
 * @dev Interface for the Tokenizin Membership System
 * @author Tokenizin
 */
interface IMembershipSystem {
    // Events
    event MemberRegistered(address indexed member, uint8 tier, uint256 timestamp);
    event MembershipUpgraded(address indexed member, uint8 fromTier, uint8 toTier);
    event MembershipExpired(address indexed member, uint8 tier);
    event BenefitClaimed(address indexed member, string benefitType, uint256 amount);

    // Enums
    enum MembershipTier {
        NONE,      // 0 - No membership
        BRONZE,    // 1 - Basic membership
        SILVER,    // 2 - Premium membership  
        GOLD,      // 3 - VIP membership
        PLATINUM,  // 4 - Elite membership
        DIAMOND    // 5 - Ultimate membership
    }

    // Structs
    struct MemberInfo {
        MembershipTier tier;
        uint256 joinDate;
        uint256 expiryDate;
        uint256 totalInvested;
        uint256 totalRewards;
        uint256 referralCount;
        bool isActive;
        address referrer;
    }

    struct TierBenefits {
        uint256 discountPercentage;     // Trading fee discount (basis points)
        uint256 bonusRewardMultiplier;  // Reward multiplier (basis points)
        uint256 maxGamingTransfer;      // Max amount transferable to gaming
        bool prioritySupport;
        bool exclusiveAssets;
        uint256 referralBonus;          // Referral bonus percentage
    }

    // Functions
    function registerMember(address member, address referrer) external;
    function upgradeMembership(address member, MembershipTier newTier) external;
    function renewMembership(address member, uint256 duration) external;
    
    function getMemberInfo(address member) external view returns (MemberInfo memory);
    function getMembershipTier(address member) external view returns (MembershipTier);
    function getTierBenefits(MembershipTier tier) external view returns (TierBenefits memory);
    
    function isActiveMember(address member) external view returns (bool);
    function canAccessAsset(address member, uint256 assetId) external view returns (bool);
    function getDiscountRate(address member) external view returns (uint256);
    function getRewardMultiplier(address member) external view returns (uint256);
    
    function claimReferralReward(address member) external;
    function updateTierRequirements(MembershipTier tier, uint256 minInvestment) external;
    
    function getTotalMembers() external view returns (uint256);
    function getMembersByTier(MembershipTier tier) external view returns (address[] memory);
}
