import { useEffect, useRef, useCallback } from 'react';
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

export function useBarcodeCamera(containerId, isActive, onScan) {
  const scannerRef = useRef(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!isActive || !containerId) return;

    let stopped = false;

    const startScanner = async () => {
      // Wait for the DOM element to exist
      const el = document.getElementById(containerId);
      if (!el) return;

      try {
        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = scanner;

        // Prefer back camera on mobile
        const cameras = await Html5Qrcode.getCameras();
        if (stopped || cameras.length === 0) return;

        const backCam = cameras.find(c => /back|rear|environment/i.test(c.label));
        const cameraId = backCam ? backCam.id : cameras[cameras.length - 1].id;

        await scanner.start(
          cameraId,
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // Use 80% width for better Code 39 reading
              const w = Math.min(Math.floor(viewfinderWidth * 0.85), 500);
              const h = Math.min(Math.floor(viewfinderHeight * 0.3), 150);
              return { width: Math.max(w, 200), height: Math.max(h, 80) };
            },
            aspectRatio: 1.777,
          },
          (decodedText) => {
            onScanRef.current(decodedText);
          },
          () => {} // ignore errors
        );
      } catch (error) {
        console.error('Fel vid kamerastart:', error);
      }
    };

    startScanner();

    return () => {
      stopped = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isActive, containerId]);

  return null;
}