import { NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  parseEther,
  decodeEventLog,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { cookies } from "next/headers";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventFactoryAbi } from "@/lib/contracts";

/**
 * POST /api/organizer/publish
 *
 * Server-side publish: bypass MetaMask, use private key from env.
 * Works around MetaMask RPC issues on testnets.
 */

function getChainRpc(): string {
  return process.env.SEPOLIA_RPC_URL ?? "https://sepolia.drpc.org";
}

function getPrivateKey(): `0x${string}` {
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error("Missing PRIVATE_KEY in env");
  return key.startsWith("0x")
    ? (key as `0x${string}`)
    : (`0x${key}` as `0x${string}`);
}

function getFactoryAddress(): string {
  const addr = process.env.NEXT_PUBLIC_EVENT_FACTORY_ADDRESS;
  if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
    throw new Error("Missing NEXT_PUBLIC_EVENT_FACTORY_ADDRESS");
  }
  return addr;
}

function symbolFromTitle(title: string): string {
  const letters = title
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (letters || "TNFT").slice(0, 8);
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = verifySessionToken(
      cookieStore.get(getSessionCookieName())?.value
    );
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, role: true, walletAddress: true },
    });
    if (!me || (me.role !== "ORGANIZER" && me.role !== "ADMIN")) {
      return NextResponse.json({ error: "Not an organizer" }, { status: 403 });
    }

    const body = (await request.json()) as {
      eventId?: string;
      tiers?: {
        tierId: string;
        onchainTierId: number;
        price: string;
        maxQuantity: number;
      }[];
    };

    if (!body.eventId || !body.tiers?.length) {
      return NextResponse.json(
        { error: "Missing eventId or tiers" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id: body.eventId },
      include: { ticketTiers: { orderBy: { createdAt: "asc" } } },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (event.organizerId !== me.id) {
      return NextResponse.json({ error: "Not your event" }, { status: 403 });
    }
    if (event.contractAddress) {
      return NextResponse.json(
        { error: "Event already published" },
        { status: 409 }
      );
    }

    const rpcUrl = getChainRpc();
    const account = privateKeyToAccount(getPrivateKey());
    const factoryAddress = getFactoryAddress();

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl),
    });

    // Read events before
    let eventsBefore: readonly `0x${string}`[] = [];
    try {
      eventsBefore = (await publicClient.readContract({
        address: factoryAddress as `0x${string}`,
        abi: eventFactoryAbi,
        functionName: "getEventsByOrganizer",
        args: [account.address],
      })) as readonly `0x${string}`[];
    } catch {}

    const createEventArgs = [
      {
        name: event.title,
        symbol: symbolFromTitle(event.title),
        tiers: body.tiers.map((t) => ({
          price: parseEther(t.price),
          maxSupply: BigInt(Math.max(t.maxQuantity, 1)),
        })),
        royaltyBps: BigInt(500),
        maxPerWallet: BigInt(5),
      },
    ] as const;

    const callData = encodeFunctionData({
      abi: eventFactoryAbi,
      functionName: "createEvent",
      args: createEventArgs,
    });

    const txHash = await walletClient.sendTransaction({
      to: factoryAddress as `0x${string}`,
      data: callData,
      gas: BigInt(4_000_000),
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    // Find created contract address from logs
    let createdAddress: string | undefined;
    const topic =
      "0xff7d1b8833f0386f36d599a24d36d54bc2cb64bdea416f6b6575230111971c05";

    for (const log of receipt.logs) {
      if (log.topics[0] === topic) {
        try {
          const decoded = decodeEventLog({
            abi: eventFactoryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.args && "eventContract" in decoded.args) {
            createdAddress = decoded.args.eventContract as string;
            break;
          }
        } catch {}
      }
    }

    // Fallback: on-chain lookup
    if (!createdAddress) {
      try {
        const eventsAfter = (await publicClient.readContract({
          address: factoryAddress as `0x${string}`,
          abi: eventFactoryAbi,
          functionName: "getEventsByOrganizer",
          args: [account.address],
        })) as readonly `0x${string}`[];
        if (eventsAfter.length > eventsBefore.length) {
          createdAddress = eventsAfter[eventsAfter.length - 1];
        } else if (eventsAfter.length > 0) {
          createdAddress = eventsAfter[eventsAfter.length - 1];
        }
      } catch {}
    }

    if (!createdAddress) {
      return NextResponse.json(
        {
          error: `TX sent (${txHash}) but contract address not found`,
          txHash,
        },
        { status: 500 }
      );
    }

    // Update DB
    await prisma.$transaction(async (tx) => {
      for (const tier of body.tiers!) {
        await tx.ticketTier.update({
          where: { id: tier.tierId },
          data: { onchainTierId: tier.onchainTierId },
        });
      }
      await tx.event.update({
        where: { id: event.id },
        data: {
          contractAddress: createdAddress!.toLowerCase(),
          chainId: "11155111",
          status: "PUBLISHED",
        },
      });
    });

    return NextResponse.json({
      data: {
        contractAddress: createdAddress,
        txHash,
        chainId: "11155111",
      },
    });
  } catch (error) {
    console.error("POST /api/organizer/publish failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Publish failed" },
      { status: 500 }
    );
  }
}
