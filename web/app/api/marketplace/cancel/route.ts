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
    const { ticketId } = body;

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

    if (listing.sellerId !== session.sub) {
      return NextResponse.json(
        { error: "You are not authorized to cancel this listing" },
        { status: 403 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark listing as CANCELLED
      await tx.listing.update({
        where: { ticketId },
        data: { status: "CANCELLED" },
      });

      // 2. Revert ticket status to MINTED
      return tx.ticket.update({
        where: { id: ticketId },
        data: { status: "MINTED" },
      });
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("POST /api/marketplace/cancel failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
