'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';

const DashboardCharts = dynamic(() => import('@/components/DashboardCharts'), {
  ssr: false,
});
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  ArrowUpRight,
  Plus,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { StorageManager } from '@/lib/storage';

export default function DashboardPage() {
  const [isDataLoading, setIsDataLoading] = useState(true);

  const [properties, setProperties] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [counts, setCounts] = useState([]);
  const [categories, setCategories] = useState([]);

  const loadBackendDashboardData = async () => {
    try {
      setIsDataLoading(true);
      const [propRes, empRes, offRes, catRes, countRes] = await Promise.allSettled([
        fetch('/api/properties').then((r) => r.json()),
        fetch('/api/personnel').then((r) => r.json()),
        fetch('/api/offices').then((r) => r.json()),
        fetch('/api/categories').then((r) => r.json()),
        fetch('/api/physical-counts').then((r) => r.json()),
      ]);

      if (propRes.status === 'fulfilled' && propRes.value?.properties) {
        setProperties(propRes.value.properties);
      }
      if (empRes.status === 'fulfilled' && (empRes.value?.personnel || empRes.value?.employees)) {
        setEmployees(empRes.value.personnel || empRes.value.employees || []);
      }
      if (offRes.status === 'fulfilled' && offRes.value?.offices) {
        setOffices(offRes.value.offices);
      }
      if (catRes.status === 'fulfilled' && catRes.value?.categories) {
        setCategories(catRes.value.categories);
      }
      if (countRes.status === 'fulfilled' && countRes.value?.counts) {
        setCounts(countRes.value.counts);
      }
    } catch (e) {
      console.error('Failed to load live backend data:', e);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    loadBackendDashboardData();
  }, []);

  // KPI Calculations
  const totalProperties = properties.length;
  const totalPropertyValue = properties.reduce((acc, p) => acc + (p.unitValue || 0) * (p.quantityPerCard || 1), 0);
  const totalPersonnel = employees.length;
  const totalOffices = offices.length;

  const countedProperties = counts.filter((c) => c.status !== 'PENDING').length;
  const pendingProperties = counts.filter((c) => c.status === 'PENDING').length;
  const shortageCount = counts.filter((c) => c.status === 'SHORTAGE').length;
  const overageCount = counts.filter((c) => c.status === 'OVERAGE').length;

  const completedPct = totalProperties > 0 ? Math.round((countedProperties / Math.max(counts.length, totalProperties)) * 100) : 0;



  return (
    <div className="min-h-screen p-2.5 sm:p-6 lg:p-8 flex justify-center items-start">
      <div className="w-full max-w-[1540px] flex gap-5 lg:gap-6 items-start">
        {/* Floating Sidebar */}
        <Sidebar totalItems={totalProperties} />

        {/* Floating Main Content Container */}
        <main className="flex-1 min-w-0 bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl sm:rounded-[32px] shadow-2xl shadow-slate-900/10 p-4 sm:p-6 lg:p-8 flex flex-col space-y-5 sm:space-y-6 overflow-hidden">
          {/* Top Navbar */}
          <Navbar pageTitle="Property & Inventory Overview" icon={LayoutDashboard} />

          {/* Quick Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Welcome to <span className="text-emerald-700">NFSTI Inventory System</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Centralized equipment accountability, physical counting, reconciliation, and automated reporting
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={loadBackendDashboardData}
                disabled={isDataLoading}
                title="Refresh Live Data from Supabase Database"
                className="flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isDataLoading ? 'animate-spin text-emerald-600' : ''}`} />
                <span>{isDataLoading ? 'Syncing...' : 'Refresh'}</span>
              </button>
              <Link
                href="/physical-inventory"
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold transition-all shadow-2xs"
              >
                <ClipboardList className="w-4 h-4 text-emerald-700" />
                <span>Physical Inventory</span>
              </Link>
              <Link
                href="/reports"
                className="flex items-center gap-2 px-3.5 sm:px-4.5 py-2 sm:py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Generate Official Report</span>
              </Link>
            </div>
          </div>

          {/* ================= 8 SUMMARY KPI CARDS ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {isDataLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs animate-pulse space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="h-3.5 w-24 bg-slate-200/80 rounded-md"></div>
                    <div className="w-4 h-4 bg-slate-200/80 rounded-full"></div>
                  </div>
                  <div className="h-7 w-32 bg-slate-200/80 rounded-lg"></div>
                  <div className="h-3 w-28 bg-slate-100 rounded-md"></div>
                </div>
              ))
            ) : (
              <>
                {/* Card 1: Total Properties */}
                <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Total Properties
                    </span>
                    <Package className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-1.5">
                    {totalProperties.toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span>
                  </p>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                    Registered in Registry
                  </span>
                </div>

                {/* Card 2: Total Property Value */}
                <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Total Property Value
                    </span>
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-1.5">
                    ₱{totalPropertyValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Philippine Peso (PHP)
                  </span>
                </div>

                {/* Card 3: Total Personnel */}
                <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Personnel
                    </span>
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-1.5">
                    {totalPersonnel} <span className="text-xs font-normal text-slate-500">Employees</span>
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Accountable Custodians
                  </span>
                </div>

                {/* Card 4: Operating Offices */}
                <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Offices
                    </span>
                    <Building2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-1.5">
                    {totalOffices} <span className="text-xs font-normal text-slate-500">Divisions</span>
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    Operating Departments
                  </span>
                </div>

                {/* Card 5: Properties Counted */}
                <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      Counted
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-emerald-800 mt-1.5">
                    {countedProperties} <span className="text-xs font-normal text-slate-500">Counted</span>
                  </p>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                    Verified in Sessions
                  </span>
                </div>

                {/* Card 6: Properties Pending Count */}
                <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-amber-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Pending
                    </span>
                    <Clock className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-2xl font-black text-amber-700 mt-1.5">
                    {pendingProperties} <span className="text-xs font-normal text-slate-500">Pending</span>
                  </p>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1">
                    Awaiting Verification
                  </span>
                </div>

                {/* Card 7: Shortages */}
                <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-rose-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Shortage
                    </span>
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  </div>
                  <p className="text-2xl font-black text-rose-700 mt-1.5">
                    {shortageCount} <span className="text-xs font-normal text-slate-500">Items</span>
                  </p>
                  <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-1">
                    Physical &lt; Expected
                  </span>
                </div>

                {/* Card 8: Overages */}
                <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Overage
                    </span>
                    <Plus className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-2xl font-black text-blue-800 mt-1.5">
                    {overageCount} <span className="text-xs font-normal text-slate-500">Items</span>
                  </p>
                </div>
              </>
            )}
          </div>

          {/* ================= APEX CHARTS & PERSONNEL DIRECTORY SECTION ================= */}
          <DashboardCharts
            properties={properties}
            categories={categories}
            counts={counts}
            offices={offices}
            personnel={employees}
          />

          {/* ================= END OF DASHBOARD CONTENT ================= */}


        </main>
      </div>
    </div>
  );
}
