import React, { useState } from 'react';
import { Camera, ScanLine, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBarcodeCamera } from '@/hooks/useBarcodeCamera';
import ScannerOverlay from '@/components/ScannerOverlay';
import TorchButton from '@/components/ui/TorchButton';
import { cn } from '@/lib/utils';

const FEEDBACK = {
  added: { icon: CheckCircle2, cls: 'bg-green-50 text-green-800 border-green-200' },
  same: { icon: Info, cls: 'bg-blue-50 text-blue-800 border-blue-200' },
  unknown: { icon: AlertCircle, cls: 'bg-red-50 text-red-800 border-red-200' },
};

export default function ScanPanel({ targetLabel, onScan, feedback }) {
  const [code, setCode] = useState('');
  const [camera, setCamera] = useState(false);
  const torch = useBarcodeCamera('massflytt-scanner', camera, onScan);

  const submit = (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    onScan(code);
    setCode('');
  };
  const fb = feedback && FEEDBACK[feedback.kind];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
      <p className="text-xs uppercase tracking-wider text-gray-400">Skannar till <span className="text-gray-800 dark:text-gray-100 font-semibold normal-case tracking-normal">{targetLabel}</span></p>
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <ScanLine className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input autoFocus value={code} onChange={e => setCode(e.target.value)} placeholder="Skanna eller skriv streckkod" className="pl-9 h-11" />
        </div>
        <Button type="button" variant="outline" className="h-11" onClick={() => setCamera(c => !c)}>
          <Camera className="w-4 h-4" />
        </Button>
      </form>
      {camera && (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden bg-black">
            <div id="massflytt-scanner" className="w-full" />
            <ScannerOverlay />
          </div>
          <div className="flex gap-2">
            <TorchButton {...torch} />
            <Button variant="outline" className="flex-1" onClick={() => setCamera(false)}>Stäng kamera</Button>
          </div>
        </div>
      )}
      {fb && (
        <div className={cn('flex items-center gap-2 text-sm rounded-xl border px-3 py-2 animate-in fade-in slide-in-from-top-1', fb.cls)}>
          <fb.icon className="w-4 h-4 shrink-0" />
          <span className="truncate">{feedback.text}</span>
        </div>
      )}
    </div>
  );
}