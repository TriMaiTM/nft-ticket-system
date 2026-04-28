const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.order.deleteMany({});
  await prisma.ticket.deleteMany({});
  await prisma.ticketTier.deleteMany({});
  const result = await prisma.event.deleteMany({});  console.log(`Deleted ${result.count} events from the database.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
