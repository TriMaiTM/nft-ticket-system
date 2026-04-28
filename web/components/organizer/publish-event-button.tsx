"use client";

import { useState } from "react";
import { parseEther, parseEventLogs, parseGwei } from "viem";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { eventFactoryAbi } from "@/lib/contracts";

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

function symbolFromTitle(title: string): string {
  const letters = title
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  return (letters || "TNFT").slice(0, 8);
}

/** Map on-chain / wallet errors to user-friendly messages */
function friendlyPublishError(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("user denied"))
    return "Bạn đã huỷ giao dịch.";
  if (lower.includes("insufficient funds") || lower.includes("insufficient balance"))
    return "Ví không đủ số dư để trả phí gas.";
  if (lower.includes("gas") && lower.includes("underpriced"))
    return "Phí gas quá thấp. Vui lòng thử lại.";
  if (lower.includes("gas") && lower.includes("minimum"))
    return "Phí gas quá thấp cho mạng hiện tại. Vui lòng thử lại.";
  if (lower.includes("nonce"))
    return "Lỗi nonce ví. Hãy reset tài khoản trong MetaMask (Settings → Advanced → Clear activity tab data).";
  if (lower.includes("already live") || lower.includes("already published"))
    return "Sự kiện đã được đưa lên blockchain rồi.";

  return raw;
}

/** Whether current chain needs Amoy-specific gas pricing */
function isAmoyChain(chainId: number): boolean {
  return chainId === 80002;
}

export function PublishEventButton({
  eventId,
  eventTitle,
  organizerWalletAddress,
  tiers,
  contractAddress,
}: PublishEventButtonProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const chainId = useChainId();

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

      if (!walletClient || !publicClient || !address) {
        throw new Error("Vui lòng kết nối ví organizer trước khi publish.");
      }

      if (address.toLowerCase() !== organizerWalletAddress.toLowerCase()) {
        throw new Error("Chỉ ví organizer mới có quyền publish sự kiện này.");
      }

      const factoryAddress = process.env.NEXT_PUBLIC_EVENT_FACTORY_ADDRESS;
      if (!factoryAddress || !/^0x[a-fA-F0-9]{40}$/.test(factoryAddress)) {
        throw new Error("Thiếu cấu hình factory contract. Vui lòng liên hệ quản trị viên.");
      }

      const normalizedTiers = tiers.map((tier, index) => {
        if (!tier.name.trim()) {
          throw new Error(`Hạng vé ${index + 1} chưa có tên.`);
        }

        return {
          tierId: tier.id,
          onchainTierId: index,
          price: parseEther(tier.price),
          maxSupply: BigInt(Math.max(tier.maxQuantity, 1)),
        };
      });

      let eventsBefore: readonly `0x${string}`[] = [];
      try {
        eventsBefore = (await publicClient.readContract({
          address: factoryAddress as `0x${string}`,
          abi: eventFactoryAbi,
          functionName: "getEventsByOrganizer",
          args: [address],
        })) as readonly `0x${string}`[];
      } catch {
        // Non-blocking: only used for fallback address recovery
      }

      const createEventArgs = [
        {
          name: eventTitle,
          symbol: symbolFromTitle(eventTitle),
          tiers: normalizedTiers.map((tier) => ({
            price: tier.price,
            maxSupply: tier.maxSupply,
          })),
          royaltyBps: BigInt(500),
          maxPerWallet: BigInt(5),
        },
      ] as const;

      // Build gas params: Amoy needs explicit gasPrice ≥ 25 Gwei, Hardhat uses defaults
      const gasOverrides: { gas: bigint; gasPrice?: bigint } = { gas: BigInt(4_000_000) };

      if (isAmoyChain(chainId)) {
        gasOverrides.gasPrice = parseGwei("30");
      }

      // Pre-estimate gas
      try {
        const estimated = await publicClient.estimateContractGas({
          address: factoryAddress as `0x${string}`,
          abi: eventFactoryAbi,
          functionName: "createEvent",
          args: createEventArgs,
          account: address,
          ...(gasOverrides.gasPrice ? { gasPrice: gasOverrides.gasPrice } : {}),
        });
        gasOverrides.gas = (estimated * BigInt(130)) / BigInt(100); // 30% buffer
      } catch {
        // Use fallback gas (4M)
      }

      setMessage("Đang chờ xác nhận từ ví...");

      const deployTxHash = await walletClient.writeContract({
        address: factoryAddress as `0x${string}`,
        abi: eventFactoryAbi,
        functionName: "createEvent",
        args: createEventArgs,
        account: address,
        ...gasOverrides,
      });

      setMessage("Đang chờ xác nhận từ blockchain...");

      const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployTxHash });
      let createdAddress: `0x${string}` | undefined;

      try {
        const createdLogs = parseEventLogs({
          abi: eventFactoryAbi,
          eventName: "EventCreated",
          logs: deployReceipt.logs,
          strict: false,
        });

        const created = createdLogs.find((log) =>
          log.args?.organizer
            ? log.args.organizer.toLowerCase() === address.toLowerCase()
            : false
        );

        createdAddress = created?.args?.eventContract;
      } catch {
        // Fall through to organizer event list lookup.
      }

      if (!createdAddress) {
        try {
          const eventsAfter = (await publicClient.readContract({
            address: factoryAddress as `0x${string}`,
            abi: eventFactoryAbi,
            functionName: "getEventsByOrganizer",
            args: [address],
          })) as readonly `0x${string}`[];

          if (eventsAfter.length > eventsBefore.length) {
            createdAddress = eventsAfter[eventsAfter.length - 1];
          } else if (eventsAfter.length > 0) {
            const previousSet = new Set(eventsBefore.map((eventAddress) => eventAddress.toLowerCase()));
            createdAddress = eventsAfter.find(
              (eventAddress) => !previousSet.has(eventAddress.toLowerCase())
            );

            if (!createdAddress) {
              createdAddress = eventsAfter[eventsAfter.length - 1];
            }
          }
        } catch {
          // Fallback lookup failed; rely on event log parsing above
        }
      }

      if (!createdAddress) {
        throw new Error("Giao dịch thành công nhưng không tìm thấy địa chỉ contract. Vui lòng kiểm tra ví và thử lại.");
      }

      setMessage("Đang đồng bộ dữ liệu...");

      const goLiveResponse = await fetch(`/api/events/${eventId}/go-live`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contractAddress: createdAddress,
          chainId: String(chainId),
          deployTxHash,
          tiers: normalizedTiers.map(({ tierId, onchainTierId }) => ({
            tierId,
            onchainTierId,
          })),
        }),
      });

      const goLivePayload = (await goLiveResponse.json()) as { error?: string };
      if (!goLiveResponse.ok) {
        throw new Error(goLivePayload.error ?? "Không thể đồng bộ sự kiện. Vui lòng liên hệ hỗ trợ.");
      }

      setIsSuccess(true);
      setMessage(`Publish thành công! Contract: ${createdAddress}`);
      window.location.reload();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Không thể publish sự kiện. Vui lòng thử lại.";
      setMessage(friendlyPublishError(raw));
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
        disabled={isPublishing}
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
        <p className={isSuccess ? "buy-ticket-message ok" : "buy-ticket-message err"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
