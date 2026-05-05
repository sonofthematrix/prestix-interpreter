import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task(
  "deploy:upgrade-revenue",
  "Deploys and upgradesTigerStaking with revenue allocation",
).setAction(async (_, hre: HardhatRuntimeEnvironment) => {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  console.log("=============================================");
  console.log("🚀 UpgradingTigerStaking with Revenue Allocation");
  console.log("=============================================");
  console.log("Deployer:", deployer.address);

  const PROXY_ADDRESS = "0xFE0E6773efEc94c50BaD017cFA61BA5bb6020F61";
  console.log("Proxy Address:", PROXY_ADDRESS);

  try {
    // Step 1: Deploy new implementation
    console.log("\n📦 Step 1: Deploying new implementation...");
    const KageFlexiV2Factory = await ethers.getContractFactory(
      "TigerStaking",
    );

    // Use a loop to try different optimization settings
    let implementation;
    try {
      implementation = await KageFlexiV2Factory.deploy({ gasLimit: 8000000 });
      await implementation.deployed();
      console.log(
        `✅ New implementation deployed at: ${implementation.address}`,
      );
    } catch (deployError: any) {
      console.error("Failed to deploy implementation:", deployError.message);
      return;
    }

    // Step 2: Get the proxy admin address
    console.log("\n🔍 Step 2: Getting proxy admin address...");
    const proxyAdminSlot =
      "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";
    const proxyAdminAddressBytes = await ethers.provider.getStorage(
      PROXY_ADDRESS,
      proxyAdminSlot,
    );
    const proxyAdminAddress = ethers.getAddress(proxyAdminAddressBytes);

    console.log(`✅ Proxy admin found at: ${proxyAdminAddress}`);

    // Step 3: Upgrade the proxy
    console.log("\n🔄 Step 3: Upgrading proxy to new implementation...");
    const proxyAdminABI = [
      "function upgrade(address proxy, address implementation) external",
    ];
    const proxyAdminContract = new ethers.Contract(
      proxyAdminAddress,
      proxyAdminABI,
      deployer,
    );

    const upgradeTx = await proxyAdminContract.upgrade(
      PROXY_ADDRESS,
      implementation.address,
      {
        gasLimit: 1000000,
      },
    );
    await upgradeTx.wait();

    console.log(`✅ Proxy successfully upgraded!`);
    console.log(`📝 Transaction hash: ${upgradeTx.hash}`);

    // Step 4: Verify the upgrade
    console.log("\n🔍 Step 4: Verifying upgrade...");
    const proxyContract = await ethers.getContractAt(
      "TigerStaking",
      PROXY_ADDRESS,
    );
    const kageAcceptedToken = await proxyContract.kageAcceptedToken();
    const poolLength = await proxyContract.kagePoolLength();

    console.log(`✅ Verification successful!`);
    console.log(`•TigerStaking at ${PROXY_ADDRESS} is operational`);
    console.log(`• Accepted token: ${kageAcceptedToken}`);
    console.log(`• Pool count: ${poolLength}`);

    // Step 5: Try accessing the new revenue allocation function
    try {
      console.log("\n💰 Step 5: Verifying revenue allocation functions...");
      const poolId = 0;
      const pendingRevenue = await proxyContract.kageGetPendingRevenue(
        poolId,
        deployer.address,
      );
      console.log(`✅ Revenue allocation functions accessible!`);
      console.log(
        `• Pending revenue: ${ethers.formatEther(pendingRevenue)} tokens`,
      );
    } catch (error: any) {
      console.log(
        `❌ Revenue allocation function verification failed: ${error.message}`,
      );
    }

    console.log("\n🎉 Upgrade process completed!");
    console.log("New implementation address for Etherscan verification:");
    console.log(implementation.address);
  } catch (error: any) {
    console.error(`❌ Error during upgrade:`, error.message);
    if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
      console.log("💡 Try increasing gas limit or checking contract size");
    }
  }
});
