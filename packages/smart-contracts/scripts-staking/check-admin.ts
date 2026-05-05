import { ethers } from "hardhat";

async function main() {
  const KUS_PROXY = "0x871AE8fC9f4596e5c4CCE0769248e26D4B4cbd74";
  const KR_PROXY = "0x6402Ee1B483f0FD4229cd04E23a7002E75F030F2";
  const ADMIN_SLOT =
    "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103";

  async function getAdmin(proxy: string) {
    const raw = await ethers.provider.getStorageAt(proxy, ADMIN_SLOT);
    return ethers.utils.getAddress("0x" + raw.slice(-40));
  }

  const kusAdmin = await getAdmin(KUS_PROXY);
  const krAdmin = await getAdmin(KR_PROXY);
  console.log("KUS admin:", kusAdmin);
  console.log("KR admin:", krAdmin);

  for (const addr of [kusAdmin, krAdmin]) {
    const code = await ethers.provider.getCode(addr);
    console.log(`Admin ${addr} code length:`, code.length);
    if (code !== "0x") {
      try {
        const ownerAbi = ["function owner() view returns (address)"];
        const c = new ethers.Contract(addr, ownerAbi, ethers.provider);
        const owner = await c.owner();
        console.log(`Admin ${addr} owner():`, owner);
      } catch (e: any) {
        console.log(`owner() call failed on ${addr}:`, e.message);
      }
    } else {
      console.log(`Admin ${addr} is an EOA (no code)`);
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
