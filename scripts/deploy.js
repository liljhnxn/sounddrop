const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("-----------------------------------------");
  console.log(" Deploying SoundDrop to Botchain Testnet ");
  console.log("-----------------------------------------");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "BOHR");

  const SoundDrop = await hre.ethers.getContractFactory("SoundDrop");
  console.log("Deploying contract...");
  const soundDrop = await SoundDrop.deploy();
  await soundDrop.waitForDeployment();

  const deployedAddress = await soundDrop.getAddress();
  console.log("\n>>> SoundDrop deployed successfully to:", deployedAddress);
  console.log(">>> Explorer link: https://scan.bohr.life/address/" + deployedAddress);

  // Write deployment info to frontend config
  const configPath = path.join(__dirname, "..", "src", "config", "deployedAddress.json");
  const deploymentInfo = {
    address: deployedAddress,
    network: "botchain",
    chainId: 968,
    deployedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(">>> Deployment info saved to:", configPath);

  // Update .env and .env.local
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, "utf8");
    envContent = envContent.replace(
      /NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS=.*/,
      `NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS="${deployedAddress}"`
    );
    fs.writeFileSync(envPath, envContent);
  }
  const envLocalPath = path.join(__dirname, "..", ".env.local");
  if (fs.existsSync(envLocalPath)) {
    let envContent = fs.readFileSync(envLocalPath, "utf8");
    envContent = envContent.replace(
      /NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS=.*/,
      `NEXT_PUBLIC_SOUND_DROP_CONTRACT_ADDRESS="${deployedAddress}"`
    );
    fs.writeFileSync(envLocalPath, envContent);
  }

  console.log("-----------------------------------------");
  console.log("Deployment finished successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
