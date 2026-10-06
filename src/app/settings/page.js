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
    member1Name: '',
    member1Title: '',
    member2Name: '',
    member2Title: '',
    certifiedCorrectByName: '',
    certifiedCorrectByTitle: '',
    approvedByName: '',
    approvedByTitle: '',
    verifiedByName: '',
    verifiedByTitle: '',
    member3Name: '',
    member3Title: '',
    member4Name: '',
    member4Title: '',
    member5Name: '',
    member5Title: '',
    preparedByName: '',
    preparedByTitle: '',
    teamLeaderName: '',
    teamLeaderTitle: '',
  });

  const [roles, setRoles] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [notification, setNotification] = useState(null);
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

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
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Settings Saved Successfully!',
          message: 'Organization details and system preferences have been saved and synced to database.',
        });
      } else {
        setNotification({
          title: 'Settings Saved Locally',
          message: 'Organization details updated in local storage.',
        });
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Settings Saved Locally',
          message: 'Organization details updated in local storage cache.',
        });
      }
    } catch (err) {
      setStatusModal({
        isOpen: true,
        type: 'failed',
        title: 'Save Failed',
        message: 'Could not sync settings to database. Local fallback applied.',
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
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Signatories Matrix Saved!',
          message: 'Official signatories and authority matrix saved and synced successfully.',
        });
      } else {
        setNotification({
          title: 'Signatories Saved Locally',
          message: 'Default authority matrix updated in local storage.',
        });
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Signatories Saved Locally',
          message: 'Default authority matrix updated in local storage cache.',
        });
      }
    } catch (err) {
      setStatusModal({
        isOpen: true,
        type: 'failed',
        title: 'Save Failed',
        message: 'Failed to update signatories matrix.',
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
        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Profile & Password Updated!',
          message: 'Admin account profile, credentials, and password updated successfully.',
        });
      } else {
        setStatusModal({
          isOpen: true,
          type: 'failed',
          title: 'Profile Update Notice',
          message: data.error || 'Profile details updated locally.',
        });
      }
    } catch (err) {
      setStatusModal({
        isOpen: true,
        type: 'failed',
        title: 'Profile Save Error',
        message: 'Could not update admin profile details.',
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
                    <strong>COA Standard Multi-Signatories:</strong> Sumusunod ang format na ito sa opisyal na COA/NFTI template. Puwede kang maglagay ng multiple positions gamit ang slash (<code className="bg-white px-1.5 py-0.5 rounded border border-emerald-300 font-bold">/</code>) o bagong linya.
                  </span>
                </div>

                {/* Section 1: Certified Correct by (Inventory Committee) */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="border-b border-slate-200/80 pb-2 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                        1. Certified Correct by (Inventory Committee)
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Naglalaman ng 2 Committee Members at 1 Chairperson para sa physical inventory verification.
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      3 Committee Columns
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Member 1 */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Member 1 (e.g. Supply Officer)
                      </span>
                      <input
                        type="text"
                        value={signatories.member1Name || ''}
                        onChange={(e) => setSignatories({ ...signatories, member1Name: e.target.value })}
                        placeholder="e.g. MONALIZA A. RAQUIÑO"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                      />
                      <input
                        type="text"
                        value={signatories.member1Title || ''}
                        onChange={(e) => setSignatories({ ...signatories, member1Title: e.target.value })}
                        placeholder="Member, NFTI Inventory Committee / Supply Officer, NFTI"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600"
                      />
                    </div>

                    {/* Member 2 */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Member 2 (e.g. Budget Officer)
                      </span>
                      <input
                        type="text"
                        value={signatories.member2Name || ''}
                        onChange={(e) => setSignatories({ ...signatories, member2Name: e.target.value })}
                        placeholder="e.g. DIONICIA A. BIDES"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                      />
                      <input
                        type="text"
                        value={signatories.member2Title || ''}
                        onChange={(e) => setSignatories({ ...signatories, member2Title: e.target.value })}
                        placeholder="Member, NFTI Inventory Committee / Budget Officer, NFTI"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600"
                      />
                    </div>

                    {/* Chairperson */}
                    <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Chairperson (Certified Correct by)
                      </span>
                      <input
                        type="text"
                        value={signatories.certifiedCorrectByName || ''}
                        onChange={(e) => setSignatories({ ...signatories, certifiedCorrectByName: e.target.value })}
                        placeholder="e.g. ENGR. DOSMEDO G. TABRILLA, MPSA"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                      />
                      <input
                        type="text"
                        value={signatories.certifiedCorrectByTitle || ''}
                        onChange={(e) => setSignatories({ ...signatories, certifiedCorrectByTitle: e.target.value })}
                        placeholder="Chairperson, NFTI Inventory Committee / OIC, Admin, NFTI"
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Section 2: Approved by */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      2. Approved by:
                    </span>
                    <input
                      type="text"
                      value={signatories.approvedByName || ''}
                      onChange={(e) => setSignatories({ ...signatories, approvedByName: e.target.value })}
                      placeholder="e.g. FCSUPT BELINDA B. OCHAVE"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                    />
                    <input
                      type="text"
                      value={signatories.approvedByTitle || ''}
                      onChange={(e) => setSignatories({ ...signatories, approvedByTitle: e.target.value })}
                      placeholder="e.g. Director, NFTI"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600"
                    />
                  </div>

                  {/* Section 3: Verified by */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      3. Verified by (State Auditor / COA Representative):
                    </span>
                    <input
                      type="text"
                      value={signatories.verifiedByName || ''}
                      onChange={(e) => setSignatories({ ...signatories, verifiedByName: e.target.value })}
                      placeholder="e.g. JAMES CHRISTOPHER G. BANAAG"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                    />
                    <input
                      type="text"
                      value={signatories.verifiedByTitle || ''}
                      onChange={(e) => setSignatories({ ...signatories, verifiedByTitle: e.target.value })}
                      placeholder="e.g. State Auditor IV / Audit Team Leader, RO IVA"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600"
                    />
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

          {/* Success / Failed Lottie Animation Modal */}
          {statusModal.isOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-4 animate-scaleUp">
                <div className="w-48 h-48 relative flex items-center justify-center overflow-hidden">
                  <iframe
                    src={
                      statusModal.type === 'success'
                        ? 'https://lottie.host/embed/c055864c-7caf-4a4e-b46c-c4b68c43f176/8DsuM6pVVZ.lottie'
                        : 'https://lottie.host/embed/4f79ee55-567f-4f30-9426-da61049a7625/VkYoDvJKgF.lottie'
                    }
                    className="w-full h-full border-none pointer-events-none scale-125"
                    title="Status Animation"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">{statusModal.title}</h3>
                  <p className="text-xs text-slate-500">{statusModal.message}</p>
                </div>
                <button
                  onClick={() => setStatusModal({ ...statusModal, isOpen: false })}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all cursor-pointer ${
                    statusModal.type === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
