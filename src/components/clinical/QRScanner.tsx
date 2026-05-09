import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  onCancel: () => void;
}

export default function QRScanner({ onScan, onCancel }: QRScannerProps) {
  const qrRef = useRef<Html5Qrcode | null>(null);
  const isTransitioningRef = useRef(false);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    qrRef.current = html5QrCode;

    const startScanner = async () => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // On Success
            stopAndExecute(() => onScan(decodedText));
          },
          () => {
            // Error callback - ignored for general usage
          }
        );
      } catch (err) {
        console.error("Scanner start error:", err);
      } finally {
        isTransitioningRef.current = false;
      }
    };

    const stopAndExecute = async (callback?: () => void) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      try {
        if (qrRef.current?.isScanning) {
          await qrRef.current.stop();
        }
        callback?.();
      } catch (err) {
        console.error("Scanner stop error:", err);
      } finally {
        isTransitioningRef.current = false;
      }
    };

    const handleManualScan = async () => {
      if (qrRef.current?.isScanning) {
        // Typically html5-qrcode scans automatically, but we can try to force a trigger or just show visual feedback
        // For a true "manual capture", we'd need to access the video element frame.
        // However, Html5Qrcode doesn't expose the frame easily for external use.
        // So we'll just keep it as a UI element that confirms the intent, or if we want real capture, we use CameraCapture.
      }
    };

    startScanner();

    return () => {
      const currentScanner = qrRef.current;
      if (currentScanner?.isScanning) {
        currentScanner.stop().catch(err => console.error("Cleanup stop error:", err));
      }
    };
  }, [onScan]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden bg-stone-50 rounded-3xl p-4 border border-teal-500/20">
        <div id="qr-reader" className="w-full overflow-hidden rounded-2xl border-none min-h-[300px]"></div>
        <div className="absolute inset-0 pointer-events-none border-[30px] border-teal-950/60">
          <div className="w-full h-full border border-teal-500/20 rounded-xl" />
        </div>
      </div>
      <div className="flex gap-4">
        <button 
          onClick={onCancel}
          className="px-8 py-5 bg-white text-stone-800 font-semibold text-sm rounded-2xl hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
        <button 
          className="flex-grow py-5 bg-teal-500 text-stone-800 font-medium text-sm rounded-2xl hover:bg-teal-400 transition-colors shadow-md"
        >
          Capture Code
        </button>
      </div>
    </div>
  );
}
