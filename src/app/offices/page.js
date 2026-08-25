'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import {
  Building2,
  Search,
  Plus,
  Edit3,
  Trash2,
  Eye,
  User,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Package,
  ArrowUpRight,
  Database,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Layers,
  Users,
} from 'lucide-react';
import { StorageManager } from '@/lib/storage';

async function parseJsonSafely(res) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return { error: `Server returned non-JSON response (${res.status})` };
  }
}

export default function OfficesPage() {
  const [offices, setOffices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [properties, setProperties] = useState([]);
  const [counts, setCounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffice, setEditingOffice] = useState(null);
  const [selectedOfficeForDetails, setSelectedOfficeForDetails] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [isCustomHead, setIsCustomHead] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    head: '',
    email: '',
    phone: '',
    floor: '',
    notes: '',
    status: 'ACTIVE',
  });

  const [notification, setNotification] = useState(null);
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Fetch live offices from the database
  const loadData = async () => {
    setLoading(true);
    setIsTableMissing(false);
    try {
      // Local metadata for calculation
      setCounts(StorageManager.getPhysicalCounts() || []);

      const [offRes, empRes, propRes] = await Promise.all([
        fetch('/api/offices', { cache: 'no-store' }),
        fetch('/api/personnel', { cache: 'no-store' }),
        fetch('/api/properties', { cache: 'no-store' }),
      ]);
      const offData = await parseJsonSafely(offRes);
      const empData = await parseJsonSafely(empRes);
      const propData = await parseJsonSafely(propRes);

      if (propData.success && Array.isArray(propData.properties)) {
        setProperties(propData.properties);
        StorageManager.saveProperties(propData.properties);
      } else {
        setProperties(StorageManager.getProperties() || []);
      }

      if (empData.success && Array.isArray(empData.employees)) {
        setEmployees(empData.employees);
        StorageManager.saveEmployees(empData.employees);
      } else {
        setEmployees(StorageManager.getEmployees() || []);
      }

      if (offData.tableMissing) {
        setIsTableMissing(true);
        setOffices([]);
      } else if (offData.success && Array.isArray(offData.offices)) {
        setOffices(offData.offices);
        // Sync with local cache
        try {
          StorageManager.saveOffices(offData.offices);
        } catch (e) {
          // ignore cache error
        }
      } else {
        // Fallback to local storage if API error
        const localOffices = StorageManager.getOffices();
        setOffices(localOffices || []);
      }
    } catch (err) {
      console.error('Failed to load offices from database:', err);
      const localOffices = StorageManager.getOffices();
      setOffices(localOffices || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortBy, pageSize]);

  // Filtering
  const filteredOffices = offices
    .filter((off) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (off.name || '').toLowerCase().includes(q) ||
        (off.code || '').toLowerCase().includes(q) ||
        (off.head || '').toLowerCase().includes(q) ||
        (off.email && off.email.toLowerCase().includes(q)) ||
        (off.floor && off.floor.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || off.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'code-asc') return (a.code || '').localeCompare(b.code || '');
      if (sortBy === 'head-asc') return (a.head || '').localeCompare(b.head || '');
      return 0;
    });

  // Pagination
  const totalItems = filteredOffices.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedOffices = filteredOffices.slice(startIndex, endIndex);

  // Statistics KPI
  const activeOfficesCount = offices.filter((o) => o.status === 'ACTIVE').length;
  const totalAllocatedProperties = properties.filter((p) => p.officeId).length;
  const totalAllocatedValue = properties.reduce(
    (sum, p) => sum + (p.unitValue || 0) * (p.quantityPerCard || 1),
    0
  );

  // Calculate specific office statistics
  const getOfficeStats = (officeId) => {
    const safeProps = properties || [];
    const safeEmployees = employees || [];
    const safeCounts = counts || [];

    const officeProps = safeProps.filter((p) => p.officeId === officeId);
    const totalVal = officeProps.reduce(
      (sum, p) => sum + (p.unitValue || 0) * (p.quantityPerCard || 1),
      0
    );
    const officeEmployees = safeEmployees.filter((e) => e.officeId === officeId);
    const officeCounts = safeCounts.filter((c) => {
      const prop = safeProps.find((p) => p.id === c.propertyId);
      return prop?.officeId === officeId;
    });

    const countedCount = officeCounts.filter((c) => c.status === 'OK').length;
    const discrepanciesCount = officeCounts.filter((c) => c.status === 'SHORTAGE' || c.status === 'OVERAGE').length;

    return {
      propertiesCount: officeProps.length,
      totalValue: totalVal,
      personnelCount: officeEmployees.length,
      assignedProperties: officeProps,
      properties: officeProps,
      employees: officeEmployees,
      countedCount,
      discrepanciesCount,
    };
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingOffice(null);
    setFormError('');
    setIsCustomHead(false);
    setFormData({
      code: `OFF-0${offices.length + 1}`,
      name: '',
      head: employees.length > 0 ? employees[0].name : '',
      email: employees.length > 0 && employees[0].email ? employees[0].email : '',
      phone: employees.length > 0 && employees[0].phone ? employees[0].phone : '',
      floor: 'Main Building',
      notes: '',
      status: 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (off) => {
    setEditingOffice(off);
    setFormError('');
    const matchesPersonnel = employees.some(
      (e) => (e.name || '').toLowerCase() === (off.head || '').toLowerCase()
    );
    setIsCustomHead(!matchesPersonnel && Boolean(off.head));
    setFormData({
      code: off.code,
      name: off.name,
      head: off.head,
      email: off.email || '',
      phone: off.phone || '',
      floor: off.floor || '',
      notes: off.notes || '',
      status: off.status || 'ACTIVE',
    });
    setIsModalOpen(true);
  };

  // Save Office to Database
  const handleSaveOffice = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.code.trim() || !formData.head.trim()) {
      setFormError('Please fill in Office Code, Office Name, and Head of Office.');
      return;
    }

    setIsSaving(true);
    try {
      const isEditing = Boolean(editingOffice);
      const url = '/api/offices';
      const method = isEditing ? 'PUT' : 'POST';
      const payload = {
        ...(editingOffice ? { id: editingOffice.id } : {}),
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        head: formData.head.trim(),
        email: formData.email ? formData.email.trim() : '',
        phone: formData.phone ? formData.phone.trim() : '',
        floor: formData.floor ? formData.floor.trim() : '',
        notes: formData.notes ? formData.notes.trim() : '',
        status: formData.status,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonSafely(res);

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save office in database.');
      }

      await loadData();
      setIsModalOpen(false);

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: isEditing ? 'Office Details Updated!' : 'Office Registered Successfully!',
        message: `Office "${payload.name}" (${payload.code}) was saved successfully.`,
      });

      setNotification({
        title: isEditing ? 'Office Details Updated' : 'Office Registered',
        message: `Office "${payload.name}" (${payload.code}) was saved successfully.`,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving the office.');
      setStatusModal({
        isOpen: true,
        type: 'failed',
        title: 'Failed to Save Office!',
        message: err.message || 'An error occurred while attempting to save the office record.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Office from Database
  const handleDeleteOffice = async (off) => {
    const stats = getOfficeStats(off.id);
    if (stats.personnelCount > 0 || stats.propertiesCount > 0) {
      setStatusModal({
        isOpen: true,
        type: 'failed',
        title: 'Cannot Delete Office!',
        message: `Cannot delete office "${off.name}" because it currently has ${stats.personnelCount} staff member(s) and ${stats.propertiesCount} assigned property item(s). Please reassign them first.`,
      });
      return;
    }

    if (confirm(`Are you sure you want to delete office "${off.name}" (${off.code})?`)) {
      try {
        const res = await fetch(`/api/offices?id=${encodeURIComponent(off.id)}`, {
          method: 'DELETE',
        });
        const data = await parseJsonSafely(res);

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to delete office.');
        }

        await loadData();

        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Office Removed!',
          message: `Office "${off.name}" (${off.code}) was removed successfully.`,
        });

        setNotification({
          title: 'Office Removed',
          message: `Office "${off.name}" was removed successfully.`,
        });
        setTimeout(() => setNotification(null), 5000);
      } catch (err) {
        setStatusModal({
          isOpen: true,
          type: 'failed',
          title: 'Delete Operation Failed!',
          message: err.message || 'An error occurred while attempting to delete the office.',
        });
      }
    }
  };

  const copyOfficesSql = async () => {
    const sql = `-- Run this in SQL Editor:
CREATE TABLE IF NOT EXISTS "offices" (
  "id" TEXT PRIMARY KEY DEFAULT ('off_' || substr(md5(random()::text), 1, 12)),
  "code" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "head" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "floor" TEXT,
  "notes" TEXT,
  "status" TEXT DEFAULT 'ACTIVE' NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE "offices" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to offices" ON "offices";
CREATE POLICY "Allow full access to offices" ON "offices" FOR ALL USING (true) WITH CHECK (true);`;

    await navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 4000);
  };

  return (
    <div className="min-h-screen p-2.5 sm:p-6 lg:p-8 flex justify-center items-start">
      <div className="w-full max-w-[1540px] flex gap-5 lg:gap-6 items-start">
        {/* Floating Sidebar */}
        <Sidebar totalItems={properties.length} />

        {/* Floating Main Content Container */}
        <main className="flex-1 min-w-0 bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl sm:rounded-[32px] shadow-2xl shadow-slate-900/10 p-4 sm:p-6 lg:p-8 flex flex-col space-y-5 sm:space-y-6 overflow-hidden">
          {/* Top Navbar */}
          <Navbar pageTitle="Deploying Area Directory" icon={Building2} />

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
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Banner: Table missing in Database */}
          {isTableMissing && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                    Database Table `offices` Not Found
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    The database is connected, but the <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">offices</code> table has not been created yet. Copy and run the SQL below in your SQL Editor.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={copyOfficesSql}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'SQL Copied!' : 'Copy Offices SQL'}</span>
                </button>
              </div>
            </div>
          )}

          {/* KPI Statistics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Card 1: Total Deploying Areas */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Deploying Areas
                </span>
                <Building2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5">
                {offices.length}{' '}
                <span className="text-xs font-normal text-slate-500">Areas</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-700 font-bold">
                  Active Database
                </span>
              </div>
            </div>

            {/* Card 2: Active Status */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Status
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5">
                {activeOfficesCount}{' '}
                <span className="text-xs font-normal text-slate-500">Active</span>
              </p>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                Operating Entities
              </span>
            </div>

            {/* Card 3: Staff & Properties */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Assigned Assets
                </span>
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5">
                {totalAllocatedProperties}{' '}
                <span className="text-xs font-normal text-slate-500">Units</span>
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                Distributed Inventory
              </span>
            </div>

            {/* Card 4: Total Portfolio Value */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Valuation
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-black text-slate-900 mt-1.5 truncate">
                ₱{totalAllocatedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                Philippine Peso (PHP)
              </span>
            </div>
          </div>

          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-xs p-4 rounded-2xl shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
                  Deploying Area Directory
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-700" />
                  Database Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage organizational deploying areas, building locations, area heads, and allocated equipment
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                title="Refresh deploying areas from database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Register New Deploying Area</span>
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search area name, code, head, floor, email..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Deploying Areas</option>
                <option value="INACTIVE">Inactive Deploying Areas</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="name-asc">Deploying Area Name (A - Z)</option>
                <option value="name-desc">Deploying Area Name (Z - A)</option>
                <option value="code-asc">Deploying Area Code (A - Z)</option>
                <option value="head-asc">Head of Area (A - Z)</option>
              </select>
            </div>
          </div>

          {/* Offices Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Deploying Area Directory
                </h3>
                <p className="text-xs text-slate-400">
                  Showing {totalItems > 0 ? startIndex + 1 : 0} to {endIndex} of {totalItems} registered deploying areas
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  {[5, 10, 20, 30].map((opt) => (
                    <option key={opt} value={opt}>
                      {opt} per page
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Deploying Area Name & Code</th>
                    <th className="py-3.5 px-4">Head of Area</th>
                    <th className="py-3.5 px-4">Location / Floor</th>
                    <th className="py-3.5 px-4">Assigned Assets</th>
                    <th className="py-3.5 px-4">Total Value</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse border-b border-slate-100">
                        <td className="py-4 px-4">
                          <div className="h-4 w-44 bg-slate-200/80 rounded-lg mb-1"></div>
                          <div className="h-3 w-16 bg-slate-100 rounded-md"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-32 bg-slate-200/80 rounded-lg"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-28 bg-slate-200/80 rounded-lg"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-6 w-20 bg-slate-200/80 rounded-full"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-24 bg-slate-200/80 rounded-lg"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-5 w-16 bg-slate-200/80 rounded-full"></div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="h-7 w-20 bg-slate-200/80 rounded-xl ml-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : paginatedOffices.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                          <div className="w-14 h-14 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                            <Building2 className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {search ? 'No deploying areas found' : 'No Deploying Areas in Database Yet'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                              {search
                                ? `No deploying areas matched your search term "${search}".`
                                : 'Your deploying area directory is clean and ready. Register your first deploying area or division to get started.'}
                            </p>
                          </div>
                          {!search && (
                            <button
                              onClick={openCreateModal}
                              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer mt-2"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Register First Deploying Area</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedOffices.map((off) => {
                      const stats = getOfficeStats(off.id);
                      return (
                        <tr key={off.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* Name & Code */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{off.name}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 pl-5.5">
                              <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                                {off.code}
                              </span>
                              {off.notes && (
                                <span className="text-[10px] text-slate-400 truncate max-w-xs">
                                  {off.notes}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Head of Office */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800 flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{off.head}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">Department Head</span>
                          </td>

                          {/* Location */}
                          <td className="py-3.5 px-4 text-slate-600">
                            <div className="flex items-center gap-1 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{off.floor || 'Not specified'}</span>
                            </div>
                            {off.phone && (
                              <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{off.phone}</span>
                              </div>
                            )}
                          </td>

                          {/* Properties Count */}
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => setSelectedOfficeForDetails(off)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Click to view assigned items"
                            >
                              <Package className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{stats.propertiesCount} Items</span>
                            </button>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {stats.personnelCount} Personnel
                            </div>
                          </td>

                          {/* Total Value */}
                          <td className="py-3.5 px-4">
                            <div className="font-black text-slate-900">
                              ₱{stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <span className="text-[10px] text-slate-400">Total Asset Allocation</span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                off.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              ● {off.status || 'ACTIVE'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedOfficeForDetails(off)}
                                title="View Office Properties & Details"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => openEditModal(off)}
                                title="Edit Office Details"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteOffice(off)}
                                title={
                                  stats.propertiesCount > 0 || stats.personnelCount > 0
                                    ? 'Cannot delete office with assigned items or personnel'
                                    : 'Delete Office'
                                }
                                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                  stats.propertiesCount > 0 || stats.personnelCount > 0
                                    ? 'bg-slate-50 text-slate-300 border-slate-100 hover:text-slate-400'
                                    : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border-slate-200'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="text-slate-600">
                Showing <strong className="text-slate-900 font-bold">{totalItems > 0 ? startIndex + 1 : 0}</strong> to{' '}
                <strong className="text-slate-900 font-bold">{endIndex}</strong> of{' '}
                <strong className="text-slate-900 font-bold">{totalItems}</strong> offices
              </div>

              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ================= MODAL: ADD / EDIT DEPLOYING AREA ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingOffice ? 'Edit Deploying Area Details' : 'Register New Deploying Area'}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    {editingOffice ? `Code: ${editingOffice.code}` : 'Define organizational area location and head custodian'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isSaving && setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveOffice} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deploying Area Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. AREA-01, LAB-01, SUPPLY-01"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-emerald-800 uppercase focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deploying Area Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Forensics Chemistry Laboratory"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Head of Deploying Area *
                    </label>
                    {employees.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomHead(!isCustomHead);
                          if (!isCustomHead) {
                            setFormData((prev) => ({ ...prev, head: '' }));
                          } else if (employees.length > 0) {
                            const firstEmp = employees[0];
                            setFormData((prev) => ({
                              ...prev,
                              head: firstEmp.name,
                              email: prev.email || firstEmp.email || '',
                              phone: prev.phone || firstEmp.phone || '',
                            }));
                          }
                        }}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
                      >
                        {isCustomHead ? '👥 Choose from Registered Personnel' : '✏️ Enter Custom Name'}
                      </button>
                    )}
                  </div>

                  {employees.length > 0 && !isCustomHead ? (
                    <select
                      value={formData.head}
                      required
                      onChange={(e) => {
                        const selectedName = e.target.value;
                        const matchedEmp = employees.find((emp) => emp.name === selectedName);
                        setFormData((prev) => ({
                          ...prev,
                          head: selectedName,
                          email: prev.email || (matchedEmp ? matchedEmp.email : '') || '',
                          phone: prev.phone || (matchedEmp ? matchedEmp.phone : '') || '',
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                    >
                      <option value="">-- Select Personnel as Area Head --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.name}>
                          {emp.name} — {emp.position} ({emp.employeeId})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <input
                        type="text"
                        required
                        value={formData.head}
                        onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                        placeholder="e.g. Elmer G. Dolotallas"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                      />
                      {employees.length === 0 && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          No personnel registered in database yet. You can type the name manually or{' '}
                          <Link href="/personnel" className="text-emerald-700 font-bold underline">
                            register personnel first
                          </Link>
                          .
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Location / Floor / Wing
                  </label>
                  <input
                    type="text"
                    value={formData.floor}
                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                    placeholder="e.g. Ground Floor, Main Wing"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Intercom / Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. Loc. 107, (02) 8123-4567"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g. supply@office.gov.ph"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Deploying Area Scope / Description
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Handles property custodianship and equipment distribution"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSaving ? 'Saving...' : editingOffice ? 'Update Deploying Area' : 'Save Deploying Area'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: OFFICE DETAILS & PROPERTY LISTING ================= */}
      {selectedOfficeForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {selectedOfficeForDetails.name}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Code: {selectedOfficeForDetails.code} • Head: {selectedOfficeForDetails.head}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOfficeForDetails(null)}
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Statistics Bar */}
              {(() => {
                const stats = getOfficeStats(selectedOfficeForDetails.id);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Total Properties</span>
                      <p className="text-lg font-black text-slate-900 mt-1">{stats.propertiesCount} Units</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Total Value</span>
                      <p className="text-lg font-black text-slate-900 mt-1">₱{stats.totalValue.toLocaleString()}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Staff Personnel</span>
                      <p className="text-lg font-black text-slate-900 mt-1">{stats.personnelCount} Members</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase">Counted</span>
                      <p className="text-lg font-black text-emerald-900 mt-1">{stats.countedCount} Units</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                      <span className="text-[10px] text-rose-700 font-bold uppercase">Discrepancies</span>
                      <p className="text-lg font-black text-rose-900 mt-1">{stats.discrepanciesCount} Items</p>
                    </div>
                  </div>
                );
              })()}

              {/* Office Properties Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Properties Installed / Assigned in this Deploying Area
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Property Number</th>
                        <th className="py-2.5 px-3">Article</th>
                        <th className="py-2.5 px-3">Accountable Custodian</th>
                        <th className="py-2.5 px-3">Value (₱)</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(getOfficeStats(selectedOfficeForDetails.id)?.properties || []).length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-slate-400">
                            No property equipment assigned to this deploying area yet.
                          </td>
                        </tr>
                      ) : (
                        (getOfficeStats(selectedOfficeForDetails.id)?.properties || []).map((p) => {
                          const custodian = employees.find((e) => e.id === p.accountablePersonId)?.name || 'Unassigned';
                          return (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-mono font-bold text-emerald-800">{p.propertyNumber}</td>
                              <td className="py-3 px-3 font-bold text-slate-900">{p.article}</td>
                              <td className="py-3 px-3 text-slate-700">{custodian}</td>
                              <td className="py-3 px-3 font-black text-slate-900">₱{(p.unitValue || 0).toLocaleString()}</td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setSelectedOfficeForDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOTTIE SUCCESS MODAL */}
      {statusModal.isOpen && statusModal.type === 'success' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-scaleUp">
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center overflow-hidden">
              <iframe
                src="https://lottie.host/embed/c055864c-7caf-4a4e-b46c-c4b68c43f176/8DsuM6pVVZ.lottie"
                className="w-full h-full border-none pointer-events-none"
                title="Success Animation"
              />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900">{statusModal.title || 'Action Successful!'}</h3>
              <p className="text-xs font-semibold text-slate-600 px-2 leading-relaxed">
                {statusModal.message}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setStatusModal({ isOpen: false, type: 'success', title: '', message: '' })}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-200 transition-all cursor-pointer"
              >
                Continue / Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOTTIE FAILED MODAL */}
      {statusModal.isOpen && statusModal.type === 'failed' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-scaleUp">
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center overflow-hidden">
              <iframe
                src="https://lottie.host/embed/4f79ee55-567f-4f30-9426-da61049a7625/VkYoDvJKgF.lottie"
                className="w-full h-full border-none pointer-events-none"
                title="Failed Animation"
              />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-rose-600">{statusModal.title || 'Operation Failed'}</h3>
              <p className="text-xs font-semibold text-slate-600 px-2 leading-relaxed">
                {statusModal.message}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setStatusModal({ isOpen: false, type: 'failed', title: '', message: '' })}
                className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-lg shadow-rose-200 transition-all cursor-pointer"
              >
                Close & Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
