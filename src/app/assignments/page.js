'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import {
  ClipboardCheck,
  Package,
  Users,
  Building2,
  Calendar,
  History,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Search,
  FileText,
  UserCheck,
  Sparkles,
  Database,
  RefreshCw,
  Copy,
  Check,
  Printer,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Tag,
  Clock,
  Send,
  QrCode,
} from 'lucide-react';
import { StorageManager } from '@/lib/storage';
import QRCodeDisplay from '@/components/QRCodeDisplay';

async function parseJsonSafely(res) {
  try {
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return { error: `Server returned non-JSON response (${res.status})` };
  }
}

function AssignmentsContent() {
  const searchParams = useSearchParams();
  const preselectedPropId = searchParams.get('propertyId');

  // Core Data State
  const [properties, setProperties] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [history, setHistory] = useState([]);

  // Supabase / Network State
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTableMissing, setIsTableMissing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  // Assignment Form State
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [targetOfficeId, setTargetOfficeId] = useState('');
  const [assignmentDate, setAssignmentDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [transferredBy, setTransferredBy] = useState('Elmer G. Dolotallas (Admin)');

  // Filter & Search State
  const [historySearch, setHistorySearch] = useState('');
  const [officeFilter, setOfficeFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Notification & Modal State
  const [notification, setNotification] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedAssignmentForPrint, setSelectedAssignmentForPrint] = useState(null);
  const [selectedAssignmentForDetails, setSelectedAssignmentForDetails] = useState(null);
  const [selectedAssignmentForTag, setSelectedAssignmentForTag] = useState(null);
  const [isBatchStickerModalOpen, setIsBatchStickerModalOpen] = useState(false);
  const [batchStickerOfficeFilter, setBatchStickerOfficeFilter] = useState('ALL');
  const [batchStickerEmployeeFilter, setBatchStickerEmployeeFilter] = useState('ALL');
  const [batchStickerSearch, setBatchStickerSearch] = useState('');

  // Re-Assign / Transfer State
  const [selectedAssignmentForReassign, setSelectedAssignmentForReassign] = useState(null);
  const [reassignEmployeeId, setReassignEmployeeId] = useState('');
  const [reassignOfficeId, setReassignOfficeId] = useState('');
  const [reassignDate, setReassignDate] = useState('');
  const [reassignRemarks, setReassignRemarks] = useState('');
  const [reassignAuthorizedBy, setReassignAuthorizedBy] = useState('Elmer G. Dolotallas (Admin)');
  const [isReassignSubmitting, setIsReassignSubmitting] = useState(false);


  // Live Database Fetch
  const loadData = async () => {
    setLoading(true);
    setIsTableMissing(false);
    try {
      // 1. Fetch concurrently from API endpoints
      const [asgnRes, propRes, empRes, offRes, catRes] = await Promise.all([
        fetch('/api/assignments', { cache: 'no-store' }),
        fetch('/api/properties', { cache: 'no-store' }),
        fetch('/api/personnel', { cache: 'no-store' }),
        fetch('/api/offices', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
      ]);

      const asgnData = await parseJsonSafely(asgnRes);
      const propData = await parseJsonSafely(propRes);
      const empData = await parseJsonSafely(empRes);
      const offData = await parseJsonSafely(offRes);
      const catData = await parseJsonSafely(catRes);

      let loadedProps = [];
      let loadedEmps = [];
      let loadedOffs = [];
      let loadedHistory = [];

      // Categories
      if (catData.success && Array.isArray(catData.categories)) {
        setCategories(catData.categories);
        StorageManager.saveCategories(catData.categories);
      } else {
        setCategories(StorageManager.getCategories() || []);
      }

      // Personnel / Employees
      if (empData.success && Array.isArray(empData.employees)) {
        loadedEmps = empData.employees;
        setEmployees(empData.employees);
        StorageManager.saveEmployees(empData.employees);
      } else {
        loadedEmps = StorageManager.getEmployees() || [];
        setEmployees(loadedEmps);
      }

      // Offices
      if (offData.success && Array.isArray(offData.offices)) {
        loadedOffs = offData.offices;
        setOffices(offData.offices);
        StorageManager.saveOffices(offData.offices);
      } else {
        loadedOffs = StorageManager.getOffices() || [];
        setOffices(loadedOffs);
      }

      // Properties
      if (propData.success && Array.isArray(propData.properties)) {
        loadedProps = propData.properties;
        setProperties(propData.properties);
        StorageManager.saveProperties(propData.properties);
      } else {
        loadedProps = StorageManager.getProperties() || [];
        setProperties(loadedProps);
      }

      // Assignments History
      if (asgnData.tableMissing) {
        setIsTableMissing(true);
        loadedHistory = StorageManager.getAssignmentsHistory() || [];
        setHistory(loadedHistory);
      } else if (asgnData.success && Array.isArray(asgnData.assignments)) {
        setDbConnected(true);
        loadedHistory = asgnData.assignments;
        setHistory(asgnData.assignments);
        StorageManager.saveAssignmentsHistory(asgnData.assignments);
      } else {
        loadedHistory = StorageManager.getAssignmentsHistory() || [];
        setHistory(loadedHistory);
      }

      // Pre-select property from query param or first available
      if (preselectedPropId && loadedProps.some((p) => p.id === preselectedPropId)) {
        setSelectedPropertyId(preselectedPropId);
      } else if (loadedProps.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(loadedProps[0].id);
      }

      if (loadedEmps.length > 0 && !targetEmployeeId) {
        setTargetEmployeeId(loadedEmps[0].id);
        if (loadedEmps[0].officeId) {
          setTargetOfficeId(loadedEmps[0].officeId);
        }
      } else if (loadedOffs.length > 0 && !targetOfficeId) {
        setTargetOfficeId(loadedOffs[0].id);
      }

      if (!assignmentDate) {
        setAssignmentDate(new Date().toISOString().slice(0, 10));
      }
    } catch (e) {
      console.error('Failed to load assignments data:', e);
      setProperties(StorageManager.getProperties() || []);
      setEmployees(StorageManager.getEmployees() || []);
      setOffices(StorageManager.getOffices() || []);
      setHistory(StorageManager.getAssignmentsHistory() || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [preselectedPropId]);

  // Selected Property Object
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const currentCustodian = employees.find((e) => e.id === selectedProperty?.accountablePersonId);
  const currentOffice = offices.find((o) => o.id === selectedProperty?.officeId);
  const selectedCategory = categories.find((c) => c.id === selectedProperty?.categoryId);

  // Helper lookup for property serial number
  const getPropertySerialNumber = (propertyId, propertyNumber, directSn) => {
    if (directSn) return directSn;
    const found = properties.find((p) => (propertyId && p.id === propertyId) || (propertyNumber && p.propertyNumber === propertyNumber));
    return found?.serialNumber || '';
  };

  // Helper lookup for property acquisition date
  const getPropertyAcquisitionDate = (propertyId, propertyNumber, directDate) => {
    const found = properties.find((p) => (propertyId && p.id === propertyId) || (propertyNumber && p.propertyNumber === propertyNumber));
    const targetDate = found?.acquisitionDate || directDate;
    if (targetDate && targetDate !== 'N/A') {
      return targetDate.includes('T') ? targetDate.slice(0, 10) : targetDate;
    }
    return directDate || 'N/A';
  };

  // Helper lookup for property description
  const getPropertyDescription = (propertyId, propertyNumber, directDesc, directArticle) => {
    if (directDesc && directDesc.trim()) return directDesc.trim();
    const found = properties.find((p) => (propertyId && p.id === propertyId) || (propertyNumber && p.propertyNumber === propertyNumber));
    return found?.description || directDesc || directArticle || 'N/A';
  };



  // Auto-populate target office when employee is changed

  const handleEmployeeChange = (empId) => {
    setTargetEmployeeId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp && emp.officeId) {
      setTargetOfficeId(emp.officeId);
    }
  };

  // Submit Reassignment / Custody Transfer to Supabase Backend
  const handleAssign = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedPropertyId || !targetEmployeeId || !targetOfficeId) {
      setErrorMsg('Please select a property, accountable officer, and receiving office.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        propertyId: selectedPropertyId,
        employeeId: targetEmployeeId,
        newEmployeeId: targetEmployeeId,
        officeId: targetOfficeId,
        newOfficeId: targetOfficeId,
        assignmentDate: assignmentDate || new Date().toISOString().slice(0, 10),
        remarks: remarks.trim() || 'Official transfer of property accountability per property card',
        transferredBy: transferredBy.trim() || 'System Admin',
      };

      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonSafely(res);

      if (!res.ok && !data.success) {
        // Fallback to local storage execution if database table is missing or endpoint is down
        console.warn('API returned error, performing local sync fallback:', data.error);
        StorageManager.reassignProperty({
          propertyId: selectedPropertyId,
          newEmployeeId: targetEmployeeId,
          newOfficeId: targetOfficeId,
          assignmentDate,
          remarks: payload.remarks,
        });
      } else {
        // Also sync local storage cache
        try {
          StorageManager.reassignProperty({
            propertyId: selectedPropertyId,
            newEmployeeId: targetEmployeeId,
            newOfficeId: targetOfficeId,
            assignmentDate,
            remarks: payload.remarks,
          });
        } catch (localErr) {
          // ignore
        }
      }

      // Reload fresh data from database
      await loadData();
      setRemarks('');

      const targetEmp = employees.find((e) => e.id === targetEmployeeId);
      const targetOff = offices.find((o) => o.id === targetOfficeId);

      setNotification({
        title: 'Accountability Successfully Assigned!',
        message: `Property "${selectedProperty?.propertyNumber} - ${selectedProperty?.article}" is now accountable to ${targetEmp?.name} (${targetOff?.name || 'Department'}).`,
        createdItem: data.assignment || {
          propertyNumber: selectedProperty?.propertyNumber,
          article: selectedProperty?.article,
          employeeName: targetEmp?.name,
          officeName: targetOff?.name,
          assignmentDate,
          remarks: payload.remarks,
          transferredBy,
        },
      });

      setTimeout(() => setNotification(null), 8000);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error occurred while saving property assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Re-Assign Modal for any assignment item
  const openReassignModal = (item) => {
    if (!item) return;
    setSelectedAssignmentForReassign(item);
    setReassignEmployeeId(item.employeeId || '');
    setReassignOfficeId(item.officeId || '');
    setReassignDate(new Date().toISOString().split('T')[0]);
    setReassignRemarks('');
    setReassignAuthorizedBy('Elmer G. Dolotallas (Admin)');
  };

  // Confirm Re-Assignment & Generate New Sticker Tag
  const handleConfirmReassign = async () => {
    if (!selectedAssignmentForReassign) return;
    if (!reassignEmployeeId) {
      alert('Please select a new Accountable Custodian.');
      return;
    }
    if (!reassignOfficeId) {
      alert('Please select a new Receiving Office / Location.');
      return;
    }

    setIsReassignSubmitting(true);
    try {
      const realPropId = selectedAssignmentForReassign.propertyId || selectedAssignmentForReassign.id;

      const payload = {
        propertyId: realPropId,
        employeeId: reassignEmployeeId,
        officeId: reassignOfficeId,
        assignmentDate: reassignDate || new Date().toISOString().split('T')[0],
        remarks: reassignRemarks.trim() || 'Property Re-assigned / Transferred',
        transferredBy: reassignAuthorizedBy.trim() || 'Admin',
      };

      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonSafely(res);

      try {
        StorageManager.reassignProperty({
          propertyId: realPropId,
          newEmployeeId: reassignEmployeeId,
          newOfficeId: reassignOfficeId,
          assignmentDate: payload.assignmentDate,
          remarks: payload.remarks,
        });
      } catch (e) {}

      await loadData();

      const newEmp = employees.find((e) => e.id === reassignEmployeeId);
      const newOff = offices.find((o) => o.id === reassignOfficeId);
      const targetProp = properties.find((p) => p.id === realPropId);

      const updatedTagData = {
        propertyId: realPropId,
        propertyNumber: selectedAssignmentForReassign.propertyNumber,
        article: selectedAssignmentForReassign.article,
        description: targetProp?.description || selectedAssignmentForReassign.description || '',
        serialNumber: targetProp?.serialNumber || selectedAssignmentForReassign.serialNumber || '',
        unitValue: targetProp?.unitValue || selectedAssignmentForReassign.unitValue || 0,
        employeeName: newEmp?.name || 'Unassigned',
        officeName: newOff?.name || 'Supply Office',
        categoryName: targetProp?.categoryName || 'Equipment',
        assignmentDate: payload.assignmentDate,
        acquisitionDate: targetProp?.acquisitionDate || payload.assignmentDate,
        remarks: payload.remarks,
        transferredBy: payload.transferredBy,
      };

      setSelectedAssignmentForReassign(null);

      setNotification({
        title: '✨ Item Successfully Re-Assigned & Transferred!',
        message: `"${selectedAssignmentForReassign.propertyNumber}" is now accountable to ${newEmp?.name} (${newOff?.name}).`,
        createdItem: updatedTagData,
      });

      setSelectedAssignmentForTag(updatedTagData);

      setTimeout(() => setNotification(null), 7000);
    } catch (err) {
      alert(err.message || 'Failed to re-assign property.');
    } finally {
      setIsReassignSubmitting(false);
    }
  };

  // SQL schema copy helper
  const handleCopySql = () => {
    const sql = `CREATE TABLE IF NOT EXISTS "property_assignments" (
  "id" TEXT PRIMARY KEY DEFAULT ('asgn_' || substr(md5(random()::text), 1, 12)),
  "propertyId" TEXT NOT NULL REFERENCES "properties"("id") ON UPDATE CASCADE ON DELETE CASCADE,
  "employeeId" TEXT NOT NULL REFERENCES "employees"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "officeId" TEXT NOT NULL REFERENCES "offices"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
  "previousEmployeeId" TEXT,
  "previousOfficeId" TEXT,
  "assignmentDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "remarks" TEXT,
  "transferredBy" TEXT DEFAULT 'System Admin',
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

ALTER TABLE "property_assignments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow full access to property_assignments" ON "property_assignments" FOR ALL USING (true) WITH CHECK (true);`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Filtered History
  const filteredHistory = history
    .filter((h) => {
      const q = historySearch.toLowerCase();
      const propNo = (h.propertyNumber || '').toLowerCase();
      const art = (h.article || '').toLowerCase();
      const emp = (h.employeeName || '').toLowerCase();
      const prevEmp = (h.previousEmployeeName || '').toLowerCase();
      const off = (h.officeName || '').toLowerCase();
      const rem = (h.remarks || '').toLowerCase();

      const matchesSearch =
        propNo.includes(q) ||
        art.includes(q) ||
        emp.includes(q) ||
        prevEmp.includes(q) ||
        off.includes(q) ||
        rem.includes(q);

      const matchesOffice = officeFilter === 'ALL' || h.officeId === officeFilter;
      const matchesEmployee = employeeFilter === 'ALL' || h.employeeId === employeeFilter;

      return matchesSearch && matchesOffice && matchesEmployee;
    })
    .sort((a, b) => new Date(b.assignmentDate || b.createdAt || 0) - new Date(a.assignmentDate || a.createdAt || 0));

  // Pagination
  const totalPages = Math.ceil(filteredHistory.length / pageSize) || 1;
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Quick stats
  const totalAssignedAssets = properties.filter((p) => p.accountablePersonId).length;
  const totalAssignmentsCount = history.length;

  // Batch Sticker Items calculation (8 stickers per A4 sheet) using current table filtered history
  const batchStickerItems = filteredHistory;
  const STICKERS_PER_PAGE = 8;
  const stickerPages = [];
  for (let i = 0; i < batchStickerItems.length; i += STICKERS_PER_PAGE) {
    stickerPages.push(batchStickerItems.slice(i, i + STICKERS_PER_PAGE));
  }




  return (
    <div className="min-h-screen p-2.5 sm:p-6 lg:p-8 flex justify-center items-start print:p-0 print:m-0 print:min-h-0 print:bg-transparent">
      <div className="w-full max-w-[1540px] flex gap-5 lg:gap-6 items-start print:max-w-none print:p-0 print:m-0 print:block">
        {/* Floating Sidebar */}
        <Sidebar totalItems={properties.length} />

        {/* Floating Main Content Container */}
        <main className="flex-1 min-w-0 bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl sm:rounded-[32px] shadow-2xl shadow-slate-900/10 p-4 sm:p-6 lg:p-8 flex flex-col space-y-5 sm:space-y-6 overflow-hidden print:bg-transparent print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0 print:overflow-visible">

          {/* Main Interactive Page Content (Hidden on print) */}
          <div className="no-print space-y-5 sm:space-y-6">
            {/* Top Navbar with Page Title & Icon */}
            <Navbar pageTitle="Property Assignments & Custody Transfer" icon={ClipboardCheck} />


          {/* Toast Notification */}
          {notification && (
            <div className="p-4.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between shadow-md shadow-emerald-100 animate-in fade-in slide-in-from-top-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-extrabold text-emerald-950">{notification.title}</p>
                  <p className="text-xs text-emerald-800 mt-0.5">{notification.message}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {notification.createdItem && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedAssignmentForTag(notification.createdItem);
                        setTimeout(() => window.print(), 50);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Print QR Sticker</span>
                    </button>


                  </>
                )}
                <button
                  onClick={() => setNotification(null)}
                  className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Assets</span>
                <p className="text-lg font-black text-slate-900">{totalAssignedAssets} / {properties.length}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <History className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custody Transfers</span>
                <p className="text-lg font-black text-slate-900">{totalAssignmentsCount}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Custodians</span>
                <p className="text-lg font-black text-slate-900">{employees.length}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Offices / Stations</span>
                <p className="text-lg font-black text-slate-900">{offices.length}</p>
              </div>
            </div>
          </div>

          {/* Section 1: Property Assignment Form & Auto-Loaded Specs Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Form */}
            <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Assign Property Accountability
                  </h2>
                  <p className="text-xs text-slate-400">
                    Select an asset and assign custodianship to an employee. Historical custody is automatically preserved.
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <UserCheck className="w-5 h-5" />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleAssign} className="space-y-4">
                {/* 1. Select Property */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Select Property / Equipment to Assign *
                  </label>
                  <select
                    value={selectedPropertyId}
                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                    disabled={isSubmitting || properties.length === 0}
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer shadow-2xs"
                  >
                    {properties.length === 0 ? (
                      <option value="">No properties registered in database</option>
                    ) : (
                      properties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.propertyNumber} — {p.article} (₱{(p.unitValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 2. Select New Accountable Personnel */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      2. New Accountable Officer (Custodian) *
                    </label>
                    <select
                      value={targetEmployeeId}
                      onChange={(e) => handleEmployeeChange(e.target.value)}
                      disabled={isSubmitting || employees.length === 0}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                    >
                      {employees.length === 0 ? (
                        <option value="">No personnel registered</option>
                      ) : (
                        employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.position})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* 3. Select Office */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      3. Receiving Office / Department *
                    </label>
                    <select
                      value={targetOfficeId}
                      onChange={(e) => setTargetOfficeId(e.target.value)}
                      disabled={isSubmitting || offices.length === 0}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                    >
                      {offices.length === 0 ? (
                        <option value="">No offices registered</option>
                      ) : (
                        offices.map((off) => (
                          <option key={off.id} value={off.id}>
                            {off.name} ({off.code})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* 4. Assignment Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      4. Effective Assignment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={assignmentDate}
                      onChange={(e) => setAssignmentDate(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* 5. Transferred By */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Authorized Admin / Supply Officer
                    </label>
                    <input
                      type="text"
                      value={transferredBy}
                      onChange={(e) => setTransferredBy(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* 6. Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Assignment Purpose / Transfer Remarks
                  </label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="e.g. Reassigned per Requisition and Issue Slip RIS-2026-081"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedPropertyId}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Saving Assignment...</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCheck className="w-4 h-4" />
                        <span>Confirm & Execute Property Assignment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Selected Property Summary Card */}
            <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Selected Property Specifications
                  </span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Asset Specifications
                  </span>
                </div>

                {selectedProperty ? (
                  <div className="space-y-3 mt-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Property Number</span>
                      <p className="font-mono text-sm font-black text-emerald-800">{selectedProperty.propertyNumber}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Article / Item Name</span>
                      <p className="font-extrabold text-slate-900 text-sm">{selectedProperty.article}</p>
                    </div>

                    {selectedCategory && (
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Category Classification</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Tag className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800">{selectedCategory.name} ({selectedCategory.code})</span>
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Description / Specifications</span>
                      <p className="text-slate-600 whitespace-pre-line bg-slate-50 p-2.5 rounded-xl border border-slate-100 mt-1 max-h-24 overflow-y-auto">
                        {selectedProperty.description || 'No description provided'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Current Value</span>
                        <p className="font-black text-slate-900 text-base">
                          ₱{(selectedProperty.unitValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">PO / RIS Reference</span>
                        <p className="font-semibold text-slate-800">{selectedProperty.poNumber || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Current Custody Box */}
                    <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 mt-2 space-y-1">
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Current Registered Custodian
                      </span>
                      <p className="font-bold text-slate-900">
                        {currentCustodian ? `${currentCustodian.name} (${currentCustodian.position || 'Staff'})` : 'Unassigned (In Property Storage)'}
                      </p>
                      <p className="text-[11px] text-slate-600">
                        {currentOffice ? `${currentOffice.name} (${currentOffice.code})` : 'Unassigned Office'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400">
                    No property selected.
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Government Accountability Rule:</strong> Reassignments create a new audit record while preserving the complete chronological history of previous custodians.
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Complete Historical Assignment Audit Trail */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-4.5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-600" />
                  <span>Chronological Assignment & Custody Transfer History</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Immutable log of all initial registrations and subsequent accountability transfers
                </p>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => {
                      setHistorySearch(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search property, custodian, office..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                {/* Office Filter */}
                <select
                  value={officeFilter}
                  onChange={(e) => {
                    setOfficeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Offices ({offices.length})</option>
                  {offices.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.name}
                    </option>
                  ))}
                </select>

                {/* Personnel Filter */}
                <select
                  value={employeeFilter}
                  onChange={(e) => {
                    setEmployeeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Personnel ({employees.length})</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>

                {/* Print All Stickers Button - Direct Print Settings */}
                <button
                  onClick={() => window.print()}
                  disabled={filteredHistory.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Print all property QR stickers directly to A4 coupon bond (8 per sheet)"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Print All Stickers</span>
                </button>

              </div>
            </div>


            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Property No. & Article</th>
                    <th className="py-3.5 px-4">Previous Custodian</th>
                    <th className="py-3.5 px-4">New Accountable Custodian</th>
                    <th className="py-3.5 px-4">Receiving Office</th>
                    <th className="py-3.5 px-4">Transfer Remarks</th>
                    <th className="py-3.5 px-4">Authorized By</th>
                    <th className="py-3.5 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                        Loading custody logs...
                      </td>
                    </tr>
                  ) : paginatedHistory.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-12 text-center text-slate-400">
                        No assignment history records match your search criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                          {h.assignmentDate}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-mono font-bold text-emerald-800">{h.propertyNumber}</div>
                          <div className="font-semibold text-slate-900">{h.article}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          <div className="font-semibold text-slate-800">{h.previousEmployeeName || 'None (Initial Registration)'}</div>
                          {h.previousOfficeName && h.previousOfficeName !== 'None (Initial Registration)' && (
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                              <span>Prev Office: </span>
                              <span className="font-bold text-slate-600">{h.previousOfficeName}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-emerald-900 flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{h.employeeName}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {h.officeName}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate" title={h.remarks}>
                          {h.remarks}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                          {h.transferredBy}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openReassignModal(h)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer text-[11px] font-extrabold shadow-2xs"
                              title="Re-assign or transfer this item to a new custodian or office"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Re-Assign</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedAssignmentForTag(h);
                                setTimeout(() => window.print(), 50);
                              }}
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors cursor-pointer"
                              title="Print Property QR Code Sticker Tag"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setSelectedAssignmentForDetails(h)}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                              title="View Full Custody Record Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredHistory.length > 0 && (
              <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/40 text-xs">
                <span className="text-slate-500 font-medium">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, filteredHistory.length)} of {filteredHistory.length} assignment records
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-1.5 font-bold text-slate-800">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
          {/* End of Interactive Main Page Content (Hidden on print) */}

          {/* Official Property Acknowledgement Receipt (PAR / PTR) Printable Document (Direct Print) */}
          {selectedAssignmentForPrint && (
            <div className="hidden print:block">
              {/* Printable Document Sheet */}
              <div
                id="printable-par-document"
                className="p-6 bg-white font-serif text-slate-900 space-y-5 text-xs print:p-0 print:border-none print:bg-white"
              >
                <div className="text-center space-y-1 border-b border-slate-300 pb-3 font-sans">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Republic of the Philippines</p>
                  <h4 className="text-sm font-black text-slate-900 uppercase">NATIONAL FISHERIES RESEARCH AND DEVELOPMENT INSTITUTE</h4>
                  <p className="text-xs font-bold text-slate-700 uppercase">PROPERTY TRANSFER REPORT / ACKNOWLEDGEMENT RECEIPT</p>
                  <p className="text-[10px] text-slate-500 font-mono">Reference No: {selectedAssignmentForPrint.id || 'PTR-' + Date.now()}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 font-sans text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Effective Date:</span>
                    <p className="font-bold text-slate-900">{selectedAssignmentForPrint.assignmentDate}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Receiving Office / Station:</span>
                    <p className="font-bold text-slate-900">{selectedAssignmentForPrint.officeName || 'Assigned Department'}</p>
                  </div>
                </div>

                {/* Asset Details Table */}
                <div className="border border-slate-300 rounded-xl overflow-hidden font-sans">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-200 text-slate-700 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2.5">Property No.</th>
                        <th className="p-2.5">Article / Description</th>
                        <th className="p-2.5">Unit</th>
                        <th className="p-2.5 text-right">Unit Value (₱)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      <tr>
                        <td className="p-2.5 font-mono font-bold text-emerald-800">
                          {selectedAssignmentForPrint.propertyNumber}
                        </td>
                        <td className="p-2.5">
                          <div className="font-bold text-slate-900">{selectedAssignmentForPrint.article}</div>
                          {selectedAssignmentForPrint.description && (
                            <div className="text-[11px] text-slate-500">{selectedAssignmentForPrint.description}</div>
                          )}
                        </td>
                        <td className="p-2.5">{selectedAssignmentForPrint.unit || 'unit'}</td>
                        <td className="p-2.5 text-right font-mono font-bold">
                          {(selectedAssignmentForPrint.unitValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 font-sans">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Transfer Purpose / Remarks:</span>
                  <p className="text-xs text-slate-700 mt-0.5">{selectedAssignmentForPrint.remarks || 'Official assignment of property custody'}</p>
                </div>

                {/* Signatories Blocks */}
                <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-300 font-sans">
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transferred / Approved By:</p>
                    <div className="pt-6 border-b border-slate-400 text-center">
                      <p className="font-bold text-slate-900">{selectedAssignmentForPrint.transferredBy || 'Elmer G. Dolotallas'}</p>
                    </div>
                    <p className="text-[10px] text-center text-slate-500">Property & Supply Officer</p>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Received By (New Custodian):</p>
                    <div className="pt-6 border-b border-slate-400 text-center">
                      <p className="font-bold text-slate-900">{selectedAssignmentForPrint.employeeName}</p>
                    </div>
                    <p className="text-[10px] text-center text-slate-500">
                      {selectedAssignmentForPrint.employeePosition || 'Accountable Officer'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Modal: Assignment Detail Audit View */}
          {selectedAssignmentForDetails && (
            <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in no-print">
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-extrabold text-slate-900">Custody Audit Details</h3>
                  </div>
                  <button
                    onClick={() => setSelectedAssignmentForDetails(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Property Item</span>
                    <p className="font-bold text-slate-900 font-mono text-sm">{selectedAssignmentForDetails.propertyNumber}</p>
                    <p className="text-slate-700">{selectedAssignmentForDetails.article}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Previous Custodian</span>
                      <p className="font-bold text-slate-800 mt-1">
                        {selectedAssignmentForDetails.previousEmployeeName || 'Initial Registration'}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase">New Custodian</span>
                      <p className="font-bold text-emerald-950 mt-1">
                        {selectedAssignmentForDetails.employeeName}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Receiving Office</span>
                    <p className="font-semibold text-slate-800">{selectedAssignmentForDetails.officeName}</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Remarks</span>
                    <p className="text-slate-700">{selectedAssignmentForDetails.remarks}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Assignment Date</span>
                      <p className="font-mono font-bold text-slate-800">{selectedAssignmentForDetails.assignmentDate}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Authorized By</span>
                      <p className="font-bold text-slate-800">{selectedAssignmentForDetails.transferredBy}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setSelectedAssignmentForDetails(null)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Property QR Code Sticker Tag Printable Container (Direct Print) */}
          {selectedAssignmentForTag && (
            <div className="hidden print:block">
              {/* Printable Horizontal Rectangular Property Sticker Card */}
              <div
                id="property-tag-print-area"
                className="rounded-2xl bg-white border-2 border-slate-900 shadow-none font-sans overflow-hidden p-0 max-w-sm mx-auto"
              >
                {/* Header Band */}
                <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white px-3 py-2 flex items-center justify-between border-b-2 border-emerald-500">
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/nfsti logo.png" alt="Logo" className="w-6.5 h-6.5 object-contain shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-tight text-slate-100 leading-none">
                        NATIONAL FORENSIC SCIENCE TRAINING INSTITUTE
                      </p>

                      <p className="text-[9.5px] font-black text-emerald-400 uppercase tracking-tight mt-0.5">
                        PROPERTY & EQUIPMENT TAG
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-black text-slate-100 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md shadow-2xs">
                    NFSTI
                  </span>
                </div>

                {/* Main Horizontal Layout: Left QR Code | Right Metadata */}
                <div className="grid grid-cols-12 gap-2.5 items-center p-2.5">
                  <div className="col-span-5 flex flex-col items-center justify-center p-1 bg-white border-2 border-slate-900 rounded-xl h-full shadow-2xs">
                    <QRCodeDisplay
                      value={selectedAssignmentForTag.propertyNumber}
                      size={105}
                      includeDetails={false}
                    />
                    <div className="w-full mt-1 px-1 py-0.5 bg-slate-100 border border-slate-900 rounded-md text-center">
                      <p className="font-mono font-black text-slate-950 text-[10.5px] leading-tight break-all">
                        {selectedAssignmentForTag.propertyNumber}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-7 space-y-1.5 text-left">
                    <div className="bg-slate-100/90 p-1.5 rounded-xl border border-slate-900 space-y-0.5 shadow-2xs">
                      <span className="text-[8.5px] font-black text-slate-950 uppercase tracking-wider block">PROPERTY DESCRIPTION</span>
                      <p className="font-black text-slate-950 text-[13px] leading-snug line-clamp-2" title={getPropertyDescription(selectedAssignmentForTag.propertyId, selectedAssignmentForTag.propertyNumber, selectedAssignmentForTag.description, selectedAssignmentForTag.article)}>
                        {getPropertyDescription(selectedAssignmentForTag.propertyId, selectedAssignmentForTag.propertyNumber, selectedAssignmentForTag.description, selectedAssignmentForTag.article)}
                      </p>
                    </div>


                    {getPropertySerialNumber(selectedAssignmentForTag.propertyId, selectedAssignmentForTag.propertyNumber, selectedAssignmentForTag.serialNumber) ? (
                      <div className="bg-slate-950 text-white px-2 py-0.5 rounded-lg border border-slate-900 flex items-center justify-between shadow-2xs">
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider shrink-0">SERIAL NUMBER:</span>
                        <span className="font-mono font-black text-slate-100 text-[11px] truncate pl-1">
                          {getPropertySerialNumber(selectedAssignmentForTag.propertyId, selectedAssignmentForTag.propertyNumber, selectedAssignmentForTag.serialNumber)}
                        </span>
                      </div>
                    ) : null}

                    <div className="space-y-1 text-[11.5px] px-0.5">
                      <div>
                        <span className="text-[8.5px] font-black text-slate-950 uppercase tracking-wider block">ACCOUNTABLE CUSTODIAN</span>
                        <span className="font-black text-slate-950 text-[12px] block truncate">{selectedAssignmentForTag.employeeName}</span>
                      </div>
                      <div>
                        <span className="text-[8.5px] font-black text-slate-950 uppercase tracking-wider block">RECEIVING OFFICE</span>
                        <span className="font-extrabold text-slate-950 text-[11px] block truncate">{selectedAssignmentForTag.officeName}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Bar */}
                <div className="bg-slate-100/90 border-t-2 border-slate-900 px-3 py-1.5 space-y-1.5 font-sans">
                  <div className="flex items-center justify-between text-[10px]">
                    <div>
                      <span className="text-[9px] text-slate-950 font-black uppercase">ACQUISITION DATE: </span>
                      <span className="font-mono font-black text-slate-950 text-[11.5px]">
                        {getPropertyAcquisitionDate(selectedAssignmentForTag.propertyId, selectedAssignmentForTag.propertyNumber, selectedAssignmentForTag.acquisitionDate || selectedAssignmentForTag.assignmentDate)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-950 font-black uppercase">UNIT VALUE: </span>
                      <span className="font-mono font-black text-slate-950 text-[11.5px]">
                        ₱{(selectedAssignmentForTag.unitValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="border-t-2 border-slate-900 pt-1 pb-0.5 flex items-center justify-between text-[9.5px]">
                    <span className="text-[8.5px] text-slate-950 font-black uppercase tracking-wider shrink-0">DATE OF INVENTORY:</span>
                    <span className="font-mono font-black text-slate-950 text-[11px] tracking-widest pl-1">___________________________</span>
                  </div>
                </div>




              </div>
            </div>
          )}

      {/* Re-Assign / Transfer Property Modal */}
      {selectedAssignmentForReassign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Re-Assign & Transfer Property</h3>
                  <p className="text-xs text-slate-500">Update custodian, office location & generate sticker</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAssignmentForReassign(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Property Card Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-mono font-black text-emerald-800 text-xs">
                  {selectedAssignmentForReassign.propertyNumber}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Active Asset
                </span>
              </div>
              <p className="font-black text-slate-900 text-sm">{selectedAssignmentForReassign.article}</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Current Custodian</span>
                  <span className="font-bold text-slate-800">{selectedAssignmentForReassign.employeeName || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">Current Office</span>
                  <span className="font-bold text-slate-800">{selectedAssignmentForReassign.officeName || 'Supply Office'}</span>
                </div>
              </div>
            </div>

            {/* Re-Assignment Form Fields */}
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  New Accountable Custodian: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reassignEmployeeId}
                  onChange={(e) => setReassignEmployeeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
                >
                  <option value="">-- Select New Accountable Officer --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.position || 'Personnel'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1">
                  New Receiving Office / Location: <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reassignOfficeId}
                  onChange={(e) => setReassignOfficeId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
                >
                  <option value="">-- Select Destination Office --</option>
                  {offices.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.name || off.officeName} ({off.code || 'Office'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Transfer:</label>
                  <input
                    type="date"
                    value={reassignDate}
                    onChange={(e) => setReassignDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Authorized By:</label>
                  <input
                    type="text"
                    value={reassignAuthorizedBy}
                    onChange={(e) => setReassignAuthorizedBy(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transfer Remarks / Notes:</label>
                <textarea
                  rows={2}
                  value={reassignRemarks}
                  onChange={(e) => setReassignRemarks(e.target.value)}
                  placeholder="e.g. Reassigned per Office Order #2026-08 due to department reshuffling."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white resize-none shadow-2xs"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedAssignmentForReassign(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isReassignSubmitting}
                onClick={handleConfirmReassign}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isReassignSubmitting ? 'Saving Re-assignment...' : 'Confirm Re-Assign & Print Sticker Tag'}</span>
              </button>
            </div>
          </div>
        </div>
      )}


          {/* Printable Batch Property QR Code Stickers Layout (Hidden on screen, active directly during window.print()) */}

          <div className="hidden print:block">
            {stickerPages.map((pageItems, pageIdx) => (
              <div key={pageIdx} className="no-break-page flex flex-col items-center print:block print:w-[210mm] print:h-[297mm] print:m-0 print:p-0">
                {/* A4 Sheet Container - Edge to Edge Coupon Bond Paper (No Outer Rounded Box) */}
                <div className="a4-sticker-sheet w-[210mm] h-[297mm] bg-white p-3 flex flex-col justify-between font-sans border-none shadow-none rounded-none print:w-[210mm] print:h-[297mm] print:p-2 print:m-0">
                  {/* 2 columns x 4 rows Grid (8 Stickers per Sheet) */}
                  <div className="grid grid-cols-2 grid-rows-4 gap-2.5 h-full w-full">

                    {pageItems.map((item, idx) => (
                      <div
                        key={item.id || item.propertyNumber + idx}
                        className="border-2 border-slate-900 rounded-xl bg-white flex flex-col justify-between h-full overflow-hidden text-black box-border shadow-2xs print:shadow-none font-sans p-0"
                      >
                        {/* Top Header Band */}
                        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white px-2.5 py-1.5 flex items-center justify-between shrink-0 border-b-2 border-emerald-500">
                          <div className="flex items-center gap-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/nfsti logo.png" alt="Logo" className="w-5.5 h-5.5 object-contain shrink-0" />
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-tight text-slate-100 leading-none">
                                NATIONAL FORENSIC SCIENCE TRAINING INSTITUTE
                              </p>

                              <p className="text-[9px] font-black text-emerald-400 uppercase tracking-tight mt-0.5">
                                PROPERTY & EQUIPMENT TAG
                              </p>
                            </div>
                          </div>
                          <span className="text-[9.5px] font-mono font-black text-slate-100 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded shadow-2xs">
                            NFSTI
                          </span>

                        </div>

                        {/* Main Horizontal Content: Left QR Code | Right Specs */}
                        <div className="grid grid-cols-12 gap-2 p-2 items-center flex-1">
                          <div className="col-span-5 flex flex-col items-center justify-center p-1 bg-white border-2 border-slate-900 rounded-xl h-full shadow-2xs">
                            <QRCodeDisplay
                              value={item.propertyNumber}
                              size={82}
                              includeDetails={false}
                            />
                            <div className="w-full mt-1 px-1 py-0.5 bg-slate-100 border border-slate-900 rounded text-center">
                              <p className="font-mono font-black text-slate-950 text-[10px] leading-tight break-all">
                                {item.propertyNumber}
                              </p>
                            </div>
                          </div>

                          <div className="col-span-7 flex flex-col justify-between h-full py-0.5 space-y-1 text-left">
                            <div className="bg-slate-100/90 p-1.5 rounded-lg border border-slate-900 space-y-0.5 shadow-2xs">
                              <span className="text-[8.5px] font-black text-slate-950 uppercase tracking-wider block">PROPERTY DESCRIPTION</span>
                              <p className="font-black text-slate-950 text-[12.5px] leading-tight line-clamp-2" title={getPropertyDescription(item.propertyId, item.propertyNumber, item.description, item.article)}>
                                {getPropertyDescription(item.propertyId, item.propertyNumber, item.description, item.article)}
                              </p>
                            </div>


                            {getPropertySerialNumber(item.propertyId, item.propertyNumber, item.serialNumber) ? (
                              <div className="bg-slate-950 text-white px-1.5 py-0.5 rounded border border-slate-900 flex items-center justify-between shadow-2xs">
                                <span className="text-[7.5px] font-black text-emerald-400 uppercase tracking-wider shrink-0">SERIAL NUMBER:</span>
                                <span className="font-mono font-black text-slate-100 text-[9.5px] truncate text-right pl-1" title={getPropertySerialNumber(item.propertyId, item.propertyNumber, item.serialNumber)}>
                                  {getPropertySerialNumber(item.propertyId, item.propertyNumber, item.serialNumber)}
                                </span>
                              </div>
                            ) : null}

                            <div className="space-y-0.5 text-[10.5px] px-0.5">
                              <div>
                                <span className="text-[8px] font-black text-slate-950 uppercase tracking-wider block">ACCOUNTABLE CUSTODIAN</span>
                                <p className="font-black text-slate-950 text-[11.5px] truncate" title={item.employeeName}>
                                  {item.employeeName || 'Unassigned'}
                                </p>
                              </div>
                              <div>
                                <span className="text-[8px] font-black text-slate-950 uppercase tracking-wider block">RECEIVING OFFICE</span>
                                <p className="font-extrabold text-slate-950 text-[10.5px] truncate" title={item.officeName}>
                                  {item.officeName || 'Supply Office'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer Bar */}
                        <div className="bg-slate-100/90 border-t-2 border-slate-900 px-2.5 py-1 space-y-1 font-sans shrink-0">
                          <div className="flex items-center justify-between text-[9.5px]">
                            <div>
                              <span className="text-[8.5px] text-slate-950 font-black uppercase">ACQUISITION DATE: </span>
                              <span className="font-mono font-black text-slate-950 text-[10.5px]">
                                {getPropertyAcquisitionDate(item.propertyId, item.propertyNumber, item.acquisitionDate || item.assignmentDate)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[8.5px] text-slate-950 font-black uppercase">VALUE: </span>
                              <span className="font-mono font-black text-slate-950 text-[11px]">
                                ₱{(item.unitValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>

                          <div className="border-t-2 border-slate-900 pt-1 pb-0.5 flex items-center justify-between text-[9px]">
                            <span className="text-[8px] text-slate-950 font-black uppercase tracking-wider shrink-0">DATE OF INVENTORY:</span>
                            <span className="font-mono font-black text-slate-950 text-[10px] tracking-widest pl-1">______________________</span>
                          </div>
                        </div>



                      </div>


                    ))}

                    {/* Fill empty grid slots if page has less than 8 items */}
                    {Array.from({ length: STICKERS_PER_PAGE - pageItems.length }).map((_, emptyIdx) => (
                      <div
                        key={`empty-${emptyIdx}`}
                        className="border-2 border-dashed border-slate-200 rounded-xl p-3 bg-slate-50/40 flex items-center justify-center text-slate-300 text-[10px] font-bold uppercase print:border-none print:bg-transparent print:invisible"
                      >
                        Empty Sticker Slot
                      </div>
                    ))}


                  </div>
                </div>
              </div>
            ))}
          </div>


        </main>

      </div>
    </div>
  );
}

export default function AssignmentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Assignments...</div>}>
      <AssignmentsContent />
    </Suspense>
  );
}
