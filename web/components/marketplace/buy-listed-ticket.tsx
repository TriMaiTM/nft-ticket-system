"use client";

import { useState } from "react";
import { encodeFunctionData } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { TicketMarketplaceAbi } from "@/lib/contracts";

type BuyListedTicketProps = {
  ticketId: string;
  tokenId: number;
  contractAddress: string;
  priceWei: string;
};

export function BuyListedTicket({
  ticketId,
  tokenId,
  contractAddress,
  priceWei,
}: BuyListedTicketProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [isBuying, setIsBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;

  const handleBuy = async () => {
    if (!address || !publicClient || !marketplaceAddress) {
      setError("Please connect your wallet.");
      return;
    }

    setIsBuying(true);
    setError(null);

    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error("MetaMask not found");

      // 1. Buy on-chain
      const buyData = encodeFunctionData({
        abi: TicketMarketplaceAbi,
        functionName: "buyTicket",
        args: [contractAddress as `0x${string}`, BigInt(tokenId)],
      });

      const priceHex = "0x" + BigInt(priceWei).toString(16);

      const buyHash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: marketplaceAddress,
            data: buyData,
            value: priceHex,
            gas: "0x493E0", // 300000
          },
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash: buyHash });

      // 2. Sync with DB
      const res = await fetch("/api/marketplace/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ticketId, txHash: buyHash }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sync purchase");
      }

      window.location.href = "/my-tickets";
    } catch (err) {
      console.error("Buy listed ticket error:", err);
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi mua vé");
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div style={{ marginTop: "16px" }}>
      {error && (
        <p className="buy-ticket-message err" style={{ marginBottom: "12px" }}>
          {error}
        </p>
      )}
      <button
        className="pill-button pill-button-dark"
        onClick={handleBuy}
        disabled={isBuying}
        style={{ width: "100%" }}
      >
        <span className="pill-button-glow" aria-hidden="true" />
        <span className="pill-button-inner">
          {isBuying ? "Đang xử lý giao dịch..." : "Mua lại vé này"}
        </span>
      </button>
    </div>
  );
}
