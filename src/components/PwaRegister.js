'use client';

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => console.log('PWA Service Worker registered:', reg.scope))
          .catch((err) => console.warn('PWA Service Worker registration failed:', err));
      });
    }

    // Check standalone mode
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      if (isStandalone) {
        setIsInstalled(true);
      }
    }

    // Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || !showBanner) return null;

  return (
    <div className="fixed bottom-3 right-3 left-3 sm:left-auto z-50 max-w-sm bg-white/95 backdrop-blur-md text-slate-800 p-2.5 sm:p-3 rounded-2xl shadow-xl border border-emerald-200/90 flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-bottom-4 font-sans">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-emerald-50/80 p-1 flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-2xs">
          <img src="/nfsti logo.png" alt="NFSTI Logo" className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0">
          <h4 className="text-[11px] font-black uppercase tracking-tight text-emerald-800 leading-none truncate">
            Install NFSTI Property App
          </h4>
          <p className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5 truncate">
            Fast desktop & mobile launcher
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] shadow-xs transition-all cursor-pointer flex items-center gap-1"
        >
          <Download className="w-3 h-3" />
          <span>Install</span>
        </button>
        <button
          onClick={() => setShowBanner(false)}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
