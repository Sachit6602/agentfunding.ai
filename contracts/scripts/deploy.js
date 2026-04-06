const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TradeAttestation with:", deployer.address);

  const TradeAttestation = await ethers.getContractFactory("TradeAttestation");
  const contract = await TradeAttestation.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("TradeAttestation deployed to:", address);
  console.log("\nAdd this to your .env:");
  console.log(`KITE_ATTESTATION_CONTRACT=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
