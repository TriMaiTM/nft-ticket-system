"use client";

import { useState } from "react";

type BuyTicketButtonProps = {
  tierId: string;
};

export function BuyTicketButton({ tierId }: BuyTicketButtonProps) {
  const [isBuying, setIsBuying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleBuy() {
    setIsBuying(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      const response = await fetch("/api/tickets/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tierId }),
      });

      const payload = (await response.json()) as {
        data?: { tokenId: number };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to buy ticket");
      }

      setIsSuccess(true);
      setMessage(`Ticket minted. Token #${payload.data?.tokenId ?? "?"}`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Failed to buy ticket";
      if (text === "Unauthorized") {
        setMessage("Please sign in with wallet before buying.");
      } else {
        setMessage(text);
      }
    } finally {
      setIsBuying(false);
    }
  }

  return (
    <div className="buy-ticket-wrap">
      <button
        className="pill-button pill-button-light event-card-cta"
        onClick={handleBuy}
        type="button"
        disabled={isBuying}
      >
        <span className="pill-button-glow" aria-hidden="true" />
        <span className="pill-button-inner">
          {isBuying ? "Processing..." : "Buy Ticket"}
        </span>
      </button>

      {message ? (
        <p className={isSuccess ? "buy-ticket-message ok" : "buy-ticket-message err"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
