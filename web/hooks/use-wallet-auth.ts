"use client";

import { useCallback, useMemo, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

type SessionUser = {
  id: string;
  walletAddress: string;
  role: "USER" | "ORGANIZER" | "ADMIN";
  name: string | null;
  avatar: string | null;
};

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoadingSession] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedAddress = useMemo(
    () => (address ? address.toLowerCase() : null),
    [address]
  );

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
      });
      const payload = await readJson<{ data: SessionUser | null }>(response);
      setUser(payload.data ?? null);
    } catch {
      setUser(null);
    }
  }, []);

  const signIn = useCallback(async () => {
    if (!normalizedAddress) {
      setError("Please connect wallet first");
      return false;
    }

    setIsSigningIn(true);
    setError(null);

    try {
      const nonceResponse = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ walletAddress: normalizedAddress }),
      });

      if (!nonceResponse.ok) {
        const payload = await readJson<{ error?: string }>(nonceResponse);
        throw new Error(payload.error ?? "Failed to request sign-in nonce");
      }

      const noncePayload = await readJson<{
        data: { nonceId: string; message: string; walletAddress: string };
      }>(nonceResponse);

      const signature = await signMessageAsync({
        message: noncePayload.data.message,
      });

      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          walletAddress: normalizedAddress,
          nonceId: noncePayload.data.nonceId,
          signature,
        }),
      });

      const verifyPayload = await readJson<{
        data?: SessionUser;
        error?: string;
      }>(verifyResponse);

      if (!verifyResponse.ok || !verifyPayload.data) {
        throw new Error(verifyPayload.error ?? "Wallet authentication failed");
      }

      setUser(verifyPayload.data);
      return true;
    } catch (err) {
      const fallback = "Failed to sign in with wallet";
      const message = err instanceof Error ? err.message : fallback;
      setError(message);
      return false;
    } finally {
      setIsSigningIn(false);
    }
  }, [normalizedAddress, signMessageAsync]);

  const signOut = useCallback(async () => {
    setError(null);
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    setUser(null);
  }, []);

  const effectiveUser = useMemo(() => {
    if (!isConnected || !normalizedAddress || !user) {
      return null;
    }

    if (user.walletAddress !== normalizedAddress) {
      return null;
    }

    return user;
  }, [isConnected, normalizedAddress, user]);

  return {
    user: effectiveUser,
    isLoadingSession,
    isSigningIn,
    isAuthenticated: !!effectiveUser,
    error,
    signIn,
    signOut,
    refreshSession,
  };
}
