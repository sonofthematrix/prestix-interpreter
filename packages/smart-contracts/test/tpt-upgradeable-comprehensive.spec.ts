import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Comprehensive TigerPalaceToken Upgradeable Deployment Test
 * 
 * This test validates the complete upgradeable deployment pattern matching production:
 * 1. Deploy implementation contract
 * 2. Deploy UUPS proxy
 * 3. Initialize proxy
 * 4. Verify configuration (roles, metadata, constants)
 * 5. Test minting functionality
 * 6. Test token distribution
 * 7. Test pause/unpause functionality
 * 8. Test burn functionality
 * 9. Test upgrade authorization
 * 10. Verify ecosystem readiness
 */
describe("TigerPalaceToken Upgradeable Comprehensive Test", () => {
  let deployer: SignerWithAddress;
  let admin: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let tigerPalaceTokenImpl: any;
  let tokenizinToken: any; // Proxy instance
  let proxyAddress: string;
  let implementationAddress: string;

  const INITIAL_MINT = ethers.parseEther("10000000"); // 10M TPT
  const MAX_SUPPLY = ethers.parseEther("100000000"); // 100M TPT

  beforeEach(async () => {
    [deployer, admin, user1, user2, user3] = await ethers.getSigners();
  });

  describe("Step 1: Deploy Implementation Contract", () => {
    it("Should deploy TigerPalaceToken implementation (for verification)", async () => {
      console.log("\n📦 Step 1: Deploying TigerPalaceToken implementation...");
      console.log("   Note: upgrades.deployProxy will deploy implementation automatically");

      const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");
      tigerPalaceTokenImpl = await TigerPalaceToken.deploy();
      await tigerPalaceTokenImpl.waitForDeployment();

      const implAddress = await tigerPalaceTokenImpl.getAddress();
      const code = await ethers.provider.getCode(implAddress);

      expect(code).to.not.equal("0x", "Implementation should have code");
      expect(code.length).to.be.greaterThan(2, "Implementation code should not be empty");

      console.log(`✅ Implementation deployed at: ${implAddress}`);
      console.log(`   Code length: ${code.length} bytes`);
      console.log(`   (This step is for verification - proxy deployment will use ContractFactory)`);
    });
  });

  describe("Step 2: Deploy UUPS Proxy", () => {
    it("Should deploy UUPS proxy for TigerPalaceToken", async () => {
      console.log("\n📦 Step 2: Deploying UUPS proxy...");

      // Get ContractFactory (upgrades.deployProxy needs factory, not instance)
      const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");

      // Deploy proxy using OpenZeppelin Upgrades plugin (matching production)
      // This automatically deploys implementation and proxy
      const tptToken = await upgrades.deployProxy(
        TigerPalaceToken,
        [admin.address], // initializer arguments
        {
          initializer: "initialize",
          kind: "uups", // Use UUPS proxy pattern
        }
      );

      await tptToken.waitForDeployment();
      tokenizinToken = tptToken;
      proxyAddress = await tptToken.getAddress();
      implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

      // Get implementation instance for verification
      tigerPalaceTokenImpl = await ethers.getContractAt("TigerPalaceToken", implementationAddress);

      // Verify proxy has code
      const proxyCode = await ethers.provider.getCode(proxyAddress);
      expect(proxyCode).to.not.equal("0x", "Proxy should have code");

      // Verify implementation address has code
      const implCode = await ethers.provider.getCode(implementationAddress);
      expect(implCode).to.not.equal("0x", "Implementation should have code");

      console.log(`✅ Proxy deployed at: ${proxyAddress}`);
      console.log(`   Implementation: ${implementationAddress}`);
      console.log(`   Proxy code length: ${proxyCode.length} bytes`);
    });
  });

  describe("Step 3: Initialize Proxy", () => {
    it("Should initialize proxy with admin address", async () => {
      console.log("\n📦 Step 3: Initializing proxy...");

      // If proxy not deployed yet, deploy it
      if (!tokenizinToken) {
        const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");

        const tptToken = await upgrades.deployProxy(
          TigerPalaceToken,
          [admin.address],
          {
            initializer: "initialize",
            kind: "uups",
          }
        );
        await tptToken.waitForDeployment();
        tokenizinToken = tptToken;
        proxyAddress = await tptToken.getAddress();
        implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        tigerPalaceTokenImpl = await ethers.getContractAt("TigerPalaceToken", implementationAddress);
      }

      // Verify initialization by checking admin balance (should have INITIAL_MINT)
      const adminBalance = await tokenizinToken.balanceOf(admin.address);
      expect(adminBalance).to.equal(INITIAL_MINT, "Admin should receive initial mint");

      // Verify total supply
      const totalSupply = await tokenizinToken.totalSupply();
      expect(totalSupply).to.equal(INITIAL_MINT, "Total supply should equal initial mint");

      // Verify cannot reinitialize
      await expect(tokenizinToken.initialize(admin.address)).to.be.revertedWith(
        "Initializable: contract is already initialized"
      );

      console.log(`✅ Proxy initialized successfully`);
      console.log(`   Admin balance: ${ethers.formatEther(adminBalance)} TPT`);
      console.log(`   Total supply: ${ethers.formatEther(totalSupply)} TPT`);
    });
  });

  describe("Step 4: Verify Configuration", () => {
    beforeEach(async () => {
      // Ensure token is deployed and initialized
      if (!tokenizinToken) {
        const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");

        const tptToken = await upgrades.deployProxy(
          TigerPalaceToken,
          [admin.address],
          {
            initializer: "initialize",
            kind: "uups",
          }
        );
        await tptToken.waitForDeployment();
        tokenizinToken = tptToken;
        proxyAddress = await tptToken.getAddress();
        implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        tigerPalaceTokenImpl = await ethers.getContractAt("TigerPalaceToken", implementationAddress);
      }
    });

    it("Should have correct token metadata", async () => {
      console.log("\n📋 Step 4a: Verifying token metadata...");

      const name = await tokenizinToken.name();
      const symbol = await tokenizinToken.symbol();
      const decimals = await tokenizinToken.decimals();

      expect(name).to.equal("Tiger Palace Token", "Token name should be correct");
      expect(symbol).to.equal("TPT", "Token symbol should be correct");
      expect(decimals).to.equal(18, "Token decimals should be 18");

      console.log(`✅ Token metadata verified:`);
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Decimals: ${decimals}`);
    });

    it("Should have correct constants", async () => {
      console.log("\n📋 Step 4b: Verifying constants...");

      const maxSupply = await tokenizinToken.MAX_SUPPLY();
      const initialMint = await tokenizinToken.INITIAL_MINT();

      expect(maxSupply).to.equal(MAX_SUPPLY, "MAX_SUPPLY should be 100M TPT");
      expect(initialMint).to.equal(INITIAL_MINT, "INITIAL_MINT should be 10M TPT");

      console.log(`✅ Constants verified:`);
      console.log(`   MAX_SUPPLY: ${ethers.formatEther(maxSupply)} TPT`);
      console.log(`   INITIAL_MINT: ${ethers.formatEther(initialMint)} TPT`);
    });

    it("Should have all roles granted to admin", async () => {
      console.log("\n📋 Step 4c: Verifying roles...");

      const DEFAULT_ADMIN_ROLE = await tokenizinToken.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await tokenizinToken.MINTER_ROLE();
      const PAUSER_ROLE = await tokenizinToken.PAUSER_ROLE();
      const UPGRADER_ROLE = await tokenizinToken.UPGRADER_ROLE();

      const hasAdmin = await tokenizinToken.hasRole(DEFAULT_ADMIN_ROLE, admin.address);
      const hasMinter = await tokenizinToken.hasRole(MINTER_ROLE, admin.address);
      const hasPauser = await tokenizinToken.hasRole(PAUSER_ROLE, admin.address);
      const hasUpgrader = await tokenizinToken.hasRole(UPGRADER_ROLE, admin.address);

      expect(hasAdmin).to.be.true;
      expect(hasMinter).to.be.true;
      expect(hasPauser).to.be.true;
      expect(hasUpgrader).to.be.true;

      console.log(`✅ All roles verified for admin:`);
      console.log(`   DEFAULT_ADMIN_ROLE: ${hasAdmin}`);
      console.log(`   MINTER_ROLE: ${hasMinter}`);
      console.log(`   PAUSER_ROLE: ${hasPauser}`);
      console.log(`   UPGRADER_ROLE: ${hasUpgrader}`);
    });

    it("Should have correct initial state", async () => {
      console.log("\n📋 Step 4d: Verifying initial state...");

      const totalSupply = await tokenizinToken.totalSupply();
      const adminBalance = await tokenizinToken.balanceOf(admin.address);
      const remainingSupply = await tokenizinToken.remainingSupply();
      const isMaxSupplyReached = await tokenizinToken.isMaxSupplyReached();

      expect(totalSupply).to.equal(INITIAL_MINT);
      expect(adminBalance).to.equal(INITIAL_MINT);
      expect(remainingSupply).to.equal(MAX_SUPPLY - INITIAL_MINT);
      expect(isMaxSupplyReached).to.be.false;

      console.log(`✅ Initial state verified:`);
      console.log(`   Total supply: ${ethers.formatEther(totalSupply)} TPT`);
      console.log(`   Admin balance: ${ethers.formatEther(adminBalance)} TPT`);
      console.log(`   Remaining supply: ${ethers.formatEther(remainingSupply)} TPT`);
      console.log(`   Max supply reached: ${isMaxSupplyReached}`);
    });
  });

  describe("Step 5: Test Minting Functionality", () => {
    beforeEach(async () => {
      // Ensure token is deployed and initialized
      if (!tokenizinToken) {
        const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");

        const tptToken = await upgrades.deployProxy(
          TigerPalaceToken,
          [admin.address],
          {
            initializer: "initialize",
            kind: "uups",
          }
        );
        await tptToken.waitForDeployment();
        tokenizinToken = tptToken;
        proxyAddress = await tptToken.getAddress();
        implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        tigerPalaceTokenImpl = await ethers.getContractAt("TigerPalaceToken", implementationAddress);
      }
    });

    it("Should mint tokens correctly", async () => {
      console.log("\n💰 Step 5a: Testing minting...");

      const mintAmount = ethers.parseEther("1000000"); // 1M TPT
      const initialBalance = await tokenizinToken.balanceOf(user1.address);
      const initialSupply = await tokenizinToken.totalSupply();

      // Mint tokens to user1
      await expect(tokenizinToken.connect(admin).mint(user1.address, mintAmount))
        .to.emit(tokenizinToken, "TokensMinted")
        .withArgs(user1.address, mintAmount, initialSupply + mintAmount);

      const finalBalance = await tokenizinToken.balanceOf(user1.address);
      const finalSupply = await tokenizinToken.totalSupply();

      expect(finalBalance).to.equal(initialBalance + mintAmount);
      expect(finalSupply).to.equal(initialSupply + mintAmount);

      console.log(`✅ Minted ${ethers.formatEther(mintAmount)} TPT to user1`);
      console.log(`   User1 balance: ${ethers.formatEther(finalBalance)} TPT`);
      console.log(`   Total supply: ${ethers.formatEther(finalSupply)} TPT`);
    });

    it("Should fail to mint if exceeds MAX_SUPPLY", async () => {
      console.log("\n💰 Step 5b: Testing MAX_SUPPLY limit...");

      const currentSupply = await tokenizinToken.totalSupply();
      const remainingSupply = await tokenizinToken.remainingSupply();
      const excessAmount = remainingSupply + ethers.parseEther("1"); // 1 TPT over limit

      await expect(
        tokenizinToken.connect(admin).mint(user1.address, excessAmount)
      ).to.be.revertedWith("TPT: exceeds max supply");

      console.log(`✅ MAX_SUPPLY limit enforced correctly`);
    });

    it("Should only allow MINTER_ROLE to mint", async () => {
      console.log("\n💰 Step 5c: Testing MINTER_ROLE requirement...");

      const mintAmount = ethers.parseEther("1000");

      // Non-minter should fail
      await expect(
        tokenizinToken.connect(user1).mint(user2.address, mintAmount)
      ).to.be.revertedWith(/AccessControl: account .* is missing role/);

      console.log(`✅ MINTER_ROLE requirement enforced`);
    });
  });

  describe("Step 6: Test Distribution", () => {
    beforeEach(async () => {
      // Ensure token is deployed and initialized
      if (!tokenizinToken) {
        const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");

        const tptToken = await upgrades.deployProxy(
          TigerPalaceToken,
          [admin.address],
          {
            initializer: "initialize",
            kind: "uups",
          }
        );
        await tptToken.waitForDeployment();
        tokenizinToken = tptToken;
        proxyAddress = await tptToken.getAddress();
        implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        tigerPalaceTokenImpl = await ethers.getContractAt("TigerPalaceToken", implementationAddress);
      }

      // Mint tokens to admin for distribution (ensure sufficient balance)
      const minRequired = ethers.parseEther("500000"); // 500K TPT minimum for distribution tests
      const adminBalance = await tokenizinToken.balanceOf(admin.address);
      if (adminBalance < minRequired) {
        const needed = minRequired - adminBalance;
        await tokenizinToken.connect(admin).mint(admin.address, needed);
      }
    });

    it("Should distribute tokens to multiple recipients", async () => {
      console.log("\n📤 Step 6: Testing token distribution...");

      const distributionAmount = ethers.parseEther("100000"); // 100K TPT each
      const adminBalanceBefore = await tokenizinToken.balanceOf(admin.address);

      // Get initial balances (may have tokens from previous tests)
      const user1BalanceBefore = await tokenizinToken.balanceOf(user1.address);
      const user2BalanceBefore = await tokenizinToken.balanceOf(user2.address);
      const user3BalanceBefore = await tokenizinToken.balanceOf(user3.address);

      // Distribute to user1
      await tokenizinToken.connect(admin).transfer(user1.address, distributionAmount);
      const user1BalanceAfter = await tokenizinToken.balanceOf(user1.address);
      expect(user1BalanceAfter).to.equal(user1BalanceBefore + distributionAmount);

      // Distribute to user2
      await tokenizinToken.connect(admin).transfer(user2.address, distributionAmount);
      const user2BalanceAfter = await tokenizinToken.balanceOf(user2.address);
      expect(user2BalanceAfter).to.equal(user2BalanceBefore + distributionAmount);

      // Distribute to user3
      await tokenizinToken.connect(admin).transfer(user3.address, distributionAmount);
      const user3BalanceAfter = await tokenizinToken.balanceOf(user3.address);
      expect(user3BalanceAfter).to.equal(user3BalanceBefore + distributionAmount);

      // Verify admin balance decreased correctly
      const adminBalanceAfter = await tokenizinToken.balanceOf(admin.address);
      const expectedBalance = adminBalanceBefore - distributionAmount * 3n;
      expect(adminBalanceAfter).to.equal(expectedBalance);

      console.log(`✅ Distributed tokens to 3 recipients:`);
      console.log(`   User1: ${ethers.formatEther(user1BalanceBefore)} → ${ethers.formatEther(user1BalanceAfter)} TPT (+${ethers.formatEther(distributionAmount)})`);
      console.log(`   User2: ${ethers.formatEther(user2BalanceBefore)} → ${ethers.formatEther(user2BalanceAfter)} TPT (+${ethers.formatEther(distributionAmount)})`);
      console.log(`   User3: ${ethers.formatEther(user3BalanceBefore)} → ${ethers.formatEther(user3BalanceAfter)} TPT (+${ethers.formatEther(distributionAmount)})`);
      console.log(`   Admin: ${ethers.formatEther(adminBalanceBefore)} → ${ethers.formatEther(adminBalanceAfter)} TPT`);
    });
  });

  describe("Step 7: Test Pause/Unpause", () => {
    beforeEach(async () => {
      // Ensure token is deployed and initialized
      if (!tokenizinToken) {
        const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");
        tigerPalaceTokenImpl = await TigerPalaceToken.deploy();
        await tigerPalaceTokenImpl.waitForDeployment();

        const tptToken = await upgrades.deployProxy(
          tigerPalaceTokenImpl,
          [admin.address],
          {
            initializer: "initialize",
            kind: "uups",
          }
        );
        await tptToken.waitForDeployment();
        tokenizinToken = tptToken;
        proxyAddress = await tptToken.getAddress();
      }

      // Mint and distribute tokens for testing
      await tokenizinToken.connect(admin).mint(admin.address, ethers.parseEther("1000000"));
      await tokenizinToken.connect(admin).mint(user1.address, ethers.parseEther("100000"));
    });

    it("Should pause and unpause transfers", async () => {
      console.log("\n⏸️ Step 7a: Testing pause/unpause...");

      // Verify not paused initially
      expect(await tokenizinToken.paused()).to.be.false;

      // Pause contract
      await expect(tokenizinToken.connect(admin).pause())
        .to.emit(tokenizinToken, "ContractPaused")
        .withArgs(admin.address);

      expect(await tokenizinToken.paused()).to.be.true;

      // Verify transfers are blocked when paused
      await expect(
        tokenizinToken.connect(user1).transfer(user2.address, ethers.parseEther("1000"))
      ).to.be.revertedWith("ERC20Pausable: token transfer while paused");

      // Unpause contract
      await expect(tokenizinToken.connect(admin).unpause())
        .to.emit(tokenizinToken, "ContractUnpaused")
        .withArgs(admin.address);

      expect(await tokenizinToken.paused()).to.be.false;

      // Verify transfers work after unpause
      const user2BalanceBefore = await tokenizinToken.balanceOf(user2.address);
      const transferAmount = ethers.parseEther("1000");
      await tokenizinToken.connect(user1).transfer(user2.address, transferAmount);
      const user2BalanceAfter = await tokenizinToken.balanceOf(user2.address);
      expect(user2BalanceAfter).to.equal(user2BalanceBefore + transferAmount);

      console.log(`✅ Pause/unpause functionality verified`);
    });

    it("Should only allow PAUSER_ROLE to pause/unpause", async () => {
      console.log("\n⏸️ Step 7b: Testing PAUSER_ROLE requirement...");

      // Non-pauser should fail
      await expect(tokenizinToken.connect(user1).pause()).to.be.revertedWith(
        /AccessControl: account .* is missing role/
      );

      console.log(`✅ PAUSER_ROLE requirement enforced`);
    });
  });

  describe("Step 8: Test Burn Functionality", () => {
    beforeEach(async () => {
      // Ensure token is deployed and initialized
      if (!tokenizinToken) {
        const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");
        tigerPalaceTokenImpl = await TigerPalaceToken.deploy();
        await tigerPalaceTokenImpl.waitForDeployment();

        const tptToken = await upgrades.deployProxy(
          tigerPalaceTokenImpl,
          [admin.address],
          {
            initializer: "initialize",
            kind: "uups",
          }
        );
        await tptToken.waitForDeployment();
        tokenizinToken = tptToken;
        proxyAddress = await tptToken.getAddress();
      }

      // Mint tokens to user1 for burning
      await tokenizinToken.connect(admin).mint(user1.address, ethers.parseEther("1000000"));
    });

    it("Should burn tokens correctly", async () => {
      console.log("\n🔥 Step 8: Testing burn functionality...");

      const burnAmount = ethers.parseEther("100000"); // 100K TPT
      const initialBalance = await tokenizinToken.balanceOf(user1.address);
      const initialSupply = await tokenizinToken.totalSupply();

      // Burn tokens
      await tokenizinToken.connect(user1).burn(burnAmount);

      const finalBalance = await tokenizinToken.balanceOf(user1.address);
      const finalSupply = await tokenizinToken.totalSupply();

      expect(finalBalance).to.equal(initialBalance - burnAmount);
      expect(finalSupply).to.equal(initialSupply - burnAmount);

      console.log(`✅ Burned ${ethers.formatEther(burnAmount)} TPT`);
      console.log(`   User1 balance: ${ethers.formatEther(finalBalance)} TPT`);
      console.log(`   Total supply: ${ethers.formatEther(finalSupply)} TPT`);
    });
  });

  describe("Step 9: Test Upgrade Authorization", () => {
    beforeEach(async () => {
      // Ensure token is deployed and initialized
      if (!tokenizinToken) {
        const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");

        const tptToken = await upgrades.deployProxy(
          TigerPalaceToken,
          [admin.address],
          {
            initializer: "initialize",
            kind: "uups",
          }
        );
        await tptToken.waitForDeployment();
        tokenizinToken = tptToken;
        proxyAddress = await tptToken.getAddress();
        implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        tigerPalaceTokenImpl = await ethers.getContractAt("TigerPalaceToken", implementationAddress);
      }
    });

    it("Should have correct upgrade authorization", async () => {
      console.log("\n⬆️ Step 9: Testing upgrade authorization...");

      const UPGRADER_ROLE = await tokenizinToken.UPGRADER_ROLE();
      const hasUpgraderRole = await tokenizinToken.hasRole(UPGRADER_ROLE, admin.address);

      expect(hasUpgraderRole).to.be.true;

      // Verify upgrade can be authorized (actual upgrade test would be in separate test)
      // The _authorizeUpgrade function is internal, so we verify the role exists
      console.log(`✅ UPGRADER_ROLE verified for admin`);
      console.log(`   Admin has UPGRADER_ROLE: ${hasUpgraderRole}`);
    });
  });

  describe("Step 10: Verify Ecosystem Readiness", () => {
    beforeEach(async () => {
      // Ensure token is deployed and initialized
      if (!tokenizinToken) {
        const TigerPalaceToken = await ethers.getContractFactory("TigerPalaceToken");
        tigerPalaceTokenImpl = await TigerPalaceToken.deploy();
        await tigerPalaceTokenImpl.waitForDeployment();

        const tptToken = await upgrades.deployProxy(
          tigerPalaceTokenImpl,
          [admin.address],
          {
            initializer: "initialize",
            kind: "uups",
          }
        );
        await tptToken.waitForDeployment();
        tokenizinToken = tptToken;
        proxyAddress = await tptToken.getAddress();
      }

      // Ensure sufficient balance for ecosystem deployments
      const adminBalance = await tokenizinToken.balanceOf(admin.address);
      const minRequired = ethers.parseEther("10000000"); // 10M TPT
      if (adminBalance < minRequired) {
        await tokenizinToken.connect(admin).mint(admin.address, minRequired - adminBalance);
      }
    });

    it("Should support approve and transferFrom for ecosystem contracts", async () => {
      console.log("\n🌐 Step 10a: Testing approve/transferFrom...");

      const approveAmount = ethers.parseEther("1000000"); // 1M TPT
      const transferAmount = ethers.parseEther("100000"); // 100K TPT

      // Mint tokens to user1
      await tokenizinToken.connect(admin).mint(user1.address, approveAmount);

      // User1 approves user2 to spend tokens
      await tokenizinToken.connect(user1).approve(user2.address, approveAmount);
      const allowance = await tokenizinToken.allowance(user1.address, user2.address);
      expect(allowance).to.equal(approveAmount);

      // User2 transfers from user1
      const user3BalanceBefore = await tokenizinToken.balanceOf(user3.address);
      await tokenizinToken
        .connect(user2)
        .transferFrom(user1.address, user3.address, transferAmount);

      const user3BalanceAfter = await tokenizinToken.balanceOf(user3.address);
      expect(user3BalanceAfter).to.equal(user3BalanceBefore + transferAmount);

      const remainingAllowance = await tokenizinToken.allowance(user1.address, user2.address);
      expect(remainingAllowance).to.equal(approveAmount - transferAmount);

      console.log(`✅ Approve/transferFrom functionality verified`);
      console.log(`   User3 received: ${ethers.formatEther(transferAmount)} TPT`);
    });

    it("Should have sufficient balance for ecosystem deployments", async () => {
      console.log("\n🌐 Step 10b: Verifying ecosystem readiness...");

      const adminBalance = await tokenizinToken.balanceOf(admin.address);
      const minRequired = ethers.parseEther("10000000"); // 10M TPT minimum

      expect(adminBalance).to.be.at.least(minRequired, "Admin should have sufficient balance");

      // Verify token is not paused
      expect(await tokenizinToken.paused()).to.be.false;

      // Verify proxy address is accessible
      const code = await ethers.provider.getCode(proxyAddress);
      expect(code).to.not.equal("0x", "Proxy should have code");

      console.log(`✅ Token ready for ecosystem deployments:`);
      console.log(`   Admin balance: ${ethers.formatEther(adminBalance)} TPT`);
      console.log(`   Token paused: ${await tokenizinToken.paused()}`);
      console.log(`   Proxy address: ${proxyAddress}`);
      console.log(`   Implementation: ${implementationAddress}`);
    });

    it("Should work correctly through proxy address", async () => {
      console.log("\n🌐 Step 10c: Verifying proxy functionality...");

      // All operations should work through proxy address
      const name = await tokenizinToken.name();
      const symbol = await tokenizinToken.symbol();
      const totalSupply = await tokenizinToken.totalSupply();
      const adminBalance = await tokenizinToken.balanceOf(admin.address);

      expect(name).to.equal("Tiger Palace Token");
      expect(symbol).to.equal("TPT");
      expect(totalSupply).to.be.gt(0);
      expect(adminBalance).to.be.gt(0);

      // Verify we can call functions through proxy
      const contractAtProxy = await ethers.getContractAt("TigerPalaceToken", proxyAddress);
      const nameFromProxy = await contractAtProxy.name();
      expect(nameFromProxy).to.equal(name);

      console.log(`✅ All functions accessible through proxy address`);
    });
  });
});

