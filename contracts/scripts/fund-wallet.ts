import { ethers } from "hardhat";

async function main() {
  const address = process.env.FUND_ADDRESS;
  if (!address) {
    throw new Error("Vui lòng cung cấp địa chỉ ví qua biến môi trường FUND_ADDRESS");
  }

  const [signer] = await ethers.getSigners();
  const tx = await signer.sendTransaction({
    to: address,
    value: ethers.parseEther("100"), // Nạp 100 ETH
  });
  
  await tx.wait();
  console.log(`Đã gửi thành công 100 ETH tới ví: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
