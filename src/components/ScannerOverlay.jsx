import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function ScannerOverlay({ scanFlash }) {
  if (!scanFlash) return null;
  return (
    <div className="absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden">
      {/* Green border flash */}
      <div
        className="absolute inset-0 border-4 border-green-400 rounded-xl"
        style={{ animation: 'scanFlashFade 600ms ease-out forwards' }}
      />
      {/* Checkmark icon */}
      <div
        className="absolute top-3 right-3 bg-green-500 rounded-full p-1.5 shadow-lg"
        style={{ animation: 'scanFlashFade 600ms ease-out forwards' }}
      >
        <CheckCircle2 className="w-5 h-5 text-white" />
      </div>
      <style>{`
        @keyframes scanFlashFade {
          0% { opacity: 1; }
          70% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}