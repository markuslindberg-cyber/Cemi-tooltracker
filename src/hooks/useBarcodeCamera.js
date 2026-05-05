import { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
];

// Debounce: ignore duplicate scans within this window
const SCAN_COOLDOWN_MS = 1500;

export function useBarcodeCamera(containerId, isActive, onScan) {
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  const lastScanRef = useRef({ text: '', time: 0 });
  onScanRef.current = onScan;

  useEffect(() => {
    if (!isActive || !containerId) return;

    let stopped = false;

    const startScanner = async () => {
      const el = document.getElementById(containerId);
      if (!el) return;

      try {
        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;

        const cameras = await Html5Qrcode.getCameras();
        if (stopped || cameras.length === 0) return;

        const backCam = cameras.find(c => /back|rear|environment/i.test(c.label));
        const cameraId = backCam ? backCam.id : cameras[cameras.length - 1].id;

        await scanner.start(
          cameraId,
          {
            fps: 20,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const w = Math.min(Math.floor(viewfinderWidth * 0.85), 500);
              const h = Math.min(Math.floor(viewfinderHeight * 0.35), 180);
              return { width: Math.max(w, 200), height: Math.max(h, 80) };
            },
            aspectRatio: 1.777,
            disableFlip: false,
          },
          (decodedText) => {
            const now = Date.now();
            const last = lastScanRef.current;
            // Ignore duplicate scans within cooldown
            if (decodedText === last.text && now - last.time < SCAN_COOLDOWN_MS) return;
            lastScanRef.current = { text: decodedText, time: now };
            // Trigger green flash via DOM (no re-render)
            const container = document.getElementById(containerId);
            if (container) {
              const flash = container.parentElement?.querySelector('.scan-flash-overlay');
              if (flash) {
                flash.style.opacity = '1';
                setTimeout(() => { flash.style.opacity = '0'; }, 500);
              }
            }
            onScanRef.current(decodedText);
          },
          () => {}
        );
      } catch (error) {
        console.error('Fel vid kamerastart:', error);
      }
    };

    startScanner();

    return () => {
      stopped = true;
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        scanner.stop().then(() => {
          try { scanner.clear(); } catch {}
        }).catch(() => {
          try { scanner.clear(); } catch {}
        });
      }
    };
  }, [isActive, containerId]);

  return null;
}