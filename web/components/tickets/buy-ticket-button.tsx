"use client";

import { useState } from "react";
import { parseEventLogs, parseEther } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { eventTicketNftAbi, mapLegacyTierNameToId } from "@/lib/contracts";

type BuyTicketButtonProps = {
  tierId: string;
  tierName: string;
  tierPrice: string;
  onchainTierId: number | null;
  eventContractAddress: string | null;
};

/** Map on-chain revert reasons to user-friendly messages */
function friendlyBuyError(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes("tiersoldout")) return "Vé hạng này đã bán hết.";
  if (lower.includes("incorrectpayment")) return "Số tiền gửi không đúng giá vé.";
  if (lower.includes("maxsupplyreached")) return "Đã bán hết toàn bộ vé cho sự kiện này.";
  if (lower.includes("maxperwalletreached") || lower.includes("exceedmaxperwallet"))
    return "Bạn đã mua tối đa số vé cho phép.";
  if (lower.includes("insufficient funds") || lower.includes("insufficient balance"))
    return "Ví không đủ số dư để mua vé.";
  if (lower.includes("user rejected") || lower.includes("user denied"))
    return "Bạn đã huỷ giao dịch.";
  if (lower.includes("nonce"))
    return "Lỗi nonce ví. Hãy reset tài khoản trong MetaMask (Settings → Advanced → Clear activity tab data).";

  return raw;
}

export function BuyTicketButton({
  tierId,
  tierName,
  tierPrice,
  onchainTierId,
  eventContractAddress,
}: BuyTicketButtonProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isBuying, setIsBuying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleBuy() {
    setIsBuying(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      if (!walletClient || !publicClient || !address) {
        throw new Error("Vui lòng kết nối ví trước khi mua vé.");
      }

      if (!eventContractAddress) {
        throw new Error("Sự kiện chưa được đưa lên blockchain. Vui lòng đợi organizer publish.");
      }

      const targetTierId = onchainTierId ?? mapLegacyTierNameToId(tierName);

      const hash = await walletClient.writeContract({
        address: eventContractAddress as `0x${string}`,
        abi: eventTicketNftAbi,
        functionName: "mint",
        args: [targetTierId, `ipfs://ticketnft/${tierId}/${Date.now()}`],
        account: address,
        value: parseEther(tierPrice),
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const txHash = receipt.transactionHash;

      const mintedLogs = parseEventLogs({
        abi: eventTicketNftAbi,
        eventName: "TicketMinted",
        logs: receipt.logs,
      });

      const minted = mintedLogs.find((log) =>
        log.args?.to ? log.args.to.toLowerCase() === address.toLowerCase() : false
      );

      const tokenId = minted?.args?.tokenId ? Number(minted.args.tokenId) : undefined;
      const mintedTierId =
        typeof minted?.args?.tierId === "number"
          ? minted.args.tierId
          : minted?.args?.tierId !== undefined
            ? Number(minted.args.tierId)
            : undefined;

      if (!tokenId || mintedTierId === undefined) {
        throw new Error("Giao dịch thành công nhưng không thể xác nhận thông tin vé. Vui lòng kiểm tra ví.");
      }

      const response = await fetch("/api/tickets/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tierId, txHash, tokenId, onchainTierId: mintedTierId }),
      });

      const payload = (await response.json()) as {
        data?: { tokenId: number; txHash?: string };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Không thể lưu thông tin vé. Vui lòng liên hệ hỗ trợ.");
      }

      setIsSuccess(true);
      setMessage(`Mua vé thành công! Token #${payload.data?.tokenId ?? "?"}`);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Không thể mua vé. Vui lòng thử lại.";
      if (raw === "Unauthorized") {
        setMessage("Vui lòng đăng nhập ví trước khi mua vé.");
      } else {
        setMessage(friendlyBuyError(raw));
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
        disabled={isBuying || !eventContractAddress}
      >
        <span className="pill-button-glow" aria-hidden="true" />
        <span className="pill-button-inner">
          {isBuying ? "Đang xử lý..." : eventContractAddress ? "Mua vé" : "Chưa mở bán"}
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
