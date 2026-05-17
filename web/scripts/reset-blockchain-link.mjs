/**
 * reset-blockchain-link.mjs
 *
 * Sau khi restart Hardhat + deploy contracts mới:
 * 1. Reset contractAddress trong tất cả events → null (về DRAFT)
 * 2. Reset ticket status → cho phép mua lại
 * 3. KHÔNG xóa Users, Events, TicketTiers, AuthNonce
 *
 * Usage: node scripts/reset-blockchain-link.mjs
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Unlink all events from old contracts
  const events = await prisma.event.updateMany({
    data: {
      contractAddress: null,
      chainId: null,
      status: "DRAFT",
    },
  });

  // 2. Reset all ticket tiers onchain mapping
  const tiers = await prisma.ticketTier.updateMany({
    data: {
      onchainTierId: null,
    },
  });

  // 3. Mark all tickets as EXPIRED (old chain state invalid)
  const tickets = await prisma.ticket.updateMany({
    data: {
      status: "EXPIRED",
    },
  });

  // 4. Cancel all active listings
  const listings = await prisma.listing.updateMany({
    where: { status: "ACTIVE" },
    data: { status: "CANCELLED" },
  });

  console.log("Blockchain link reset:");
  console.log(`  Events unlinked: ${events.count}`);
  console.log(`  Tier mappings cleared: ${tiers.count}`);
  console.log(`  Tickets expired: ${tickets.count}`);
  console.log(`  Listings cancelled: ${listings.count}`);
  console.log("");
  console.log("Preserved: Users, AuthNonce, Orders, Event details");
  console.log("");
  console.log("Next steps:");
  console.log("  1. Deploy new contracts (start.ps1 -Fresh)");
  console.log("  2. Login as organizer");
  console.log("  3. Go to My Events → Publish On-chain again");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
