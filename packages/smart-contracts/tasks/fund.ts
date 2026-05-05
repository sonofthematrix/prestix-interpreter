import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("fund", "Funds an account with test ETH")
  .addParam("account", "The account's address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    if (hre.network.name === "hardhat" || hre.network.name === "localhost") {
      // For local testing
      const [signer] = await hre.ethers.getSigners();
      await signer.sendTransaction({
        to: taskArgs.account,
        value: hre.ethers.utils.parseEther("1.0"),
      });
      console.log(`Funded ${taskArgs.account} with 1 ETH`);
    } else {
      console.log(`For ${hre.network.name}, please fund the account manually:`);
      console.log(`Account: ${taskArgs.account}`);
      if (hre.network.name === "sepolia") {
        console.log("You can get Sepolia ETH from:");
        console.log("1. https://sepoliafaucet.com/");
        console.log("2. https://faucet.sepolia.dev/");
      }
    }

    // Show current balance
    const balance = await hre.ethers.provider.getBalance(taskArgs.account);
    console.log(
      `Current balance: ${hre.ethers.utils.formatEther(balance)} ETH`,
    );
  });
