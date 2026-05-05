import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "hardhat";

task("balance", "Prints an account's balance")
  .addParam("account", "The account's address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const balance = await hre.ethers.provider.getBalance(taskArgs.account);
    console.log(`Account ${taskArgs.account}`);
    console.log(`Balance: ${ethers.utils.formatEther(balance)} ETH`);
    console.log(`Balance: ${ethers.utils.formatUnits(balance, "wei")} wei`);

    // Also show gas price info
    const gasPrice = await hre.ethers.provider.getFeeData();
    console.log(
      `Current gas price: ${ethers.utils.formatUnits(
        gasPrice.maxFeePerGas ?? 0,
        "gwei",
      )} gwei`,
    );

    // Estimate deployment cost
    const maxFeePerGas = gasPrice.maxFeePerGas?.mul(120).div(100);
    const estimatedGasCost = maxFeePerGas?.mul(5000000); // 5M gas limit
    console.log(
      `Estimated deployment cost: ${ethers.utils.formatEther(
        estimatedGasCost ?? 0,
      )} ETH`,
    );
  });
