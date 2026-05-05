import 'dotenv/config';
import hre from 'hardhat';
const { ethers } = hre;

const MARKETPLACE = process.env.NEXT_PUBLIC_RWA_MARKETPLACE || '0xc9C369525DFf385935dfDC6aC2F678C26998D0d7';
const EXPECTED_REGISTRY = process.env.NEXT_PUBLIC_RWA_ASSET_REGISTRY || '0xA1fb017a8c89cCB76F63d2244C4a228964B50D80';

async function main() {
  const marketplace = await ethers.getContractAt([
    'function assetRegistry() view returns (address)',
  ], MARKETPLACE);
  
  const registryAddress = await marketplace.assetRegistry();
  console.log(`Marketplace Registry: ${registryAddress}`);
  console.log(`Expected Registry: ${EXPECTED_REGISTRY}`);
  console.log(`Match: ${registryAddress.toLowerCase() === EXPECTED_REGISTRY.toLowerCase() ? '✅' : '❌'}`);
  
  if (registryAddress.toLowerCase() !== EXPECTED_REGISTRY.toLowerCase()) {
    console.log(`\n⚠️  Marketplace is using a different registry!`);
    console.log(`   Marketplace Registry: ${registryAddress}`);
    console.log(`   Expected Registry: ${EXPECTED_REGISTRY}`);
    console.log(`\n💡 Solution: Update marketplace registry or use the correct registry address\n`);
  } else {
    console.log(`\n✅ Marketplace is using the correct registry\n`);
  }
}

main().catch(console.error);

