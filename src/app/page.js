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

function GithubIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

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
      gradient: 'from-emerald-500/10 to-teal-500/5',
      accentColor: 'text-emerald-600',
    },
    {
      icon: QrCode,
      title: 'Mobile QR Physical Inventory',
      description:
        'Live camera-based QR scanning for physical inventory sessions. Instantly flags shortages, overages, and unrecorded equipment in real-time.',
      tag: 'HTML5 QR Tech',
      gradient: 'from-blue-500/10 to-indigo-500/5',
      accentColor: 'text-blue-600',
    },
    {
      icon: Users,
      title: 'Custodian & Office Accountability',
      description:
        'Full assignment matrix mapping equipment to accountable officers, personnel, and deploying offices with digital Property Acknowledgement Receipts (PAR).',
      tag: 'PAR & ICS Slips',
      gradient: 'from-purple-500/10 to-pink-500/5',
      accentColor: 'text-purple-600',
    },
    {
      icon: FileSpreadsheet,
      title: 'Automated Official COA Reports',
      description:
        'Generate official government audit reports (RPCPPE, RPCSP, RSPI, RPCI) compliant with COA and GAM standards in single-click print and spreadsheet formats.',
      tag: 'Instant Export',
      gradient: 'from-amber-500/10 to-orange-500/5',
      accentColor: 'text-amber-600',
    },
    {
      icon: BarChart3,
      title: 'ApexCharts Executive Analytics',
      description:
        'Visual interactive analytics displaying total property valuation, equipment condition breakdown (Usable, Repairable, Unserviceable), and unit density per office.',
      tag: 'Live Metrics',
      gradient: 'from-rose-500/10 to-red-500/5',
      accentColor: 'text-rose-600',
    },
    {
      icon: Database,
      title: 'Supabase Cloud & PostgreSQL Security',
      description:
        'Enterprise-grade database powered by Supabase PostgreSQL, Prisma ORM, server-side authentication, and encrypted audit trail logging.',
      tag: 'Vercel Hosted',
      gradient: 'from-cyan-500/10 to-blue-500/5',
      accentColor: 'text-cyan-600',
    },
  ];

  const techStack = [
    { name: 'Next.js 15', category: 'App Router & SSR Framework', desc: 'React 19, Server Components & Dynamic API Routes', badge: 'v15.2' },
    { name: 'Supabase', category: 'Cloud Database & SSR Auth', desc: 'PostgreSQL DB, Row Level Security & Session Auth', badge: 'Supabase SSR' },
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
      color: 'border-emerald-200 bg-emerald-50/40 text-emerald-950',
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
      color: 'border-blue-200 bg-blue-50/40 text-blue-950',
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
      color: 'border-amber-200 bg-amber-50/40 text-amber-950',
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
      q: 'How is authentication and deployment configured on Vercel and Supabase?',
      a: 'The application is deployed on Vercel with Next.js 15 App Router. The database backend relies on Supabase PostgreSQL with Prisma ORM for schema management. Authentication uses Supabase SSR cookies with local storage fallback to ensure seamless multi-device sessions.',
    },
    {
      q: 'Can custom reports be exported for official documentation?',
      a: 'Absolutely. The Reports module allows supply officers to filter and export official RPCPPE, RPCSP, RSPI, and RPCI documents. Reports can be previewed directly in the browser or saved/printed as official government documentation.',
    },
    {
      q: 'Is this system hosted on GitHub and open for further customization?',
      a: 'Yes, the codebase is fully maintained in GitHub and configured for continuous deployment on Vercel. Developers can clone the repository, run `npm install`, setup Supabase environment variables, and run `npm run dev` to start building.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white overflow-x-hidden">
      {/* Dynamic Background Glow FX */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-[600px] right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[160px]" />
        <div className="absolute top-[1400px] left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[180px]" />
      </div>

      {/* ================= 1. HEADER / NAVIGATION ================= */}
      <header className="relative z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-white p-1 flex items-center justify-center border border-slate-700 shadow-md group-hover:scale-105 transition-transform overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nfsti logo.png" alt="NFSTI Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                  NFSTI <span className="text-emerald-500">EQUIPMENT</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Vercel Deployed
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">
                Property & Inventory System
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">
              Features
            </a>
            <a href="#interactive-demo" className="hover:text-emerald-400 transition-colors">
              System Modules
            </a>
            <a href="#tech-stack" className="hover:text-emerald-400 transition-colors">
              Tech Architecture
            </a>
            <a href="#roles" className="hover:text-emerald-400 transition-colors">
              Target Roles
            </a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/admin/login"
                  className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                >
                  Admin Portal Login
                </Link>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 px-4.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <span>Launch System</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300"
          >
            <ChevronDown className={`w-5 h-5 transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-950 p-4 space-y-3 animate-in fade-in">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-300 py-2 border-b border-slate-900"
            >
              Features
            </a>
            <a
              href="#interactive-demo"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-300 py-2 border-b border-slate-900"
            >
              System Demos
            </a>
            <a
              href="#tech-stack"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-300 py-2 border-b border-slate-900"
            >
              Tech Architecture
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-xs font-bold text-slate-300 py-2"
            >
              FAQ
            </a>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/auth/admin/login"
                className="w-full text-center py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-white"
              >
                Admin Login
              </Link>
              <Link
                href="/dashboard"
                className="w-full text-center py-2.5 rounded-xl bg-emerald-600 text-xs font-extrabold text-white"
              >
                Launch Dashboard
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ================= 2. HERO SECTION ================= */}
      <section className="relative z-10 pt-12 lg:pt-20 pb-16 lg:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold tracking-wide animate-in fade-in slide-in-from-bottom-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>NATIONAL FORENSIC SCIENCE TRAINING INSTITUTE</span>
            <span className="text-slate-600">•</span>
            <span className="text-white">OFFICIAL PROPERTY SYSTEM</span>
          </div>

          {/* Main Hero Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
            Next-Gen Government <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Equipment Accountability & Inventory System
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-sm sm:text-base lg:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed font-medium">
            Streamline public sector asset management with centralized property card registries, mobile QR physical counting sessions, custodian PAR/ICS slips, and automated COA-compliant report generation (RPCPPE, RPCSP, RSPI, RPCI).
          </p>

          {/* Dual Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <span>Access Internal Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/auth/admin/login"
              className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 font-bold text-sm shadow-lg flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Admin Portal Login</span>
            </Link>
          </div>

          {/* Live Deployment Indicators */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-semibold">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span>Hosted on <strong className="text-slate-200">Vercel</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <GithubIcon className="w-4 h-4 text-slate-300" />
              <span>Repository on <strong className="text-slate-200">GitHub</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-400" />
              <span>Powered by <strong className="text-slate-200">Supabase & Prisma</strong></span>
            </div>
          </div>
        </div>

        {/* ================= HERO PREVIEW MOCKUP ================= */}
        <div className="mt-12 sm:mt-16 relative max-w-6xl mx-auto">
          {/* Glassmorphic Browser Wrapper */}
          <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 backdrop-blur-2xl p-3 sm:p-5 shadow-2xl shadow-emerald-950/40 relative overflow-hidden">
            {/* Top Mock Window Bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80 px-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="ml-3 text-[11px] font-mono text-slate-400 truncate">
                  https://equipment-and-property-system.vercel.app/dashboard
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Supabase Connected</span>
              </div>
            </div>

            {/* Inner Dashboard Live Screenshot Simulation */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 text-slate-900">
              {/* Left Column: Quick KPI Mock Cards */}
              <div className="lg:col-span-4 bg-slate-950/80 rounded-2xl border border-slate-800 p-4 text-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Live Summary</span>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Total Property Value</span>
                  <p className="text-2xl font-black text-emerald-400 mt-1">₱1,854,200.00</p>
                  <span className="text-[10px] text-slate-500">Government Valued Assets</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Properties Counted</span>
                    <p className="text-lg font-black text-white">100% Verified</p>
                  </div>
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-slate-300">COA Audit Readiness</span>
                    <span className="text-emerald-400 font-mono">100%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 w-full" />
                  </div>
                </div>
              </div>

              {/* Right Column: Live Feature Cards Preview */}
              <div className="lg:col-span-8 bg-slate-950/80 rounded-2xl border border-slate-800 p-4 text-slate-100 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-black text-white tracking-wide">
                      OFFICIAL COA REPORT ENGINE
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                    RPCPPE & RPCSP Ready
                  </span>
                </div>

                {/* Simulated Table Snippet */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="py-2 px-2">Property No.</th>
                        <th className="py-2 px-2">Article / Description</th>
                        <th className="py-2 px-2">Classification</th>
                        <th className="py-2 px-2 text-right">Unit Value</th>
                        <th className="py-2 px-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                      <tr>
                        <td className="py-2 px-2 text-emerald-400 font-bold">PPE-2026-001</td>
                        <td className="py-2 px-2 font-sans font-medium text-white">Dell Latitude 5440 Laptop</td>
                        <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-sans font-bold">RPCPPE (≥₱50k)</span></td>
                        <td className="py-2 px-2 text-right">₱68,500.00</td>
                        <td className="py-2 px-2 text-center"><span className="text-emerald-400 font-sans font-bold text-[10px]">Verified</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-emerald-400 font-bold">SE-2026-042</td>
                        <td className="py-2 px-2 font-sans font-medium text-white">Ergonomic Office Executive Chair</td>
                        <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[9px] font-sans font-bold">RPCSP (&lt;₱50k)</span></td>
                        <td className="py-2 px-2 text-right">₱14,200.00</td>
                        <td className="py-2 px-2 text-center"><span className="text-emerald-400 font-sans font-bold text-[10px]">Verified</span></td>
                      </tr>
                      <tr>
                        <td className="py-2 px-2 text-emerald-400 font-bold">PPE-2026-015</td>
                        <td className="py-2 px-2 font-sans font-medium text-white">Epson EcoTank Heavy Duty Printer</td>
                        <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-sans font-bold">RPCPPE (≥₱50k)</span></td>
                        <td className="py-2 px-2 text-right">₱52,000.00</td>
                        <td className="py-2 px-2 text-center"><span className="text-emerald-400 font-sans font-bold text-[10px]">Verified</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                  <span>Showing real-time database sync from Supabase</span>
                  <Link href="/dashboard" className="text-emerald-400 font-bold hover:underline flex items-center gap-1">
                    Open Full System Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 3. SYSTEM METRICS BAR ================= */}
      <section className="relative z-10 py-10 bg-slate-900/60 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
          <div className="p-4 space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">₱50,000+</p>
            <p className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">RPCPPE Valuation Threshold</p>
            <p className="text-[11px] text-slate-400">Automatic GAM classification</p>
          </div>
          <div className="p-4 space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-white font-mono">100%</p>
            <p className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">COA Audit Compliance</p>
            <p className="text-[11px] text-slate-400">Standard official report forms</p>
          </div>
          <div className="p-4 space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">&lt; 3 Sec</p>
            <p className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Report Generation</p>
            <p className="text-[11px] text-slate-400">Instant printable PDFs & tables</p>
          </div>
          <div className="p-4 space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-white font-mono">Mobile QR</p>
            <p className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Physical Counting</p>
            <p className="text-[11px] text-slate-400">Camera scanning reconciliation</p>
          </div>
        </div>
      </section>

      {/* ================= 4. FEATURE SHOWCASE GRID ================= */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Comprehensive Core Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Engineered Specifically for Public Sector Property Accountability
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-medium">
            Everything your supply section, property officers, and inventory auditors need to manage government property efficiently.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-3xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 backdrop-blur-xl p-6 transition-all hover:border-slate-700 hover:-translate-y-1 shadow-lg hover:shadow-emerald-950/30 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feat.gradient} border border-slate-700 flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${feat.accentColor}`} />
                    </div>
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {feat.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
                    {feat.description}
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-800/80 mt-6 flex items-center text-xs font-bold text-slate-400 group-hover:text-emerald-400 transition-colors">
                  <span>Explore Module</span>
                  <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================= 5. INTERACTIVE MODULE DEMO TABS ================= */}
      <section id="interactive-demo" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto bg-slate-900/40 rounded-3xl border border-slate-800/90 my-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12">
          <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">Interactive Workspaces</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Explore System Modules
          </h2>
          <p className="text-sm text-slate-400">
            Click through the interactive workspace previews below to see how each module functions.
          </p>

          {/* Tab Switcher Buttons */}
          <div className="flex flex-wrap justify-center gap-2 pt-4">
            <button
              onClick={() => setActiveTab('registry')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'registry'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              1. Asset Registry
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              2. QR Physical Count
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              3. COA Official Reports
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              4. Analytics & Charts
            </button>
          </div>
        </div>

        {/* Tab Content Display */}
        <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 max-w-5xl mx-auto shadow-2xl">
          {activeTab === 'registry' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-base font-black text-white">Master Property Registry Card Module</h4>
                  <p className="text-xs text-slate-400">Searchable list of all registered government equipment with unit cost thresholds.</p>
                </div>
                <Link href="/properties" className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-600/30">
                  View Live Registry
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">RPCPPE Items (≥ ₱50,000)</span>
                  <p className="text-xl font-black text-emerald-400">Capitalized Assets</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">RPCSP Items (&lt; ₱50,000)</span>
                  <p className="text-xl font-black text-blue-400">Semi-Expendable</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Serial & QR Tagging</span>
                  <p className="text-xl font-black text-white">Auto-Generated</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qr' && (
            <div className="space-y-4 animate-in fade-in duration-300 text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <QrCode className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-white">Mobile Camera Scanner & Physical Count Reconciliation</h4>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">
                Inventory officers point their mobile camera at the equipment barcode. The engine validates the serial number against expected office deployment and records item condition.
              </p>
              <div className="pt-2">
                <Link href="/physical-inventory" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-500 transition-colors">
                  <span>Start Physical Inventory Session</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h4 className="text-base font-black text-white">COA Standard Report Generation</h4>
                  <p className="text-xs text-slate-400">Select report type, fiscal year, and exporting format.</p>
                </div>
                <Link href="/reports" className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30">
                  Generate Reports
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs font-black text-emerald-400">RPCPPE Report</span>
                  <p className="text-[11px] text-slate-400">Report on Physical Count of Property, Plant and Equipment (≥ ₱50,000)</p>
                </div>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs font-black text-blue-400">RPCSP Report</span>
                  <p className="text-[11px] text-slate-400">Report on Physical Count of Semi-Expendable Property (&lt; ₱50,000)</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-4 animate-in fade-in duration-300 text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-black text-white">ApexCharts Executive Visual Intelligence</h4>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">
                Real-time charts depicting total property valuation, equipment breakdown per category, office allocation, and shortage/overage audit monitoring.
              </p>
              <div className="pt-2">
                <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-extrabold hover:bg-emerald-500 transition-colors">
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
          <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">Enterprise Architecture</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Built with Modern High-Performance Tech Stack
          </h2>
          <p className="text-sm text-slate-400">
            Powered by Next.js 15 App Router, Supabase PostgreSQL database, and Tailwind CSS v4.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {techStack.map((tech, idx) => (
            <div key={idx} className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">{tech.category}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">{tech.badge}</span>
              </div>
              <h3 className="text-xl font-black text-white">{tech.name}</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">{tech.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ================= 7. TARGET ROLES ================= */}
      <section id="roles" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">Role-Based Operations</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Tailored for Supply Officers, Inspectors & Auditors
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {userRoles.map((roleItem, idx) => {
            const Icon = roleItem.icon;
            return (
              <div key={idx} className={`p-6 rounded-3xl border ${roleItem.color} backdrop-blur-xl space-y-4 flex flex-col justify-between`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-white/80 p-2 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-slate-900" />
                    </div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${roleItem.badgeColor}`}>
                      Active Role
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{roleItem.role}</h3>

                  <ul className="space-y-2 text-xs font-medium text-slate-700">
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
          <span className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">Got Questions?</span>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? -1 : idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900 transition-colors"
                >
                  <span className="text-sm font-extrabold text-white">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-emerald-400' : ''}`} />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-300 leading-relaxed font-medium border-t border-slate-800/80 pt-3 animate-in fade-in duration-200">
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
        <div className="rounded-3xl bg-gradient-to-r from-emerald-900/80 via-slate-900 to-teal-900/80 border border-emerald-500/30 p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight max-w-2xl mx-auto leading-tight">
            Ready to Streamline Government Property & Asset Accountability?
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto font-medium">
            Log in to the supply admin portal or access the live inventory management dashboard now.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="px-8 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
            >
              Launch Dashboard Now
            </Link>
            <Link
              href="/auth/admin/login"
              className="px-7 py-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Admin Portal Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ================= 10. FOOTER ================= */}
      <footer className="relative z-10 border-t border-slate-800 bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white p-1 border border-slate-700 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/nfsti logo.png" alt="NFSTI Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="font-extrabold text-white text-xs">NFSTI Equipment & Property System</p>
              <p className="text-[10px] text-slate-500">National Forensic Science Training Institute © FY 2026</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-semibold text-slate-400">
            <Link href="/dashboard" className="hover:text-emerald-400 transition-colors">Dashboard</Link>
            <Link href="/properties" className="hover:text-emerald-400 transition-colors">Properties</Link>
            <Link href="/physical-inventory" className="hover:text-emerald-400 transition-colors">Physical Count</Link>
            <Link href="/reports" className="hover:text-emerald-400 transition-colors">COA Reports</Link>
            <Link href="/auth/admin/login" className="hover:text-emerald-400 transition-colors">Admin Login</Link>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Vercel Hosted & Operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
