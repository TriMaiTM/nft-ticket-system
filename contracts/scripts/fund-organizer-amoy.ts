import hre, { ethers } from "hardhat";

async function main() {
  if (hre.network.name !== "amoy") {
    throw new Error("This script must run on Amoy: npx hardhat run scripts/fund-organizer-amoy.ts --network amoy");
  }

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "POL");

  const organizer = "0x3dcC5d59d8f37fbD90d02Db8aDAf60fca2249E62";
  const orgBalance = await ethers.provider.getBalance(organizer);
  console.log("Organizer:", organizer);
  console.log("Organizer balance:", ethers.formatEther(orgBalance), "POL");

  // Send 0.05 POL to organizer (enough for several publishes)
  const sendAmount = ethers.parseEther("0.05");

  if (balance < sendAmount + ethers.parseEther("0.01")) {
    console.log("Deployer doesn't have enough POL to send. Need faucet.");
    return;
  }

  console.log("Sending", ethers.formatEther(sendAmount), "POL to organizer...");
  const tx = await deployer.sendTransaction({
    to: organizer,
    value: sendAmount,
    gasPrice: ethers.parseUnits("30", "gwei"),
  });
  await tx.wait();
  console.log("Done! TX:", tx.hash);

  const newBalance = await ethers.provider.getBalance(organizer);
  console.log("Organizer new balance:", ethers.formatEther(newBalance), "POL");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
