'use client';

import React from 'react';
import Link from 'next/link';
import {
  Package,
  Clock,
  ArrowLeft,
  ShieldCheck,
  FileSpreadsheet,
  Boxes,
  Sparkles,
  ArrowRight,
  Lock,
} from 'lucide-react';

export default function SupplyPortalComingSoon() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col justify-between selection:bg-emerald-600 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-xl sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 p-1.5 flex items-center justify-center border border-emerald-200 shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nfsti logo.png" alt="NFSTI Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-black text-base tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors block leading-tight">
                NFSTI <span className="text-emerald-600">SUPPLY PORTAL</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">
                Consumable Supplies & Requisition
              </span>
            </div>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-all shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-12 sm:py-16 flex flex-col items-center justify-center text-center">
        {/* Official Agency Logos */}
        <div className="inline-flex items-center justify-center gap-3 px-5 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-2xs mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Logo-Bagong-Pilipinas.png" alt="Bagong Pilipinas" className="h-8 w-auto object-contain" />
          <span className="w-px h-5 bg-slate-200" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/DILG.png" alt="DILG" className="h-7 w-auto object-contain" />
          <span className="w-px h-5 bg-slate-200" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/PPSC.webp" alt="PPSC" className="h-7 w-auto object-contain" />
          <span className="w-px h-5 bg-slate-200" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nfsti logo.png" alt="NFSTI Logo" className="h-7 w-auto object-contain" />
        </div>

        {/* Coming Soon Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-extrabold tracking-wide mb-6 shadow-2xs animate-pulse">
          <Clock className="w-4 h-4 text-amber-600" />
          <span>MODULE UNDER SCHEDULED DEVELOPMENT</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
          Admin Supply Portal <br />
          <span className="bg-gradient-to-r from-emerald-700 via-teal-600 to-amber-600 bg-clip-text text-transparent">
            COMING SOON
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl leading-relaxed font-medium mb-10">
          The <strong>Admin Supply Portal</strong> for managing office supplies, Requisition and Issue Slips (RIS), Stock Cards, and RSPI inventory summaries is currently under scheduled development for FY 2026.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto">
          <Link
            href="/auth/admin/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Go to Admin Equipment Property Portal Login</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <span>Return to Landing Page</span>
          </Link>
        </div>

        {/* Upcoming Module Preview Grid */}
        <div className="w-full text-left">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Upcoming Supply Module Features
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold">
                <Boxes className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">Consumable Supplies Catalog</h4>
              <p className="text-xs text-slate-500 font-medium">Tracking office stationery, printer inks, cleaning materials, and unit reorder points.</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">Requisition Slips (RIS)</h4>
              <p className="text-xs text-slate-500 font-medium">Digital issuance of Requisition and Issue Slips with electronic approval workflows.</p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">RSPI COA Report Generation</h4>
              <p className="text-xs text-slate-500 font-medium">Automated COA-compliant Report on the Physical Count of Supplies and Materials (RSPI).</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">National Forensic Science Training Institute © FY 2026</p>
      </footer>
    </div>
  );
}
