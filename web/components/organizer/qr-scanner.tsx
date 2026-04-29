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
            if (scannerRef.current?.isScanning) {
              scannerRef.current.pause();
            }
            onScanSuccess(decodedText);
          },
          () => {} // Ignore scan errors
        );
      } catch (err) {
        setError("Không thể khởi động camera. Vui lòng cấp quyền truy cập hoặc tải ảnh lên.");
        console.error(err);
        
        // Still instantiate for file scanning even if camera fails
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("qr-reader");
        }
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      } else if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [onScanSuccess]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader");
      }
      
      const decodedText = await scannerRef.current.scanFile(file, true);
      onScanSuccess(decodedText);
    } catch (err) {
      setError("Không tìm thấy mã QR trong ảnh này. Vui lòng thử ảnh khác.");
      console.error(err);
    }
  };

  return (
    <div className="qr-scanner-wrap" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {error && <p className="buy-ticket-message err">{error}</p>}
      
      <div id="qr-reader" className="qr-scanner-view" style={{ minHeight: "200px" }}></div>
      
      <div style={{ textAlign: "center", padding: "10px 0", display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
        <p style={{ margin: "0", fontSize: "14px", color: "rgba(255,255,255,0.7)" }}>
          Các phương thức dự phòng (dành cho môi trường Test):
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <label className="pill-button pill-button-light" style={{ cursor: "pointer", display: "inline-block" }}>
            <span className="pill-button-glow" aria-hidden="true" />
            <span className="pill-button-inner">Tải ảnh QR</span>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload} 
              style={{ display: "none" }} 
            />
          </label>
          
          <button 
            className="pill-button pill-button-dark" 
            onClick={() => {
              const text = prompt("Dán đoạn mã Payload đã copy từ trang My Tickets:");
              if (text) onScanSuccess(text);
            }}
            type="button"
          >
            <span className="pill-button-glow" aria-hidden="true" />
            <span className="pill-button-inner">Dán Payload</span>
          </button>
        </div>
      </div>
    </div>
  );
}
