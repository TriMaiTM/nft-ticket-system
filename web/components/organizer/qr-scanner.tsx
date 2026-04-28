"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type QRScannerProps = {
  onScanSuccess: (decodedText: string) => void;
};

export function QRScanner({ onScanSuccess }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Pause scanning while processing
            if (scannerRef.current?.isScanning) {
              scannerRef.current.pause();
            }
            onScanSuccess(decodedText);
          },
          () => {
            // Ignore scan errors (happens constantly when looking for QR)
          }
        );
      } catch (err) {
        setError("Không thể khởi động camera. Vui lòng cấp quyền truy cập camera.");
        console.error(err);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="qr-scanner-wrap">
      {error && <p className="buy-ticket-message err">{error}</p>}
      <div id="qr-reader" className="qr-scanner-view"></div>
    </div>
  );
}
