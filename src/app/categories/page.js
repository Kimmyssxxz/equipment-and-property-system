'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import {
  Tag,
  Search,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Package,
  Layers,
  Building2,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  FileText,
  SlidersHorizontal,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Database,
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

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [properties, setProperties] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategoryForDetails, setSelectedCategoryForDetails] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  const [notification, setNotification] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setIsTableMissing(false);
    try {
      // 1. Fetch live categories from API
      const res = await fetch('/api/categories', { cache: 'no-store' });
      const data = await parseJsonSafely(res);

      if (data.tableMissing) {
        setIsTableMissing(true);
        setCategories([]);
      } else if (data.categories) {
        setCategories(data.categories);
      } else {
        setCategories([]);
      }

      // Load auxiliary storage data for relationships
      setProperties(StorageManager.getProperties() || []);
      setEmployees(StorageManager.getEmployees() || []);
      setOffices(StorageManager.getOffices() || []);
    } catch (e) {
      console.error('Failed to load categories:', e);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, pageSize]);

  // Statistics calculation for each category
  const getCategoryStats = (catId) => {
    const catProps = properties.filter((p) => p.categoryId === catId);
    const totalVal = catProps.reduce((sum, p) => sum + (p.unitValue || 0) * (p.quantityPerCard || 1), 0);
    const activeCount = catProps.filter((p) => p.status === 'ACTIVE').length;

    return {
      propertiesCount: catProps.length,
      totalValue: totalVal,
      activeCount,
      properties: catProps,
    };
  };

  // Overall Global Statistics
  const totalCategoriesCount = categories.length;
  const totalEquipmentCount = properties.length;
  const totalPortfolioValue = properties.reduce(
    (sum, p) => sum + (p.unitValue || 0) * (p.quantityPerCard || 1),
    0
  );

  // Largest category
  const sortedByCount = [...categories].sort((a, b) => {
    const countA = properties.filter((p) => p.categoryId === a.id).length;
    const countB = properties.filter((p) => p.categoryId === b.id).length;
    return countB - countA;
  });
  const largestCategory = sortedByCount[0] || null;
  const largestCategoryCount = largestCategory
    ? properties.filter((p) => p.categoryId === largestCategory.id).length
    : 0;

  // Filtering
  const filteredCategories = categories.filter((cat) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (cat.name && cat.name.toLowerCase().includes(q)) ||
      (cat.code && cat.code.toLowerCase().includes(q)) ||
      (cat.description && cat.description.toLowerCase().includes(q));

    return matchesSearch;
  });

  // Sorting
  filteredCategories.sort((a, b) => {
    const statsA = getCategoryStats(a.id);
    const statsB = getCategoryStats(b.id);

    if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
    if (sortBy === 'code-asc') return (a.code || '').localeCompare(b.code || '');
    if (sortBy === 'count-desc') return statsB.propertiesCount - statsA.propertiesCount;
    if (sortBy === 'count-asc') return statsA.propertiesCount - statsB.propertiesCount;
    if (sortBy === 'value-desc') return statsB.totalValue - statsA.totalValue;
    if (sortBy === 'value-asc') return statsA.totalValue - statsB.totalValue;
    return 0;
  });

  // Pagination
  const totalItems = filteredCategories.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

  // Open Create Modal
  const openCreateModal = () => {
    setEditingCategory(null);
    setFormError('');
    setFormData({
      code: '',
      name: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setFormError('');
    setFormData({
      code: cat.code,
      name: cat.name,
      description: cat.description || '',
    });
    setIsModalOpen(true);
  };

  // Save Category
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.code.trim()) {
      setFormError('Please enter both Category Code and Category Name.');
      return;
    }

    setIsSaving(true);
    try {
      const isEditing = Boolean(editingCategory);
      const url = '/api/categories';
      const method = isEditing ? 'PUT' : 'POST';
      const payload = {
        ...(editingCategory ? { id: editingCategory.id } : {}),
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description ? formData.description.trim() : '',
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonSafely(res);

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save category.');
      }

      await loadData();
      setIsModalOpen(false);

      setNotification({
        title: isEditing ? 'Category Updated' : 'Category Saved',
        message: `Category "${payload.name}" (${payload.code}) was saved successfully.`,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving the category.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat) => {
    const stats = getCategoryStats(cat.id);
    if (stats.propertiesCount > 0) {
      alert(
        `Cannot delete category "${cat.name}" because it currently has ${stats.propertiesCount} properties assigned to it. Please reassign or remove these properties first.`
      );
      return;
    }

    if (confirm(`Are you sure you want to delete category "${cat.name}" (${cat.code})?`)) {
      try {
        const res = await fetch(`/api/categories?id=${encodeURIComponent(cat.id)}`, {
          method: 'DELETE',
        });
        const data = await parseJsonSafely(res);

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to delete category.');
        }

        await loadData();
        setNotification({
          title: 'Category Removed',
          message: `Category "${cat.name}" was removed successfully.`,
        });
        setTimeout(() => setNotification(null), 5000);
      } catch (err) {
        alert(err.message || 'Failed to delete category.');
      }
    }
  };

  const copyCategorySql = async () => {
    const sql = `-- Run this in SQL Editor:
CREATE TABLE IF NOT EXISTS "property_categories" (
  "id" TEXT PRIMARY KEY DEFAULT ('cat_' || substr(md5(random()::text), 1, 12)),
  "name" TEXT UNIQUE NOT NULL,
  "code" TEXT UNIQUE NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE "property_categories" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to property_categories" ON "property_categories";
CREATE POLICY "Allow full access to property_categories" ON "property_categories" FOR ALL USING (true) WITH CHECK (true);`;

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
          <Navbar pageTitle="Equipment & Property Categories" icon={Tag} />

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
                    Database Table `property_categories` Not Found
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    The database is connected, but the <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">property_categories</code> table has not been created yet. Copy and run the SQL below in your SQL Editor.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={copyCategorySql}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'SQL Copied!' : 'Copy Categories SQL'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Card 1: Total Categories */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Categories
                </span>
                <Tag className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5">
                {totalCategoriesCount}{' '}
                <span className="text-xs font-normal text-slate-500">Live</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-700 font-bold">
                  Active Database
                </span>
              </div>
            </div>

            {/* Card 2: Total Equipment */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Assigned Equipment
                </span>
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5">
                {totalEquipmentCount}{' '}
                <span className="text-xs font-normal text-slate-500">Units</span>
              </p>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                Active Catalog
              </span>
            </div>

            {/* Card 3: Total Portfolio Value */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Valuation
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5">
                ₱{totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                Philippine Peso (PHP)
              </span>
            </div>

            {/* Card 4: Largest Category */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Top Category
                </span>
                <Layers className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-base font-black text-slate-900 mt-1.5 truncate">
                {largestCategory ? largestCategory.name : 'None'}
              </p>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                {largestCategoryCount} Items Assigned
              </span>
            </div>
          </div>

          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-xs p-4 rounded-2xl shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
                  Property Categories Directory
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-700" />
                  Database Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage property classifications and equipment group codes saved directly in the system database
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                title="Refresh categories"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Category</span>
              </button>
            </div>
          </div>

          {/* Search & Sort Filters */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search category name, code, description..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="name-asc">Category Name (A - Z)</option>
                <option value="name-desc">Category Name (Z - A)</option>
                <option value="code-asc">Category Code (A - Z)</option>
                <option value="count-desc">Highest Property Count</option>
                <option value="count-asc">Lowest Property Count</option>
                <option value="value-desc">Highest Asset Value</option>
                <option value="value-asc">Lowest Asset Value</option>
              </select>
            </div>
          </div>

          {/* Categories Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Registered Property Categories
                </h3>
                <p className="text-xs text-slate-400">
                  Showing {totalItems > 0 ? startIndex + 1 : 0} to {endIndex} of {totalItems} categories
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
                    <th className="py-3.5 px-4">Code</th>
                    <th className="py-3.5 px-4">Category Name & Description</th>
                    <th className="py-3.5 px-4">Assigned Equipment</th>
                    <th className="py-3.5 px-4">Total Asset Valuation</th>
                    <th className="py-3.5 px-4">Share of Inventory</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                          <p className="text-xs font-bold text-slate-600">Loading categories...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedCategories.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                          <div className="w-14 h-14 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                            <Tag className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {search ? 'No categories found' : 'No Categories in Database Yet'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                              {search
                                ? `No categories matched your search term "${search}".`
                                : 'Your category directory is clean and ready. Add your first official category to get started.'}
                            </p>
                          </div>
                          {!search && (
                            <button
                              onClick={openCreateModal}
                              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer mt-2"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Create First Category</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCategories.map((cat) => {
                      const stats = getCategoryStats(cat.id);
                      const sharePct =
                        totalPortfolioValue > 0
                          ? ((stats.totalValue / totalPortfolioValue) * 100).toFixed(1)
                          : '0.0';

                      return (
                        <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* Code */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center justify-center min-w-[36px] px-2.5 py-1 text-xs font-mono font-black text-emerald-900 bg-emerald-100 border border-emerald-300 rounded-xl">
                              {cat.code}
                            </span>
                          </td>

                          {/* Name & Description */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{cat.name}</span>
                            </div>
                            {cat.description ? (
                              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-md">
                                {cat.description}
                              </p>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No description provided</span>
                            )}
                          </td>

                          {/* Properties Count */}
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => setSelectedCategoryForDetails(cat)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Click to view equipment in this category"
                            >
                              <Package className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{stats.propertiesCount} Units</span>
                            </button>
                          </td>

                          {/* Total Valuation */}
                          <td className="py-3.5 px-4">
                            <div className="font-black text-slate-900">
                              ₱{stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <span className="text-[10px] text-slate-400">Total Book Value</span>
                          </td>

                          {/* Share Percentage */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                  className="h-full bg-emerald-600 rounded-full"
                                  style={{ width: `${Math.min(100, Math.max(0, parseFloat(sharePct)))}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-700">{sharePct}%</span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedCategoryForDetails(cat)}
                                title="View Properties in this Category"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => openEditModal(cat)}
                                title="Edit Category Details"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteCategory(cat)}
                                title={
                                  stats.propertiesCount > 0
                                    ? 'Cannot delete category with assigned properties'
                                    : 'Delete Category'
                                }
                                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                  stats.propertiesCount > 0
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
                <strong className="text-slate-900 font-bold">{totalItems}</strong> categories
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

      {/* ================= MODAL: ADD / EDIT CATEGORY ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingCategory ? 'Edit Property Category' : 'Register New Property Category'}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    {editingCategory ? `Code: ${editingCategory.code}` : 'Define standard property classifications'}
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
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category Code * <span className="text-[10px] text-slate-400">(Short acronym, e.g. OE, IT, FF, MED, VEH)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. IT, OE, MED, LAB"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-emerald-800 uppercase focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Information & Communication Technology Equipment"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Description & Equipment Scope
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g. Laptops, server infrastructure, desktop computers, network routers, switches, enterprise printers..."
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none"
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
                  <span>{isSaving ? 'Saving...' : editingCategory ? 'Update Category' : 'Save Category'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CATEGORY DETAILS & PROPERTY LISTING ================= */}
      {selectedCategoryForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {selectedCategoryForDetails.name}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    Code: {selectedCategoryForDetails.code} • Classification Details
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCategoryForDetails(null)}
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Category Summary Details */}
              {selectedCategoryForDetails.description && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-0.5">
                    Category Scope / Description:
                  </span>
                  <p className="text-xs text-emerald-900">{selectedCategoryForDetails.description}</p>
                </div>
              )}

              {/* Statistics Bar */}
              {(() => {
                const stats = getCategoryStats(selectedCategoryForDetails.id);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Total Items</span>
                      <p className="text-lg font-black text-slate-900 mt-1">{stats.propertiesCount} Units</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Total Book Value</span>
                      <p className="text-lg font-black text-slate-900 mt-1">₱{stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase">Active Status</span>
                      <p className="text-lg font-black text-emerald-900 mt-1">{stats.activeCount} Units</p>
                    </div>
                  </div>
                );
              })()}

              {/* Properties List Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Equipment Classified under this Category
                  </h4>
                  <Link
                    href="/properties"
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                  >
                    <span>Open Properties Registry</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Property Number</th>
                        <th className="py-2.5 px-3">Article & Model</th>
                        <th className="py-2.5 px-3">Custodian</th>
                        <th className="py-2.5 px-3">Office Location</th>
                        <th className="py-2.5 px-3">Unit Value (₱)</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(getCategoryStats(selectedCategoryForDetails.id)?.properties || []).length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            No property equipment assigned to this category yet.
                          </td>
                        </tr>
                      ) : (
                        (getCategoryStats(selectedCategoryForDetails.id)?.properties || []).map((p) => {
                          const custodian = employees.find((e) => e.id === p.accountablePersonId)?.name || 'Unassigned';
                          const office = offices.find((o) => o.id === p.officeId)?.name || 'Unassigned Office';

                          return (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-mono font-bold text-emerald-800">
                                {p.propertyNumber}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900">{p.article}</div>
                                {p.description && (
                                  <div className="text-[10px] text-slate-400 truncate max-w-xs">{p.description}</div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-slate-700">{custodian}</td>
                              <td className="py-3 px-3 text-slate-600">{office}</td>
                              <td className="py-3 px-3 font-black text-slate-900">
                                ₱{p.unitValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
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

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setSelectedCategoryForDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
