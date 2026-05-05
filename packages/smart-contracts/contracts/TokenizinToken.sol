// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title TokenizinToken (TKNZN)
 * @notice Upgradeable ERC20 token for Tokenizin RWA Marketplace
 * @dev Utility token for marketplace fees, listing costs, and subscriptions
 *
 * Features:
 * - Max supply: 100,000,000 TKNZN
 * - Initial mint: 10,000,000 TKNZN to admin wallet
 * - Upgradeable via UUPS proxy pattern (ProxyAdmin contract)
 * - Pausable for emergencies
 * - Burnable for deflationary mechanics
 * - Role-based access control (Admin, Minter, Pauser)
 * - 18 decimals (standard ERC20)
 *
 * Use Cases:
 * - Marketplace listing fees
 * - Subscription payments
 * - Property token purchases (via TokenExchange)
 * - Staking rewards
 * - Governance (future)
 *
 * Roles:
 * - DEFAULT_ADMIN_ROLE: Can grant/revoke roles, upgrade contract
 * - MINTER_ROLE: Can mint new tokens (up to max supply)
 * - PAUSER_ROLE: Can pause/unpause transfers
 * - UPGRADER_ROLE: Can upgrade contract implementation
 */
contract TokenizinToken is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    /// @notice Role identifier for accounts that can mint tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Role identifier for accounts that can pause/unpause
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice Role identifier for accounts that can upgrade the contract
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @notice Maximum token supply (100 million TKNZN)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;

    /// @notice Initial minted amount (10 million TKNZN)
    uint256 public constant INITIAL_MINT = 10_000_000 * 10**18;

    /// @notice Emitted when tokens are minted
    event TokensMinted(address indexed to, uint256 amount, uint256 newTotalSupply);

    /// @notice Emitted when the contract is paused
    event ContractPaused(address indexed pauser);

    /// @notice Emitted when the contract is unpaused
    event ContractUnpaused(address indexed pauser);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the upgradeable contract
     * @dev Replaces constructor for upgradeable contracts
     * @param admin The address that will receive admin role and initial tokens
     */
    function initialize(address admin) public initializer {
        require(admin != address(0), "TKNZN: admin is zero address");

        __ERC20_init("Tokenizin Token", "TKNZN");
        __ERC20Burnable_init();
        __ERC20Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        // Grant roles to admin
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
        _grantRole(UPGRADER_ROLE, admin);

        // Mint initial supply to admin
        _mint(admin, INITIAL_MINT);

        emit TokensMinted(admin, INITIAL_MINT, INITIAL_MINT);
    }

    /**
     * @notice Mints new tokens to specified address
     * @dev Only accounts with MINTER_ROLE can call this
     * @param to The address to receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        require(to != address(0), "TKNZN: mint to zero address");
        require(totalSupply() + amount <= MAX_SUPPLY, "TKNZN: exceeds max supply");

        _mint(to, amount);

        emit TokensMinted(to, amount, totalSupply());
    }

    /**
     * @notice Pauses all token transfers
     * @dev Only accounts with PAUSER_ROLE can call this
     */
    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
        emit ContractPaused(msg.sender);
    }

    /**
     * @notice Unpauses all token transfers
     * @dev Only accounts with PAUSER_ROLE can call this
     */
    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    /**
     * @notice Returns the remaining mintable supply
     * @return The amount of tokens that can still be minted
     */
    function remainingSupply() public view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }

    /**
     * @notice Checks if max supply has been reached
     * @return True if total supply equals max supply
     */
    function isMaxSupplyReached() public view returns (bool) {
        return totalSupply() >= MAX_SUPPLY;
    }

    /**
     * @notice Authorizes contract upgrades
     * @dev Only accounts with UPGRADER_ROLE can upgrade
     * @param newImplementation The address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation)
        internal
        view
        onlyRole(UPGRADER_ROLE)
        override
    {
        require(newImplementation != address(0), "TKNZN: new implementation is zero address");
    }

    /**
     * @notice Hook that is called before any token transfer
     * @dev Combines pausable and standard ERC20 checks
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
