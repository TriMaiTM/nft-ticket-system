import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";
import { createPublicClient, http } from "viem";
import { polygonAmoy, hardhat } from "viem/chains";
import { eventTicketNftAbi } from "@/lib/contracts";

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const session = verifySessionToken(cookieStore.get(getSessionCookieName())?.value);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ticketId, eventId, tokenId } = await req.json();

    if (!ticketId || !eventId || tokenId === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const me = await prisma.user.findUnique({
      where: { id: session.sub },
    });

    if (!me || (me.role !== "ORGANIZER" && me.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Not an organizer" }, { status: 403 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        event: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.eventId !== eventId || ticket.tokenId !== tokenId) {
      return NextResponse.json({ error: "Invalid ticket data" }, { status: 400 });
    }

    if (ticket.event.organizerId !== me.id) {
      return NextResponse.json({ error: "You are not the organizer of this event" }, { status: 403 });
    }

    if (ticket.isUsed) {
      return NextResponse.json({ error: "Ticket has already been used" }, { status: 400 });
    }

    // Update in DB (off-chain check-in for speed)
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
        status: "USED",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Check-in error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
