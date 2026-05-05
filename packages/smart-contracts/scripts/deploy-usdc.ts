import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "ethers";

/**
 * @dev Deploy MockUSDC for local testing or configure existing USDC for Sepolia
 * 
 * For Sepolia: Use existing Circle USDC at 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
 * For Local: Deploy MockUSDC contract
 */
const deployUSDC: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { network } = hre;  

  // Sepolia USDC address (official Circle USDC)
  const SEPOLIA_USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

  if (network.name === "sepolia") {
    console.log("📍 Using existing Circle USDC on Sepolia");
    console.log(`   USDC Address: ${SEPOLIA_USDC}`);
    
    // Save USDC address for marketplace integration
    
    console.log("✅ USDC configuration saved for Sepolia");
    return;
  }

  // Deploy MockUSDC for localhost/hardhat networks
  console.log("🚀 Deploying MockUSDC for local testing...");
  
  const mockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDCInstance = await mockUSDC.deploy();

  console.log(`✅ MockUSDC deployed at: ${mockUSDCInstance.address}`);
  
  // Verify on Etherscan if on testnet
  if (network.name === "sepolia" && process.env.ETHERSCAN_API_KEY) {
    console.log("⏳ Waiting for block confirmations before verification...");
    await new Promise((resolve) => setTimeout(resolve, 30000));
    
    try {
      await hre.run("verify:verify", {
        address: mockUSDCInstance.address,
        constructorArguments: [],
      });
      console.log("✅ MockUSDC verified on Etherscan");
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ MockUSDC already verified");
      } else {
        console.log(`⚠️  Verification failed: ${error.message}`);
      }
    }
  }
};

deployUSDC.tags = ["USDC", "PaymentToken"];
deployUSDC.skip = async (hre) => {
  // Skip if USDC already deployed
  const { deployments } = hre as any;
  const usdc = await deployments.getOrNull("USDC");
  return !!usdc && hre.network.name !== "sepolia";
};

export default deployUSDC;

