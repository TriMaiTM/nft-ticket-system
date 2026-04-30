"use client";

import { useState } from "react";
import { useAccount, useWriteContract, usePublicClient, useWalletClient } from "wagmi";
import { parseEther } from "viem";
import { eventTicketNftAbi, TicketMarketplaceAbi } from "@/lib/contracts";

type ListTicketButtonProps = {
  ticketId: string;
  tokenId: number;
  contractAddress: string;
};

export function ListTicketButton({ ticketId, tokenId, contractAddress }: ListTicketButtonProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [isListing, setIsListing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;

  const handleList = async () => {
    if (!address || !publicClient || !walletClient || !marketplaceAddress) {
      setError("Please connect your wallet and ensure marketplace is configured.");
      return;
    }

    const priceInput = prompt("Nhập giá bạn muốn bán (ETH/POL):", "1.5");
    if (!priceInput || isNaN(Number(priceInput)) || Number(priceInput) <= 0) {
      return;
    }

    setIsListing(true);
    setError(null);

    try {
      // 1. Check Approval
      const approved = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: eventTicketNftAbi,
        functionName: "getApproved",
        args: [BigInt(tokenId)],
      });

      if (approved.toLowerCase() !== marketplaceAddress.toLowerCase()) {
        const isApprovedForAll = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: eventTicketNftAbi,
          functionName: "isApprovedForAll",
          args: [address, marketplaceAddress as `0x${string}`],
        });

        if (!isApprovedForAll) {
          const approveHash = await walletClient.writeContract({
            address: contractAddress as `0x${string}`,
            abi: eventTicketNftAbi,
            functionName: "approve",
            args: [marketplaceAddress as `0x${string}`, BigInt(tokenId)],
            account: address,
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
        }
      }

      // 2. List Ticket On-chain
      const priceWei = parseEther(priceInput);
      const listHash = await walletClient.writeContract({
        address: marketplaceAddress as `0x${string}`,
        abi: TicketMarketplaceAbi,
        functionName: "listTicket",
        args: [contractAddress as `0x${string}`, BigInt(tokenId), priceWei],
        account: address,
      });

      await publicClient.waitForTransactionReceipt({ hash: listHash });

      // 3. Sync with DB
      const res = await fetch("/api/marketplace/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, price: priceWei.toString() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sync listing");
      }

      // Reload page to reflect changes
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi rao bán");
    } finally {
      setIsListing(false);
    }
  };

  return (
    <div style={{ marginTop: "16px" }}>
      {error && <p className="buy-ticket-message err">{error}</p>}
      <button 
        className="pill-button pill-button-dark"
        onClick={handleList}
        disabled={isListing}
        style={{ width: "100%" }}
      >
        <span className="pill-button-glow" aria-hidden="true" />
        <span className="pill-button-inner">
          {isListing ? "Đang xử lý..." : "Rao bán vé này"}
        </span>
      </button>
    </div>
  );
}
