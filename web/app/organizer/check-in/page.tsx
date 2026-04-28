"use client";

import { useState } from "react";
import Link from "next/link";
import { QRScanner } from "@/components/organizer/qr-scanner";

type CheckInResult = {
  success: boolean;
  message: string;
  ticketData?: any;
};

export default function CheckInPage() {
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanKey, setScanKey] = useState(0); // Used to force re-mount scanner

  const handleScan = async (decodedText: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const payload = JSON.parse(decodedText);
      
      if (!payload.ticketId || !payload.eventId || payload.tokenId === undefined) {
        throw new Error("Mã QR không hợp lệ.");
      }

      const response = await fetch("/api/tickets/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Lỗi khi check-in.");
      }

      setResult({
        success: true,
        message: `Check-in thành công! Token #${payload.tokenId}`,
        ticketData: payload,
      });

    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Mã QR không hợp lệ hoặc lỗi kết nối.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setResult(null);
    setScanKey((prev) => prev + 1);
  };

  return (
    <section className="events-root">
      <video
        className="hero-video"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="hero-overlay" />

      <div className="hero-content-layer">
        <nav className="hero-navbar" aria-label="Primary">
          <div className="hero-navbar-left">
            <Link href="/" className="hero-logo" aria-label="Homepage">
              LOGOIPSUM
            </Link>
          </div>

          <Link href="/organizer/events" className="pill-button pill-button-light">
            <span className="pill-button-glow" aria-hidden="true" />
            <span className="pill-button-inner">Quản lý sự kiện</span>
          </Link>
        </nav>

        <main className="events-main" style={{ maxWidth: "600px" }}>
          <header className="events-header" style={{ textAlign: "center" }}>
            <p className="events-eyebrow">Scanner</p>
            <h1 className="events-title">Check-in Vé</h1>
          </header>

          <div className="event-create-form" style={{ padding: "20px" }}>
            {!result ? (
              <>
                <p style={{ textAlign: "center", marginBottom: "16px", color: "rgba(255,255,255,0.8)" }}>
                  Đưa mã QR của khách hàng vào khung hình để quét
                </p>
                <div style={{ borderRadius: "12px", overflow: "hidden", background: "#000" }}>
                  <QRScanner key={scanKey} onScanSuccess={handleScan} />
                </div>
                {isProcessing && (
                  <p className="buy-ticket-message" style={{ textAlign: "center", marginTop: "16px" }}>
                    Đang xử lý...
                  </p>
                )}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                  {result.success ? "✅" : "❌"}
                </div>
                <h3 style={{ fontSize: "20px", marginBottom: "12px", color: result.success ? "#4ade80" : "#f87171" }}>
                  {result.message}
                </h3>
                {result.ticketData && (
                  <div style={{ background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "12px", marginBottom: "24px", textAlign: "left" }}>
                    <p style={{ margin: "0 0 8px", fontSize: "14px", color: "rgba(255,255,255,0.6)" }}>Thông tin vé:</p>
                    <p style={{ margin: "0 0 4px", fontSize: "14px" }}>Token ID: {result.ticketData.tokenId}</p>
                    <p style={{ margin: "0", fontSize: "14px", wordBreak: "break-all" }}>Owner: {result.ticketData.owner}</p>
                  </div>
                )}
                <button
                  className="pill-button pill-button-light"
                  onClick={resetScanner}
                  type="button"
                >
                  <span className="pill-button-glow" aria-hidden="true" />
                  <span className="pill-button-inner">Quét vé tiếp theo</span>
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </section>
  );
}
