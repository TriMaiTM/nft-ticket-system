import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getArg(name) {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return process.argv[index + 1];
}

async function main() {
  const eventId = getArg("eventId") ?? process.env.EVENT_ID;
  const contractAddress = (getArg("contract") ?? process.env.CONTRACT_ADDRESS)?.toLowerCase();
  const chainId = getArg("chainId") ?? process.env.CHAIN_ID ?? "80002";

  if (!eventId) {
    throw new Error("Missing event id. Pass --eventId <id> or set EVENT_ID env.");
  }

  if (!contractAddress || !/^0x[a-f0-9]{40}$/.test(contractAddress)) {
    throw new Error(
      "Missing valid contract address. Pass --contract 0x... or set CONTRACT_ADDRESS env."
    );
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: {
      contractAddress,
      chainId,
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      contractAddress: true,
      chainId: true,
      status: true,
    },
  });

  console.log("Event is live on-chain:");
  console.log(updated);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
