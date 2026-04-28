import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";

type RouteParams = {
  params: Promise<{ id: string }>;
};

type TierLinkInput = {
  tierId?: string;
  onchainTierId?: number;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const session = verifySessionToken(
      cookieStore.get(getSessionCookieName())?.value
    );

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      contractAddress?: string;
      chainId?: string;
      deployTxHash?: string;
      tiers?: TierLinkInput[];
    };

    const contractAddress = body.contractAddress?.toLowerCase().trim();
    if (!contractAddress || !/^0x[a-f0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json(
        { error: "Valid contractAddress is required" },
        { status: 400 }
      );
    }

    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        organizerId: true,
        contractAddress: true,
        ticketTiers: {
          select: { id: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    if (event.organizerId !== session.sub) {
      return NextResponse.json(
        { error: "Only organizer can go-live this event" },
        { status: 403 }
      );
    }

    if (event.contractAddress && event.contractAddress !== contractAddress) {
      return NextResponse.json(
        {
          error:
            "Event already linked to another contract address. Refusing overwrite.",
        },
        { status: 409 }
      );
    }

    const tiers = body.tiers ?? [];
    if (tiers.length !== event.ticketTiers.length) {
      return NextResponse.json(
        { error: "Tier mapping count does not match draft ticket tiers" },
        { status: 400 }
      );
    }

    const tierIdSet = new Set(event.ticketTiers.map((tier) => tier.id));
    const onchainTierIdSet = new Set<number>();

    for (const tier of tiers) {
      if (!tier.tierId || !tierIdSet.has(tier.tierId)) {
        return NextResponse.json(
          { error: "Invalid draft tier mapping payload" },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(tier.onchainTierId) ||
        tier.onchainTierId! < 0 ||
        onchainTierIdSet.has(tier.onchainTierId!)
      ) {
        return NextResponse.json(
          { error: "Invalid or duplicate onchainTierId mapping" },
          { status: 400 }
        );
      }

      onchainTierIdSet.add(tier.onchainTierId!);
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const tier of tiers) {
        await tx.ticketTier.update({
          where: { id: tier.tierId! },
          data: { onchainTierId: tier.onchainTierId! },
        });
      }

      return tx.event.update({
        where: { id },
        data: {
          contractAddress,
          chainId: body.chainId ?? "80002",
          status: "PUBLISHED",
        },
        select: {
          id: true,
          title: true,
          contractAddress: true,
          chainId: true,
          status: true,
          ticketTiers: {
            select: {
              id: true,
              onchainTierId: true,
              name: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      data: {
        ...updated,
        deployTxHash: body.deployTxHash,
      },
    });
  } catch (error) {
    console.error("POST /api/events/[id]/go-live failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
