/* eslint-disable @typescript-eslint/no-unused-vars */
/*
// Temporarily commented out due to missing dependencies and contract changes
// This file needs to be updated to work with the newTigerStaking contract

import { task } from "hardhat/config";
// Removed web3 import as it's not available
import {
  // TigerPool__factory, // Not available in current typechain
  TigerPalaceToken__factory,
  RWAStaking__factory,
} from "../typechain";
// const { toWei } = web3.utils; // Commented out due to missing web3

// Commented out task due to missing dependencies
task("init-rwa-staking").setAction(async (_, hre) => {
  const { deployments, ethers } = hre as any;
  const [deployer] = await ethers.getSigners();

  const RWAStaking = await deployments.get("RWAStaking");

  const TigerStaking = await RWAStaking__factory.connect(
    RWAStaking.address,
    deployer,
  );

    const distributeToken = await TigerPalaceToken__factory.connect(
    (
      await deployments.get("TigerPalaceToken")
    ).address,
    deployer,
  );

  await TigerStaking.setRewardDistributor(deployer.address);
  await distributeToken.approve(
    TigerStaking.address,
    ethers.parseEther("10000")
  );

  let totalSupply = 100000000;
  for (let i = 0; i < 10; i++) {
    let cap = 0;
    let minStaked = ethers.parseEther("1000");
    let lockDuration = 90 * 86400;
    let startJoinTime = Date.now() / 1000;
    let endJoinTime = Date.now() / 1000 + 730 * 86400;
    let apy = 3000;

    await TigerStaking.addPool(
      cap,
      minStaked,
      lockDuration,
      startJoinTime,
      endJoinTime,
      apy
    );
  }

  console.log("successfully initialized rwa staking!");
});

task("test-mint").setAction(async (_, hre) => {
  const { deployments, ethers } = hre;
  const [deployer] = await ethers.getSigners();

  const TigerPalaceToken = await deployments.get("TigerPalaceToken");

  const mintableToken = await TigerPalaceToken__factory.connect(
    TigerPalaceToken.address,
    deployer,
  );

  const tx = await mintableToken.connect(deployer).multisend([deployer.address], [ethers.parseEther("10000000")]);
  console.log("\x1b[36m%s\x1b[0m", "tx", tx);
  console.log(
    `npx hardhat verify --network sepolia ${mintableToken.address} TigerPalaceToken ${deployer}`,
  );
});
*/

// Placeholder to avoid empty file
export {};
