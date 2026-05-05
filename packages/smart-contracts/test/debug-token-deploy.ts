import { expect } from "chai";
import { ethers } from "hardhat";
import { deployTigerPalaceTokenUpgradeable } from "./utils/token-deployment";
import { reset } from "@nomicfoundation/hardhat-network-helpers";

describe("TigerPalaceToken Deployment Debug", function () {
  it("Should deploy TigerPalaceToken and verify functionality", async function () {
    this.timeout(120000); // Increase timeout to 120 seconds for deployment operations
    console.log("Testing TigerPalaceToken deployment...");

    // Reset network state first to ensure fresh deployment
    await reset();
    
    const [deployer] = await ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // Deploy TigerPalaceToken using upgradeable utility (production pattern)
    const { token } = await deployTigerPalaceTokenUpgradeable(deployer, {
      minBalance: ethers.parseEther("1000000"), // 1M tokens minimum
    });

    const tokenAddress = await token.getAddress();
    console.log(`Token deployed at: ${tokenAddress}`);

    // Check if contract has code
    const code = await ethers.provider.getCode(tokenAddress);
    console.log(`Contract code length: ${code.length} (${code === '0x' ? 'NO CODE' : 'HAS CODE'})`);
    expect(code).to.not.equal('0x', "Contract should have code");

    // Try to call balanceOf
    console.log("Attempting to call balanceOf...");
    const balance = await token.balanceOf(deployer.address);
    console.log("Deployer balance:", ethers.formatEther(balance), "TPT");

    // Should have at least 10M tokens (INITIAL_MINT)
    expect(balance).to.be.at.least(ethers.parseEther("10000000"), "Deployer should have initial mint tokens");

    // Check total supply
    const totalSupply = await token.totalSupply();
    console.log("Total supply:", ethers.formatEther(totalSupply), "TPT");
    expect(totalSupply).to.equal(balance, "Total supply should equal deployer balance initially");

    // Check roles
    const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
    const MINTER_ROLE = await token.MINTER_ROLE();
    const PAUSER_ROLE = await token.PAUSER_ROLE();

    const hasAdmin = await token.hasRole(DEFAULT_ADMIN_ROLE, deployer.address);
    const hasMinter = await token.hasRole(MINTER_ROLE, deployer.address);
    const hasPauser = await token.hasRole(PAUSER_ROLE, deployer.address);

    console.log("Deployer has admin role:", hasAdmin);
    console.log("Deployer has minter role:", hasMinter);
    console.log("Deployer has pauser role:", hasPauser);

    expect(hasAdmin).to.be.true;
    expect(hasMinter).to.be.true;
    expect(hasPauser).to.be.true;

    console.log("✅ TigerPalaceToken deployment and initialization verified successfully");
  });
});
