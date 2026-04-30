import hre, { ethers } from "hardhat";

type TierArg = {
  priceEth: string;
  maxSupply: bigint;
};

type CreateEventArgs = {
  factory: string;
  name: string;
  symbol: string;
  tiers: TierArg[];
  royaltyBps: bigint;
  maxPerWallet: bigint;
};

function parseTierJson(raw: string): TierArg[] {
  const parsed = JSON.parse(raw) as Array<{ priceEth?: string; maxSupply?: number | string }>;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("The --tiers argument must be a non-empty JSON array.");
  }

  return parsed.map((tier, index) => {
    const priceEth = `${tier.priceEth ?? ""}`.trim();
    const maxSupply = BigInt(tier.maxSupply ?? 0);

    if (!priceEth || maxSupply <= 0n) {
      throw new Error(`Invalid tier at index ${index}. Expected { priceEth, maxSupply }.`);
    }

    return { priceEth, maxSupply };
  });
}

function parseArgs(argv: string[]): CreateEventArgs {
  const raw = new Map<string, string>();

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];

    if (!key.startsWith("--") || !value || value.startsWith("--")) {
      continue;
    }

    raw.set(key.slice(2), value);
    i += 1;
  }

  const factory = raw.get("factory") ?? process.env.EVENT_FACTORY_ADDRESS;
  const name = raw.get("name") ?? "TicketNFT Event";
  const symbol = raw.get("symbol") ?? "TNFT";
  const royaltyBps = BigInt(raw.get("royaltyBps") ?? "500");
  const maxPerWallet = BigInt(raw.get("maxPerWallet") ?? "5");

  const tiers = raw.has("tiers")
    ? parseTierJson(raw.get("tiers")!)
    : [
        {
          priceEth: raw.get("ticketPrice") ?? "0.05",
          maxSupply: BigInt(raw.get("maxSupply") ?? "500"),
        },
      ];

  if (!factory || !ethers.isAddress(factory)) {
    throw new Error(
      "Missing valid EventFactory address. Pass --factory 0x... or set EVENT_FACTORY_ADDRESS in contracts/.env"
    );
  }

  return {
    factory,
    name,
    symbol,
    tiers,
    royaltyBps,
    maxPerWallet,
  };
}

async function main() {
  if (hre.network.name === "amoy") {
    if (!process.env.AMOY_RPC_URL || !process.env.PRIVATE_KEY) {
      throw new Error(
        "Missing AMOY_RPC_URL or PRIVATE_KEY. Create contracts/.env from .env.example before running create:event:amoy."
      );
    }
  }

  const args = parseArgs(process.argv.slice(2));
  const [deployer] = await ethers.getSigners();

  const factory = await ethers.getContractAt("EventFactory", args.factory);

  const tx = await factory.createEvent({
    name: args.name,
    symbol: args.symbol,
    tiers: args.tiers.map((tier) => ({
      price: ethers.parseEther(tier.priceEth),
      maxSupply: tier.maxSupply,
    })),
    royaltyBps: args.royaltyBps,
    maxPerWallet: args.maxPerWallet,
  });

  const receipt = await tx.wait();

  let eventContractAddress: string | undefined;

  for (const log of receipt?.logs ?? []) {
    try {
      const parsed = factory.interface.parseLog(log as never);
      if (parsed?.name === "EventCreated") {
        eventContractAddress = parsed.args.eventContract as string;
        break;
      }
    } catch {
      // Ignore logs from other contracts.
    }
  }

  if (!eventContractAddress) {
    const list = await factory.getEventsByOrganizer(deployer.address);
    eventContractAddress = list[list.length - 1];
  }

  if (!eventContractAddress) {
    throw new Error("Could not determine deployed event contract address");
  }

  console.log("Network:", hre.network.name);
  console.log("Organizer:", deployer.address);
  console.log("Factory:", args.factory);
  console.log("Event contract:", eventContractAddress);
  console.log("Configured tiers:", args.tiers.length);
  console.log("Copy this value to web linking step as CONTRACT_ADDRESS.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
