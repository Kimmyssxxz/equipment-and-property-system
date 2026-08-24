'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  ShieldCheck,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
  Sparkles,
  ExternalLink,
  Menu,
  LogOut,
} from 'lucide-react';
import { StorageManager } from '@/lib/storage';

export default function Navbar({ pageTitle = 'Dashboard', icon: PageIcon }) {
  const [activeUser, setActiveUser] = useState({
    name: 'Elmer G. Dolotallas',
    role: 'Admin',
    position: 'Supply Officer',
    initials: 'ED',
  });
  const [roles, setRoles] = useState([]);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    try {
      const user = StorageManager.getActiveUser();
      const allRoles = StorageManager.getRoles();
      const logs = StorageManager.getAuditLogs();
      if (user) setActiveUser(user);
      if (allRoles) setRoles(allRoles);
      if (logs) setAuditLogs(logs.slice(0, 5));
    } catch (e) {}

    // Live clock update
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleDateString('en-PH', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRoleChange = (roleName) => {
    let newUserData = { ...activeUser, role: roleName };
    if (roleName === 'Admin') {
      newUserData = {
        name: 'Elmer G. Dolotallas',
        role: 'Admin',
        position: 'Supply Officer / Admin',
        initials: 'ED',
      };
    } else if (roleName === 'Inventory Officer') {
      newUserData = {
        name: 'Carmelo S. Balita',
        role: 'Inventory Officer',
        position: 'Supply Section Representative',
        initials: 'CB',
      };
    } else if (roleName === 'Accountable Officer') {
      newUserData = {
        name: 'Maria Santos',
        role: 'Accountable Officer',
        position: 'Chief Accountant',
        initials: 'MS',
      };
    } else if (roleName === 'Viewer') {
      newUserData = {
        name: 'Audit Inspector',
        role: 'Viewer',
        position: 'COA State Auditor',
        initials: 'AI',
      };
    }

    setActiveUser(newUserData);
    StorageManager.setActiveUser(newUserData);
    setShowRoleMenu(false);
    window.location.reload();
  };

  return (
    <header className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-2xl sm:rounded-[28px] shadow-sm px-3.5 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2.5 sm:gap-4 mb-4 sm:mb-6">
      {/* Mobile Sidebar Hamburger Toggle & Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
          title="Open Navigation Menu"
          className="lg:hidden p-2 rounded-xl sm:rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 transition-colors cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        {PageIcon && (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-200 shrink-0">
            <PageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
              NFSTI Property System
            </span>
            <span className="text-[9px] text-slate-300 hidden sm:inline">•</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.2 rounded-full border border-emerald-200 shrink-0">
              FY 2026
            </span>
          </div>
          <h1 className="text-sm sm:text-lg font-extrabold text-slate-900 leading-tight truncate">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Date Display */}
        <div className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
          <span>{timeStr || 'Aug 11, 2026'}</span>
        </div>



        {/* Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 transition-all cursor-pointer shadow-2xs"
          >
            <div className="w-6 h-6 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider leading-none">
                Role: {activeUser.role}
              </p>
              <p className="text-xs font-extrabold text-slate-900 leading-tight">
                {activeUser.name}
              </p>
            </div>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-slate-200 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/auth/logout', { method: 'POST' });
                  } catch (e) {}
                  StorageManager.setAuthenticated(false);
                  window.location.href = '/auth/admin/login';
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-extrabold text-rose-700 hover:bg-rose-50 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Sign Out</span>
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
