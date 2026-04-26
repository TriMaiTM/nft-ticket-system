import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSignInMessage, generateNonce } from "@/lib/auth";

const NONCE_TTL_MINUTES = 10;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { walletAddress?: string };
    const walletAddress = body.walletAddress?.toLowerCase();

    if (!walletAddress) {
      return NextResponse.json(
        { error: "walletAddress is required" },
        { status: 400 }
      );
    }

    const nonce = generateNonce();
    const message = buildSignInMessage(walletAddress, nonce);
    const expiresAt = new Date(Date.now() + NONCE_TTL_MINUTES * 60_000);

    const challenge = await prisma.authNonce.create({
      data: {
        walletAddress,
        nonce,
        message,
        expiresAt,
      },
    });

    return NextResponse.json({
      data: {
        nonceId: challenge.id,
        walletAddress,
        message,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("POST /api/auth/nonce failed", error);
    return NextResponse.json(
      { error: "Failed to create sign-in nonce" },
      { status: 500 }
    );
  }
}
