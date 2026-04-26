import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";

function pseudoTxHash(): string {
  return `0x${crypto.randomBytes(32).toString("hex")}`;
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as { tierId?: string };
    if (!body.tierId) {
      return NextResponse.json({ error: "tierId is required" }, { status: 400 });
    }

    const tier = await prisma.ticketTier.findUnique({
      where: { id: body.tierId },
      include: {
        event: {
          select: { id: true, title: true },
        },
      },
    });

    if (!tier) {
      return NextResponse.json({ error: "Ticket tier not found" }, { status: 404 });
    }

    if (tier.soldCount >= tier.maxQuantity) {
      return NextResponse.json({ error: "Tier sold out" }, { status: 409 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user) {
      return NextResponse.json({ error: "Session user not found" }, { status: 401 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const latestTier = await tx.ticketTier.findUnique({ where: { id: tier.id } });
      if (!latestTier || latestTier.soldCount >= latestTier.maxQuantity) {
        throw new Error("TIER_SOLD_OUT");
      }

      await tx.ticketTier.update({
        where: { id: latestTier.id },
        data: { soldCount: { increment: 1 } },
      });

      const maxToken = await tx.ticket.aggregate({
        where: { eventId: tier.eventId },
        _max: { tokenId: true },
      });
      const nextTokenId = (maxToken._max.tokenId ?? 0) + 1;

      const order = await tx.order.create({
        data: {
          userId: session.sub,
          eventId: tier.eventId,
          totalAmount: tier.price,
          paymentMethod: "CRYPTO",
          status: "CONFIRMED",
          txHash: pseudoTxHash(),
        },
      });

      const ticket = await tx.ticket.create({
        data: {
          eventId: tier.eventId,
          tierId: tier.id,
          ownerId: session.sub,
          tokenId: nextTokenId,
          txHash: order.txHash,
          status: "MINTED",
          isUsed: false,
          qrCode: `${tier.eventId}:${nextTokenId}`,
        },
      });

      return { order, ticket };
    });

    return NextResponse.json({
      data: {
        orderId: result.order.id,
        ticketId: result.ticket.id,
        eventId: result.ticket.eventId,
        tokenId: result.ticket.tokenId,
        txHash: result.ticket.txHash,
      },
    });
  } catch (error) {
    console.error("POST /api/tickets/buy failed", error);

    if (error instanceof Error && error.message === "TIER_SOLD_OUT") {
      return NextResponse.json({ error: "Tier sold out" }, { status: 409 });
    }

    return NextResponse.json({ error: "Failed to buy ticket" }, { status: 500 });
  }
}
