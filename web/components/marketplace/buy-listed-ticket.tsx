"use client";

import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { TicketMarketplaceAbi } from "@/lib/contracts";

type BuyListedTicketProps = {
  ticketId: string;
  tokenId: number;
  contractAddress: string;
  priceWei: string;
};

export function BuyListedTicket({ ticketId, tokenId, contractAddress, priceWei }: BuyListedTicketProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isBuying, setIsBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;

  const handleBuy = async () => {
    if (!address || !publicClient || !walletClient || !marketplaceAddress) {
      setError("Please connect your wallet to buy tickets.");
      return;
    }

    setIsBuying(true);
    setError(null);

    try {
      // 1. Buy on-chain
      const buyHash = await walletClient.writeContract({
        address: marketplaceAddress as `0x${string}`,
        abi: TicketMarketplaceAbi,
        functionName: "buyTicket",
        args: [contractAddress as `0x${string}`, BigInt(tokenId)],
        value: BigInt(priceWei),
        account: address,
      });

      await publicClient.waitForTransactionReceipt({ hash: buyHash });

      // 2. Sync with DB
      const res = await fetch("/api/marketplace/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, txHash: buyHash }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sync purchase");
      }

      // Redirect to My Tickets
      window.location.href = "/my-tickets";
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi mua vé");
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div style={{ marginTop: "16px" }}>
      {error && <p className="buy-ticket-message err" style={{ marginBottom: "12px" }}>{error}</p>}
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
