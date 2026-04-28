"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type TicketQRProps = {
  ticketId: string;
  eventId: string;
  tokenId: number;
  ownerAddress: string;
};

export function TicketQR({ ticketId, eventId, tokenId, ownerAddress }: TicketQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (!showQR || !canvasRef.current) return;

    const payload = JSON.stringify({
      ticketId,
      eventId,
      tokenId,
      owner: ownerAddress,
      ts: Date.now(),
    });

    QRCode.toCanvas(canvasRef.current, payload, {
      width: 220,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  }, [showQR, ticketId, eventId, tokenId, ownerAddress]);

  return (
    <div className="ticket-qr-wrap">
      <button
        className="pill-button pill-button-dark event-card-cta"
        onClick={() => setShowQR(!showQR)}
        type="button"
      >
        <span className="pill-button-glow" aria-hidden="true" />
        <span className="pill-button-inner">
          {showQR ? "Ẩn QR" : "Hiện QR"}
        </span>
      </button>

      {showQR && (
        <div className="ticket-qr-canvas-wrap">
          <canvas ref={canvasRef} />
          <p className="ticket-qr-hint">Quét mã QR này tại cổng check-in</p>
        </div>
      )}
    </div>
  );
}
