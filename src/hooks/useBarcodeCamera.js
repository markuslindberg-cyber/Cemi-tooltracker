import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function useBarcodeCamera(containerId, isActive, onScan) {
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerId) return;

    const startScanner = () => {
      try {
        scannerRef.current = new Html5QrcodeScanner(
          containerId,
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            useBarCodeDetectorIfSupported: true
          },
          false
        );

        scannerRef.current.render(
          (decodedText) => {
            onScan(decodedText);
            scannerRef.current?.clear().catch(() => {});
          },
          () => {}
        );
      } catch (error) {
        console.error('Fel vid kamerastart:', error);
      }
    };

    startScanner();

    return () => {
      scannerRef.current?.clear().catch(() => {});
    };
  }, [isActive, containerId, onScan]);

  return null;
}