import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        organizer: {
          select: {
            id: true,
            walletAddress: true,
            name: true,
          },
        },
        ticketTiers: {
          select: {
            id: true,
            name: true,
            price: true,
            maxQuantity: true,
            soldCount: true,
          },
        },
      },
    });

    return NextResponse.json({ data: events });
  } catch (error) {
    console.error("GET /api/events failed", error);
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      organizerWalletAddress?: string;
      title?: string;
      description?: string;
      venue?: string;
      bannerImage?: string;
      startDate?: string;
      endDate?: string;
      chainId?: string;
      maxAttendees?: number;
    };

    if (!body.organizerWalletAddress || !body.title || !body.startDate || !body.endDate) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: organizerWalletAddress, title, startDate, endDate",
        },
        { status: 400 }
      );
    }

    const organizer = await prisma.user.upsert({
      where: { walletAddress: body.organizerWalletAddress.toLowerCase() },
      update: {},
      create: {
        walletAddress: body.organizerWalletAddress.toLowerCase(),
        role: "ORGANIZER",
      },
    });

    const event = await prisma.event.create({
      data: {
        organizerId: organizer.id,
        title: body.title,
        description: body.description,
        venue: body.venue,
        bannerImage: body.bannerImage,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        chainId: body.chainId,
        maxAttendees: body.maxAttendees,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    console.error("POST /api/events failed", error);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
