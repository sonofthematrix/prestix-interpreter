import fs from "fs";

async function main() {
  const STATE_FILE = "deployment-state.json";
  const FAILURE_LOG = "deployment-failure-log.json";

  console.log("🧹 Resetting Deployment State");
  console.log("==============================");

  try {
    // Remove state file if it exists
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
      console.log("✅ Removed deployment-state.json");
    } else {
      console.log("ℹ️  No deployment-state.json found");
    }

    // Remove failure log if it exists
    if (fs.existsSync(FAILURE_LOG)) {
      fs.unlinkSync(FAILURE_LOG);
      console.log("✅ Removed deployment-failure-log.json");
    } else {
      console.log("ℹ️  No deployment-failure-log.json found");
    }

    console.log("\n🎉 Deployment state reset complete!");
    console.log("Next deployment will start fresh from the beginning.");
  } catch (error: any) {
    console.error("❌ Error resetting deployment state:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
