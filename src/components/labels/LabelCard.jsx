import React from 'react';
import { qrUrl, barcodeUrl } from '@/lib/labelTypes';

export default function LabelCard({ item, format, size }) {
  const showQr = format !== 'barcode';
  const showBar = format !== 'qr';
  return (
    <div className={`${size.cls} border border-gray-300 bg-white text-black rounded-md p-1.5 flex items-center gap-2 overflow-hidden break-inside-avoid`}>
      {showQr && <img src={qrUrl(item.code, size.qr)} alt="" style={{ width: `${size.qrMm}mm`, height: `${size.qrMm}mm` }} className="shrink-0" />}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5" style={{ fontSize: `${size.font}mm` }}>
        <p className="font-bold leading-tight line-clamp-2">{item.name}</p>
        {item.sub && size.id !== 'small' && <p className="leading-tight truncate text-gray-600">{item.sub}</p>}
        {showBar && <img src={barcodeUrl(item.code)} alt="" style={{ height: `${size.barMm}mm` }} className="max-w-full object-contain object-left" />}
        <p className="font-mono leading-tight truncate">{item.code}</p>
      </div>
    </div>
  );
}