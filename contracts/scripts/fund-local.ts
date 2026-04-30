import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const tx = await signer.sendTransaction({
    to: "0x3dcC5d59d8f37fbD90d02Db8aDAf60fca2249E62",
    value: ethers.parseEther("100"),
  });
  await tx.wait();
  console.log("Sent 100 ETH to Organizer wallet (0x3dcC...9E62)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
