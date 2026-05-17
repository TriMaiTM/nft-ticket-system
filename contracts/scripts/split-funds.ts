import { ethers } from "hardhat";

/**
 * split-funds.ts
 *
 * Chia ETH từ ví chính (deployer) cho 2 ví khác.
 * Dùng sau khi nhận ETH từ faucet trên Base Sepolia.
 *
 * Usage:
 *   FUNDER_KEY=0xabc... USER1=0x111... USER2=0x222... npx hardhat run scripts/split-funds.ts --network baseSepolia
 */

async function main() {
  const user1 = process.env.USER1;
  const user2 = process.env.USER2;
  const amountEach = process.env.AMOUNT ?? "0.15"; // ETH per wallet

  if (!user1 || !user2) {
    throw new Error("Missing USER1 or USER2 env vars (wallet addresses)");
  }

  const [funder] = await ethers.getSigners();
  const funderBalance = await ethers.provider.getBalance(funder.address);
  const value = ethers.parseEther(amountEach);
  const totalNeeded = value * 2n;

  console.log(`Funder: ${funder.address}`);
  console.log(`Balance: ${ethers.formatEther(funderBalance)} ETH`);
  console.log(`Sending ${amountEach} ETH to each wallet...`);
  console.log("");

  if (funderBalance < totalNeeded + ethers.parseEther("0.01")) {
    throw new Error(
      `Insufficient balance. Need ${ethers.formatEther(
        totalNeeded + ethers.parseEther("0.01")
      )} ETH but have ${ethers.formatEther(funderBalance)}`
    );
  }

  // Send to User 1
  const tx1 = await funder.sendTransaction({ to: user1, value });
  await tx1.wait();
  console.log(`  Sent ${amountEach} ETH → ${user1}`);

  // Send to User 2
  const tx2 = await funder.sendTransaction({ to: user2, value });
  await tx2.wait();
  console.log(`  Sent ${amountEach} ETH → ${user2}`);

  const remaining = await ethers.provider.getBalance(funder.address);
  console.log("");
  console.log(`Funder remaining: ${ethers.formatEther(remaining)} ETH`);
  console.log("Done!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
