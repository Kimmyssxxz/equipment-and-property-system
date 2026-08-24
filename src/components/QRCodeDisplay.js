'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export default function QRCodeDisplay({
  value,
  size = 180,
  className = '',
  includeDetails = false,
  property = null,
}) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!value) return;

    // Generate scannable QR Code Data URL
    // Can encode either propertyNumber or structured QR payload
    const qrPayload = typeof value === 'string' ? value : JSON.stringify(value);

    QRCode.toDataURL(qrPayload, {
      width: size * 2, // 2x for sharp retina/print resolution
      margin: 1,
      color: {
        dark: '#0f172a', // deep slate
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        setQrDataUrl(url);
        setError(null);
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
        setError('Failed to generate QR');
      });
  }, [value, size]);

  if (error) {
    return (
      <div className="w-full h-36 flex items-center justify-center bg-slate-100 rounded-xl text-rose-500 text-xs font-bold">
        {error}
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div className="w-full h-36 flex items-center justify-center bg-slate-50 rounded-xl animate-pulse text-slate-400 text-xs">
        Generating QR Code...
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative p-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrDataUrl}
          alt={`QR Code for ${typeof value === 'string' ? value : 'Property'}`}
          className="object-contain rounded-lg"
          style={{ width: `${size}px`, height: `${size}px` }}
        />
      </div>

      {includeDetails && property && (
        <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mt-2">
          {property.propertyNumber}
        </span>
      )}
    </div>
  );
}
