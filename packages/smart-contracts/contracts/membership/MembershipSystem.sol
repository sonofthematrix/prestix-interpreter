// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../interfaces/IMembershipSystem.sol";

/**
 * @title MembershipSystem
 * @dev Manages membership tiers and benefits for Tokenizin users
 * @author Tokenizin
 */
contract MembershipSystem is IMembershipSystem, AccessControl, Pausable, ReentrancyGuard {
    using SafeMath for uint256;

    // Roles
    bytes32 public constant MEMBERSHIP_MANAGER_ROLE = keccak256("MEMBERSHIP_MANAGER_ROLE");
    bytes32 public constant BENEFIT_MANAGER_ROLE = keccak256("BENEFIT_MANAGER_ROLE");

    // State variables
    mapping(address => MemberInfo) private _members;
    mapping(MembershipTier => TierBenefits) private _tierBenefits;
    mapping(MembershipTier => uint256) private _tierRequirements; // Minimum investment required
    mapping(MembershipTier => uint256) private _memberCounts;
    mapping(MembershipTier => address[]) private _membersByTier;
    mapping(address => uint256) private _memberTierIndex;

    uint256 private _totalMembers;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_YEAR = 365 days;

    // Events
    event MemberInvestmentUpdated(address indexed member, uint256 newInvestment);
    event MemberRewardsUpdated(address indexed member, uint256 newRewards);
    event TierRequirementsUpdated(uint8 tier, uint256 newRequirement); 
    event MemberRenewed(address indexed member, uint256 newExpiryDate);

    /**
     * @dev Constructor
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MEMBERSHIP_MANAGER_ROLE, msg.sender);
        _grantRole(BENEFIT_MANAGER_ROLE, msg.sender);

        _initializeTierBenefits();
        _initializeTierRequirements();
    }

    /**
     * @dev Register a new member
     */
    function registerMember(
        address member,
        address referrer
    ) external override onlyRole(MEMBERSHIP_MANAGER_ROLE) whenNotPaused {
        require(member != address(0), "MembershipSystem: invalid member address");
        require(_members[member].tier == MembershipTier.NONE, "MembershipSystem: member already registered");

        _members[member] = MemberInfo({
            tier: MembershipTier.BRONZE,
            joinDate: block.timestamp,
            expiryDate: block.timestamp + SECONDS_PER_YEAR,
            totalInvested: 0,
            totalRewards: 0,
            referralCount: 0,
            isActive: true,
            referrer: referrer
        });

        _addMemberToTier(member, MembershipTier.BRONZE);
        _totalMembers = _totalMembers.add(1);

        // Handle referral if valid
        if (referrer != address(0) && _members[referrer].isActive) {
            _members[referrer].referralCount = _members[referrer].referralCount.add(1);
        }

        emit MemberRegistered(member, uint8(MembershipTier.BRONZE), block.timestamp);
    }

    /**
     * @dev Upgrade membership tier based on investment
     */
    function upgradeMembership(
        address member,
        MembershipTier newTier
    ) external override onlyRole(MEMBERSHIP_MANAGER_ROLE) whenNotPaused {
        require(_members[member].isActive, "MembershipSystem: member not active");
        require(newTier > _members[member].tier, "MembershipSystem: invalid tier upgrade");
        require(newTier <= MembershipTier.DIAMOND, "MembershipSystem: tier too high");

        // Check investment requirements
        uint256 requiredInvestment = _tierRequirements[newTier];
        require(_members[member].totalInvested >= requiredInvestment, "MembershipSystem: insufficient investment");

        MembershipTier oldTier = _members[member].tier;
        _removeMemberFromTier(member, oldTier);
        _members[member].tier = newTier;
        _addMemberToTier(member, newTier);

        emit MembershipUpgraded(member, uint8(oldTier), uint8(newTier));
    }

    /**
     * @dev Renew membership
     */
    function renewMembership(
        address member,
        uint256 duration
    ) external override onlyRole(MEMBERSHIP_MANAGER_ROLE) {
        require(_members[member].tier != MembershipTier.NONE, "MembershipSystem: member not found");
        require(duration > 0, "MembershipSystem: invalid duration");

        _members[member].expiryDate = _members[member].expiryDate.add(duration);
        
        if (!_members[member].isActive) {
            _members[member].isActive = true;
        }
    }

    /**
     * @dev Update member's investment amount
     */
    function updateMemberInvestment(
        address member,
        uint256 investmentAmount
    ) external onlyRole(MEMBERSHIP_MANAGER_ROLE) {
        require(_members[member].isActive, "MembershipSystem: member not active");
        
        _members[member].totalInvested = _members[member].totalInvested.add(investmentAmount);
        
        // Check for automatic tier upgrade
        _checkAndUpgradeTier(member);
    }

    /**
     * @dev Update member's reward amount
     */
    function updateMemberRewards(
        address member,
        uint256 rewardAmount
    ) external onlyRole(MEMBERSHIP_MANAGER_ROLE) {
        require(_members[member].isActive, "MembershipSystem: member not active");
        
        _members[member].totalRewards = _members[member].totalRewards.add(rewardAmount);
    }

    /**
     * @dev Get member information
     */
    function getMemberInfo(address member) external view override returns (MemberInfo memory) {
        return _members[member];
    }

    /**
     * @dev Get membership tier
     */
    function getMembershipTier(address member) external view override returns (MembershipTier) {
        return _members[member].tier;
    }

    /**
     * @dev Get tier benefits
     */
    function getTierBenefits(MembershipTier tier) external view override returns (TierBenefits memory) {
        return _tierBenefits[tier];
    }

    /**
     * @dev Check if member is active
     */
    function isActiveMember(address member) external view override returns (bool) {
        return _members[member].isActive && _members[member].expiryDate > block.timestamp;
    }

    /**
     * @dev Check if member can access exclusive asset
     */
    function canAccessAsset(address member, uint256) external view override returns (bool) {
        if (!_members[member].isActive) return false;
        
        MembershipTier tier = _members[member].tier;
        TierBenefits memory benefits = _tierBenefits[tier];
        
        return benefits.exclusiveAssets;
    }

    /**
     * @dev Get discount rate for member
     */
    function getDiscountRate(address member) external view override returns (uint256) {
        if (!_members[member].isActive) return 0;
        
        return _tierBenefits[_members[member].tier].discountPercentage;
    }

    /**
     * @dev Get reward multiplier for member
     */
    function getRewardMultiplier(address member) external view override returns (uint256) {
        if (!_members[member].isActive) return BASIS_POINTS;
        
        return _tierBenefits[_members[member].tier].bonusRewardMultiplier;
    }

    /**
     * @dev Claim referral reward
     */
    function claimReferralReward(address member) external override nonReentrant whenNotPaused {
        require(msg.sender == member, "MembershipSystem: unauthorized");
        require(_members[member].isActive, "MembershipSystem: member not active");
        require(_members[member].referralCount > 0, "MembershipSystem: no referrals");

        MembershipTier tier = _members[member].tier;
        TierBenefits memory benefits = _tierBenefits[tier];
        
        uint256 rewardAmount = _members[member].referralCount.mul(benefits.referralBonus);
        require(rewardAmount > 0, "MembershipSystem: no reward available");

        // Reset referral count after claiming
        _members[member].referralCount = 0;
        _members[member].totalRewards = _members[member].totalRewards.add(rewardAmount);

        // Transfer reward (assuming contract holds ETH for rewards)
        payable(member).transfer(rewardAmount);

        emit BenefitClaimed(member, "REFERRAL_REWARD", rewardAmount);
    }

    /**
     * @dev Update tier requirements
     */
    function updateTierRequirements(
        MembershipTier tier,
        uint256 minInvestment
    ) external override onlyRole(BENEFIT_MANAGER_ROLE) {
        require(tier > MembershipTier.NONE && tier <= MembershipTier.DIAMOND, "MembershipSystem: invalid tier");
        
        _tierRequirements[tier] = minInvestment;
        
        emit TierRequirementsUpdated(uint8(tier), minInvestment);
    }

    /**
     * @dev Get total members
     */
    function getTotalMembers() external view override returns (uint256) {
        return _totalMembers;
    }

    /**
     * @dev Get members by tier
     */
    function getMembersByTier(MembershipTier tier) external view override returns (address[] memory) {
        return _membersByTier[tier];
    }

    /**
     * @dev Get tier requirements
     */
    function getTierRequirement(MembershipTier tier) external view returns (uint256) {
        return _tierRequirements[tier];
    }

    /**
     * @dev Get member count by tier
     */
    function getMemberCountByTier(MembershipTier tier) external view returns (uint256) {
        return _memberCounts[tier];
    }

    /**
     * @dev Initialize tier benefits
     */
    function _initializeTierBenefits() private {
        // BRONZE
        _tierBenefits[MembershipTier.BRONZE] = TierBenefits({
            discountPercentage: 0,      // 0% discount
            bonusRewardMultiplier: BASIS_POINTS,  // 1x multiplier
            maxGamingTransfer: 1 ether,  // 1 ETH max
            prioritySupport: false,
            exclusiveAssets: false,
            referralBonus: 0.01 ether   // 0.01 ETH per referral
        });

        // SILVER
        _tierBenefits[MembershipTier.SILVER] = TierBenefits({
            discountPercentage: 100,    // 1% discount
            bonusRewardMultiplier: 11000, // 1.1x multiplier
            maxGamingTransfer: 5 ether,  // 5 ETH max
            prioritySupport: false,
            exclusiveAssets: false,
            referralBonus: 0.02 ether   // 0.02 ETH per referral
        });

        // GOLD
        _tierBenefits[MembershipTier.GOLD] = TierBenefits({
            discountPercentage: 200,    // 2% discount
            bonusRewardMultiplier: 12000, // 1.2x multiplier
            maxGamingTransfer: 10 ether, // 10 ETH max
            prioritySupport: true,
            exclusiveAssets: false,
            referralBonus: 0.05 ether   // 0.05 ETH per referral
        });

        // PLATINUM
        _tierBenefits[MembershipTier.PLATINUM] = TierBenefits({
            discountPercentage: 350,    // 3.5% discount
            bonusRewardMultiplier: 13500, // 1.35x multiplier
            maxGamingTransfer: 25 ether, // 25 ETH max
            prioritySupport: true,
            exclusiveAssets: true,
            referralBonus: 0.1 ether    // 0.1 ETH per referral
        });

        // DIAMOND
        _tierBenefits[MembershipTier.DIAMOND] = TierBenefits({
            discountPercentage: 500,    // 5% discount
            bonusRewardMultiplier: 15000, // 1.5x multiplier
            maxGamingTransfer: 100 ether, // 100 ETH max
            prioritySupport: true,
            exclusiveAssets: true,
            referralBonus: 0.2 ether    // 0.2 ETH per referral
        });
    }

    /**
     * @dev Initialize tier requirements
     */
    function _initializeTierRequirements() private {
        _tierRequirements[MembershipTier.BRONZE] = 0;          // Free tier
        _tierRequirements[MembershipTier.SILVER] = 1 ether;    // 1 ETH
        _tierRequirements[MembershipTier.GOLD] = 5 ether;      // 5 ETH
        _tierRequirements[MembershipTier.PLATINUM] = 25 ether; // 25 ETH
        _tierRequirements[MembershipTier.DIAMOND] = 100 ether; // 100 ETH
    }

    /**
     * @dev Check and upgrade tier automatically
     */
    function _checkAndUpgradeTier(address member) private {
        MemberInfo storage memberInfo = _members[member];
        MembershipTier currentTier = memberInfo.tier;
        MembershipTier newTier = currentTier;

        // Check for tier upgrade based on investment
        if (memberInfo.totalInvested >= _tierRequirements[MembershipTier.DIAMOND] && currentTier < MembershipTier.DIAMOND) {
            newTier = MembershipTier.DIAMOND;
        } else if (memberInfo.totalInvested >= _tierRequirements[MembershipTier.PLATINUM] && currentTier < MembershipTier.PLATINUM) {
            newTier = MembershipTier.PLATINUM;
        } else if (memberInfo.totalInvested >= _tierRequirements[MembershipTier.GOLD] && currentTier < MembershipTier.GOLD) {
            newTier = MembershipTier.GOLD;
        } else if (memberInfo.totalInvested >= _tierRequirements[MembershipTier.SILVER] && currentTier < MembershipTier.SILVER) {
            newTier = MembershipTier.SILVER;
        }

        if (newTier != currentTier) {
            _removeMemberFromTier(member, currentTier);
            memberInfo.tier = newTier;
            _addMemberToTier(member, newTier);

            emit MembershipUpgraded(member, uint8(currentTier), uint8(newTier));
        }
    }

    /**
     * @dev Add member to tier tracking
     */
    function _addMemberToTier(address member, MembershipTier tier) private {
        _membersByTier[tier].push(member);
        _memberTierIndex[member] = _membersByTier[tier].length - 1;
        _memberCounts[tier] = _memberCounts[tier].add(1);
    }

    /**
     * @dev Remove member from tier tracking
     */
    function _removeMemberFromTier(address member, MembershipTier tier) private {
        uint256 index = _memberTierIndex[member];
        uint256 lastIndex = _membersByTier[tier].length - 1;

        if (index != lastIndex) {
            address lastMember = _membersByTier[tier][lastIndex];
            _membersByTier[tier][index] = lastMember;
            _memberTierIndex[lastMember] = index;
        }

        _membersByTier[tier].pop();
        delete _memberTierIndex[member];
        _memberCounts[tier] = _memberCounts[tier].sub(1);
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
     * @dev Allow contract to receive ETH for rewards
     */
    receive() external payable {}

    /**
     * @dev Withdraw ETH from contract
     */
    function withdrawETH(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount <= address(this).balance, "MembershipSystem: insufficient balance");
        payable(msg.sender).transfer(amount);
    }
}
