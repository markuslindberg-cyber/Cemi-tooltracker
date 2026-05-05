import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function ScannerOverlay({ scanFlash }) {
  if (!scanFlash) return null;
  return (
    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center rounded-xl overflow-hidden">
      <div className="absolute inset-0 bg-green-500/25 animate-pulse" />
      <div className="relative bg-green-500 rounded-full p-3 shadow-lg shadow-green-500/50 animate-bounce">
        <CheckCircle2 className="w-8 h-8 text-white" />
      </div>
    </div>
  );
}