require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * clear-events.js
 *
 * Xoa du lieu event/ticket/listing NHUNG GIU NGUYEN:
 * - User accounts (khong can dang nhap lai)
 * - AuthNonce (session khong bi mat)
 * - Orders (lich su giao dich)
 *
 * Dung khi can reset events sau khi redeploy contracts.
 */

async function main() {
  const listings = await prisma.listing.deleteMany({});
  const tickets = await prisma.ticket.deleteMany({});
  const tiers = await prisma.ticketTier.deleteMany({});
  const events = await prisma.event.deleteMany({});

  console.log(
    `Cleared: ${events.count} events, ${tiers.count} tiers, ${tickets.count} tickets, ${listings.count} listings`,
  );
  console.log("Preserved: Users, AuthNonce, Orders");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
