import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export function useBarcodeCamera(containerId, isActive, onScan) {
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isActive || !containerId) return;

    scannerRef.current = new Html5QrcodeScanner(
      containerId,
      { 
        fps: 10, 
        qrbox: { width: 250, height: 150 }, 
        aspectRatio: 1.5,
        useBarCodeDetectorIfSupported: true 
      },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        scannerRef.current?.clear();
      },
      () => {}
    );

    return () => {
      scannerRef.current?.clear().catch(() => {});
    };
  }, [isActive, containerId, onScan]);

  const stopScanning = () => {
    scannerRef.current?.clear().catch(() => {});
  };

  return { stopScanning };
}