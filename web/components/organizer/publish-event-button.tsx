"use client";

import { useState } from "react";

type PublishTierInput = {
  id: string;
  name: string;
  price: string;
  maxQuantity: number;
};

type PublishEventButtonProps = {
  eventId: string;
  eventTitle: string;
  organizerWalletAddress: string;
  tiers: PublishTierInput[];
  contractAddress: string | null;
};

export function PublishEventButton({
  eventId,
  eventTitle,
  organizerWalletAddress,
  tiers,
  contractAddress,
}: PublishEventButtonProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handlePublish() {
    setIsPublishing(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      if (contractAddress) {
        throw new Error("Sự kiện đã được đưa lên blockchain rồi.");
      }
      if (tiers.length === 0) {
        throw new Error("Vui lòng thêm ít nhất một hạng vé trước khi publish.");
      }

      setMessage("Đang publish lên blockchain...");

      const response = await fetch("/api/organizer/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          eventId,
          tiers: tiers.map((tier, index) => ({
            tierId: tier.id,
            onchainTierId: index,
            price: tier.price,
            maxQuantity: tier.maxQuantity,
          })),
        }),
      });

      const payload = (await response.json()) as {
        data?: { contractAddress: string; txHash: string };
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Publish failed");
      }

      setIsSuccess(true);
      setMessage(
        `Publish thành công! Contract: ${payload.data.contractAddress}`,
      );

      // Reload to show updated state
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      const raw =
        error instanceof Error
          ? error.message
          : "Không thể publish sự kiện. Vui lòng thử lại.";
      setMessage(raw);
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div className="buy-ticket-wrap">
      <button
        className="pill-button pill-button-light event-card-cta"
        onClick={handlePublish}
        type="button"
        disabled={isPublishing || !!contractAddress}
      >
        <span className="pill-button-glow" aria-hidden="true" />
        <span className="pill-button-inner">
          {isPublishing
            ? "Đang publish..."
            : contractAddress
              ? "Đã publish"
              : "Publish On-chain"}
        </span>
      </button>

      {message ? (
        <p
          className={
            isSuccess ? "buy-ticket-message ok" : "buy-ticket-message err"
          }
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
