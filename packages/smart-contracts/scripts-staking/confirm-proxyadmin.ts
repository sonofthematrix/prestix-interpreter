import { ethers } from "hardhat";

async function main() {
  const PROXYADMIN = "0x33DAA21a68cc2C83946D86EEe131E158477E6e2B";
  const KUS_PROXY = "0x871AE8fC9f4596e5c4CCE0769248e26D4B4cbd74";
  const KR_PROXY = "0x6402Ee1B483f0FD4229cd04E23a7002E75F030F2";

  const ownerAbi = ["function owner() view returns (address)"];
  const pa = new ethers.Contract(PROXYADMIN, ownerAbi, ethers.provider);
  try {
    const owner = await pa.owner();
    console.log("ProxyAdmin owner:", owner);
  } catch (e: any) {
    console.log("owner() call failed:", e.message);
  }

  const paAbi = [
    "function getProxyAdmin(address) view returns (address)",
    "function getProxyImplementation(address) view returns (address)",
  ];
  const paFull = new ethers.Contract(PROXYADMIN, paAbi, ethers.provider);

  for (const [label, proxy] of [
    ["KUS", KUS_PROXY],
    ["KR", KR_PROXY],
  ] as const) {
    try {
      const admin = await paFull.getProxyAdmin(proxy);
      console.log(`${label} proxy admin reported by ProxyAdmin:`, admin);
      const impl = await paFull.getProxyImplementation(proxy);
      console.log(`${label} current implementation:`, impl);
    } catch (e: any) {
      console.log(
        `${label} getProxyAdmin/getProxyImplementation failed:`,
        e.message,
      );
    }
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
