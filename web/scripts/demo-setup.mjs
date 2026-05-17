/**
 * demo-setup.mjs
 *
 * Setup demo environment cho 3 ví:
 * - Organizer: tạo event, publish on-chain
 * - User 1: mua vé, bán trên marketplace
 * - User 2: mua vé từ marketplace
 *
 * Chạy trên Hardhat local.
 *
 * Usage: node scripts/demo-setup.mjs
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Hardhat default accounts (có 10000 ETH mỗi account)
const ACCOUNTS = [
  { address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", label: "Account #0 (Deployer)" },
  { address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", label: "Account #1" },
  { address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", label: "Account #2" },
  { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906", label: "Account #3" },
  { address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", label: "Account #4" },
];

async function main() {
  console.log("");
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║   TicketNFT Demo Setup (Hardhat Local)   ║");
  console.log("╚═══════════════════════════════════════════╝");
  console.log("");

  console.log("Available Hardhat accounts (10000 ETH each):");
  console.log("");
  ACCOUNTS.forEach((acc, i) => {
    console.log(`  [${i}] ${acc.address}  ← ${acc.label}`);
  });
  console.log("");
  console.log("Recommended assignment:");
  console.log("  Organizer: Account #1 (0x7099...79C8)");
  console.log("  User 1:    Account #2 (0x3C44...93BC)");
  console.log("  User 2:    Account #3 (0x90F7...b906)");
  console.log("");

  // Create/update organizer user in DB
  const organizerWallet = ACCOUNTS[1].address.toLowerCase();
  const user1Wallet = ACCOUNTS[2].address.toLowerCase();
  const user2Wallet = ACCOUNTS[3].address.toLowerCase();

  // Upsert all 3 users
  const organizer = await prisma.user.upsert({
    where: { walletAddress: organizerWallet },
    update: { role: "ORGANIZER", name: "Demo Organizer" },
    create: { walletAddress: organizerWallet, role: "ORGANIZER", name: "Demo Organizer" },
  });

  const user1 = await prisma.user.upsert({
    where: { walletAddress: user1Wallet },
    update: { role: "USER", name: "Demo User 1" },
    create: { walletAddress: user1Wallet, role: "USER", name: "Demo User 1" },
  });

  const user2 = await prisma.user.upsert({
    where: { walletAddress: user2Wallet },
    update: { role: "USER", name: "Demo User 2" },
    create: { walletAddress: user2Wallet, role: "USER", name: "Demo User 2" },
  });

  // Create demo event (DRAFT - needs Publish On-chain)
  const existing = await prisma.event.findFirst({
    where: { organizerId: organizer.id, title: "TicketNFT Launch Night" },
  });

  let event;
  if (!existing) {
    event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: "TicketNFT Launch Night",
        description: "Demo event for NFT ticketing system. Buy, sell, and check-in with blockchain verification.",
        venue: "Ho Chi Minh City, Vietnam",
        startDate: new Date("2026-06-01T18:00:00.000Z"),
        endDate: new Date("2026-06-01T23:00:00.000Z"),
        status: "DRAFT",
        chainId: "31337",
        maxAttendees: 500,
        ticketTiers: {
          create: [
            { name: "General", price: "0.050000", maxQuantity: 300, benefits: "Standing area, general admission" },
            { name: "VIP", price: "0.150000", maxQuantity: 150, benefits: "Priority seating, free drink, merch pack" },
            { name: "VVIP", price: "0.500000", maxQuantity: 50, benefits: "Front row, backstage pass, meet & greet" },
          ],
        },
      },
      include: { ticketTiers: true },
    });
    console.log(`Created event: "${event.title}" (DRAFT)`);
  } else {
    event = await prisma.event.findUnique({
      where: { id: existing.id },
      include: { ticketTiers: true },
    });
    console.log(`Event already exists: "${event.title}"`);
  }

  console.log("");
  console.log("Users created:");
  console.log(`  Organizer: ${organizerWallet} (${organizer.id})`);
  console.log(`  User 1:    ${user1Wallet} (${user1.id})`);
  console.log(`  User 2:    ${user2Wallet} (${user2.id})`);
  console.log("");
  console.log("Event tiers:");
  event.ticketTiers.forEach((tier) => {
    console.log(`  ${tier.name}: ${Number(tier.price).toFixed(3)} POL (${tier.maxQuantity} available)`);
  });
  console.log("");
  console.log("═══════════════════════════════════════════");
  console.log("NEXT STEPS:");
  console.log("═══════════════════════════════════════════");
  console.log("");
  console.log("1. Open MetaMask, import these accounts:");
  console.log("   Account #1 key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("   Account #2 key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  console.log("   Account #3 key: 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
  console.log("");
  console.log("2. Start app: cd web && npm run dev");
  console.log("");
  console.log("3. Follow DEMO SCRIPT below");
  console.log("");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
