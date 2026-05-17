import { NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  encodeFunctionData,
  decodeEventLog,
} from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { cookies } from "next/headers";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { eventTicketNftAbi } from "@/lib/contracts";

/**
 * POST /api/tickets/mint
 *
 * Server-side mint: organizer mints ticket to user's wallet.
 * Bypasses MetaMask RPC issues.
 */

function getChainRpc(): string {
  return process.env.SEPOLIA_RPC_URL ?? "https://sepolia.drpc.org";
}

function getPrivateKey(): `0x${string}` {
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error("Missing PRIVATE_KEY");
  return key.startsWith("0x")
    ? (key as `0x${string}`)
    : (`0x${key}` as `0x${string}`);
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const session = verifySessionToken(
      cookieStore.get(getSessionCookieName())?.value,
    );
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      tierId?: string;
    };

    if (!body.tierId) {
      return NextResponse.json({ error: "Missing tierId" }, { status: 400 });
    }

    // Load tier + event
    const tier = await prisma.ticketTier.findUnique({
      where: { id: body.tierId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            contractAddress: true,
            organizerId: true,
          },
        },
      },
    });

    if (!tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    if (!tier.event.contractAddress) {
      return NextResponse.json(
        { error: "Event not published on-chain yet" },
        { status: 412 },
      );
    }

    if (tier.soldCount >= tier.maxQuantity) {
      return NextResponse.json({ error: "Tier sold out" }, { status: 409 });
    }

    if (tier.onchainTierId === null) {
      return NextResponse.json(
        { error: "Tier not linked to on-chain tier" },
        { status: 400 },
      );
    }

    // Get user wallet address
    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: { id: true, walletAddress: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const rpcUrl = getChainRpc();
    const account = privateKeyToAccount(getPrivateKey());

    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(rpcUrl),
    });
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(rpcUrl),
    });

    // Call organizerMint to mint NFT to user's address
    const tokenURI = `ipfs://ticketnft/${tier.id}/${Date.now()}`;

    const mintData = encodeFunctionData({
      abi: eventTicketNftAbi,
      functionName: "organizerMint",
      args: [user.walletAddress as `0x${string}`, tier.onchainTierId, tokenURI],
    });

    const txHash = await walletClient.sendTransaction({
      to: tier.event.contractAddress as `0x${string}`,
      data: mintData,
      gas: BigInt(500_000),
    });

    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    // Parse TicketMinted event to get tokenId
    let tokenId: number | undefined;
    const mintedTopic =
      "0x395ab5891d7a7cb8666fd5b76a45b09f1801c75d979e44914e4a45b76578183e";

    for (const log of receipt.logs) {
      if (log.topics[0] === mintedTopic) {
        try {
          const decoded = decodeEventLog({
            abi: eventTicketNftAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.args && "tokenId" in decoded.args) {
            tokenId = Number(decoded.args.tokenId);
            break;
          }
        } catch {}
      }
    }

    if (!tokenId) {
      // Fallback: read nextTokenId from contract and subtract 1
      try {
        const nextId = await publicClient.readContract({
          address: tier.event.contractAddress as `0x${string}`,
          abi: eventTicketNftAbi,
          functionName: "nextTokenId",
        });
        tokenId = Number(nextId) - 1;
      } catch {
        tokenId = Date.now() % 100000; // Last resort fallback
      }
    }

    // Record in DB
    const result = await prisma.$transaction(async (tx) => {
      await tx.ticketTier.update({
        where: { id: tier.id },
        data: { soldCount: { increment: 1 } },
      });

      const order = await tx.order.create({
        data: {
          userId: session.sub,
          eventId: tier.eventId,
          totalAmount: tier.price,
          paymentMethod: "CRYPTO",
          status: "CONFIRMED",
          txHash,
        },
      });

      const ticket = await tx.ticket.create({
        data: {
          eventId: tier.eventId,
          tierId: tier.id,
          ownerId: session.sub,
          tokenId,
          txHash,
          status: "MINTED",
          isUsed: false,
          qrCode: `${tier.eventId}:${tokenId}`,
        },
      });

      return { order, ticket };
    });

    return NextResponse.json({
      data: {
        orderId: result.order.id,
        ticketId: result.ticket.id,
        tokenId: result.ticket.tokenId,
        txHash,
      },
    });
  } catch (error) {
    console.error("POST /api/tickets/mint failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Mint failed" },
      { status: 500 },
    );
  }
}
