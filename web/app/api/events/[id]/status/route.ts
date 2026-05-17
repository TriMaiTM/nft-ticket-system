import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    
    const cookieStore = await cookies();
    const session = verifySessionToken(cookieStore.get(getSessionCookieName())?.value);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Only the organizer or admin can update the event status
    if (event.organizerId !== session.sub) {
      const me = await prisma.user.findUnique({
        where: { id: session.sub },
      });
      if (me?.role !== "ADMIN") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { status } = body;

    if (!["DRAFT", "PUBLISHED", "ONGOING", "ENDED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.event.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("POST /api/events/[id]/status failed", error);
    return NextResponse.json(
      { error: "Failed to update event status" },
      { status: 500 }
    );
  }
}
