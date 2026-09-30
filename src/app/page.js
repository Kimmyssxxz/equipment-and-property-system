'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Package,
  QrCode,
  Users,
  Building2,
  FileSpreadsheet,
  TrendingUp,
  Database,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Layers,
  BarChart3,
  Search,
  Check,
  ClipboardList,
  AlertTriangle,
  Globe,
  Radio,
  Clock,
  Terminal,
  Cpu,
  Zap,
} from 'lucide-react';
import { StorageManager } from '@/lib/storage';



export default function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('registry');
  const [openFaqIndex, setOpenFaqIndex] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      const auth = StorageManager.isAuthenticated();
      setIsAuthenticated(auth);
    } catch (e) {
      setIsAuthenticated(false);
    }
  }, []);

  const features = [
    {
      icon: Package,
      title: 'RPCPPE & RPCSP Asset Registry',
      description:
        'Automatic classification of government property (RPCPPE for items ≥ ₱50,000) and semi-expendables (RPCSP < ₱50,000) with complete depreciation and valuation tracking.',
      tag: 'COA Compliant',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      accentColor: 'text-emerald-700',
    },
    {
      icon: QrCode,
      title: 'Mobile QR Physical Inventory',
      description:
        'Live camera-based QR scanning for physical inventory sessions. Instantly flags shortages, overages, and unrecorded equipment in real-time.',
      tag: 'HTML5 QR Tech',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      accentColor: 'text-teal-700',
    },
    {
      icon: Users,
      title: 'Custodian & Office Accountability',
      description:
        'Full assignment matrix mapping equipment to accountable officers, personnel, and deploying offices with digital Property Acknowledgement Receipts (PAR).',
      tag: 'PAR & ICS Slips',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      accentColor: 'text-blue-700',
    },
    {
      icon: FileSpreadsheet,
      title: 'Automated Official COA Reports',
      description:
        'Generate official government audit reports (RPCPPE, RPCSP, RSPI, RPCI) compliant with COA and GAM standards in single-click print and spreadsheet formats.',
      tag: 'Instant Export',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      accentColor: 'text-amber-700',
    },
    {
      icon: BarChart3,
      title: 'Executive Analytics & Insights',
      description:
        'Visual interactive analytics displaying total property valuation, equipment condition breakdown (Usable, Repairable, Unserviceable), and unit density per office.',
      tag: 'Live Metrics',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      accentColor: 'text-indigo-700',
    },
    {
      icon: Database,
      title: 'Encrypted Cloud Database & Security',
      description:
        'Enterprise-grade relational database security, server-side authentication, role-based access control, and encrypted audit trail logging.',
      tag: 'Cloud Security',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      accentColor: 'text-cyan-700',
    },
  ];

  const techStack = [
    { name: 'Next.js 15', category: 'App Router & SSR Framework', desc: 'React 19, Server Components & Dynamic API Routes', badge: 'v15.2' },
    { name: 'PostgreSQL Database', category: 'Cloud Database Architecture', desc: 'Relational DB, Row Level Security & Session Auth', badge: 'Relational DB' },
    { name: 'Prisma ORM', category: 'Database Modeling', desc: 'Type-safe SQL queries, migrations & schema management', badge: 'v6.19' },
    { name: 'Tailwind CSS v4', category: 'Modern Styling System', desc: 'Responsive glassmorphic UI, custom gradients & animations', badge: 'v4.0' },
    { name: 'ApexCharts', category: 'Data Visualization', desc: 'Interactive property valuation & status distribution charts', badge: 'v6.10' },
    { name: 'HTML5 QR Code', category: 'Mobile Scanner Engine', desc: 'Real-time camera barcode scanning for physical count sessions', badge: 'QR Engine' },
  ];

  const userRoles = [
    {
      role: 'Supply & Property Officers',
      icon: ShieldCheck,
      responsibilities: [
        'Manage master property registry and unit valuations',
        'Issue Property Acknowledgement Receipts (PAR)',
        'Conduct annual physical counting sessions',
        'Export official COA compliance reports',
      ],
      color: 'border-emerald-200 bg-emerald-50/50 text-slate-900',
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      role: 'Inventory Inspectors',
      icon: ClipboardList,
      responsibilities: [
        'Scan property QR code tags via mobile devices',
        'Record item location and current working condition',
        'Flag discrepancies (shortages and overages)',
        'Verify physical existence against registry cards',
      ],
      color: 'border-blue-200 bg-blue-50/50 text-slate-900',
      badgeColor: 'bg-blue-600 text-white',
    },
    {
      role: 'COA & State Auditors',
      icon: FileSpreadsheet,
      responsibilities: [
        'Review official RPCPPE and RPCSP inventory summaries',
        'Verify equipment thresholds (≥ ₱50k vs < ₱50k)',
        'Audit custodian accountability & office deployment',
        'Inspect automated audit trail timestamp logs',
      ],
      color: 'border-amber-200 bg-amber-50/50 text-slate-900',
      badgeColor: 'bg-amber-600 text-white',
    },
  ];

  const faqs = [
    {
      q: 'Is the NFSTI Equipment System compliant with COA and GAM guidelines?',
      a: 'Yes! The system adheres to standard government accounting manual (GAM) rules and Commission on Audit (COA) circulars. It automatically separates Property, Plant and Equipment (RPCPPE) valued at ₱50,000 or higher from Semi-Expendable Property (RPCSP) under ₱50,000, generating official print-ready report formats.',
    },
    {
      q: 'How does the mobile QR code physical inventory feature work?',
      a: 'Each property card generates a unique serial QR code. Inventory officers open the mobile physical inventory page on any smartphone or tablet camera to scan equipment labels. The system instantly matches the scanned QR code against the database record and logs status as Verified, Shortage, or Overage.',
    },
    {
      q: 'How is authentication and database access configured?',
      a: 'The application uses Next.js 15 App Router with server-side API routes and PostgreSQL database integration. Authentication uses secure cookies with local storage fallback to ensure seamless multi-device sessions.',
    },
    {
      q: 'Can custom reports be exported for official documentation?',
      a: 'Absolutely. The Reports module allows supply officers to filter and export official RPCPPE, RPCSP, RSPI, and RPCI documents. Reports can be previewed directly in the browser or saved/printed as official government documentation.',
    },
    {
      q: 'Is this system customizable for other government institutes?',
      a: 'Yes, the modular architecture allows easy adaptation of property threshold rules, office classifications, report forms, and inventory scanning workflows.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-emerald-600 selection:text-white overflow-x-hidden">
      {/* Subtle Background Glow FX */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-emerald-200/40 rounded-full blur-[140px]" />
        <div className="absolute top-[600px] right-0 w-[500px] h-[500px] bg-teal-200/30 rounded-full blur-[160px]" />
        <div className="absolute top-[1400px] left-0 w-[600px] h-[600px] bg-emerald-100/50 rounded-full blur-[180px]" />
      </div>

      {/* ================= 1. HEADER / NAVIGATION ================= */}
      <header className="relative z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl sticky top-0 shadow-xs">
        <div className="max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          {/* Logo & Title */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 p-1.5 flex items-center justify-center border border-emerald-200 shadow-xs group-hover:scale-105 transition-transform overflow-hidden shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nfsti logo.png" alt="NFSTI Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-base tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors block leading-tight truncate">
                NFSTI <span className="text-emerald-600">EQUIPMENT</span>
              </span>
              <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase truncate">
                Property & Inventory System
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden xl:flex items-center gap-7 text-xs font-bold text-slate-600 shrink-0">
            <a href="#features" className="hover:text-emerald-700 transition-colors">
              Features
            </a>
            <a href="#interactive-demo" className="hover:text-emerald-700 transition-colors">
              System Modules
            </a>
            <a href="#tech-stack" className="hover:text-emerald-700 transition-colors">
              Tech Architecture
            </a>
            <a href="#roles" className="hover:text-emerald-700 transition-colors">
              Target Roles
            </a>
            <a href="#faq" className="hover:text-emerald-700 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <Link
              href="/auth/admin/login"
              className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-extrabold text-xs transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
            >
              Admin Equipment Property Portal Login
            </Link>
            <Link
              href="/supply-portal"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-200 transition-all hover:scale-[1.02] cursor-pointer whitespace-nowrap"
            >
              <span>Admin Supply Portal Login</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-2xs cursor-pointer"
          >
            <ChevronDown className={`w-5 h-5 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-slate-200 bg-white p-4 space-y-3 animate-in fade-in">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-700 py-2 border-b border-slate-100"
            >
              Features
            </a>
            <a
              href="#interactive-demo"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-700 py-2 border-b border-slate-100"
            >
              System Demos
            </a>
            <a
              href="#tech-stack"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-700 py-2 border-b border-slate-100"
            >
              Tech Architecture
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-700 py-2"
            >
              FAQ
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/auth/admin/login"
                className="w-full text-center py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-extrabold text-slate-800"
              >
                Admin Equipment Property Portal Login
              </Link>
              <Link
                href="/supply-portal"
                className="w-full text-center py-2.5 rounded-xl bg-emerald-600 text-xs font-extrabold text-white"
              >
                Admin Supply Portal Login
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ================= 2. HERO SECTION ================= */}
      <section className="relative z-10 pt-12 lg:pt-20 pb-16 lg:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-5xl mx-auto space-y-6">
          {/* Official Agency Logos Banner */}
          <div className="inline-flex items-center justify-center gap-3 sm:gap-4 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:border-emerald-300 transition-all">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo-Bagong-Pilipinas.png" alt="Bagong Pilipinas" className="h-10 sm:h-13 w-auto object-contain hover:scale-105 transition-transform" />
            <span className="w-px h-7 bg-slate-200" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/DILG.png" alt="DILG" className="h-9 sm:h-11 w-auto object-contain hover:scale-105 transition-transform" />
            <span className="w-px h-7 bg-slate-200" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/PPSC.webp" alt="PPSC" className="h-9 sm:h-11 w-auto object-contain hover:scale-105 transition-transform" />
            <span className="w-px h-7 bg-slate-200" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/nfsti logo.png" alt="NFSTI Logo" className="h-9 sm:h-11 w-auto object-contain hover:scale-105 transition-transform" />
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]">
            National Forensic Science Training Institute <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-700 via-teal-600 to-emerald-800 bg-clip-text text-transparent">
              Equipment and Accountability and Inventory System
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed font-medium">
            Streamline public sector asset management with centralized property card registries, mobile QR physical counting sessions, custodian PAR/ICS slips, and automated COA-compliant report generation (RPCPPE, RPCSP, RSPI, RPCI).
          </p>

          {/* Dual Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>Access Internal Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/auth/admin/login"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-sm shadow-md flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Admin Portal Login</span>
            </Link>
          </div>

          {/* Live Deployment Indicators */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-semibold">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Institutional <strong className="text-slate-900">Cloud Network</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>COA & GAM <strong className="text-slate-900">Compliant</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>PostgreSQL <strong className="text-slate-900">Encrypted DB</strong></span>
            </div>
          </div>
        </div>

        {/* ================= HERO PREVIEW MOCKUP ================= */}
        <div className="mt-12 sm:mt-16 relative max-w-6xl mx-auto">
          {/* Glassmorphic Browser Wrapper */}
          <div className="rounded-3xl border border-slate-200/90 bg-white/90 backdrop-blur-2xl p-3 sm:p-5 shadow-2xl shadow-slate-900/10 relative overflow-hidden">
            {/* Top Mock Window Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/80 px-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-[11px] font-mono text-slate-400 truncate">
                  https://equipment-and-property-system.vercel.app/dashboard
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-300 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>Live Supabase Connected</span>
              </div>
            </div>

            {/* Inner Dashboard Live Screenshot Simulation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-slate-900">
              {/* Left Column: Quick KPI Mock Cards */}
              <div className="lg:col-span-4 bg-slate-50/90 rounded-2xl border border-slate-200/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Live Summary</span>
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Total Property Value</span>
                  <p className="text-2xl font-black text-emerald-700 mt-1">₱4,784,881.60</p>
                  <span className="text-[10px] text-slate-500">Government Valued Assets</span>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Properties Counted</span>
                    <p className="text-lg font-black text-slate-900">100% Verified</p>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-700">COA Audit Readiness</span>
                    <span className="text-emerald-700 font-mono">100%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-600 w-full" />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Feature Cards Preview */}
              <div className="lg:col-span-8 bg-slate-50/90 rounded-2xl border border-slate-200/80 p-4 text-slate-900 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-black text-slate-900 tracking-wide">
                      OFFICIAL COA REPORT ENGINE
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono bg-white px-2 py-1 rounded-md border border-slate-200 font-bold">
                    RPCPPE & RPCSP Ready
                  </span>
                </div>

                {/* Simulated Table Snippet */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold bg-slate-50">
                        <th className="py-2.5 px-3">Property No.</th>
                        <th className="py-2.5 px-3">Article / Description</th>
                        <th className="py-2.5 px-3">Classification</th>
                        <th className="py-2.5 px-3 text-right">Unit Value</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                      <tr>
                        <td className="py-2.5 px-3 text-emerald-800 font-bold">PPE-2026-001</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">Desktop Workstation CPU</td>
                        <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9px] font-sans font-bold border border-emerald-200">RPCPPE (≥₱50k)</span></td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">₱68,500.00</td>
                        <td className="py-2.5 px-3 text-center"><span className="text-emerald-700 font-sans font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">ACTIVE</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-emerald-800 font-bold">SE-2026-042</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">Ergonomic Office Chair</td>
                        <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[9px] font-sans font-bold border border-blue-200">RPCSP (&lt;₱50k)</span></td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">₱14,200.00</td>
                        <td className="py-2.5 px-3 text-center"><span className="text-emerald-700 font-sans font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">ACTIVE</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 text-emerald-800 font-bold">PPE-2026-015</td>
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">Air Conditioning Unit</td>
                        <td className="py-2.5 px-3"><span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[9px] font-sans font-bold border border-emerald-200">RPCPPE (≥₱50k)</span></td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">₱52,000.00</td>
                        <td className="py-2.5 px-3 text-center"><span className="text-emerald-700 font-sans font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">ACTIVE</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-sans">
                  <span>Showing real-time database sync from Supabase</span>
                  <Link href="/dashboard" className="text-emerald-700 font-extrabold hover:underline flex items-center gap-1">
                    Open Full System Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. SYSTEM METRICS BAR ================= */}
      <section className="relative z-10 py-10 bg-white border-y border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-4 space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono">₱50,000+</p>
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">RPCPPE Valuation Threshold</p>
            <p className="text-[11px] text-slate-500 font-medium">Automatic GAM classification</p>
          </div>
          <div className="p-4 space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">100%</p>
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">COA Audit Compliance</p>
            <p className="text-[11px] text-slate-500 font-medium">Standard official report forms</p>
          </div>
          <div className="p-4 space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-emerald-600 font-mono">&lt; 3 Sec</p>
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Report Generation</p>
            <p className="text-[11px] text-slate-500 font-medium">Instant printable PDFs & tables</p>
          </div>
          <div className="p-4 space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-slate-900 font-mono">Mobile QR</p>
            <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Physical Counting</p>
            <p className="text-[11px] text-slate-500 font-medium">Camera scanning reconciliation</p>
          </div>
        </div>
      </section>

      {/* ================= 4. FEATURE SHOWCASE GRID ================= */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-800 uppercase tracking-widest bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-300 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            <span>Comprehensive Core Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Engineered Specifically for Public Sector Property Accountability
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-medium">
            Everything your supply section, property officers, and inventory auditors need to manage government property efficiently.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-3xl border border-slate-200/90 bg-white hover:border-emerald-300 backdrop-blur-xl p-6 transition-all hover:-translate-y-1 shadow-xs hover:shadow-xl hover:shadow-emerald-900/5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl ${feat.bgColor} border ${feat.borderColor} flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${feat.accentColor}`} />
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {feat.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-100 mt-6 flex items-center text-xs font-bold text-slate-500 group-hover:text-emerald-700 transition-colors">
                  <span>Explore Module</span>
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 5. INTERACTIVE MODULE DEMO TABS ================= */}
      <section id="interactive-demo" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-white rounded-3xl border border-slate-200/90 shadow-xs my-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
          <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-widest">Interactive Workspaces</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Explore System Modules
          </h2>
          <p className="text-sm text-slate-600 font-medium">
            Click through the interactive workspace previews below to see how each module functions.
          </p>

          {/* Tab Switcher Buttons */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            <button
              onClick={() => setActiveTab('registry')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'registry'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              1. Asset Registry
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              2. QR Physical Count
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              3. COA Official Reports
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              4. Analytics & Charts
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 max-w-5xl mx-auto shadow-inner">
          {activeTab === 'registry' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-base font-black text-slate-900">Master Property Registry Card Module</h4>
                  <p className="text-xs text-slate-500">Searchable list of all registered government equipment with unit cost thresholds.</p>
                </div>
                <Link href="/properties" className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                  View Live Registry
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">RPCPPE Items (≥ ₱50,000)</span>
                  <p className="text-xl font-black text-emerald-700">Capitalized Assets</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">RPCSP Items (&lt; ₱50,000)</span>
                  <p className="text-xl font-black text-blue-700">Semi-Expendable</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Serial & QR Tagging</span>
                  <p className="text-xl font-black text-slate-900">Auto-Generated</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="space-y-4 animate-in fade-in duration-300 text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                <QrCode className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-slate-900">Mobile Camera Scanner & Physical Count Reconciliation</h4>
              <p className="text-xs text-slate-600 max-w-xl mx-auto font-medium">
                Inventory officers point their mobile camera at the equipment barcode. The engine validates the serial number against expected office deployment and records item condition.
              </p>
              <div className="pt-2">
                <Link href="/physical-inventory" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200">
                  <span>Start Physical Inventory Session</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div>
                  <h4 className="text-base font-black text-slate-900">COA Standard Report Generation</h4>
                  <p className="text-xs text-slate-500">Select report type, fiscal year, and exporting format.</p>
                </div>
                <Link href="/reports" className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700">
                  Generate Reports
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-black text-emerald-700">RPCPPE Report</span>
                  <p className="text-[11px] text-slate-600">Report on Physical Count of Property, Plant and Equipment (≥ ₱50,000)</p>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                  <span className="text-xs font-black text-blue-700">RPCSP Report</span>
                  <p className="text-[11px] text-slate-600">Report on Physical Count of Semi-Expendable Property (&lt; ₱50,000)</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-4 animate-in fade-in duration-300 text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-700">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-slate-900">ApexCharts Executive Visual Intelligence</h4>
              <p className="text-xs text-slate-600 max-w-xl mx-auto font-medium">
                Real-time charts depicting total property valuation, equipment breakdown per category, office allocation, and shortage/overage audit monitoring.
              </p>
              <div className="pt-2">
                <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200">
                  <span>Open Executive Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ================= 6. TECH STACK & SYSTEM ARCHITECTURE ================= */}
      <section id="tech-stack" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-widest">Enterprise Architecture</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Built with Modern High-Performance Tech Stack
          </h2>
          <p className="text-sm text-slate-600 font-medium">
            Powered by Next.js 15 App Router, PostgreSQL database, and Tailwind CSS v4.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {techStack.map((tech, idx) => (
            <div key={idx} className="p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-emerald-300 transition-all shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700">{tech.category}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">{tech.badge}</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">{tech.name}</h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{tech.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 7. TARGET ROLES ================= */}
      <section id="roles" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-widest">Role-Based Operations</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Tailored for Supply Officers, Inspectors & Auditors
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {userRoles.map((roleItem, idx) => {
            const Icon = roleItem.icon;
            return (
              <div key={idx} className={`p-6 rounded-3xl border ${roleItem.color} shadow-xs backdrop-blur-xl space-y-4 flex flex-col justify-between`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-white p-2 flex items-center justify-center shrink-0 border border-slate-200 shadow-2xs">
                      <Icon className="w-5 h-5 text-emerald-700" />
                    </div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${roleItem.badgeColor}`}>
                      Active Role
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{roleItem.role}</h3>

                  <ul className="space-y-2 text-xs font-semibold text-slate-700">
                    {roleItem.responsibilities.map((resp, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 8. FAQ ACCORDION ================= */}
      <section id="faq" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="text-center space-y-4 mb-14">
          <span className="text-xs font-extrabold text-emerald-700 uppercase tracking-widest">Got Questions?</span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden transition-all shadow-xs"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span className="text-sm font-extrabold text-slate-900">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-600 leading-relaxed font-medium border-t border-slate-100 pt-3 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 9. FINAL CALL TO ACTION BANNER ================= */}
      <section className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight max-w-2xl mx-auto leading-tight">
            Ready to Streamline Government Property & Asset Accountability?
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto font-medium">
            Log in to the supply admin portal or access the live inventory management dashboard now.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs shadow-lg transition-all cursor-pointer"
            >
              Launch Dashboard Now
            </Link>
            <Link
              href="/auth/admin/login"
              className="px-7 py-3.5 rounded-2xl bg-emerald-900/80 hover:bg-emerald-950 border border-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Admin Portal Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 10. FOOTER ================= */}
      <footer className="relative z-10 border-t border-slate-200 bg-white py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Logo-Bagong-Pilipinas.png" alt="Bagong Pilipinas Logo" className="h-7 w-auto object-contain" />
              <span className="w-px h-4 bg-slate-200" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/DILG.png" alt="DILG Logo" className="h-6 w-auto object-contain" />
              <span className="w-px h-4 bg-slate-200" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/PPSC.webp" alt="PPSC Logo" className="h-6 w-auto object-contain" />
              <span className="w-px h-4 bg-slate-200" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nfsti logo.png" alt="NFSTI Logo" className="h-6 w-auto object-contain" />
            </div>
            <div>
              <p className="font-extrabold text-slate-900 text-xs">NFSTI Equipment & Property System</p>
              <p className="text-[10px] text-slate-400">DILG • PPSC • National Forensic Science Training Institute © FY 2026</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-semibold text-slate-600">
            <Link href="/dashboard" className="hover:text-emerald-700 transition-colors">Dashboard</Link>
            <Link href="/properties" className="hover:text-emerald-700 transition-colors">Properties</Link>
            <Link href="/physical-inventory" className="hover:text-emerald-700 transition-colors">Physical Count</Link>
            <Link href="/reports" className="hover:text-emerald-700 transition-colors">COA Reports</Link>
            <Link href="/auth/admin/login" className="hover:text-emerald-700 transition-colors">Admin Login</Link>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-300 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Institutional System Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
