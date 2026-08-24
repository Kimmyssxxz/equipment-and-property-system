'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import {
  Users,
  Search,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Building2,
  Mail,
  Phone,
  Calendar,
  Package,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowUpRight,
  ClipboardList,
  Database,
  RefreshCw,
  Copy,
  Check,
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

export default function PersonnelPage() {
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [properties, setProperties] = useState([]);
  const [counts, setCounts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const [search, setSearch] = useState('');
  const [officeFilter, setOfficeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [selectedEmployeeForDetails, setSelectedEmployeeForDetails] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    position: '',
    officeId: '',
    email: '',
    phone: '',
    status: 'ACTIVE',
    assumedDate: '',
  });

  const [notification, setNotification] = useState(null);
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  const [assignmentsHistory, setAssignmentsHistory] = useState([]);

  // Load live data from database
  const loadData = async () => {
    setLoading(true);
    setIsTableMissing(false);
    try {
      setCounts(StorageManager.getPhysicalCounts() || []);

      // Fetch live employees, offices, properties, and assignments concurrently
      const [empRes, offRes, propRes, asgnRes] = await Promise.all([
        fetch('/api/personnel', { cache: 'no-store' }),
        fetch('/api/offices', { cache: 'no-store' }),
        fetch('/api/properties', { cache: 'no-store' }),
        fetch('/api/assignments', { cache: 'no-store' }),
      ]);

      const empData = await parseJsonSafely(empRes);
      const offData = await parseJsonSafely(offRes);
      const propData = await parseJsonSafely(propRes);
      const asgnData = await parseJsonSafely(asgnRes);

      if (offData.success && Array.isArray(offData.offices)) {
        setOffices(offData.offices);
        StorageManager.saveOffices(offData.offices);
      } else {
        setOffices(StorageManager.getOffices() || []);
      }

      if (empData.tableMissing) {
        setIsTableMissing(true);
        setEmployees([]);
      } else if (empData.success && Array.isArray(empData.employees)) {
        setEmployees(empData.employees);
        StorageManager.saveEmployees(empData.employees);
      } else {
        setEmployees(StorageManager.getEmployees() || []);
      }

      if (propData.success && Array.isArray(propData.properties)) {
        setProperties(propData.properties);
        StorageManager.saveProperties(propData.properties);
      } else {
        setProperties(StorageManager.getProperties() || []);
      }

      if (asgnData.success && Array.isArray(asgnData.assignments)) {
        setAssignmentsHistory(asgnData.assignments);
        StorageManager.saveAssignmentsHistory(asgnData.assignments);
      } else {
        setAssignmentsHistory(StorageManager.getAssignmentsHistory() || []);
      }
    } catch (err) {
      console.error('Failed to load personnel data:', err);
      setEmployees(StorageManager.getEmployees() || []);
      setOffices(StorageManager.getOffices() || []);
      setProperties(StorageManager.getProperties() || []);
      setAssignmentsHistory(StorageManager.getAssignmentsHistory() || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, officeFilter, statusFilter, sortBy, pageSize]);

  // Filtering & Sorting
  const filteredEmployees = employees
    .filter((emp) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (emp.name || '').toLowerCase().includes(q) ||
        (emp.employeeId || '').toLowerCase().includes(q) ||
        (emp.position || '').toLowerCase().includes(q) ||
        (emp.email && emp.email.toLowerCase().includes(q));

      const matchesOffice = officeFilter === 'ALL' || emp.officeId === officeFilter;
      const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
      return matchesSearch && matchesOffice && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'id-asc') return (a.employeeId || '').localeCompare(b.employeeId || '');
      if (sortBy === 'position-asc') return (a.position || '').localeCompare(b.position || '');
      return 0;
    });

  // Pagination
  const totalItems = filteredEmployees.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Statistics KPI
  const activeEmployeesCount = employees.filter((e) => e.status === 'ACTIVE').length;
  const totalAssignedProperties = properties.filter((p) => {
    if (p.accountablePersonId || p.employeeId || p.employee_id || p.accountable_person_id) return true;
    return assignmentsHistory.some((a) => a.propertyId === p.id || a.propertyNumber === p.propertyNumber);
  }).length;

  const totalValuation = properties.reduce(
    (sum, p) => sum + (parseFloat(p.unitValue || p.unit_value || p.cost) || 0) * (parseInt(p.quantityPerCard || p.quantity_per_card || p.quantity, 10) || 1),
    0
  );

  // Calculations per employee (resolving direct properties & active assignment history)
  const getEmployeeStats = (empInput) => {
    if (!empInput) {
      return {
        propertiesCount: 0,
        totalValue: 0,
        assignedProperties: [],
        countedCount: 0,
        pendingCount: 0,
        discrepanciesCount: 0,
      };
    }

    const empObj = typeof empInput === 'object' ? empInput : employees.find((e) => e.id === empInput || e.employeeId === empInput);
    const empId = empObj?.id || (typeof empInput === 'string' ? empInput : '');
    const empName = (empObj?.name || '').toLowerCase().trim();

    // Latest active assignment mapping for each property
    const activeAssignmentsByProp = {};
    assignmentsHistory.forEach((asgn) => {
      const propKey = asgn.propertyId || asgn.propertyNumber;
      if (propKey && !activeAssignmentsByProp[propKey]) {
        activeAssignmentsByProp[propKey] = asgn;
      }
    });

    const assignedProps = properties.filter((p) => {
      const pEmpId = p.accountablePersonId || p.employeeId || p.employee_id || p.accountable_person_id;
      const pEmpName = (p.accountablePersonName || p.accountable_person_name || p.accountableOfficer || p.employeeName || '').toLowerCase().trim();

      // Direct property assignment check
      if (empId && pEmpId && pEmpId === empId) return true;
      if (empName && pEmpName && pEmpName === empName) return true;

      // Active assignment check from assignments history table
      const activeAsgn = activeAssignmentsByProp[p.id] || activeAssignmentsByProp[p.propertyNumber];
      if (activeAsgn) {
        if (empId && activeAsgn.employeeId === empId) return true;
        if (empName && activeAsgn.employeeName && activeAsgn.employeeName.toLowerCase().trim() === empName) return true;
      }

      return false;
    });

    const totalVal = assignedProps.reduce(
      (sum, p) => sum + (parseFloat(p.unitValue || p.unit_value || p.cost) || 0) * (parseInt(p.quantityPerCard || p.quantity_per_card || p.quantity, 10) || 1),
      0
    );

    const empCounts = counts.filter((c) =>
      assignedProps.some((p) => p.propertyNumber === c.propertyNumber || p.id === c.propertyId)
    );
    const counted = empCounts.filter((c) => c.status !== 'PENDING').length;
    const pending = empCounts.filter((c) => c.status === 'PENDING').length;
    const discrepancies = empCounts.filter(
      (c) => c.status === 'SHORTAGE' || c.status === 'OVERAGE'
    ).length;

    return {
      propertiesCount: assignedProps.length,
      totalValue: totalVal,
      assignedProperties: assignedProps,
      countedCount: counted,
      pendingCount: pending,
      discrepanciesCount: discrepancies,
    };
  };

  const getOfficeName = (id) => {
    const found = offices.find((o) => o.id === id || o.code === id);
    return found ? `${found.name} (${found.code})` : 'Unassigned';
  };

  // Open Add Modal
  const openCreateModal = () => {
    setEditingEmployee(null);
    setFormError('');
    setFormData({
      employeeId: `EMP-2026-${String(employees.length + 1).padStart(4, '0')}`,
      name: '',
      position: '',
      officeId: offices[0]?.id || '',
      email: '',
      phone: '',
      status: 'ACTIVE',
      assumedDate: new Date().toISOString().slice(0, 10),
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setFormError('');
    setFormData({
      employeeId: emp.employeeId,
      name: emp.name,
      position: emp.position,
      officeId: emp.officeId || offices[0]?.id || '',
      email: emp.email || '',
      phone: emp.phone || '',
      status: emp.status || 'ACTIVE',
      assumedDate: emp.assumedDate ? emp.assumedDate.slice(0, 10) : '',
    });
    setIsModalOpen(true);
  };

  // Save Employee Form
  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim() || !formData.employeeId.trim() || !formData.position.trim()) {
      setFormError('Please fill in Employee ID, Full Name, and Designation / Position.');
      return;
    }

    if (!formData.officeId) {
      setFormError('Please select an Assigned Office / Department.');
      return;
    }

    setIsSaving(true);
    try {
      const isEditing = Boolean(editingEmployee);
      const url = '/api/personnel';
      const method = isEditing ? 'PUT' : 'POST';
      const payload = {
        ...(editingEmployee ? { id: editingEmployee.id } : {}),
        employeeId: formData.employeeId.trim().toUpperCase(),
        name: formData.name.trim(),
        position: formData.position.trim(),
        officeId: formData.officeId,
        email: formData.email ? formData.email.trim() : '',
        phone: formData.phone ? formData.phone.trim() : '',
        status: formData.status,
        assumedDate: formData.assumedDate || new Date().toISOString(),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonSafely(res);

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save personnel in database.');
      }

      await loadData();
      setIsModalOpen(false);

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: isEditing ? 'Personnel Profile Updated!' : 'Personnel Registered Successfully!',
        message: `Accountability profile for "${payload.name}" (${payload.employeeId}) was saved successfully.`,
      });

      setNotification({
        title: isEditing ? 'Personnel Record Updated' : 'New Personnel Registered',
        message: `Accountability profile for "${payload.name}" was saved successfully.`,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving the personnel record.');
      setStatusModal({
        isOpen: true,
        type: 'failed',
        title: 'Failed to Save Personnel!',
        message: err.message || 'An error occurred while attempting to save the personnel record.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Employee
  const handleDeleteEmployee = async (emp) => {
    const stats = getEmployeeStats(emp.id);
    if (stats.propertiesCount > 0) {
      setStatusModal({
        isOpen: true,
        type: 'failed',
        title: 'Cannot Remove Personnel!',
        message: `Cannot delete "${emp.name}" because they currently have ${stats.propertiesCount} accountable property item(s) assigned. Please reassign those properties first.`,
      });
      return;
    }

    if (confirm(`Are you sure you want to remove "${emp.name}" (${emp.employeeId})?`)) {
      try {
        const res = await fetch(`/api/personnel?id=${encodeURIComponent(emp.id)}`, {
          method: 'DELETE',
        });
        const data = await parseJsonSafely(res);

        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to delete personnel.');
        }

        await loadData();

        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Personnel Removed!',
          message: `Profile for "${emp.name}" (${emp.employeeId}) was removed successfully.`,
        });

        setNotification({
          title: 'Personnel Removed',
          message: `Profile for "${emp.name}" was removed successfully.`,
        });
        setTimeout(() => setNotification(null), 5000);
      } catch (err) {
        setStatusModal({
          isOpen: true,
          type: 'failed',
          title: 'Delete Failed!',
          message: err.message || 'An error occurred while attempting to delete the personnel profile.',
        });
      }
    }
  };

  const copyEmployeesSql = async () => {
    const sql = `-- Run this in SQL Editor:
CREATE TABLE IF NOT EXISTS "employees" (
  "id" TEXT PRIMARY KEY DEFAULT ('emp_' || substr(md5(random()::text), 1, 12)),
  "employeeId" TEXT UNIQUE NOT NULL,
  "name" TEXT NOT NULL,
  "position" TEXT NOT NULL,
  "officeId" TEXT NOT NULL REFERENCES "offices"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "email" TEXT,
  "phone" TEXT,
  "status" TEXT DEFAULT 'ACTIVE' NOT NULL,
  "assumedDate" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE "employees" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow full access to employees" ON "employees";
CREATE POLICY "Allow full access to employees" ON "employees" FOR ALL USING (true) WITH CHECK (true);`;

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
          <Navbar pageTitle="Personnel & Accountable Officers" icon={Users} />

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
                    Database Table `employees` Not Found
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    The database is connected, but the <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">employees</code> table has not been created yet. Copy and run the SQL below in your SQL Editor.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={copyEmployeesSql}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'SQL Copied!' : 'Copy Employees SQL'}</span>
                </button>
              </div>
            </div>
          )}

          {/* KPI Statistics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Card 1: Total Personnel */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Personnel
                </span>
                <Users className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5">
                {employees.length}{' '}
                <span className="text-xs font-normal text-slate-500">Officers</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] text-emerald-700 font-bold">
                  Active Database
                </span>
              </div>
            </div>

            {/* Card 2: Active Officers */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Custodians
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5">
                {activeEmployeesCount}{' '}
                <span className="text-xs font-normal text-slate-500">Active</span>
              </p>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
                Verified Officers
              </span>
            </div>

            {/* Card 3: Assigned Assets */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Custody Items
                </span>
                <Package className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-slate-900 mt-1.5">
                {totalAssignedProperties}{' '}
                <span className="text-xs font-normal text-slate-500">Units</span>
              </p>
              <span className="text-[10px] text-slate-500 font-medium">
                Equipment Issued
              </span>
            </div>

            {/* Card 4: Total Value */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Accountable Value
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
          </div>

          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-xs p-4 rounded-2xl shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
                  Accountable Personnel Directory
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <Database className="w-3 h-3 text-emerald-700" />
                  Database Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage government employees, assigned equipment portfolios, and custody assumptions
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                title="Refresh personnel from database"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Register New Personnel</span>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, employee ID, position, email..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
            </div>

            <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
              <select
                value={officeFilter}
                onChange={(e) => setOfficeFilter(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Offices / Departments</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Custodians</option>
                <option value="INACTIVE">Inactive</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
              >
                <option value="name-asc">Full Name (A - Z)</option>
                <option value="name-desc">Full Name (Z - A)</option>
                <option value="id-asc">Employee ID (A - Z)</option>
                <option value="position-asc">Position (A - Z)</option>
              </select>
            </div>
          </div>

          {/* Personnel Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Registered Personnel & Property Holdings
                </h3>
                <p className="text-xs text-slate-400">
                  Showing {totalItems > 0 ? startIndex + 1 : 0} to {endIndex} of {totalItems} employees
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
                    <th className="py-3.5 px-4">Employee ID & Name</th>
                    <th className="py-3.5 px-4">Designation / Position</th>
                    <th className="py-3.5 px-4">Assigned Department</th>
                    <th className="py-3.5 px-4">Assigned Assets</th>
                    <th className="py-3.5 px-4">Total Property Value</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                          <p className="text-xs font-bold text-slate-600">Loading personnel from database...</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                          <div className="w-14 h-14 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                            <Users className="w-7 h-7" />
                          </div>
                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900">
                              {search ? 'No personnel found' : 'No Personnel in Database Yet'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                              {search
                                ? `No personnel matched your search term "${search}".`
                                : offices.length === 0
                                ? 'No registered offices found. Please create an Office first before adding personnel.'
                                : 'Your personnel directory is clean and ready. Register your first accountable officer to get started.'}
                            </p>
                          </div>
                          {!search && (
                            <button
                              onClick={openCreateModal}
                              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer mt-2"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Register First Personnel</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedEmployees.map((emp) => {
                      const stats = getEmployeeStats(emp);
                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* ID & Name */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{emp.name}</span>
                            </div>
                            <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 inline-block mt-0.5 ml-5.5">
                              {emp.employeeId}
                            </span>
                          </td>

                          {/* Position */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{emp.position}</div>
                            {emp.assumedDate && (
                              <span className="text-[10px] text-slate-400">
                                Assumed: {new Date(emp.assumedDate).toLocaleDateString()}
                              </span>
                            )}
                          </td>

                          {/* Office */}
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-700 flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{getOfficeName(emp.officeId)}</span>
                            </div>
                          </td>

                          {/* Assigned Properties Count */}
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => setSelectedEmployeeForDetails(emp)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="Click to view assigned items"
                            >
                              <Package className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{stats.propertiesCount} Items</span>
                            </button>
                          </td>

                          {/* Total Value */}
                          <td className="py-3.5 px-4">
                            <div className="font-black text-slate-900">
                              ₱{stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <span className="text-[10px] text-slate-400">Accountability Portfolio</span>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                emp.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              ● {emp.status || 'ACTIVE'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => setSelectedEmployeeForDetails(emp)}
                                title="View Accountable Assets Portfolio"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => openEditModal(emp)}
                                title="Edit Personnel Details"
                                className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteEmployee(emp)}
                                title={
                                  stats.propertiesCount > 0
                                    ? 'Cannot delete personnel with accountable items'
                                    : 'Delete Personnel'
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
                <strong className="text-slate-900 font-bold">{totalItems}</strong> employees
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

      {/* ================= MODAL: ADD / EDIT PERSONNEL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {editingEmployee ? 'Edit Personnel Profile' : 'Register Accountable Personnel'}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    {editingEmployee ? `ID: ${editingEmployee.employeeId}` : 'Define official employee custodian details'}
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
            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    placeholder="e.g. EMP-2021-0001"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-emerald-800 uppercase focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Accountability Status
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
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. ELMER G. DOLOTALLAS"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Position / Designation *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="e.g. Supply Officer / Property Custodian"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Office / Operating Unit *
                  </label>
                  {offices.length === 0 ? (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      No registered offices found in database. Please{' '}
                      <Link href="/offices" className="underline font-bold text-amber-900">
                        create an office first
                      </Link>
                      .
                    </div>
                  ) : (
                    <select
                      value={formData.officeId}
                      required
                      onChange={(e) => setFormData({ ...formData, officeId: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Select Office / Department --</option>
                      {offices.map((off) => (
                        <option key={off.id} value={off.id}>
                          {off.name} ({off.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@office.gov.ph"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact / Phone Loc.
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Loc. 107"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Date of Assumption of Accountability
                  </label>
                  <input
                    type="date"
                    value={formData.assumedDate}
                    onChange={(e) => setFormData({ ...formData, assumedDate: e.target.value })}
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
                  <span>{isSaving ? 'Saving...' : editingEmployee ? 'Update Profile' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: PERSONNEL ACCOUNTABILITY VIEW ================= */}
      {selectedEmployeeForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-emerald-600 text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {selectedEmployeeForDetails.name}
                  </h3>
                  <p className="text-xs text-emerald-100">
                    {selectedEmployeeForDetails.position} • {getOfficeName(selectedEmployeeForDetails.officeId)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEmployeeForDetails(null)}
                className="p-1.5 rounded-xl text-emerald-100 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              {/* Summary Metrics Bar */}
              {(() => {
                const stats = getEmployeeStats(selectedEmployeeForDetails.id);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Assigned Items</span>
                      <p className="text-lg font-black text-slate-900 mt-1">{stats.propertiesCount} Units</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Total Value</span>
                      <p className="text-lg font-black text-slate-900 mt-1">₱{stats.totalValue.toLocaleString()}</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 font-bold uppercase">Counted</span>
                      <p className="text-lg font-black text-emerald-900 mt-1">{stats.countedCount} Units</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                      <span className="text-[10px] text-amber-700 font-bold uppercase">Pending</span>
                      <p className="text-lg font-black text-amber-900 mt-1">{stats.pendingCount} Units</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                      <span className="text-[10px] text-rose-700 font-bold uppercase">Discrepancies</span>
                      <p className="text-lg font-black text-rose-900 mt-1">{stats.discrepanciesCount} Items</p>
                    </div>
                  </div>
                );
              })()}

              {/* Assigned Properties Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Assigned Property & Plant Equipment Cards
                  </h4>
                  <Link
                    href={`/reports?officerId=${selectedEmployeeForDetails.id}`}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
                  >
                    <span>Generate Accountability Report for this Officer</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Property Number</th>
                        <th className="py-2.5 px-3">Article & Specs</th>
                        <th className="py-2.5 px-3">Unit Value</th>
                        <th className="py-2.5 px-3">PO Reference</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getEmployeeStats(selectedEmployeeForDetails.id).assignedProperties.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-slate-400">
                            No active properties currently assigned to this officer.
                          </td>
                        </tr>
                      ) : (
                        getEmployeeStats(selectedEmployeeForDetails.id).assignedProperties.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-mono font-bold text-emerald-800">{p.propertyNumber}</td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900">{p.article}</span>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{p.description}</p>
                            </td>
                            <td className="py-3 px-3 font-black text-slate-900">₱{(p.unitValue || 0).toLocaleString()}</td>
                            <td className="py-3 px-3 text-slate-600">{p.poNumber || 'N/A'}</td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => setSelectedEmployeeForDetails(null)}
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
                src="https://lottie.host/embed/b19a9453-e129-45d0-80ee-bfd378a5c97d/ivigsxDbxZ.lottie"
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
