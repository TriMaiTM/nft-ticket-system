import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, verifySessionToken } from "@/lib/auth";

export async function GET() {
  try {
    const cookieName = getSessionCookieName();
    const cookieStore = await cookies();
    const token = cookieStore.get(cookieName)?.value;
    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json({ data: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        walletAddress: true,
        role: true,
        name: true,
        avatar: true,
      },
    });

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("GET /api/auth/me failed", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}
