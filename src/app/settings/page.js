'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import {
  Settings,
  Building2,
  FileSpreadsheet,
  Users,
  ShieldCheck,
  History,
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RotateCcw,
  Sliders,
  Lock,
  Search,
  Database,
  Server,
  Key,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Terminal,
  Layers,
  Cloud,
  CheckCircle,
  User,
  Eye,
  EyeOff,
} from 'lucide-react';
import { StorageManager } from '@/lib/storage';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('ORG'); // ORG, REPORT, USERS, AUDIT, DATABASE
  const [settings, setSettings] = useState({
    orgName: '',
    orgCode: '',
    officeAddress: '',
    contactEmail: '',
    contactPhone: '',
    defaultCurrency: 'PHP',
    currencySymbol: '₱',
    reportHeaderTitle: '',
    defaultUnit: 'unit',
  });

  const [signatories, setSignatories] = useState({
    preparedByName: '',
    preparedByTitle: '',
    certifiedCorrectByName: '',
    certifiedCorrectByTitle: '',
    teamLeaderName: '',
    teamLeaderTitle: '',
    approvedByName: '',
    approvedByTitle: '',
    verifiedByName: '',
    verifiedByTitle: '',
  });

  const [roles, setRoles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [notification, setNotification] = useState(null);

  // Supabase & Database Integration State
  const [dbStatus, setDbStatus] = useState({
    loading: false,
    checked: false,
    data: null,
    error: null,
  });
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  const checkSupabaseStatus = async () => {
    setDbStatus((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch('/api/supabase/status');
      const data = await res.json();
      setDbStatus({
        loading: false,
        checked: true,
        data,
        error: null,
      });
    } catch (err) {
      setDbStatus({
        loading: false,
        checked: true,
        data: null,
        error: err.message,
      });
    }
  };

  const handleCopySqlSchema = async () => {
    try {
      const res = await fetch('/api/supabase/schema');
      const json = await res.json();
      if (json.sql) {
        await navigator.clipboard.writeText(json.sql);
        setCopiedSql(true);
        setNotification({
          title: 'SQL Schema Copied!',
          message: 'PostgreSQL DDL schema copied to clipboard. Paste and run it in Supabase SQL Editor.',
        });
        setTimeout(() => setCopiedSql(false), 4000);
      }
    } catch (err) {
      console.error('Failed to copy schema:', err);
    }
  };

  const handleCopyEnvTemplate = async () => {
    const envText = `# Supabase REST / Auth API Client Keys
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-secret-key"

# Supabase PostgreSQL Database Connections (Prisma ORM)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"`;
    try {
      await navigator.clipboard.writeText(envText);
      setCopiedEnv(true);
      setNotification({
        title: '.env Configuration Template Copied!',
        message: 'Paste into your .env.local file and replace placeholders with your Supabase credentials.',
      });
      setTimeout(() => setCopiedEnv(false), 4000);
    } catch (err) {
      console.error('Failed to copy env:', err);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      const localSet = StorageManager.getSettings();
      const localSigs = StorageManager.getSignatoriesConfig();
      setSettings(localSet);
      setSignatories(localSigs);
    } catch (e) {}

    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.settings && Object.keys(data.settings).length > 0) {
          const mergedSettings = { ...StorageManager.getSettings(), ...data.settings };
          setSettings(mergedSettings);
          StorageManager.saveSettings(mergedSettings);
        }
        if (data.signatories && Object.keys(data.signatories).length > 0) {
          const mergedSigs = { ...StorageManager.getSignatoriesConfig(), ...data.signatories };
          setSignatories(mergedSigs);
          StorageManager.saveSignatoriesConfig(mergedSigs);
        }
      }
    } catch (apiErr) {
      console.warn('Fallback to local storage for settings:', apiErr);
    }

    try {
      const profRes = await fetch('/api/profile');
      const profData = await profRes.json();
      if (profRes.ok && profData.success && profData.profile) {
        setProfile((prev) => ({ ...prev, ...profData.profile }));
      }
    } catch (profErr) {
      console.warn('Fallback for profile fetch:', profErr);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save Org Settings to Supabase
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      StorageManager.saveSettings(settings);

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setNotification({
          title: 'Settings Saved to Supabase!',
          message: 'Organization details saved and synced to Supabase database successfully.',
        });
      } else {
        setNotification({
          title: 'Settings Saved Locally',
          message: 'Organization details updated in local storage.',
        });
      }
    } catch (err) {
      setNotification({
        title: 'Settings Saved Locally',
        message: 'Organization details updated in local storage.',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Save Signatories to Supabase
  const handleSaveSignatories = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      StorageManager.saveSignatoriesConfig(signatories);

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatories }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setNotification({
          title: 'Signatories Saved to Supabase!',
          message: 'Official signatories matrix saved and synced to Supabase database successfully.',
        });
      } else {
        setNotification({
          title: 'Signatories Saved Locally',
          message: 'Default authority matrix updated in local storage.',
        });
      }
    } catch (err) {
      setNotification({
        title: 'Signatories Saved Locally',
        message: 'Default authority matrix updated in local storage.',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const [profile, setProfile] = useState({
    username: 'edolotallas',
    fullName: 'Elmer G. Dolotallas',
    position: 'Supply Officer / Admin',
    email: 'supplyoffice1996@gmail.com',
    password: 'NFSTISupply123',
  });
  const [showProfilePassword, setShowProfilePassword] = useState(false);

  // Save Admin Profile to Supabase
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        StorageManager.setActiveUser({
          ...StorageManager.getActiveUser(),
          name: profile.fullName,
          fullName: profile.fullName,
          position: profile.position,
        });
        setNotification({
          title: 'Profile Settings Saved to Supabase!',
          message: 'Admin account profile, credentials, and password updated successfully.',
        });
      } else {
        setNotification({
          title: 'Profile Updated Locally',
          message: data.error || 'Profile details updated.',
        });
      }
    } catch (err) {
      setNotification({
        title: 'Profile Saved',
        message: 'Admin details updated.',
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  // Reset Database
  const handleResetData = () => {
    if (
      confirm(
        '⚠️ Are you sure you want to restore the database to its official initial seed state? This will reset all counts and properties back to defaults.'
      )
    ) {
      StorageManager.resetToDefaultSeed();
      window.location.reload();
    }
  };

  // Filtered audit logs
  const filteredLogs = auditLogs.filter((l) => {
    const q = auditSearch.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.entity.toLowerCase().includes(q) ||
      l.user.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen p-2.5 sm:p-6 lg:p-8 flex justify-center items-start">
      <div className="w-full max-w-[1540px] flex gap-5 lg:gap-6 items-start">
        {/* Floating Sidebar */}
        <Sidebar totalItems={12} />

        {/* Floating Main Content Container */}
        <main className="flex-1 min-w-0 bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl sm:rounded-[32px] shadow-2xl shadow-slate-900/10 p-4 sm:p-6 lg:p-8 flex flex-col space-y-5 sm:space-y-6 overflow-hidden">
          {/* Top Navbar */}
          <Navbar pageTitle="System Settings & Governance" icon={Settings} />

          {/* Toast Notification */}
          {notification && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between shadow-md shadow-emerald-100 animate-in fade-in slide-in-from-top-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-extrabold">{notification.title}</p>
                  <p className="text-xs text-emerald-800">{notification.message}</p>
                </div>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors"
              >
                ✕
              </button>
            </div>
          )}

          {/* Tab Navigation Header */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 w-full sm:w-auto overflow-x-auto">
            {[
              { id: 'ORG', label: 'Organization Info', icon: Building2 },
              { id: 'REPORT', label: 'Report & Signatories', icon: FileSpreadsheet },
              { id: 'PROFILE', label: 'Profile Settings', icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: Organization Information */}
          {activeTab === 'ORG' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Organization Information</h3>
                <p className="text-xs text-slate-400">
                  Agency credentials and official reporting header information
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Organization / Agency Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={settings.orgName}
                      onChange={(e) => setSettings({ ...settings, orgName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Agency Code</label>
                    <input
                      type="text"
                      value={settings.orgCode}
                      onChange={(e) => setSettings({ ...settings, orgCode: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Official Currency</label>
                    <input
                      type="text"
                      value={`${settings.currencySymbol} (${settings.defaultCurrency})`}
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Office Address</label>
                    <input
                      type="text"
                      value={settings.officeAddress}
                      onChange={(e) => setSettings({ ...settings, officeAddress: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={settings.contactEmail}
                      onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone / Trunkline</label>
                    <input
                      type="text"
                      value={settings.contactPhone}
                      onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Organization Information</span>
                  </button>
                </div>
              </form>
            </div>
          )}

              {/* TAB 2: Report & Signatories */}
          {activeTab === 'REPORT' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Default Report Signatories Matrix</h3>
                <p className="text-xs text-slate-400">
                  Configure default signatory names, multi-position designations, and 5 Committee Members for all auto-generated government reports
                </p>
              </div>

              <form onSubmit={handleSaveSignatories} className="space-y-4">
                <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>Multi-Position Support:</strong> Puwede kang maglagay ng multiple positions / designations sa pamamagitan ng paghihiwalay gamit ang slash (<code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-bold">/</code>), comma, o bagong linya. Awtomatiko itong lalabas nang maayos sa naka-landscape na report.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 1. Prepared by */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      1. Prepared by:
                    </span>
                    <input
                      type="text"
                      value={signatories.preparedByName || ''}
                      onChange={(e) => setSignatories({ ...signatories, preparedByName: e.target.value })}
                      placeholder="Full Name"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                    />
                    <input
                      type="text"
                      value={signatories.preparedByTitle || ''}
                      onChange={(e) => setSignatories({ ...signatories, preparedByTitle: e.target.value })}
                      placeholder="Designation / Multiple Positions (e.g. Supply Section Rep / Custodian)"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600"
                    />
                  </div>

                  {/* 2. Certified Correct by */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      2. Certified Correct by:
                    </span>
                    <input
                      type="text"
                      value={signatories.certifiedCorrectByName || ''}
                      onChange={(e) => setSignatories({ ...signatories, certifiedCorrectByName: e.target.value })}
                      placeholder="Full Name"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                    />
                    <input
                      type="text"
                      value={signatories.certifiedCorrectByTitle || ''}
                      onChange={(e) => setSignatories({ ...signatories, certifiedCorrectByTitle: e.target.value })}
                      placeholder="Designation / Multiple Positions (e.g. Supply Officer V / Admin Officer)"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600"
                    />
                  </div>

                  {/* 3. Team Leader */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      3. Team Leader:
                    </span>
                    <input
                      type="text"
                      value={signatories.teamLeaderName || ''}
                      onChange={(e) => setSignatories({ ...signatories, teamLeaderName: e.target.value })}
                      placeholder="Full Name"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                    />
                    <input
                      type="text"
                      value={signatories.teamLeaderTitle || ''}
                      onChange={(e) => setSignatories({ ...signatories, teamLeaderTitle: e.target.value })}
                      placeholder="Designation / Multiple Positions (e.g. Committee Chair / Chief Admin Officer)"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600"
                    />
                  </div>

                  {/* 4. Approved by */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      4. Approved by:
                    </span>
                    <input
                      type="text"
                      value={signatories.approvedByName || ''}
                      onChange={(e) => setSignatories({ ...signatories, approvedByName: e.target.value })}
                      placeholder="Full Name"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                    />
                    <input
                      type="text"
                      value={signatories.approvedByTitle || ''}
                      onChange={(e) => setSignatories({ ...signatories, approvedByTitle: e.target.value })}
                      placeholder="Designation / Multiple Positions (e.g. Acting Executive Director / VP)"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600"
                    />
                  </div>

                  {/* 5. Inventory Committee Members (5 Persons - Names Only) */}
                  <div className="sm:col-span-2 p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <div>
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                          5. Physical Inventory Committee Members (Optional Slots)
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Pangalan lamang ng mga miyembro (walang indibidwal na posisyon). 2 default members; magdagdag kung kinakailangan.
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Committee Members
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Member 1</label>
                        <input
                          type="text"
                          value={signatories.member1Name || ''}
                          onChange={(e) => setSignatories({ ...signatories, member1Name: e.target.value })}
                          placeholder="Member 1 Name"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Member 2</label>
                        <input
                          type="text"
                          value={signatories.member2Name || ''}
                          onChange={(e) => setSignatories({ ...signatories, member2Name: e.target.value })}
                          placeholder="Member 2 Name"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Member 3 (Optional)</label>
                        <input
                          type="text"
                          value={signatories.member3Name || ''}
                          onChange={(e) => setSignatories({ ...signatories, member3Name: e.target.value })}
                          placeholder="Member 3 Name"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Member 4 (Optional)</label>
                        <input
                          type="text"
                          value={signatories.member4Name || ''}
                          onChange={(e) => setSignatories({ ...signatories, member4Name: e.target.value })}
                          placeholder="Member 4 Name"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Member 5 (Optional)</label>
                        <input
                          type="text"
                          value={signatories.member5Name || ''}
                          onChange={(e) => setSignatories({ ...signatories, member5Name: e.target.value })}
                          placeholder="Member 5 Name"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 6. Verified by */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 sm:col-span-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      6. Verified by (State Auditor / Audit Team Leader):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={signatories.verifiedByName || ''}
                        onChange={(e) => setSignatories({ ...signatories, verifiedByName: e.target.value })}
                        placeholder="Full Name (e.g. YVES ARDEN M. CABANLONG)"
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                      />
                      <input
                        type="text"
                        value={signatories.verifiedByTitle || ''}
                        onChange={(e) => setSignatories({ ...signatories, verifiedByTitle: e.target.value })}
                        placeholder="Designation / Multi-Positions (e.g. State Auditor IV / Audit Team Leader, RO IVA)"
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Signatories Matrix</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Profile Settings */}
          {activeTab === 'PROFILE' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Administrator Profile & Credentials</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Manage account details, admin credentials, and login password saved to Supabase users table
                </p>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={profile.fullName}
                      onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                      placeholder="e.g. Elmer G. Dolotallas"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Position / Designation
                    </label>
                    <input
                      type="text"
                      value={profile.position}
                      onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                      placeholder="e.g. Supply Officer / Admin"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      placeholder="e.g. edolotallas"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="e.g. supplyoffice1996@gmail.com"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-extrabold text-slate-700 mb-1.5">
                      Account Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showProfilePassword ? 'text' : 'password'}
                        required
                        value={profile.password}
                        onChange={(e) => setProfile({ ...profile, password: e.target.value })}
                        placeholder="Enter account password"
                        className="w-full pl-4 pr-10 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowProfilePassword(!showProfilePassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                      >
                        {showProfilePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Profile & Password</span>
                  </button>
                </div>
              </form>
            </div>
          )}


        </main>
      </div>
    </div>
  );
}
