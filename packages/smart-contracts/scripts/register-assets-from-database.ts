import hre from "hardhat";
const { ethers, network } = hre;
import path from 'path';

async function main() {
  console.log(`\n🔄 Registering assets from database to new registry on ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const NEW_REGISTRY = "0x4f641965145c93c81614e47dce16224d5eb2fcf9";

  // Get registry contract
  const newRegistry = await ethers.getContractAt(
    "contracts/core/RWAAssetRegistryUpgradeable.sol:RWAAssetRegistryUpgradeable",
    NEW_REGISTRY
  );

  console.log(`New Registry: ${NEW_REGISTRY}`);

  // Import database
  let createClient: any;
  try {
    const rootPath = path.resolve(__dirname, '../../..');
    const dbPath = path.join(rootPath, 'src/lib/db.ts');
    const dbModule = await import(`file://${dbPath}`);
    createClient = dbModule.createClient;
  } catch (error: any) {
    console.error('❌ Could not load database:', error.message);
    process.exit(1);
  }

  const systemUser = {
    id: 'system',
    email: 'system@TKNZN.pro',
    role: 'ADMIN' as const,
    name: 'System Admin'
  };

  const db = createClient(systemUser);

  try {
    // Get assets from database
    const assets = await db.realEstateAsset.findMany({
      where: {
        propertyId: { in: [1, 2, 3, 4] }
      },
      include: {
        assetContractLink: true
      },
      orderBy: {
        propertyId: 'asc'
      }
    });

    console.log(`\nFound ${assets.length} assets in database\n`);

    let registeredCount = 0;

    for (const asset of assets) {
      try {
        console.log(`\n🔍 Processing Asset ${asset.propertyId}: ${asset.title}`);

        // Check if already registered
        try {
          const existing = await newRegistry.getAsset(asset.propertyId);
          console.log(`   ⚠️  Asset ${asset.propertyId} already registered - skipping`);
          continue;
        } catch (e) {
          // Asset doesn't exist, good to register
        }

        const tokenAddress = asset.assetContractLink?.contractAddress || ethers.ZeroAddress;
        
        console.log(`   📝 Registering with:`);
        console.log(`      Owner: ${deployer.address}`);
        console.log(`      Title: ${asset.title}`);
        console.log(`      Total Tokens: ${asset.totalTokens}`);
        console.log(`      Token Price: ${ethers.parseEther(asset.tokenPrice.toString())} wei`);
        console.log(`      Token Address: ${tokenAddress}`);

        // Register asset with new signature:
        // registerAsset(address owner, string title, string description, string assetType, string location, uint256 price, uint256 tokenPrice, uint256 totalTokens)
        const registerTx = await newRegistry.registerAsset(
          deployer.address, // owner
          asset.title, // title
          asset.description || '', // description
          asset.propertyType || 'REAL_ESTATE', // assetType
          asset.location || '', // location
          ethers.parseEther((asset.tokenPrice * asset.totalTokens).toString()), // price (total value)
          ethers.parseEther(asset.tokenPrice.toString()), // tokenPrice (per token)
          asset.totalTokens // totalTokens
        );

        console.log(`   ⏳ Waiting for transaction...`);
        const receipt = await registerTx.wait();
        console.log(`   ✅ Registered! Tx: ${receipt.hash}`);

        registeredCount++;

      } catch (error: any) {
        console.error(`   ❌ Error:`, error.message);
      }
    }

    console.log(`\n📊 Registration Summary:`);
    console.log(`========================`);
    console.log(`Assets registered: ${registeredCount}`);
    console.log(`Total assets processed: ${assets.length}`);

    // Verify registration
    console.log(`\n🔍 Verifying registration...`);
    const nextAssetId = await newRegistry.getNextAssetId();
    console.log(`Next Asset ID in registry: ${nextAssetId}`);

    if (nextAssetId > 1) {
      console.log(`✅ Registration successful!`);
      
      // Show registered assets
      console.log(`\n📋 Registered Assets:`);
      for (let i = 1; i < Number(nextAssetId); i++) {
        try {
          const asset = await newRegistry.getAsset(i);
          console.log(`   ✅ Asset ${i}: ${asset[2]}`); // asset[2] is title
        } catch (e) {
          console.log(`   ❌ Asset ${i}: Not found`);
        }
      }
    } else {
      console.log(`⚠️ No assets were registered`);
    }

  } catch (error: any) {
    console.error('❌ Script failed:', error.message);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
