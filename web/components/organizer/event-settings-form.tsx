"use client";

import { useState } from "react";
import { useWalletClient, usePublicClient, useAccount, useReadContract } from "wagmi";
import { useRouter } from "next/navigation";
import { eventTicketNftAbi } from "@/lib/contracts";

type EventSettingsFormProps = {
  eventId: string;
  contractAddress: string;
  currentStatus: string;
};

export function EventSettingsForm({ eventId, contractAddress, currentStatus }: EventSettingsFormProps) {
  const router = useRouter();
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const { data: isTransferable, refetch: refetchTransferable } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: eventTicketNftAbi,
    functionName: "transferable",
  });

  async function handleEndEvent() {
    if (!walletClient || !publicClient || !address) return;
    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);

    try {
      if (!confirm("Are you sure you want to end this event? This action cannot be undone and will prevent further ticket transfers and sales.")) {
        setIsSubmitting(false);
        return;
      }

      // 1. Call Smart Contract setEventEnded(true)
      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: eventTicketNftAbi,
        functionName: "setEventEnded",
        args: [true],
        account: address,
      });

      setMessage("Ending event on-chain... Please wait.");
      await publicClient.waitForTransactionReceipt({ hash });

      // 2. Sync Database
      const res = await fetch(`/api/events/${eventId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ENDED" }),
      });

      if (!res.ok) {
        throw new Error("Failed to sync database status");
      }

      setMessage("Event has been permanently ended.");
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Failed to end event");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleTransfers(enabled: boolean) {
    if (!walletClient || !publicClient || !address) return;
    setIsSubmitting(true);
    setMessage(null);
    setIsError(false);

    try {
      const confirmMsg = enabled 
        ? "Enable secondary market transfers?" 
        : "Disable secondary market transfers? Users will not be able to sell or transfer tickets.";
      if (!confirm(confirmMsg)) {
        setIsSubmitting(false);
        return;
      }

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: eventTicketNftAbi,
        functionName: "setTransferable",
        args: [enabled],
        account: address,
      });

      setMessage("Updating transferability on-chain...");
      await publicClient.waitForTransactionReceipt({ hash });

      setMessage(`Transfers are now ${enabled ? "Enabled" : "Disabled"}.`);
      refetchTransferable();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Failed to toggle transfers");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isEnded = currentStatus === "ENDED" || currentStatus === "CANCELLED";

  return (
    <div className="event-card">
      <h3 className="event-title">Event Settings</h3>
      <p className="event-description">Manage on-chain settings for this event.</p>
      
      {message && (
        <p className={`buy-ticket-message ${isError ? "err" : "ok"}`} style={{ marginBottom: "16px" }}>
          {message}
        </p>
      )}

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "16px" }}>
        <button 
          className="pill-button pill-button-dark" 
          onClick={() => handleToggleTransfers(!isTransferable)}
          disabled={isSubmitting || isEnded || isTransferable === undefined}
        >
          <span className="pill-button-glow" aria-hidden="true" />
          <span className="pill-button-inner">
            {isTransferable === undefined ? "Loading..." : (isTransferable ? "Disable Transfers" : "Enable Transfers")}
          </span>
        </button>

        <button 
          className="pill-button pill-button-accent" 
          onClick={handleEndEvent}
          disabled={isSubmitting || isEnded}
        >
          <span className="pill-button-glow" aria-hidden="true" />
          <span className="pill-button-inner">
            {isEnded ? "Event Ended" : "End Event Permanently"}
          </span>
        </button>
      </div>
    </div>
  );
}
