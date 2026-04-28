import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";

type TierInput = {
  name?: string;
  price?: string;
  maxQuantity?: number;
  benefits?: string;
};

function isOrganizerRole(role: string): boolean {
  return role === "ORGANIZER" || role === "ADMIN";
}

function normalizeTiers(body: {
  tiers?: TierInput[];
  tierName?: string;
  tierPrice?: string;
  tierMaxQuantity?: number;
  benefits?: string;
}): TierInput[] {
  if (Array.isArray(body.tiers) && body.tiers.length > 0) {
    return body.tiers;
  }

  return [
    {
      name: body.tierName,
      price: body.tierPrice,
      maxQuantity: body.tierMaxQuantity,
      benefits: body.benefits,
    },
  ];
}

export async function GET() {
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
      select: {
        id: true,
        role: true,
      },
    });

    if (!me || !isOrganizerRole(me.role)) {
      return NextResponse.json(
        { error: "Organizer role required" },
        { status: 403 }
      );
    }

    const events = await prisma.event.findMany({
      where: { organizerId: me.id },
      orderBy: { createdAt: "desc" },
      include: {
        ticketTiers: {
          select: {
            id: true,
            onchainTierId: true,
            name: true,
            price: true,
            maxQuantity: true,
            soldCount: true,
            benefits: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ data: events });
  } catch (error) {
    console.error("GET /api/organizer/events failed", error);
    return NextResponse.json(
      { error: "Failed to fetch organizer events" },
      { status: 500 }
    );
  }
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
      select: {
        id: true,
        role: true,
      },
    });

    if (!me) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let organizerId = me.id;
    if (!isOrganizerRole(me.role)) {
      const upgraded = await prisma.user.update({
        where: { id: me.id },
        data: { role: "ORGANIZER" },
        select: { id: true },
      });
      organizerId = upgraded.id;
    }

    const body = (await request.json()) as {
      title?: string;
      description?: string;
      venue?: string;
      startDate?: string;
      endDate?: string;
      maxAttendees?: number;
      tiers?: TierInput[];
      tierName?: string;
      tierPrice?: string;
      tierMaxQuantity?: number;
      benefits?: string;
    };

    const tiers = normalizeTiers(body).filter(
      (tier) => tier.name || tier.price || tier.maxQuantity || tier.benefits
    );

    if (!body.title || !body.startDate || !body.endDate || tiers.length === 0) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title, startDate, endDate, and at least one ticket tier",
        },
        { status: 400 }
      );
    }

    const normalizedTiers = tiers.map((tier, index) => {
      const name = tier.name?.trim() ?? "";
      const price = tier.price?.trim() ?? "";
      const maxQuantity = tier.maxQuantity;

      const priceNumber = Number(price);
      if (!name) {
        throw new Error(`Tier ${index + 1} name is required`);
      }
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
        throw new Error(`Tier ${index + 1} has invalid price`);
      }
      if (typeof maxQuantity !== "number" || !Number.isInteger(maxQuantity) || maxQuantity <= 0) {
        throw new Error(`Tier ${index + 1} must have a positive integer quantity`);
      }

      return {
        name,
        price,
        maxQuantity,
        benefits: tier.benefits?.trim() || null,
      };
    });

    const event = await prisma.event.create({
      data: {
        organizerId,
        title: body.title,
        description: body.description,
        venue: body.venue,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        maxAttendees: body.maxAttendees,
        status: "DRAFT",
        chainId: "80002",
        ticketTiers: {
          create: normalizedTiers,
        },
      },
      include: {
        ticketTiers: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (error) {
    console.error("POST /api/organizer/events failed", error);

    if (error instanceof Error && error.message.startsWith("Tier ")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create organizer event" },
      { status: 500 }
    );
  }
}
