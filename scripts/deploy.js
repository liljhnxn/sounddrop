const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = await hre.ethers.provider.getNetwork();
  const chainId = Number(network.chainId);

  const networkName = "BOT Chain Mainnet";
  const nativeSymbol = "BOT";
  const explorerBase = "https://scan.botchain.ai";

  console.log("=========================================");
  console.log(` Deploying SoundDrop to ${networkName} `);
  console.log("=========================================");
  console.log("Chain ID:", chainId);
  console.log("Deployer address:", deployer.address);

  const balanceBefore = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${hre.ethers.formatEther(balanceBefore)} ${nativeSymbol}`);

  // Fetch fee data to verify gas price (keeping gas fees minimal)
  const feeData = await hre.ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice;
  console.log(`Current Gas Price: ${gasPrice ? hre.ethers.formatUnits(gasPrice, "gwei") + " gwei" : "default"}`);

  const SoundDrop = await hre.ethers.getContractFactory("SoundDrop");
  console.log("\nDeploying contract with minimal gas...");

  // Deploy using network gasPrice without unnecessary markup
  const deployOptions = {};
  if (gasPrice) {
    deployOptions.gasPrice = gasPrice;
  }

  const soundDrop = await SoundDrop.deploy(deployOptions);
  console.log("Transaction hash:", soundDrop.deploymentTransaction().hash);
  console.log("Waiting for confirmation on BOT Chain...");

  const receipt = await soundDrop.deploymentTransaction().wait(1);
  const deployedAddress = await soundDrop.getAddress();

  const balanceAfter = await hre.ethers.provider.getBalance(deployer.address);
  const gasUsed = receipt.gasUsed;
  const effectiveGasPrice = receipt.gasPrice || gasPrice || 0n;
  const totalCost = gasUsed * effectiveGasPrice;

  console.log("\n=========================================");
  console.log(">>> SoundDrop DEPLOYED SUCCESSFULLY!");
  console.log(">>> Contract Address:", deployedAddress);
  console.log(`>>> Gas Used: ${gasUsed.toString()} units`);
  console.log(`>>> Total Gas Fee: ${hre.ethers.formatEther(totalCost)} ${nativeSymbol}`);
  console.log(`>>> Remaining Balance: ${hre.ethers.formatEther(balanceAfter)} ${nativeSymbol}`);
  console.log(`>>> Explorer: ${explorerBase}/address/${deployedAddress}`);
  console.log("=========================================\n");

  // Save deployment info
  const configPath = path.join(__dirname, "..", "src", "config", "deployedAddress.json");
  const deploymentInfo = {
    address: deployedAddress,
    network: "botchain",
    chainId: chainId,
    explorer: explorerBase,
    nativeSymbol: nativeSymbol,
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
    envContent = envContent.replace(
      /BOTCHAIN_RPC_URL=.*/,
      `BOTCHAIN_RPC_URL="https://rpc.botchain.ai"`
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
    envContent = envContent.replace(
      /BOTCHAIN_RPC_URL=.*/,
      `BOTCHAIN_RPC_URL="https://rpc.botchain.ai"`
    );
    fs.writeFileSync(envLocalPath, envContent);
  }

  console.log(">>> Environment files updated with new contract address.");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
