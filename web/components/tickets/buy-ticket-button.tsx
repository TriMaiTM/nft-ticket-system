"use client";

import { useState } from "react";
import { encodeFunctionData, parseEther, parseEventLogs } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { eventTicketNftAbi, mapLegacyTierNameToId } from "@/lib/contracts";

type BuyTicketButtonProps = {
  tierId: string;
  tierName: string;
  tierPrice: string;
  onchainTierId: number | null;
  eventContractAddress: string | null;
};

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
        throw new Error("Sự kiện chưa được đưa lên blockchain.");
      }

      const targetTierId = onchainTierId ?? mapLegacyTierNameToId(tierName);

      // Encode function call
      const callData = encodeFunctionData({
        abi: eventTicketNftAbi,
        functionName: "mint",
        args: [targetTierId, `ipfs://ticketnft/${tierId}/${Date.now()}`],
      });

      // Call MetaMask directly via request() — bypasses viem's RPC calls
      const provider = await walletClient.getChainId().then(() => {
        // Access the underlying EIP-1193 provider
        return (
          (walletClient as any).transport?.value ||
          (walletClient as any).request
        );
      });

      // Use window.ethereum directly for maximum reliability
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error("MetaMask not found");
      }

      // Ensure MetaMask uses a reliable RPC (switch to Sepolia if not already)
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xAA36A7" }], // Sepolia
        });
      } catch {
        // Chain not added yet, try adding it
        try {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xAA36A7",
                chainName: "Sepolia",
                nativeCurrency: {
                  name: "SepoliaETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: [
                  "https://eth-sepolia.g.alchemy.com/v2/" +
                    (process.env.NEXT_PUBLIC_ALCHEMY_KEY ?? ""),
                ],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } catch {}
      }

      const txHash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: eventContractAddress,
            data: callData,
            value: "0x" + parseEther(tierPrice).toString(16),
            gas: "0x493E0", // 300000
          },
        ],
      });

      setMessage("Đang chờ xác nhận từ blockchain...");

      // Wait for receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });

      // Parse TicketMinted event
      const mintedLogs = parseEventLogs({
        abi: eventTicketNftAbi,
        eventName: "TicketMinted",
        logs: receipt.logs,
      });

      const minted = mintedLogs.find((log) =>
        log.args?.to
          ? log.args.to.toLowerCase() === address.toLowerCase()
          : false,
      );

      const tokenId = minted?.args?.tokenId
        ? Number(minted.args.tokenId)
        : undefined;

      if (!tokenId) {
        throw new Error("Không thể xác nhận tokenId từ blockchain.");
      }

      // Sync with DB
      const response = await fetch("/api/tickets/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tierId,
          txHash,
          tokenId,
          onchainTierId: targetTierId,
        }),
      });

      const payload = (await response.json()) as {
        data?: { tokenId: number };
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Không thể lưu thông tin vé.");
      }

      setIsSuccess(true);
      setMessage(`Mua vé thành công! Token #${payload.data.tokenId}`);
    } catch (error) {
      console.error("Buy ticket error:", error);
      const raw = error instanceof Error ? error.message : "Không thể mua vé.";
      setMessage(raw);
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
          {isBuying
            ? "Đang xử lý..."
            : eventContractAddress
              ? "Mua vé"
              : "Chưa mở bán"}
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
