'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  ClipboardCheck,
  ClipboardList,
  GitCompare,
  FileSpreadsheet,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Monitor,
  Radio,
  Armchair,
  Tag,
  ShieldCheck,
  UserCheck,
  X,
  Menu,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { StorageManager } from '@/lib/storage';

function SidebarContent({ totalItems = 0 }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams?.get('type') || searchParams?.get('category') || '';

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isReportsMenuOpen, setIsReportsMenuOpen] = useState(pathname ? pathname.startsWith('/reports') : false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Listen for mobile sidebar toggle events from Navbar or window
  useEffect(() => {
    const handleToggle = () => setMobileOpen((prev) => !prev);
    const handleClose = () => setMobileOpen(false);
    window.addEventListener('toggle-mobile-sidebar', handleToggle);
    window.addEventListener('close-mobile-sidebar', handleClose);
    return () => {
      window.removeEventListener('toggle-mobile-sidebar', handleToggle);
      window.removeEventListener('close-mobile-sidebar', handleClose);
    };
  }, []);

  // Close mobile sidebar drawer and collapse reports dropdown on navigation unless on reports
  useEffect(() => {
    setMobileOpen(false);
    if (!pathname?.startsWith('/reports')) {
      setIsReportsMenuOpen(false);
    }
  }, [pathname, searchParams]);

  const [counts, setCounts] = useState({
    properties: 0,
    categories: 0,
    personnel: 0,
    offices: 0,
    pendingCounts: 0,
    discrepancies: 0,
    reports: 0,
    rpcppe: 0,
    rpci: 0,
    rpcsp: 0,
  });

  const [activeUser, setActiveUser] = useState({
    name: 'Elmer G. Dolotallas',
    role: 'Admin',
    position: 'Supply Officer',
    initials: 'ED',
  });

  // Load persistent collapsed state and dynamic badge counters on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nfsti_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch (e) {}

    const refreshCounts = async () => {
      try {
        const props = StorageManager.getProperties() || [];
        const emps = StorageManager.getEmployees() || [];
        const physicalCounts = StorageManager.getPhysicalCounts() || [];
        const reps = StorageManager.getReports() || [];
        const user = StorageManager.getActiveUser();

        let catsCount = (StorageManager.getCategories() || []).length;
        let offsCount = (StorageManager.getOffices() || []).length;
        let empsCount = (StorageManager.getEmployees() || []).length;
        let liveProps = StorageManager.getProperties() || [];

        // Fetch live database counts
        try {
          const [catRes, offRes, empRes, propRes] = await Promise.all([
            fetch('/api/categories', { cache: 'no-store' }),
            fetch('/api/offices', { cache: 'no-store' }),
            fetch('/api/personnel', { cache: 'no-store' }),
            fetch('/api/properties', { cache: 'no-store' }),
          ]);
          if (catRes.ok) {
            try {
              const catText = await catRes.text();
              const catData = JSON.parse(catText);
              if (catData.success && Array.isArray(catData.categories)) {
                catsCount = catData.categories.length;
                StorageManager.saveCategories(catData.categories);
              }
            } catch (e) {}
          }
          if (offRes.ok) {
            try {
              const offText = await offRes.text();
              const offData = JSON.parse(offText);
              if (offData.success && Array.isArray(offData.offices)) {
                offsCount = offData.offices.length;
                StorageManager.saveOffices(offData.offices);
              }
            } catch (e) {}
          }
          if (empRes.ok) {
            try {
              const empText = await empRes.text();
              const empData = JSON.parse(empText);
              if (empData.success && Array.isArray(empData.employees)) {
                empsCount = empData.employees.length;
                StorageManager.saveEmployees(empData.employees);
              }
            } catch (e) {}
          }
          if (propRes.ok) {
            try {
              const propText = await propRes.text();
              const propData = JSON.parse(propText);
              if (propData.success && Array.isArray(propData.properties)) {
                liveProps = propData.properties;
                StorageManager.saveProperties(propData.properties);
              }
            } catch (e) {}
          }
        } catch (apiErr) {
          // fallback to local storage
        }

        const pending = physicalCounts.filter((c) => c.status === 'PENDING').length;
        const disc = physicalCounts.filter((c) => c.status === 'SHORTAGE' || c.status === 'OVERAGE').length;

        const parseVal = (val) => {
          if (val === null || val === undefined) return 0;
          if (typeof val === 'number') return val;
          const cleaned = String(val).replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        };

        // Breakdown by Official Report Classification (RPCPPE >= ₱50k, RPCSP < ₱50k, RPCI Inventory)
        const ppeProps = liveProps.filter((p) => parseVal(p.unitValue) >= 50000).length;
        const semiExpProps = liveProps.filter((p) => parseVal(p.unitValue) < 50000).length;
        const invReports = reps.filter((r) => r.reportType?.includes('RPCI') || r.reportType?.includes('Inventory')).length || 0;

        setCounts({
          properties: liveProps.length,
          categories: catsCount,
          personnel: empsCount,
          offices: offsCount,
          pendingCounts: pending,
          discrepancies: disc,
          reports: reps.length,
          rpcppe: ppeProps,
          rpci: invReports,
          rpcsp: semiExpProps,
        });

        if (user) {
          setActiveUser(user);
        }
      } catch (e) {}
    };

    refreshCounts();
    window.addEventListener('storage', refreshCounts);
    return () => window.removeEventListener('storage', refreshCounts);
  }, [pathname, searchParams]);

  const toggleSidebar = (e) => {
    e.stopPropagation();
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nfsti_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  const isExpanded = !isCollapsed || isHovered;

  // Report Sub-Menu Items (Official Government Inventory & Property Reports)
  const reportSubItems = [
    {
      name: 'RPCPPE',
      fullName: 'REPORT ON PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT (RPCPPE)',
      subLabel: 'Property, Plant & Equipment',
      href: '/reports?type=rpcppe',
      typeId: 'rpcppe',
      icon: Building2,
      count: counts.rpcppe,
    },
    {
      name: 'RSPI',
      fullName: 'REGISTRY OF SEMI-EXPANDABLE PROPERTY ISSUED (RSPI)',
      subLabel: 'Semi-Expendable Issued Registry',
      href: '/reports?type=rspi',
      typeId: 'rspi',
      icon: ClipboardList,
      count: counts.rspi || counts.rpcsp,
    },
    {
      name: 'RPCSP',
      fullName: 'REPORT ON PHYSICAL COUNT OF SEMI-EXPANDABLE PROPERTY (RPCSP)',
      subLabel: 'Semi-Expendable Property',
      href: '/reports?type=rpcsp',
      typeId: 'rpcsp',
      icon: FileSpreadsheet,
      count: counts.rpcsp,
    },
  ];

  const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Properties', href: '/properties', icon: Package, badge: counts.properties },
    { name: 'Categories', href: '/categories', icon: Tag, badge: counts.categories },
    { name: 'Personnel', href: '/personnel', icon: Users, badge: counts.personnel },
    { name: 'Offices', href: '/offices', icon: Building2, badge: counts.offices },
    { name: 'Assignments', href: '/assignments', icon: ClipboardCheck },
    {
      name: 'Physical Inventory',
      href: '/physical-inventory',
      icon: ClipboardList,
      badge: counts.pendingCounts > 0 ? counts.pendingCounts : null,
      badgeColor: 'bg-amber-100 text-amber-800',
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: FileSpreadsheet,
      badge: counts.reports,
      hasSubMenu: true,
    },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar Layout */}
      <aside
        onMouseEnter={() => isCollapsed && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden lg:flex bg-white/95 backdrop-blur-xl border border-white/80 rounded-[32px] shadow-2xl shadow-slate-900/10 flex-col shrink-0 min-h-[88vh] sticky top-6 lg:top-8 overflow-hidden transition-[width,padding] duration-300 ease-in-out z-20 ${
          isExpanded ? 'w-64 p-5' : 'w-20 p-3'
        }`}
      >
        {/* Brand Logo & Collapse Toggle Header */}
        <div
          className={`flex items-center mb-4 border-b border-slate-100 pb-4 ${
            !isExpanded ? 'justify-center flex-col gap-2' : 'justify-between'
          }`}
        >
          <Link href="/" className="flex items-center gap-3 min-w-0 group cursor-pointer">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-xs border border-slate-100 shrink-0 p-0.5 overflow-hidden group-hover:scale-105 transition-transform">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/nfsti logo.png"
                alt="NFSTI Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {isExpanded && (
              <div className="min-w-0 animate-in fade-in duration-200">
                <span className="font-black text-base text-slate-900 tracking-tight block leading-tight truncate">
                  NFSTI <span className="text-emerald-600">Equipment</span>
                </span>
                <span className="block text-[9px] text-emerald-800 font-extrabold tracking-wider uppercase truncate">
                  Inventory System
                </span>
              </div>
            )}
          </Link>

          {/* Hide / Expand Toggle Button */}
          <button
            onClick={toggleSidebar}
            title={isCollapsed ? 'Pin Sidebar (Expanded)' : 'Collapse Sidebar (Expand on Hover)'}
            className={`p-1.5 rounded-xl text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200 transition-all cursor-pointer ${
              !isExpanded ? 'mt-1' : ''
            }`}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Menu */}
        <div className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden pr-0.5">
          {isExpanded && (
            <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 animate-in fade-in duration-200">
              Main Menu
            </p>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isReports = item.name === 'Reports';
            const isParentActive = pathname.startsWith('/reports') && isReports;
            const isGenericActive = !isReports && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
            const isActive = isReports ? isParentActive : isGenericActive;

            if (isReports) {
              return (
                <div key={item.name} className="space-y-1">
                  {/* Reports Main Menu Item */}
                  <div
                    className={`w-full flex items-center rounded-2xl text-xs font-semibold transition-all group relative cursor-pointer ${
                      !isExpanded
                        ? 'justify-center p-3'
                        : 'justify-between px-3.5 py-2.5'
                    } ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/80'
                    }`}
                    onClick={() => isExpanded && setIsReportsMenuOpen(!isReportsMenuOpen)}
                  >
                    <Link
                      href="/reports?type=rpcppe"
                      className={`flex items-center flex-1 min-w-0 ${!isExpanded ? 'justify-center' : 'gap-3'}`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-700'
                        }`}
                      />
                      {isExpanded && <span className="truncate font-bold animate-in fade-in duration-200">Reports</span>}
                    </Link>

                    {isExpanded && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isReportsMenuOpen ? 'rotate-180' : ''
                          } ${isActive ? 'text-white' : 'text-slate-400'}`}
                        />
                      </div>
                    )}
                  </div>

                  {/* Reports Category Sub-Menus */}
                  {isExpanded && isReportsMenuOpen && (
                    <div className="pl-3 pr-1 py-1 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="border-l-2 border-emerald-200/80 pl-2.5 space-y-1">
                        {reportSubItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive =
                            pathname.startsWith('/reports') &&
                            (currentType === sub.typeId || (!currentType && sub.typeId === 'rpcppe') || (currentType === 'cat-oe' && sub.typeId === 'rpcppe'));

                          return (
                            <Link
                              key={sub.typeId}
                              href={sub.href}
                              title={sub.fullName}
                              className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-bold transition-all ${
                                isSubActive
                                  ? 'bg-emerald-100 text-emerald-950 font-black shadow-2xs border border-emerald-300'
                                  : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <SubIcon
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    isSubActive ? 'text-emerald-700 font-bold' : 'text-slate-400'
                                  }`}
                                />
                                <div className="min-w-0">
                                  <span className="truncate block leading-tight font-extrabold">{sub.name}</span>
                                  <span className="text-[9px] text-slate-400 block truncate leading-tight font-medium">
                                    {sub.subLabel}
                                  </span>
                                </div>
                              </div>

                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                title={!isExpanded ? item.name : undefined}
                className={`w-full flex items-center rounded-2xl text-xs font-semibold transition-all group relative ${
                  !isExpanded
                    ? 'justify-center p-3'
                    : 'justify-between px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 scale-[1.02]'
                    : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/80'
                }`}
              >
                <div className={`flex items-center ${!isExpanded ? 'justify-center' : 'gap-3'}`}>
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-emerald-700'
                    }`}
                  />
                  {isExpanded && <span className="truncate animate-in fade-in duration-200">{item.name}</span>}
                </div>


              </Link>
            );
          })}
        </div>



        {/* User Profile Footer */}
        <div
          className={`pt-3 border-t border-slate-100 flex items-center shrink-0 ${
            !isExpanded ? 'justify-center px-0' : 'gap-3 px-2'
          }`}
        >
          <Link
            href="/settings"
            title={`${activeUser.name} (${activeUser.role} / ${activeUser.position})`}
            className="w-9 h-9 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center font-bold text-emerald-800 text-xs shrink-0 cursor-pointer hover:bg-emerald-200 transition-colors"
          >
            {activeUser.initials || 'ED'}
          </Link>
          {isExpanded && (
            <div className="flex-1 min-w-0 animate-in fade-in duration-200">
              <p className="text-xs font-bold text-slate-800 truncate">{activeUser.name}</p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  {activeUser.role}
                </span>
                <p className="text-[10px] text-slate-400 truncate">{activeUser.position}</p>
              </div>
            </div>
          )}
          {isExpanded && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' });
                } catch (e) {
                  console.error('Logout API error:', e);
                }
                document.cookie = 'nfsti_authenticated=false; path=/; max-age=0';
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('nfsti_user_session');
                }
                router.push('/login');
                router.refresh();
              }}
              title="Sign Out / Logout"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Off-Canvas Drawer (Visible on < lg screens when mobileOpen is true) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer Content Panel */}
          <aside className="relative z-10 w-80 max-w-[85vw] bg-white border-r border-slate-200 h-full p-5 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-300">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-3">
              <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-xs border border-slate-100 shrink-0 p-0.5 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/nfsti logo.png" alt="NFSTI Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="font-black text-base text-slate-900 tracking-tight block leading-tight truncate">
                    NFSTI <span className="text-emerald-600">Equipment</span>
                  </span>
                  <span className="block text-[9px] text-emerald-800 font-extrabold tracking-wider uppercase truncate">
                    Inventory System
                  </span>
                </div>
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Navigation List */}
            <div className="flex-1 space-y-1 overflow-y-auto pr-0.5">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Main Menu
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isReports = item.name === 'Reports';
                const isParentActive = pathname.startsWith('/reports') && isReports;
                const isGenericActive = !isReports && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
                const isActive = isReports ? isParentActive : isGenericActive;

                if (isReports) {
                  return (
                    <div key={item.name} className="space-y-1">
                      <div
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                            : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/80'
                        }`}
                        onClick={() => setIsReportsMenuOpen(!isReportsMenuOpen)}
                      >
                        <Link href="/reports?type=rpcppe" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 flex-1 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                          <span className="truncate font-bold">Reports</span>
                        </Link>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isReportsMenuOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {isReportsMenuOpen && (
                        <div className="pl-3 pr-1 py-1 space-y-1">
                          <div className="border-l-2 border-emerald-200 pl-2.5 space-y-1">
                            {reportSubItems.map((sub) => {
                              const SubIcon = sub.icon;
                              const isSubActive = pathname.startsWith('/reports') && (currentType === sub.typeId || (!currentType && sub.typeId === 'rpcppe'));
                              return (
                                <Link
                                  key={sub.typeId}
                                  href={sub.href}
                                  onClick={() => setMobileOpen(false)}
                                  className={`flex items-center justify-between px-2.5 py-2 rounded-xl text-[11px] font-bold transition-all ${
                                    isSubActive
                                      ? 'bg-emerald-100 text-emerald-950 font-black border border-emerald-300'
                                      : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <SubIcon className={`w-3.5 h-3.5 shrink-0 ${isSubActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                                    <span className="truncate block font-extrabold">{sub.name}</span>
                                  </div>

                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="truncate">{item.name}</span>
                    </div>

                  </Link>
                );
              })}
            </div>

            {/* Mobile Footer User Profile */}
            <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center font-bold text-emerald-800 text-xs shrink-0">
                  {activeUser.initials || 'ED'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{activeUser.name}</p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      {activeUser.role}
                    </span>
                    <p className="text-[10px] text-slate-400 truncate">{activeUser.position}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                  } catch (e) {}
                  StorageManager.setAuthenticated(false);
                  window.location.href = '/auth/admin/login';
                }}
                title="Sign Out"
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export default function Sidebar(props) {
  return (
    <Suspense fallback={<aside className="w-64 p-5 bg-white/95 rounded-[32px]" />}>
      <SidebarContent {...props} />
    </Suspense>
  );
}
