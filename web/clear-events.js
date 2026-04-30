require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.listing.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.ticketTier.deleteMany({});
  const result = await prisma.event.deleteMany({});
  console.log(`Deleted ${result.count} events and related data from the database.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
