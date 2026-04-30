import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;
    const session = verifySessionToken(token);
    if (!session?.sub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ticketId, txHash } = body;

    if (!ticketId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findUnique({
      where: { ticketId },
      include: { ticket: true },
    });

    if (!listing || listing.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Listing is not active or does not exist" },
        { status: 404 }
      );
    }

    if (listing.sellerId === session.sub) {
      return NextResponse.json(
        { error: "You cannot buy your own ticket" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark listing as SOLD
      await tx.listing.update({
        where: { ticketId },
        data: { status: "SOLD" },
      });

      // 2. Transfer ticket ownership
      return tx.ticket.update({
        where: { id: ticketId },
        data: {
          ownerId: session.sub,
          status: "MINTED", // Reset status back to minted for the new owner
          txHash: txHash || listing.ticket.txHash,
        },
      });
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("POST /api/marketplace/buy failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
