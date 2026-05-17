import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * seed.mjs
 *
 * Tao demo organizer + event (DRAFT, chua co contractAddress).
 * Sau khi organizer bam "Publish On-chain" tren UI, contractAddress se duoc cap nhat tu dong.
 *
 * Khong hardcode contractAddress vi moi lan deploy la co address moi.
 */

async function main() {
  const organizerWallet = "0x3dcc5d59d8f37fbd90d02db8adaf60fca2249e62";

  const organizer = await prisma.user.upsert({
    where: { walletAddress: organizerWallet },
    update: {
      role: "ORGANIZER",
      name: "Demo Organizer",
    },
    create: {
      walletAddress: organizerWallet,
      role: "ORGANIZER",
      name: "Demo Organizer",
    },
  });

  const existing = await prisma.event.findFirst({
    where: {
      organizerId: organizer.id,
      title: "TicketNFT Launch Night",
    },
  });

  if (!existing) {
    await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: "TicketNFT Launch Night",
        description:
          "Live demo for NFT ticketing with wallet auth and on-chain flows.",
        venue: "Ho Chi Minh City",
        startDate: new Date("2026-05-10T11:00:00.000Z"),
        endDate: new Date("2026-05-10T14:00:00.000Z"),
        status: "DRAFT",
        chainId: "31337",
        maxAttendees: 500,
        ticketTiers: {
          create: [
            {
              name: "General",
              price: "0.050000",
              maxQuantity: 350,
              soldCount: 0,
              benefits: "General admission",
            },
            {
              name: "VIP",
              price: "0.150000",
              maxQuantity: 120,
              soldCount: 0,
              benefits: "Priority entry + merch",
            },
            {
              name: "VVIP",
              price: "0.500000",
              maxQuantity: 30,
              soldCount: 0,
              benefits: "Backstage + meet the team",
            },
          ],
        },
      },
    });

    console.log("Seed completed: created demo event and tiers (DRAFT)");
    console.log("Next: Login as organizer -> My Events -> Publish On-chain");
  } else {
    console.log("Seed skipped: demo event already exists");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
