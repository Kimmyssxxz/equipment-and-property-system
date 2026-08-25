'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import {
  Package,
  Search,
  Plus,
  Edit3,
  Trash2,
  Download,
  Eye,
  UserCheck,
  Building2,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  X,
  Calendar,
  Layers,
  Printer,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Tag,
  MapPin,
  FileText,
  Database,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
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

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assignmentsHistory, setAssignmentsHistory] = useState([]);
  const [counts, setCounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [officeFilter, setOfficeFilter] = useState('ALL');
  const [personnelFilter, setPersonnelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [selectedPropertyForDetails, setSelectedPropertyForDetails] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    propertyNumber: '',
    article: '',
    description: '',
    categoryId: '',
    unit: 'unit',
    unitValue: '',
    quantityPerCard: '1',
    acquisitionDate: '',
    poNumber: '',
    poDate: '',
    serialNumber: '',
    remarks: '',
    status: 'ACTIVE',
  });

  const [notification, setNotification] = useState(null);
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Live Database Fetch
  const loadData = async () => {
    setLoading(true);
    setIsTableMissing(false);
    try {
      setAssignmentsHistory(StorageManager.getAssignmentsHistory() || []);
      setCounts(StorageManager.getPhysicalCounts() || []);

      const [propRes, catRes, offRes, empRes] = await Promise.all([
        fetch('/api/properties', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
        fetch('/api/offices', { cache: 'no-store' }),
        fetch('/api/personnel', { cache: 'no-store' }),
      ]);

      const propData = await parseJsonSafely(propRes);
      const catData = await parseJsonSafely(catRes);
      const offData = await parseJsonSafely(offRes);
      const empData = await parseJsonSafely(empRes);

      if (catData.success && Array.isArray(catData.categories)) {
        setCategories(catData.categories);
        StorageManager.saveCategories(catData.categories);
      } else {
        setCategories(StorageManager.getCategories() || []);
      }

      if (offData.success && Array.isArray(offData.offices)) {
        setOffices(offData.offices);
        StorageManager.saveOffices(offData.offices);
      } else {
        setOffices(StorageManager.getOffices() || []);
      }

      if (empData.success && Array.isArray(empData.employees)) {
        setEmployees(empData.employees);
        StorageManager.saveEmployees(empData.employees);
      } else {
        setEmployees(StorageManager.getEmployees() || []);
      }

      if (propData.tableMissing) {
        setIsTableMissing(true);
        setProperties([]);
      } else if (propData.success && Array.isArray(propData.properties)) {
        setProperties(propData.properties);
        StorageManager.saveProperties(propData.properties);
      } else {
        setProperties(StorageManager.getProperties() || []);
      }
    } catch (e) {
      console.error('Failed to load properties:', e);
      setProperties(StorageManager.getProperties() || []);
      setCategories(StorageManager.getCategories() || []);
      setOffices(StorageManager.getOffices() || []);
      setEmployees(StorageManager.getEmployees() || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter, officeFilter, personnelFilter, statusFilter, sortBy, pageSize]);

  // Filtering & Sorting
  const filteredProperties = properties
    .filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (p.propertyNumber || '').toLowerCase().includes(q) ||
        (p.article || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q) ||
        (p.serialNumber && p.serialNumber.toLowerCase().includes(q)) ||
        (p.poNumber && p.poNumber.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q));

      const matchesCategory = categoryFilter === 'ALL' || p.categoryId === categoryFilter;
      const matchesOffice = officeFilter === 'ALL' || p.officeId === officeFilter;
      const matchesPersonnel =
        personnelFilter === 'ALL' || p.accountablePersonId === personnelFilter;
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

      return matchesSearch && matchesCategory && matchesOffice && matchesPersonnel && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      if (sortBy === 'prop-asc') return (a.propertyNumber || '').localeCompare(b.propertyNumber || '');
      if (sortBy === 'article-asc') return (a.article || '').localeCompare(b.article || '');
      if (sortBy === 'val-desc') return (b.unitValue || 0) - (a.unitValue || 0);
      if (sortBy === 'val-asc') return (a.unitValue || 0) - (b.unitValue || 0);
      return 0;
    });

  // Pagination Calculations
  const totalItems = filteredProperties.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedProperties = filteredProperties.slice(startIndex, endIndex);

  const parseVal = (val) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Statistics KPI
  const totalValuation = properties.reduce(
    (sum, p) => sum + parseVal(p.unitValue) * (p.quantityPerCard || 1),
    0
  );
  const activePropsCount = properties.filter((p) => p.status === 'ACTIVE').length;
  const ppeCount = properties.filter((p) => parseVal(p.unitValue) >= 50000).length;
  const semiExpCount = properties.filter((p) => parseVal(p.unitValue) < 50000).length;

  // Helper Lookups
  const getEmployeeName = (id) => {
    if (!id || id === 'UNASSIGNED') return 'Unassigned / Common Area (No Head Officer)';
    const found = employees.find((e) => e.id === id || e.employeeId === id);
    return found ? `${found.name} (${found.position})` : 'Unassigned / Common Area';
  };
  const getOfficeName = (id) => {
    const found = offices.find((o) => o.id === id || o.code === id);
    return found ? `${found.name} (${found.code})` : 'Unassigned';
  };
  const getCategoryName = (id) => {
    const found = categories.find((c) => c.id === id || c.code === id);
    return found ? `${found.name} (${found.code})` : 'General Equipment';
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingProperty(null);
    setFormError('');
    const today = new Date().toISOString().slice(0, 10);
    const generatedPropNo = `PROP-${today.replace(/-/g, '')}-${String(properties.length + 1).padStart(4, '0')}`;
    setFormData({
      propertyNumber: generatedPropNo,
      article: '',
      description: '',
      categoryId: categories[0]?.id || '',
      unit: 'unit',
      unitValue: '',
      quantityPerCard: '1',
      acquisitionDate: today,
      poNumber: '',
      poDate: today,
      serialNumber: '',
      remarks: '',
      status: 'ACTIVE',
    });
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (p) => {
    setEditingProperty(p);
    setFormError('');
    setFormData({
      propertyNumber: p.propertyNumber,
      article: p.article,
      description: p.description || '',
      categoryId: p.categoryId || categories[0]?.id || '',
      unit: p.unit || 'unit',
      unitValue: p.unitValue?.toString() || '',
      quantityPerCard: (p.quantityPerCard || 1).toString(),
      acquisitionDate: p.acquisitionDate ? p.acquisitionDate.slice(0, 10) : '',
      poNumber: p.poNumber || '',
      poDate: p.poDate ? p.poDate.slice(0, 10) : '',
      serialNumber: p.serialNumber || '',
      remarks: p.remarks || '',
      status: p.status || 'ACTIVE',
    });
    setIsAddModalOpen(true);
  };

  // Save Property Form
  const handleSaveProperty = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.propertyNumber.trim() || !formData.article.trim()) {
      setFormError('Property Number and Article / Item Name are required fields.');
      return;
    }

    if (!formData.categoryId) {
      setFormError('Please select a Property Category.');
      return;
    }

    setIsSaving(true);
    try {
      const isEditing = Boolean(editingProperty);
      const url = '/api/properties';
      const method = isEditing ? 'PUT' : 'POST';
      const payload = {
        ...(editingProperty ? { id: editingProperty.id } : {}),
        propertyNumber: formData.propertyNumber.trim(),
        article: formData.article.trim(),
        description: formData.description ? formData.description.trim() : formData.article.trim(),
        categoryId: formData.categoryId,
        unit: formData.unit ? formData.unit.trim() : 'unit',
        unitValue: parseFloat(formData.unitValue) || 0.0,
        quantityPerCard: parseInt(formData.quantityPerCard, 10) || 1,
        acquisitionDate: formData.acquisitionDate || new Date().toISOString(),
        poNumber: formData.poNumber ? formData.poNumber.trim() : '',
        poDate: formData.poDate || null,
        serialNumber: formData.serialNumber ? formData.serialNumber.trim() : '',
        remarks: formData.remarks ? formData.remarks.trim() : '',
        status: formData.status,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonSafely(res);

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save property in database.');
      }

      await loadData();
      setIsAddModalOpen(false);

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: isEditing ? 'Property Record Updated!' : 'Property Registered Successfully!',
        message: `Property "${payload.propertyNumber} (${payload.article})" was saved successfully to the system registry.`,
      });

      setNotification({
        title: isEditing ? 'Property Record Updated' : 'New Property Registered',
        message: `Property "${payload.propertyNumber} (${payload.article})" was saved successfully.`,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving the property.');
      setStatusModal({
        isOpen: true,
        type: 'failed',
        title: 'Failed to Save Property!',
        message: err.message || 'An error occurred while attempting to save the property record.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Property
  const handleDeleteProperty = async (p) => {
    if (confirm(`Are you sure you want to delete property "${p.propertyNumber} - ${p.article}"?`)) {
      try {
        const res = await fetch(`/api/properties?id=${encodeURIComponent(p.id)}`, {
          method: 'DELETE',
        });
        const data = await parseJsonSafely(res);

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to delete property.');
        }

        await loadData();

        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Property Successfully Removed!',
          message: `Property record "${p.propertyNumber} (${p.article})" was deleted from system database.`,
        });

        setNotification({
          title: 'Property Removed',
          message: `Property record "${p.propertyNumber}" was deleted.`,
        });
        setTimeout(() => setNotification(null), 5000);
      } catch (err) {
        setStatusModal({
          isOpen: true,
          type: 'failed',
          title: 'Delete Operation Failed!',
          message: err.message || 'An error occurred while attempting to delete the property.',
        });
      }
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredProperties.length === 0) return;
    const headers = [
      'PropertyNumber',
      'SerialNumber',
      'Article',
      'Description',
      'Category',
      'Unit',
      'UnitValue',
      'AccountablePerson',
      'Office',
      'PONumber',
      'AcquisitionDate',
      'Location',
      'Status',
    ];
    const rows = filteredProperties.map((p) => [
      `"${p.propertyNumber}"`,
      `"${(p.serialNumber || '').replace(/"/g, '""')}"`,
      `"${(p.article || '').replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${getCategoryName(p.categoryId)}"`,
      `"${p.unit || 'unit'}"`,
      p.unitValue || 0,
      `"${getEmployeeName(p.accountablePersonId)}"`,
      `"${getOfficeName(p.officeId)}"`,
      `"${p.poNumber || ''}"`,
      `"${p.acquisitionDate || ''}"`,
      `"${p.location || ''}"`,
      `"${p.status}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `properties_registry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyPropertiesSql = async () => {
    const sql = `-- Run this in SQL Editor:
CREATE TABLE IF NOT EXISTS "properties" (
  "id" TEXT PRIMARY KEY DEFAULT ('prop_' || substr(md5(random()::text), 1, 12)),
  "propertyNumber" TEXT UNIQUE NOT NULL,
  "article" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL REFERENCES "property_categories"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "unit" TEXT DEFAULT 'unit' NOT NULL,
  "unitValue" DOUBLE PRECISION DEFAULT 0.0 NOT NULL,
  "quantityPerCard" INTEGER DEFAULT 1 NOT NULL,
  "acquisitionDate" TIMESTAMP WITH TIME ZONE,
  "poNumber" TEXT,
  "poDate" TIMESTAMP WITH TIME ZONE,
  "serialNumber" TEXT,
  "location" TEXT,
  "remarks" TEXT,
  "status" TEXT DEFAULT 'ACTIVE' NOT NULL,
  "accountablePersonId" TEXT REFERENCES "employees"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "officeId" TEXT REFERENCES "offices"("id") ON UPDATE CASCADE ON DELETE SET NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;

ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to properties" ON "properties";
CREATE POLICY "Allow full access to properties" ON "properties" FOR ALL USING (true) WITH CHECK (true);`;

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
          <Navbar pageTitle="Properties & Asset Registry" icon={Package} />

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
                className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
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
                    Database Table `properties` Not Found
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    The database is connected, but the <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">properties</code> table has not been created yet. Copy and run the SQL below in your SQL Editor.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={copyPropertiesSql}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'SQL Copied!' : 'Copy Properties SQL'}</span>
                </button>
              </div>
            </div>
          )}

          {/* KPI Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Total Properties */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Assets
                </span>
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5">
                {properties.length}{' '}
                <span className="text-xs font-normal text-slate-500">Items</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-700 font-bold">
                  Database Live
                </span>
              </div>
            </div>

            {/* Card 2: Total Valuation */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Asset Value
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xl font-black text-slate-900 mt-1.5 truncate">
                ₱{totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                Philippine Peso (PHP)
              </span>
            </div>

            {/* Card 3: RPCPPE (High Value >= 50k) */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  RPCPPE (≥ ₱50k)
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5">
                {ppeCount}{' '}
                <span className="text-xs font-normal text-slate-500">PPE Cards</span>
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                Plant & Equipment
              </span>
            </div>

            {/* Card 4: RPCSP (Semi-Expendable < 50k) */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  RPCSP (&lt; ₱50k)
                </span>
                <Tag className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5">
                {semiExpCount}{' '}
                <span className="text-xs font-normal text-slate-500">Semi-Exp.</span>
              </p>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                {activePropsCount} Active In-Service
              </span>
            </div>
          </div>

          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-xs p-4 rounded-2xl shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
                  Government Property Registry
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-700" />
                  Database Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage, assign, and track Property, Plant and Equipment (PPE) cards
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                title="Refresh properties from database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Register New Property</span>
              </button>
            </div>
          </div>

          {/* Search and Advanced Filters */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            {/* Search Bar */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search property number, article, description, PO number..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
              />
            </div>

            {/* Filter Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              {/* Category Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Deploying Area Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Deploying Area
                </label>
                <select
                  value={officeFilter}
                  onChange={(e) => setOfficeFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Deploying Areas</option>
                  {offices.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Personnel Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Accountable Officer
                </label>
                <select
                  value={personnelFilter}
                  onChange={(e) => setPersonnelFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Personnel</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} ({e.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="UNDER_REPAIR">UNDER REPAIR</option>
                  <option value="UNSERVICEABLE">UNSERVICEABLE</option>
                  <option value="CONDEMNED">CONDEMNED</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="newest">Newest Added</option>
                  <option value="oldest">Oldest Added</option>
                  <option value="prop-asc">Property No (A-Z)</option>
                  <option value="article-asc">Article (A-Z)</option>
                  <option value="val-desc">Highest Value</option>
                  <option value="val-asc">Lowest Value</option>
                </select>
              </div>
            </div>
          </div>

          {/* Properties Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Registered Properties & Equipment Cards
                </h3>
                <p className="text-xs text-slate-400">
                  Showing {totalItems > 0 ? startIndex + 1 : 0} to {endIndex} of {totalItems} items
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  {[5, 10, 20, 30, 50].map((opt) => (
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
                    <th className="py-3.5 px-4">Property Number & Article</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Accountable Custodian</th>
                    <th className="py-3.5 px-4">Assigned Department</th>
                    <th className="py-3.5 px-4">Unit Value (PHP)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse border-b border-slate-100">
                        <td className="py-4 px-4">
                          <div className="h-4 w-32 bg-slate-200/80 rounded-lg mb-1.5"></div>
                          <div className="h-3 w-48 bg-slate-100 rounded-md"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-28 bg-slate-200/80 rounded-lg"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-36 bg-slate-200/80 rounded-lg"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-32 bg-slate-200/80 rounded-lg"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-24 bg-slate-200/80 rounded-lg"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-5 w-20 bg-slate-200/80 rounded-full"></div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="h-7 w-20 bg-slate-200/80 rounded-xl ml-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : paginatedProperties.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                          <div className="w-14 h-14 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                            <Package className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {search ? 'No properties matched your search' : 'No Properties in Database Yet'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                              {search
                                ? `No items matched "${search}". Try resetting the search filters.`
                                : categories.length === 0
                                ? 'No categories found. Please create a category first in Categories module.'
                                : 'Your asset directory is clean and ready. Register your first property or equipment item to get started.'}
                            </p>
                          </div>
                          {!search && (
                            <button
                              onClick={openCreateModal}
                              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer mt-2"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Register First Property</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedProperties.map((p) => {
                      const isHighValue = parseVal(p.unitValue) >= 50000;
                      const activeAsgn = assignmentsHistory.find((a) => a.propertyId === p.id && a.isActive !== false);
                      const custodianName = activeAsgn?.employeeName || getEmployeeName(p.accountablePersonId);
                      const officeName = activeAsgn?.officeName || getOfficeName(p.officeId);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* Property Number & Article */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                              <Package className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{p.article}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 pl-5.5 flex-wrap">
                              <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                                {p.propertyNumber}
                              </span>
                              {p.serialNumber && (
                                <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200" title={`Serial Number: ${p.serialNumber}`}>
                                  SERIAL NUMBER: {p.serialNumber}
                                </span>
                              )}

                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {getCategoryName(p.categoryId)}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {isHighValue ? 'RPCPPE Item' : 'RPCSP Item'}
                            </div>
                          </td>

                          {/* Accountable Custodian */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{custodianName}</span>
                            </div>
                          </td>

                          {/* Office */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-700 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{officeName}</span>
                            </div>
                          </td>

                          {/* Unit Value */}
                          <td className="py-3.5 px-4">
                            <div className="font-black text-slate-900">
                              ₱{(p.unitValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <span className="text-[10px] text-slate-400">Qty: {p.quantityPerCard || 1} {p.unit || 'unit'}</span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                p.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : p.status === 'UNDER_REPAIR'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              ● {p.status || 'ACTIVE'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Details Modal Button */}
                              <button
                                onClick={() => setSelectedPropertyForDetails(p)}
                                title="View Property Card Details"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Button */}
                              <button
                                onClick={() => openEditModal(p)}
                                title="Edit Property Details"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => handleDeleteProperty(p)}
                                title="Delete Property Record"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-colors cursor-pointer"
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
                <strong className="text-slate-900 font-bold">{totalItems}</strong> items
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

      {/* ================= MODAL: ADD / EDIT PROPERTY ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingProperty ? 'Edit Property Card' : 'Register New Property / Equipment'}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    {editingProperty ? `Property No: ${editingProperty.propertyNumber}` : 'Record asset information in database'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => !isSaving && setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProperty} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Property Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Property Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.propertyNumber}
                    onChange={(e) => setFormData({ ...formData, propertyNumber: e.target.value })}
                    placeholder="e.g. PROP-2024-0001"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-emerald-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all uppercase"
                  />
                </div>

                {/* Serial Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Serial Number (S/N)
                  </label>
                  <input
                    type="text"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    placeholder="e.g. SN-98124019"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all uppercase"
                  />
                </div>

                {/* Property Category */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Property Category *
                  </label>
                  {categories.length === 0 ? (
                    <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      No categories found.{' '}
                      <Link href="/categories" className="underline font-bold text-amber-900">
                        Create category first
                      </Link>
                      .
                    </div>
                  ) : (
                    <select
                      value={formData.categoryId}
                      required
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Article Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Article / Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.article}
                    onChange={(e) => setFormData({ ...formData, article: e.target.value })}
                    placeholder="e.g. Desktop Computer Workstation, Ergonomic Office Chair"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Technical Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Detailed Specifications / Serial Number / Model
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brand: Dell, Model: OptiPlex 7090, Processor: Intel Core i7..."
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Unit Cost */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit Value (Acquisition Cost in PHP) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.unitValue}
                    onChange={(e) => setFormData({ ...formData, unitValue: e.target.value })}
                    placeholder="e.g. 45000.00"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Unit of Measure */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Unit of Measure
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="e.g. unit, set, piece, lot"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Acquisition Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Acquisition Date
                  </label>
                  <input
                    type="date"
                    value={formData.acquisitionDate}
                    onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* PO Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Purchase Order (PO) Number
                  </label>
                  <input
                    type="text"
                    value={formData.poNumber}
                    onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                    placeholder="e.g. PO-2024-0012"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Operational Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="ACTIVE">ACTIVE (In Service)</option>
                    <option value="UNDER_REPAIR">UNDER REPAIR</option>
                    <option value="UNSERVICEABLE">UNSERVICEABLE</option>
                    <option value="CONDEMNED">CONDEMNED</option>
                  </select>
                </div>

                {/* Remarks */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Remarks / Property Card Annotation
                  </label>
                  <input
                    type="text"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="e.g. Warranty until 2027, complete with accessories"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsAddModalOpen(false)}
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
                  <span>{isSaving ? 'Saving...' : editingProperty ? 'Update Property' : 'Save Property'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PROPERTY DETAILS & HISTORY ================= */}
      {selectedPropertyForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-3xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Property Accountability Card
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Property No: {selectedPropertyForDetails.propertyNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPropertyForDetails(null)}
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Section 1: Property Information */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  1. Property Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400">Property Number</span>
                    <p className="font-mono font-bold text-emerald-800">{selectedPropertyForDetails.propertyNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Serial Number</span>
                    <p className="font-mono font-bold text-slate-900">{selectedPropertyForDetails.serialNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Article</span>
                    <p className="font-bold text-slate-900">{selectedPropertyForDetails.article}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Category</span>
                    <p className="font-semibold text-slate-800">{getCategoryName(selectedPropertyForDetails.categoryId)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Unit Value</span>
                    <p className="font-black text-slate-900">₱{(selectedPropertyForDetails.unitValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Unit of Measure</span>
                    <p className="font-semibold text-slate-800">{selectedPropertyForDetails.unit || 'unit'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Acquisition Date</span>
                    <p className="font-semibold text-slate-800">{selectedPropertyForDetails.acquisitionDate ? new Date(selectedPropertyForDetails.acquisitionDate).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">PO Reference</span>
                    <p className="font-semibold text-slate-800">{selectedPropertyForDetails.poNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Status</span>
                    <p className="font-bold text-emerald-700">{selectedPropertyForDetails.status}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-[10px] text-slate-400">Technical Specs</span>
                    <p className="text-slate-700 whitespace-pre-line mt-0.5">{selectedPropertyForDetails.description || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Accountability Information */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  2. Accountability Information
                </h4>
                <div className="grid grid-cols-2 gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200">
                  <div>
                    <span className="text-[10px] text-slate-500">Accountable Officer</span>
                    <p className="font-bold text-slate-900 text-sm">{getEmployeeName(selectedPropertyForDetails.accountablePersonId)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Assigned Deploying Area</span>
                    <p className="font-bold text-slate-900 text-sm">{getOfficeName(selectedPropertyForDetails.officeId)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => setSelectedPropertyForDetails(null)}
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
