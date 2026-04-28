"use client";

import { useState, useEffect, useCallback } from "react";
import { formatEther } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { eventTicketNftAbi } from "@/lib/contracts";

type WithdrawButtonProps = {
  contractAddress: string;
};

export function WithdrawButton({ contractAddress }: WithdrawButtonProps) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [balance, setBalance] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicClient) return;
    try {
      const raw = await publicClient.getBalance({
        address: contractAddress as `0x${string}`,
      });
      setBalance(formatEther(raw));
    } catch {
      setBalance(null);
    }
  }, [publicClient, contractAddress]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 10_000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  async function handleWithdraw() {
    setIsWithdrawing(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      if (!walletClient || !publicClient || !address) {
        throw new Error("Vui lòng kết nối ví trước.");
      }

      const owner = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: eventTicketNftAbi,
        functionName: "owner",
      });

      if ((owner as string).toLowerCase() !== address.toLowerCase()) {
        throw new Error("Chỉ organizer mới có quyền rút tiền.");
      }

      const hash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi: eventTicketNftAbi,
        functionName: "withdraw",
        account: address,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      setIsSuccess(true);
      setMessage("Rút tiền thành công!");
      fetchBalance();
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Không thể rút tiền.";
      if (raw.toLowerCase().includes("no funds")) {
        setMessage("Không có tiền để rút.");
      } else if (raw.toLowerCase().includes("user rejected") || raw.toLowerCase().includes("user denied")) {
        setMessage("Bạn đã huỷ giao dịch.");
      } else {
        setMessage(raw);
      }
    } finally {
      setIsWithdrawing(false);
    }
  }

  const hasBalance = balance && parseFloat(balance) > 0;

  return (
    <div className="withdraw-wrap">
      <div className="withdraw-balance">
        <span className="withdraw-balance-label">Doanh thu</span>
        <span className="withdraw-balance-value">
          {balance !== null ? `${balance} ETH` : "—"}
        </span>
      </div>

      {hasBalance && (
        <button
          className="pill-button pill-button-accent event-card-cta"
          onClick={handleWithdraw}
          type="button"
          disabled={isWithdrawing}
        >
          <span className="pill-button-glow" aria-hidden="true" />
          <span className="pill-button-inner">
            {isWithdrawing ? "Đang rút..." : "Rút tiền"}
          </span>
        </button>
      )}

      {message && (
        <p className={isSuccess ? "buy-ticket-message ok" : "buy-ticket-message err"}>
          {message}
        </p>
      )}
    </div>
  );
}
