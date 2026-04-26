import hre, { ethers } from "hardhat";

async function main() {
  if (hre.network.name === "amoy") {
    if (!process.env.AMOY_RPC_URL || !process.env.PRIVATE_KEY) {
      throw new Error(
        "Missing AMOY_RPC_URL or PRIVATE_KEY. Create contracts/.env from .env.example before deploy:amoy."
      );
    }
  }

  const [deployer] = await ethers.getSigners();

  const factory = await ethers.getContractFactory("EventFactory");
  const eventFactory = await factory.deploy();
  await eventFactory.waitForDeployment();

  console.log("Deployer:", deployer.address);
  console.log("EventFactory deployed to:", await eventFactory.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
