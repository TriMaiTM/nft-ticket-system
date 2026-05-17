"use client";

import { useState } from "react";
import { encodeFunctionData, parseEther, formatEther } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { eventTicketNftAbi, TicketMarketplaceAbi } from "@/lib/contracts";

type ListTicketButtonProps = {
  ticketId: string;
  tokenId: number;
  contractAddress: string;
  tierPrice: string; // Original price in ETH (e.g. "0.05")
  tierName: string;
};

const MAX_MULTIPLIER = 3; // Max 3x original price

export function ListTicketButton({
  ticketId,
  tokenId,
  contractAddress,
  tierPrice,
  tierName,
}: ListTicketButtonProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [isListing, setIsListing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [priceInput, setPriceInput] = useState("");

  const marketplaceAddress = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
  const originalPrice = parseFloat(tierPrice);
  const maxPrice = originalPrice * MAX_MULTIPLIER;
  const minPrice = 0.001;

  const priceNum = parseFloat(priceInput) || 0;
  const isValidPrice = priceNum >= minPrice && priceNum <= maxPrice;

  function openModal() {
    setPriceInput((originalPrice * 2).toFixed(4)); // Default: 2x
    setError(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setError(null);
  }

  async function handleConfirm() {
    if (!address || !publicClient || !marketplaceAddress) {
      setError("Please connect your wallet.");
      return;
    }

    if (!isValidPrice) {
      setError(
        `Giá phải từ ${minPrice} đến ${maxPrice.toFixed(4)} ETH (tối đa ${MAX_MULTIPLIER}x giá gốc)`,
      );
      return;
    }

    setIsListing(true);
    setError(null);

    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) throw new Error("MetaMask not found");

      // 1. Check & Approve marketplace
      const approved = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: eventTicketNftAbi,
        functionName: "getApproved",
        args: [BigInt(tokenId)],
      });

      if (approved.toLowerCase() !== marketplaceAddress.toLowerCase()) {
        const approveData = encodeFunctionData({
          abi: eventTicketNftAbi,
          functionName: "approve",
          args: [marketplaceAddress as `0x${string}`, BigInt(tokenId)],
        });

        const approveHash = await ethereum.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: address,
              to: contractAddress,
              data: approveData,
              gas: "0x30D40",
            },
          ],
        });

        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // 2. List ticket on marketplace
      const priceWei = parseEther(priceInput);
      const listData = encodeFunctionData({
        abi: TicketMarketplaceAbi,
        functionName: "listTicket",
        args: [contractAddress as `0x${string}`, BigInt(tokenId), priceWei],
      });

      const listHash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: address,
            to: marketplaceAddress,
            data: listData,
            gas: "0x493E0",
          },
        ],
      });

      await publicClient.waitForTransactionReceipt({ hash: listHash });

      // 3. Sync with DB
      const res = await fetch("/api/marketplace/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ticketId, price: priceWei.toString() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to sync listing");
      }

      closeModal();
      window.location.reload();
    } catch (err) {
      console.error("List ticket error:", err);
      setError(
        err instanceof Error ? err.message : "Đã xảy ra lỗi khi rao bán",
      );
    } finally {
      setIsListing(false);
    }
  }

  return (
    <>
      <div style={{ marginTop: "16px" }}>
        <button
          className="pill-button pill-button-dark"
          onClick={openModal}
          style={{ width: "100%" }}
        >
          <span className="pill-button-glow" aria-hidden="true" />
          <span className="pill-button-inner">Rao bán vé này</span>
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#111",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "32px",
              maxWidth: "420px",
              width: "90%",
            }}
          >
            <h3
              style={{
                margin: "0 0 8px",
                fontSize: "20px",
                color: "#fff",
              }}
            >
              Đăng bán vé
            </h3>
            <p
              style={{
                margin: "0 0 24px",
                fontSize: "14px",
                color: "rgba(255,255,255,0.5)",
              }}
            >
              {tierName} Ticket · Token #{tokenId}
            </p>

            {/* Price info */}
            <div
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}
                >
                  Giá gốc
                </span>
                <span style={{ color: "#fff", fontSize: "13px" }}>
                  {originalPrice.toFixed(4)} ETH
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{ color: "rgba(255,255,255,0.5)", fontSize: "13px" }}
                >
                  Giá tối đa ({MAX_MULTIPLIER}x)
                </span>
                <span style={{ color: "#4ade80", fontSize: "13px" }}>
                  {maxPrice.toFixed(4)} ETH
                </span>
              </div>
            </div>

            {/* Price input */}
            <label
              style={{
                display: "block",
                marginBottom: "16px",
              }}
            >
              <span
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                Giá bán (ETH)
              </span>
              <input
                type="number"
                min={minPrice}
                max={maxPrice}
                step="0.001"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder={`0.001 - ${maxPrice.toFixed(4)}`}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${isValidPrice || !priceInput ? "rgba(255,255,255,0.2)" : "#f87171"}`,
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "16px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {priceInput && !isValidPrice && (
                <span
                  style={{
                    display: "block",
                    marginTop: "4px",
                    fontSize: "12px",
                    color: "#f87171",
                  }}
                >
                  Giá phải từ {minPrice} đến {maxPrice.toFixed(4)} ETH
                </span>
              )}
            </label>

            {/* Profit estimate */}
            {priceInput && isValidPrice && (
              <div
                style={{
                  background: "rgba(74,222,128,0.1)",
                  border: "1px solid rgba(74,222,128,0.3)",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "20px",
                  fontSize: "13px",
                  color: "#4ade80",
                }}
              >
                Bạn nhận: ~{((priceNum * 95) / 100).toFixed(4)} ETH (sau 2.5%
                platform fee + 5% royalty)
              </div>
            )}

            {/* Error */}
            {error && (
              <p
                style={{
                  margin: "0 0 16px",
                  padding: "12px",
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  color: "#f87171",
                }}
              >
                {error}
              </p>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="pill-button pill-button-dark"
                onClick={closeModal}
                disabled={isListing}
                style={{ flex: 1 }}
              >
                <span className="pill-button-inner">Huỷ</span>
              </button>
              <button
                className="pill-button pill-button-light"
                onClick={handleConfirm}
                disabled={isListing || !isValidPrice}
                style={{ flex: 1 }}
              >
                <span className="pill-button-glow" aria-hidden="true" />
                <span className="pill-button-inner">
                  {isListing ? "Đang xử lý..." : "Xác nhận"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
