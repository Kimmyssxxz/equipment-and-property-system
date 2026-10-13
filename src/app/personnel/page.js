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
  Printer,
  FileText,
  Download,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Layers,
} from 'lucide-react';
import { StorageManager, authFetch, initialSettings, initialSignatoriesConfig } from '@/lib/storage';

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
  const [settings, setSettings] = useState(initialSettings || null);
  const [signatories, setSignatories] = useState(initialSignatoriesConfig || null);

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

  // Official Custodian Slip Modal (ICS < 50k, PAR >= 50k)
  const [slipModal, setSlipModal] = useState({
    isOpen: false,
    type: 'PAR', // 'ICS' (< ₱50k RPCSP) or 'PAR' (≥ ₱50k RPCPPE)
    employee: null,
    selectedItemIds: [],
    controlNo: '',
    entityName: 'NFSTI',
    fundCluster: '',
    issuedDate: new Date().toISOString().slice(0, 10),
    issuedByName: 'ELMER G. DOLOTALLAS',
    issuedByPosition: 'Supply Accountable Officer',
    receivedByName: '',
    receivedByPosition: '',
  });

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

  // Load live data from database (User-Scoped)
  const loadData = async () => {
    setLoading(true);
    setIsTableMissing(false);
    try {
      const activeUser = StorageManager.getActiveUser();
      const currentUsername = (activeUser?.username || 'edolotallas').toLowerCase().trim();

      setCounts(StorageManager.getPhysicalCounts() || []);

      // Fetch live employees, offices, properties, assignments, and settings concurrently
      const [empRes, offRes, propRes, asgnRes, setRes] = await Promise.all([
        authFetch('/api/personnel', { cache: 'no-store' }),
        authFetch('/api/offices', { cache: 'no-store' }),
        authFetch('/api/properties', { cache: 'no-store' }),
        authFetch('/api/assignments', { cache: 'no-store' }),
        authFetch('/api/settings', { cache: 'no-store' }),
      ]);

      const empData = await parseJsonSafely(empRes);
      const offData = await parseJsonSafely(offRes);
      const propData = await parseJsonSafely(propRes);
      const asgnData = await parseJsonSafely(asgnRes);
      const setData = await parseJsonSafely(setRes);

      if (setData && (setData.settings || setData.signatories)) {
        if (setData.settings) setSettings(setData.settings);
        if (setData.signatories) setSignatories(setData.signatories);
      }

      const isOwner = (item) => {
        const creator = (item.createdBy || item.encodedBy || 'edolotallas').toLowerCase().trim();
        if (currentUsername === 'queenie_ppsc') return creator === 'queenie_ppsc' || creator.includes('queenie');
        if (currentUsername === 'edolotallas') return creator === 'edolotallas' || (!creator.includes('queenie') && creator !== 'queenie_ppsc');
        return creator === currentUsername;
      };

      if (offData.success && Array.isArray(offData.offices)) {
        const userOffices = offData.offices.filter(isOwner);
        setOffices(userOffices);
        StorageManager.saveOffices(userOffices);
      } else {
        setOffices([]);
      }

      if (empData.tableMissing) {
        setIsTableMissing(true);
        setEmployees([]);
      } else if (empData.success && Array.isArray(empData.employees)) {
        const userEmployees = empData.employees.filter(isOwner);
        setEmployees(userEmployees);
        StorageManager.saveEmployees(userEmployees);
      } else {
        setEmployees([]);
      }

      if (propData.success && Array.isArray(propData.properties)) {
        const userProps = propData.properties.filter(isOwner);
        setProperties(userProps);
        StorageManager.saveProperties(userProps);
      } else {
        setProperties([]);
      }

      if (asgnData.success && Array.isArray(asgnData.assignments)) {
        const userAsgns = asgnData.assignments.filter((asgn) => {
          const transBy = (asgn.transferredBy || asgn.createdBy || asgn.encodedBy || '').toLowerCase();
          return isOwner(asgn) || transBy.includes(currentUsername);
        });
        setAssignmentsHistory(userAsgns);
        StorageManager.saveAssignmentsHistory(userAsgns);
      } else {
        setAssignmentsHistory([]);
      }
    } catch (err) {
      console.error('Failed to load personnel data:', err);
      setEmployees([]);
      setOffices([]);
      setProperties([]);
      setAssignmentsHistory([]);
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

  const getItemCost = (p) => {
    if (!p) return 0;
    const val = p.unitValue ?? p.unit_value ?? p.cost ?? 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getItemQty = (p) => {
    if (!p) return 1;
    const q = p.quantityPerCard ?? p.quantity_per_card ?? p.quantity ?? 1;
    const parsed = parseInt(q, 10);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  };

  // Formatters for NFSTI Official Documents (PAR / ICS)
  const formatLongDate = (d) => {
    if (!d) return '';
    const dateOnly = String(d).split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const dt = new Date(year, month, day);
      if (!isNaN(dt.getTime())) {
        return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    }
    const dt = new Date(d);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return String(d);
  };

  const formatAcquiredDate = (d) => {
    if (!d) return '';
    const dateOnly = String(d).split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${month}/${day}/${year}`;
    }
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  };

  const formatPropertyDescription = (p) => {
    if (!p) return { mainDesc: 'Equipment', serialNo: '' };
    const parts = [];
    if (p.article) parts.push(p.article);
    if (p.brand && !parts.some((pt) => pt.toLowerCase().includes(p.brand.toLowerCase()))) {
      parts.push(p.brand);
    }
    if (p.model && !parts.some((pt) => pt.toLowerCase().includes(p.model.toLowerCase()))) {
      parts.push(p.model);
    }
    if (p.specs || p.specifications) {
      parts.push(p.specs || p.specifications);
    }
    if (p.description) {
      const cleanDesc = p.description.trim();
      if (!parts.some((pt) => pt.toLowerCase().includes(cleanDesc.toLowerCase()))) {
        parts.push(cleanDesc);
      }
    }
    const mainDesc = parts.length > 0 ? parts.join(', ') : (p.article || p.name || 'Equipment');
    const sn = p.serialNumber || p.serial_number || p.sn || '';
    return {
      mainDesc,
      serialNo: sn ? `SN: ${sn}` : '',
    };
  };

  const totalValuation = properties.reduce(
    (sum, p) => sum + getItemCost(p) * getItemQty(p),
    0
  );

  // Calculations per employee (resolving direct properties & active assignment history)
  const getEmployeeStats = (empInput) => {
    if (!empInput) {
      return {
        propertiesCount: 0,
        totalValue: 0,
        assignedProperties: [],
        icsProperties: [],
        parProperties: [],
        icsCount: 0,
        parCount: 0,
        icsTotalValue: 0,
        parTotalValue: 0,
        countedCount: 0,
        pendingCount: 0,
        discrepanciesCount: 0,
      };
    }

    const empObj = typeof empInput === 'object' ? empInput : employees.find((e) => e.id === empInput || e.employeeId === empInput);
    const empId = empObj?.id || (typeof empInput === 'string' ? empInput : '');
    const empName = (empObj?.name || '').toLowerCase().trim();
    const empCode = (empObj?.employeeId || '').toLowerCase().trim();

    // 1. Sort assignments history newest first to locate the active current custodian of each property
    const sortedAsgns = [...assignmentsHistory].sort((a, b) => {
      const dateA = new Date(a.assignmentDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.assignmentDate || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const activeAssignmentsByProp = {};
    sortedAsgns.forEach((asgn) => {
      const propKey = asgn.propertyId || asgn.propertyNumber;
      if (propKey && !activeAssignmentsByProp[propKey]) {
        activeAssignmentsByProp[propKey] = asgn;
      }
    });

    const assignedProps = properties.filter((p) => {
      // Direct property accountable person ID check (highest priority single source of truth)
      const pEmpId = p.accountablePersonId || p.employeeId || p.employee_id || p.accountable_person_id;
      if (pEmpId) {
        if (empId && pEmpId === empId) return true;
        if (empCode && pEmpId.toLowerCase() === empCode) return true;
        // If property has an explicit accountablePersonId set to someone else, it does NOT belong to this employee
        return false;
      }

      // If property object has no accountablePersonId, check active assignment history (newest assignment)
      const activeAsgn = activeAssignmentsByProp[p.id] || activeAssignmentsByProp[p.propertyNumber];
      if (activeAsgn) {
        if (empId && activeAsgn.employeeId === empId) return true;
        if (empName && activeAsgn.employeeName && activeAsgn.employeeName.toLowerCase().trim() === empName) return true;
        return false;
      }

      // Check legacy name string fallback ONLY if property has no assigned custodian ID or history
      const pEmpName = (p.accountablePersonName || p.accountable_person_name || p.accountableOfficer || p.employeeName || '').toLowerCase().trim();
      if (empName && pEmpName && pEmpName === empName) return true;

      return false;
    });

    // Classification threshold:
    // ICS (Inventory Custodian Slip): Semi-Expendable items (< ₱50,000 / RPCSP)
    // PAR (Property Acknowledgement Receipt): Property, Plant & Equipment (≥ ₱50,000 / RPCPPE)
    const icsProperties = assignedProps.filter((p) => getItemCost(p) < 50000);
    const parProperties = assignedProps.filter((p) => getItemCost(p) >= 50000);

    const totalVal = assignedProps.reduce(
      (sum, p) => sum + getItemCost(p) * getItemQty(p),
      0
    );

    const icsTotalVal = icsProperties.reduce(
      (sum, p) => sum + getItemCost(p) * getItemQty(p),
      0
    );

    const parTotalVal = parProperties.reduce(
      (sum, p) => sum + getItemCost(p) * getItemQty(p),
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
      icsProperties,
      parProperties,
      icsCount: icsProperties.length,
      parCount: parProperties.length,
      icsTotalValue: icsTotalVal,
      parTotalValue: parTotalVal,
      countedCount: counted,
      pendingCount: pending,
      discrepanciesCount: discrepancies,
    };
  };

  const getOfficeName = (id) => {
    const found = offices.find((o) => o.id === id || o.code === id);
    return found ? `${found.name} (${found.code})` : 'Unassigned';
  };

  // Open Custodian Slip Modal (ICS / PAR)
  const openGenerateSlipModal = (emp, requestedType = 'PAR') => {
    if (!emp) return;
    const stats = getEmployeeStats(emp);
    
    // Choose appropriate type if requested has no items but other does
    let targetType = requestedType;
    if (requestedType === 'ICS' && stats.icsCount === 0 && stats.parCount > 0) {
      targetType = 'PAR';
    } else if (requestedType === 'PAR' && stats.parCount === 0 && stats.icsCount > 0) {
      targetType = 'ICS';
    }

    const targetItems = targetType === 'ICS' ? stats.icsProperties : stats.parProperties;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateFormatted = `${yyyy}-${mm}-${dd}`;
    const cleanId = String(emp.employeeId || '001').replace(/[^0-9]/g, '').slice(-4).padStart(4, '0') || '0020';
    
    // Exact PAR No format from official NFSTI document: 2026-10-08-0020 (YYYY-MM-DD-####)
    const autoControlNo = targetType === 'PAR' ? `${dateFormatted}-${cleanId}` : `ICS-${dateFormatted}-${cleanId}`;

    const activeUser = StorageManager.getActiveUser();
    const defaultIssuedName =
      signatories?.preparedByName ||
      signatories?.member1Name ||
      settings?.contactPerson ||
      activeUser?.fullName ||
      activeUser?.name ||
      'ELMER G. DOLOTALLAS';

    const defaultIssuedPos =
      signatories?.preparedByTitle ||
      'Supply Accountable Officer';

    setSlipModal({
      isOpen: true,
      type: targetType,
      employee: emp,
      selectedItemIds: targetItems.map((p) => p.id || p.propertyNumber),
      controlNo: autoControlNo,
      entityName: 'NFSTI',
      fundCluster: '',
      issuedDate: dateFormatted,
      issuedByName: defaultIssuedName,
      issuedByPosition: defaultIssuedPos,
      receivedByName: emp.name || '',
      receivedByPosition: emp.position || 'End User',
    });
  };

  const switchSlipType = (newType) => {
    if (!slipModal.employee) return;
    const stats = getEmployeeStats(slipModal.employee);
    const targetItems = newType === 'ICS' ? stats.icsProperties : stats.parProperties;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateFormatted = `${yyyy}-${mm}-${dd}`;
    const cleanId = String(slipModal.employee.employeeId || '001').replace(/[^0-9]/g, '').slice(-4).padStart(4, '0') || '0020';
    const autoControlNo = newType === 'PAR' ? `${dateFormatted}-${cleanId}` : `ICS-${dateFormatted}-${cleanId}`;
    
    setSlipModal((prev) => ({
      ...prev,
      type: newType,
      controlNo: autoControlNo,
      selectedItemIds: targetItems.map((p) => p.id || p.propertyNumber),
    }));
  };

  const toggleSlipItem = (itemId) => {
    setSlipModal((prev) => {
      const exists = prev.selectedItemIds.includes(itemId);
      return {
        ...prev,
        selectedItemIds: exists
          ? prev.selectedItemIds.filter((id) => id !== itemId)
          : [...prev.selectedItemIds, itemId],
      };
    });
  };

  const selectAllSlipItems = (items) => {
    setSlipModal((prev) => ({
      ...prev,
      selectedItemIds: items.map((p) => p.id || p.propertyNumber),
    }));
  };

  const deselectAllSlipItems = () => {
    setSlipModal((prev) => ({
      ...prev,
      selectedItemIds: [],
    }));
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const handleExportWordSlip = () => {
    if (!slipModal.employee) return;
    const emp = slipModal.employee;
    const stats = getEmployeeStats(emp);
    const isICS = slipModal.type === 'ICS';
    const allEligible = isICS ? stats.icsProperties : stats.parProperties;
    const selectedItems = allEligible.filter((p) =>
      slipModal.selectedItemIds.includes(p.id || p.propertyNumber)
    );

    const docTitle = isICS ? 'INVENTORY CUSTODIAN SLIP' : 'PROPERTY ACKNOWLEDGEMENT RECEIPT';
    const formCode = isICS ? 'PPSC-NFSTI-ICS-2018-01-F4' : 'PPSC-NFSTI-PAR-2018-01-F5';
    const controlLabel = isICS ? 'ICS NO.:' : 'PAR NO.:';
    const formattedDate = formatLongDate(slipModal.issuedDate);
    
    let rowsHtml = '';
    const minRows = 18;
    const usedRows = selectedItems.length + 1; // items + nothing follows row
    const emptyRowsCount = Math.max(0, minRows - usedRows);

    if (isICS) {
      rowsHtml = selectedItems.length > 0 ? selectedItems.map((p) => {
        const qty = getItemQty(p);
        const cost = getItemCost(p);
        const lineTotal = cost * qty;
        const descObj = formatPropertyDescription(p);
        const usefulLife = p.estimatedUsefulLife || (cost < 15000 ? '3 years' : '5 years');
        return `
          <tr>
            <td style="text-align:center;">${qty}</td>
            <td style="text-align:center;">${(p.unit || 'UNIT').toUpperCase()}</td>
            <td style="text-align:right;">₱${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="text-align:right; font-weight:bold;">₱${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td><strong>${descObj.mainDesc}</strong>${descObj.serialNo ? `<br><span style="font-size:8pt; font-family:monospace;">${descObj.serialNo}</span>` : ''}</td>
            <td style="text-align:center; font-family:monospace; font-weight:bold;">${p.propertyNumber || 'N/A'}</td>
            <td style="text-align:center;">${usefulLife}</td>
          </tr>
        `;
      }).join('') : `<tr><td colspan="7" style="text-align:center; padding:15px;">No items selected</td></tr>`;

      rowsHtml += `
        <tr>
          <td></td><td></td><td></td><td></td>
          <td style="text-align:center; font-family:monospace; font-style:italic; font-size:8pt;">x-x-x-x- x-x-nothing follows-x-x-x-x-x</td>
          <td></td><td></td>
        </tr>
      `;

      for (let i = 0; i < emptyRowsCount; i++) {
        rowsHtml += `<tr><td style="height:20px;"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`;
      }
    } else {
      // PAR format matching official NFSTI document
      rowsHtml = selectedItems.length > 0 ? selectedItems.map((p) => {
        const qty = getItemQty(p);
        const cost = getItemCost(p);
        const descObj = formatPropertyDescription(p);
        const acqDate = p.acquisitionDate ? formatAcquiredDate(p.acquisitionDate) : '';
        const amtStr = cost > 0 ? `₱ ${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
        return `
          <tr>
            <td style="text-align:center; font-weight:bold;">${qty}</td>
            <td style="text-align:center;">${(p.unit || 'UNIT').toUpperCase()}</td>
            <td>
              <strong>${descObj.mainDesc}</strong>
              ${descObj.serialNo ? `<br><span style="font-size:8pt; font-family:monospace;">${descObj.serialNo}</span>` : ''}
            </td>
            <td style="text-align:center; font-family:monospace; font-weight:bold;">${p.propertyNumber || ''}</td>
            <td style="text-align:center; font-family:monospace;">${acqDate}</td>
            <td style="text-align:right; font-family:monospace; font-weight:bold;">${amtStr}</td>
          </tr>
        `;
      }).join('') : `<tr><td colspan="6" style="text-align:center; padding:15px;">No items selected</td></tr>`;

      rowsHtml += `
        <tr>
          <td></td><td></td>
          <td style="text-align:center; font-family:monospace; font-style:italic; font-size:8pt;">x-x-x-x- x-x-nothing follows-x-x-x-x-x</td>
          <td></td><td></td><td></td>
        </tr>
      `;

      for (let i = 0; i < emptyRowsCount; i++) {
        rowsHtml += `<tr><td style="height:20px;"></td><td></td><td></td><td></td><td></td><td></td></tr>`;
      }
    }

    const htmlDocument = `
      <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${docTitle} - ${emp.name}</title>
        <style>
          @page WordSection1 { size: 8.5in 11.0in; margin: 0.5in 0.6in; }
          div.WordSection1 { page: WordSection1; font-family: Arial, sans-serif; font-size: 9pt; color: #000; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1pt solid #000; padding: 4px 6px; font-size: 8.5pt; vertical-align: top; }
          th { background-color: #ffffff; font-weight: bold; text-align: center; }
          .header-text { text-align: center; margin-bottom: 12px; }
          .header-text p { margin: 1px 0; }
        </style>
      </head>
      <body>
      <div class="WordSection1">
        <!-- Institutional Header -->
        <div class="header-text">
          <p style="font-size: 8.5pt;">Republic of the Philippines</p>
          <p style="font-size: 8.5pt;">Department of the Interior and Local Government</p>
          <p style="font-size: 9.5pt; font-weight: bold; color: #0284c7;">Philippine Public Safety College</p>
          <p style="font-size: 11pt; font-weight: bold; color: #166534; text-transform: uppercase;">NATIONAL FORENSIC SCIENCE TRAINING INSTITUTE</p>
          <p style="font-size: 8pt; color: #333;">Camp Vicente Lim, Calamba City, Laguna</p>
          <h2 style="margin: 14px 0 10px 0; font-size: 12pt; text-transform: uppercase; font-weight: bold; text-decoration: underline; text-align: center;">
            ${docTitle}
          </h2>
        </div>

        <!-- Meta Table -->
        <table style="width: 100%; border: none; margin-bottom: 6px;">
          <tr>
            <td style="border: none; width: 60%; padding: 2px 0;">
              <strong>Entity Name :</strong> <u style="font-weight: bold; text-transform: uppercase;">${slipModal.entityName || 'NFSTI'}</u><br>
              <strong>Fund Cluster:</strong> <u>${slipModal.fundCluster || '________________________'}</u>
            </td>
            <td style="border: none; width: 40%; text-align: right; padding: 2px 0;">
              <strong>${controlLabel}</strong> <u style="font-weight: bold; font-family: monospace;">${slipModal.controlNo}</u>
            </td>
          </tr>
        </table>

        <!-- Main Items Table -->
        <table>
          <thead>
            ${isICS ? `
              <tr>
                <th style="width: 7%;">QTY</th>
                <th style="width: 8%;">UNIT</th>
                <th style="width: 12%;">Unit Cost</th>
                <th style="width: 13%;">Total Cost</th>
                <th style="width: 34%;">DESCRIPTION</th>
                <th style="width: 16%;">Inventory Item No.</th>
                <th style="width: 10%;">Est. Useful Life</th>
              </tr>
            ` : `
              <tr>
                <th style="width: 7%;">QTY</th>
                <th style="width: 9%;">UNIT</th>
                <th style="width: 38%;">DESCRIPTION</th>
                <th style="width: 18%;">Property Number</th>
                <th style="width: 13%;">Date Acquired</th>
                <th style="width: 15%;">Amount</th>
              </tr>
            `}
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Signatures Table -->
        <table style="margin-top: -1px; width: 100%; border: 1pt solid #000;">
          <tr>
            <td style="width: 50%; border: 1pt solid #000; padding: 8px 12px; height: 160px; vertical-align: top;">
              <p style="margin: 0; font-weight: bold;">Received by:</p>
              <div style="height: 35px;"></div>
              <div style="text-align: center;">
                <p style="margin: 0; font-weight: bold; text-transform: uppercase; text-decoration: underline; font-size: 9.5pt;">
                  ${slipModal.receivedByName || emp.name}
                </p>
                <p style="margin: 2px 0 0 0; font-size: 8pt;">Signature Over Printed Name</p>
                <p style="margin: 0; font-size: 8pt;">of End User</p>
              </div>
              <div style="text-align: center; margin-top: 15px;">
                <p style="margin: 0; font-weight: bold; text-transform: uppercase; text-decoration: underline; font-size: 9pt;">
                  ${slipModal.receivedByPosition || emp.position || 'End User'}
                </p>
                <p style="margin: 2px 0 0 0; font-size: 8pt;">Position / Office</p>
              </div>
              <div style="text-align: center; margin-top: 15px;">
                <p style="margin: 0; text-decoration: underline; font-weight: bold; font-size: 9pt;">
                  ${formattedDate}
                </p>
                <p style="margin: 2px 0 0 0; font-size: 8pt;">Date</p>
              </div>
            </td>
            <td style="width: 50%; border: 1pt solid #000; padding: 8px 12px; height: 160px; vertical-align: top;">
              <p style="margin: 0; font-weight: bold;">Issued from:</p>
              <div style="height: 35px;"></div>
              <div style="text-align: center;">
                <p style="margin: 0; font-weight: bold; text-transform: uppercase; text-decoration: underline; font-size: 9.5pt;">
                  ${slipModal.issuedByName || 'ELMER G. DOLOTALLAS'}
                </p>
                <p style="margin: 2px 0 0 0; font-size: 8pt;">Signature Over Printed Name of Supply and/or</p>
                <p style="margin: 0; font-size: 8pt;">Property Custodian</p>
              </div>
              <div style="text-align: center; margin-top: 15px;">
                <p style="margin: 0; text-decoration: underline; font-weight: bold; font-size: 9pt;">
                  ${slipModal.issuedByPosition || 'Supply Accountable Officer'}
                </p>
                <p style="margin: 2px 0 0 0; font-size: 8pt;">Position / Office</p>
              </div>
              <div style="text-align: center; margin-top: 15px;">
                <p style="margin: 0; text-decoration: underline; font-weight: bold; font-size: 9pt;">
                  ${formattedDate}
                </p>
                <p style="margin: 2px 0 0 0; font-size: 8pt;">Date</p>
              </div>
            </td>
          </tr>
        </table>

        <!-- Form Code Footer -->
        <div style="text-align: right; margin-top: 4px;">
          <span style="font-family: monospace; font-size: 8pt; font-weight: bold;">
            ${formCode}
          </span>
        </div>
      </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlDocument], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slipModal.controlNo}_${emp.name.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

      const res = await authFetch(url, {
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

  // Delete Employee (Auto-unassigns assigned properties)
  const handleDeleteEmployee = async (emp) => {
    const stats = getEmployeeStats(emp.id);
    const confirmMsg = stats.propertiesCount > 0
      ? `Are you sure you want to remove "${emp.name}" (${emp.employeeId})?\n\nThis personnel currently has ${stats.propertiesCount} property item(s) under custody. Deleting will automatically unassign those properties.`
      : `Are you sure you want to remove "${emp.name}" (${emp.employeeId})?`;

    if (confirm(confirmMsg)) {
      try {
        const res = await authFetch(`/api/personnel?id=${encodeURIComponent(emp.id)}`, {
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
                <option value="ALL">All Deploying Areas</option>
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
                    Array.from({ length: 6 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse border-b border-slate-100">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-200/80 shrink-0"></div>
                            <div>
                              <div className="h-4 w-36 bg-slate-200/80 rounded-lg mb-1"></div>
                              <div className="h-3 w-20 bg-slate-100 rounded-md"></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-32 bg-slate-200/80 rounded-lg"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-4 w-28 bg-slate-200/80 rounded-lg"></div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="h-6 w-16 bg-slate-200/80 rounded-full"></div>
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
                        <tr
                          key={emp.id}
                          onClick={() => setSelectedEmployeeForDetails(emp)}
                          className="hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                          title="Click to view personnel details & accountability portfolio"
                        >
                          {/* ID & Name */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5">
                              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                              <span className="underline decoration-transparent group-hover:decoration-emerald-600 underline-offset-2 transition-all">
                                {emp.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60 inline-block mt-0.5 ml-5.5 group-hover:bg-emerald-100 transition-colors">
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

                          {/* Assigned Properties Count & Slip Breakdown */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1.5 items-start">
                              <span
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 group-hover:bg-emerald-100 transition-colors"
                              >
                                <Package className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{stats.propertiesCount} {stats.propertiesCount === 1 ? 'Item' : 'Items'}</span>
                              </span>
                              {stats.propertiesCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`text-[9.5px] font-black px-1.5 py-0.5 rounded border ${
                                      stats.icsCount > 0
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : 'bg-slate-50 text-slate-400 border-slate-200'
                                    }`}
                                    title={`${stats.icsCount} Semi-Expendable item(s) (< ₱50k) eligible for ICS`}
                                  >
                                    ICS: {stats.icsCount}
                                  </span>
                                  <span
                                    className={`text-[9.5px] font-black px-1.5 py-0.5 rounded border ${
                                      stats.parCount > 0
                                        ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                        : 'bg-slate-50 text-slate-400 border-slate-200'
                                    }`}
                                    title={`${stats.parCount} PPE item(s) (≥ ₱50k) eligible for PAR`}
                                  >
                                    PAR: {stats.parCount}
                                  </span>
                                </div>
                              )}
                            </div>
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
                          <td
                            className="py-3.5 px-4 text-right cursor-default"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-1.5">
                              {/* Quick Generate ICS (< 50k) */}
                              <button
                                onClick={() => openGenerateSlipModal(emp, 'ICS')}
                                disabled={stats.icsCount === 0}
                                title={
                                  stats.icsCount > 0
                                    ? `Generate Inventory Custodian Slip (ICS) for ${stats.icsCount} item(s) < ₱50k`
                                    : 'No RPCSP item (< ₱50k) assigned to this officer'
                                }
                                className={`px-2 py-1 rounded-xl text-[10px] font-black border transition-all cursor-pointer flex items-center gap-1 ${
                                  stats.icsCount > 0
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 shadow-2xs hover:scale-105'
                                    : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                }`}
                              >
                                <FileText className="w-3 h-3 text-amber-600" />
                                <span>ICS ({stats.icsCount})</span>
                              </button>

                              {/* Quick Generate PAR (>= 50k) */}
                              <button
                                onClick={() => openGenerateSlipModal(emp, 'PAR')}
                                disabled={stats.parCount === 0}
                                title={
                                  stats.parCount > 0
                                    ? `Generate Property Acknowledgement Receipt (PAR) for ${stats.parCount} item(s) ≥ ₱50k`
                                    : 'No RPCPPE item (≥ ₱50k) assigned to this officer'
                                }
                                className={`px-2 py-1 rounded-xl text-[10px] font-black border transition-all cursor-pointer flex items-center gap-1 ${
                                  stats.parCount > 0
                                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border-indigo-300 shadow-2xs hover:scale-105'
                                    : 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed'
                                }`}
                              >
                                <FileText className="w-3 h-3 text-indigo-600" />
                                <span>PAR ({stats.parCount})</span>
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
                    Assigned Deploying Area *
                  </label>
                  {offices.length === 0 ? (
                    <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                      No registered deploying areas found in database. Please{' '}
                      <Link href="/offices" className="underline font-bold text-amber-900">
                        create a deploying area first
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
                      <option value="">-- Select Deploying Area --</option>
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
                const stats = getEmployeeStats(selectedEmployeeForDetails);
                return (
                  <>
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

                    {/* Official Custodian Slips Generation Action Bar */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-emerald-50/40 to-slate-50 border border-emerald-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                            Official Government Custodian Slips
                          </h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                            COA / GAM Compliant
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Generate official, print-ready slips and Word documents classified by valuation threshold:
                          <strong className="text-amber-800 ml-1">ICS (&lt; ₱50,000 Semi-Expendable)</strong> and 
                          <strong className="text-indigo-800 ml-1">PAR (≥ ₱50,000 PPE)</strong>.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                        {/* ICS Button */}
                        <button
                          onClick={() => openGenerateSlipModal(selectedEmployeeForDetails, 'ICS')}
                          disabled={stats.icsCount === 0}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                            stats.icsCount > 0
                              ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-200 hover:scale-102'
                              : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <div className="text-left">
                            <div className="leading-tight">Generate ICS Slip</div>
                            <div className="text-[9.5px] opacity-90 font-medium">
                              {stats.icsCount > 0 ? `${stats.icsCount} item(s) < ₱50k` : 'No item < ₱50k'}
                            </div>
                          </div>
                        </button>

                        {/* PAR Button */}
                        <button
                          onClick={() => openGenerateSlipModal(selectedEmployeeForDetails, 'PAR')}
                          disabled={stats.parCount === 0}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                            stats.parCount > 0
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-md shadow-indigo-200 hover:scale-102'
                              : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <div className="text-left">
                            <div className="leading-tight">Generate PAR Slip</div>
                            <div className="text-[9.5px] opacity-90 font-medium">
                              {stats.parCount > 0 ? `${stats.parCount} item(s) ≥ ₱50k` : 'No item ≥ ₱50k'}
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
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
                        <th className="py-2.5 px-3">Classification</th>
                        <th className="py-2.5 px-3">PO Reference</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {getEmployeeStats(selectedEmployeeForDetails).assignedProperties.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            No active properties currently assigned to this officer.
                          </td>
                        </tr>
                      ) : (
                        getEmployeeStats(selectedEmployeeForDetails).assignedProperties.map((p) => {
                          const cost = getItemCost(p);
                          const isICS = cost < 50000;
                          return (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-3 px-3 font-mono font-bold text-emerald-800">{p.propertyNumber}</td>
                              <td className="py-3 px-3">
                                <span className="font-bold text-slate-900">{p.article}</span>
                                <p className="text-[10px] text-slate-400 line-clamp-1">{p.description}</p>
                              </td>
                              <td className="py-3 px-3 font-black text-slate-900">₱{cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                              <td className="py-3 px-3">
                                {isICS ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    <span>ICS (&lt; ₱50k)</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                    <span>PAR (≥ ₱50k)</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-slate-600">{p.poNumber || 'N/A'}</td>
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

      {/* ================= MODAL: GENERATE INVENTORY CUSTODIAN SLIP (ICS) / PROPERTY ACKNOWLEDGEMENT RECEIPT (PAR) ================= */}
      {slipModal.isOpen && slipModal.employee && (() => {
        const emp = slipModal.employee;
        const stats = getEmployeeStats(emp);
        const isICS = slipModal.type === 'ICS';
        const eligibleItems = isICS ? stats.icsProperties : stats.parProperties;
        const selectedItems = eligibleItems.filter((p) =>
          slipModal.selectedItemIds.includes(p.id || p.propertyNumber)
        );

        const totalQty = selectedItems.reduce((acc, p) => acc + getItemQty(p), 0);
        const totalAmount = selectedItems.reduce((acc, p) => acc + getItemCost(p) * getItemQty(p), 0);

        const orgName = settings?.orgName || 'NATIONAL FISHERIES RESEARCH AND DEVELOPMENT INSTITUTE';
        const officeAddr = settings?.officeAddress || 'Corporate 101 Bldg., Mother Ignacia Ave., Quezon City';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs no-print">
            <div className="bg-slate-100 w-full max-w-5xl rounded-3xl border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
              
              {/* Modal Top Header Bar */}
              <div className={`px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white ${
                isICS ? 'bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 border-amber-500' : 'bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 border-indigo-600'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-white">
                        {isICS ? 'Inventory Custodian Slip (ICS)' : 'Property Acknowledgement Receipt (PAR)'}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/30">
                        {isICS ? 'COA Appendix 59 • RPCSP (< ₱50,000)' : 'COA Appendix 71 • RPCPPE (≥ ₱50,000)'}
                      </span>
                    </div>
                    <p className="text-xs text-white/80">
                      Custodian: <strong className="text-white underline">{emp.name}</strong> ({emp.employeeId}) • {emp.position}
                    </p>
                  </div>
                </div>

                {/* Right Top Actions */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={handleExportWordSlip}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-all cursor-pointer backdrop-blur-xs border border-white/30"
                    title="Export formatted slip as Microsoft Word Document (.doc)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save Word (.doc)</span>
                  </button>

                  <button
                    onClick={handlePrintSlip}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-slate-900 hover:bg-slate-100 text-xs font-extrabold shadow-md transition-all cursor-pointer"
                    title="Directly print slip or save as PDF"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Print Slip / PDF</span>
                  </button>

                  <button
                    onClick={() => setSlipModal((prev) => ({ ...prev, isOpen: false, employee: null }))}
                    className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer ml-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Subheader: Mode Switcher Tab Bar */}
              <div className="bg-white px-6 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Slip Type:</span>
                  <button
                    onClick={() => switchSlipType('ICS')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isICS
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-800'
                    }`}
                  >
                    <span>ICS (Semi-Expendable &lt; ₱50k)</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
                      {stats.icsCount}
                    </span>
                  </button>

                  <button
                    onClick={() => switchSlipType('PAR')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      !isICS
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-800'
                    }`}
                  >
                    <span>PAR (PPE ≥ ₱50k)</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-white">
                      {stats.parCount}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Selected: <strong className="text-slate-900">{selectedItems.length}</strong> of {eligibleItems.length} items</span>
                  <span className="text-slate-300">|</span>
                  <span>Total: <strong className="text-emerald-700 font-mono">₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong></span>
                </div>
              </div>

              {/* Slip Metadata & Parameters Controls Form */}
              <div className="bg-slate-50 px-6 py-2.5 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Entity Name
                  </label>
                  <input
                    type="text"
                    value={slipModal.entityName || ''}
                    onChange={(e) => setSlipModal({ ...slipModal, entityName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    placeholder="e.g. NFSTI"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Fund Cluster
                  </label>
                  <input
                    type="text"
                    value={slipModal.fundCluster || ''}
                    onChange={(e) => setSlipModal({ ...slipModal, fundCluster: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-medium text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    placeholder="Leave blank or e.g. 01"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {isICS ? 'ICS NO.' : 'PAR NO.'}
                  </label>
                  <input
                    type="text"
                    value={slipModal.controlNo}
                    onChange={(e) => setSlipModal({ ...slipModal, controlNo: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    placeholder="e.g. 2026-10-08-0020"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Document Date
                  </label>
                  <input
                    type="date"
                    value={slipModal.issuedDate}
                    onChange={(e) => setSlipModal({ ...slipModal, issuedDate: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-medium text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-2 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Received by (End User Name)
                  </label>
                  <input
                    type="text"
                    value={slipModal.receivedByName}
                    onChange={(e) => setSlipModal({ ...slipModal, receivedByName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold uppercase text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    placeholder="e.g. PCOL. ATTY. ERCY NANETTE P MADRIAGA, DPSSG"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    End User Position / Office
                  </label>
                  <input
                    type="text"
                    value={slipModal.receivedByPosition}
                    onChange={(e) => setSlipModal({ ...slipModal, receivedByPosition: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-medium text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    placeholder="e.g. DIRECTOR"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Issued from (Supply Custodian)
                  </label>
                  <input
                    type="text"
                    value={slipModal.issuedByName}
                    onChange={(e) => setSlipModal({ ...slipModal, issuedByName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold uppercase text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    placeholder="e.g. ELMER G. DOLOTALLAS"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Supply Custodian Position
                  </label>
                  <input
                    type="text"
                    value={slipModal.issuedByPosition}
                    onChange={(e) => setSlipModal({ ...slipModal, issuedByPosition: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-medium text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    placeholder="e.g. Supply Accountable Officer"
                  />
                </div>
              </div>

              {/* Item Selection Toolbar (Chips / Checkboxes) */}
              {eligibleItems.length > 1 && (
                <div className="bg-white/80 px-6 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500">Filter Items on this Slip:</span>
                    <button
                      onClick={() => selectAllSlipItems(eligibleItems)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Select All ({eligibleItems.length})
                    </button>
                    <button
                      onClick={deselectAllSlipItems}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-all cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5">
                    {eligibleItems.map((p) => {
                      const id = p.id || p.propertyNumber;
                      const selected = slipModal.selectedItemIds.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => toggleSlipItem(id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                            selected
                              ? isICS
                                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                                : 'bg-indigo-100 text-indigo-900 border-indigo-300 shadow-2xs'
                              : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {selected ? <CheckSquare className="w-3 h-3 text-emerald-700" /> : <Square className="w-3 h-3 text-slate-400" />}
                          <span className="font-mono">{p.propertyNumber}</span>
                          <span className="max-w-[120px] truncate">({p.article})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Scrollable WYSIWYG Document Viewer Sheet */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-200/60 flex justify-center">
                {eligibleItems.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center max-w-md my-auto shadow-md border border-slate-200 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900">
                      No {isICS ? 'RPCSP (< ₱50k)' : 'RPCPPE (≥ ₱50k)'} items assigned
                    </h4>
                    <p className="text-xs text-slate-500">
                      {isICS
                        ? `Officer ${emp.name} has no semi-expendable properties valued under ₱50,000. Switch to PAR to view items valued ₱50,000 and above.`
                        : `Officer ${emp.name} has no capitalized equipment valued ₱50,000 and above. Switch to ICS to view semi-expendable items.`}
                    </p>
                    <button
                      onClick={() => switchSlipType(isICS ? 'PAR' : 'ICS')}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Switch to {isICS ? 'PAR (Property Acknowledgement Receipt)' : 'ICS (Inventory Custodian Slip)'}
                    </button>
                  </div>
                ) : selectedItems.length === 0 ? (
                  <div className="bg-white rounded-3xl p-12 text-center max-w-md my-auto shadow-md border border-slate-200 space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                      <SlidersHorizontal className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900">No items selected</h4>
                    <p className="text-xs text-slate-500">
                      Please select at least one item from the toolbar above to generate the slip.
                    </p>
                    <button
                      onClick={() => selectAllSlipItems(eligibleItems)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                    >
                      Select All {eligibleItems.length} Items
                    </button>
                  </div>
                ) : (
                  <div className="bg-white w-full max-w-4xl p-6 sm:p-10 border border-slate-300 shadow-xl text-black font-sans text-xs">
                    {/* Institutional Header with Logos matching Official Form */}
                    <div className="flex items-center justify-between border-b border-black pb-3">
                      <div className="w-20 shrink-0 flex justify-start">
                        <img src="/PPSC.webp" alt="PPSC Logo" className="w-16 h-16 object-contain" />
                      </div>

                      <div className="text-center flex-1 space-y-0.5 px-2">
                        <p className="text-[11px] font-medium text-slate-800 leading-tight">Republic of the Philippines</p>
                        <p className="text-[11px] font-medium text-slate-800 leading-tight">Department of the Interior and Local Government</p>
                        <p className="text-[12px] font-bold text-sky-600 leading-tight">Philippine Public Safety College</p>
                        <p className="text-[13px] font-black text-emerald-800 uppercase tracking-wide leading-tight">
                          NATIONAL FORENSIC SCIENCE TRAINING INSTITUTE
                        </p>
                        <p className="text-[10px] text-slate-700 leading-tight">Camp Vicente Lim, Calamba City, Laguna</p>
                      </div>

                      <div className="w-20 shrink-0 flex justify-end">
                        <img src="/nfsti logo.png" alt="NFSTI Logo" className="w-16 h-16 object-contain" />
                      </div>
                    </div>

                    {/* Document Title */}
                    <div className="text-center my-3">
                      <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-black font-serif underline underline-offset-4">
                        {isICS ? 'INVENTORY CUSTODIAN SLIP' : 'PROPERTY ACKNOWLEDGEMENT RECEIPT'}
                      </h2>
                    </div>

                    {/* Meta Fields Grid matching Photo */}
                    <div className="flex items-start justify-between text-[11px] mb-2 px-1">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">Entity Name :</span>
                          <span className="font-bold underline text-black uppercase">{slipModal.entityName || 'NFSTI'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">Fund Cluster:</span>
                          <span className="underline text-black min-w-[120px] inline-block">{slipModal.fundCluster || '________________________'}</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-semibold text-slate-800">{isICS ? 'ICS NO.:' : 'PAR NO.:'}</span>
                          <span className="font-mono font-bold underline text-black text-xs">{slipModal.controlNo}</span>
                        </div>
                      </div>
                    </div>

                    {/* Main Items Table */}
                    <div className="border border-black overflow-hidden">
                      <table className="w-full text-left text-[11px] border-collapse border border-black">
                        {isICS ? (
                          <thead className="bg-slate-100 text-black text-center font-bold text-[10px] border-b border-black">
                            <tr>
                              <th className="border border-black p-1.5 w-[7%]">QTY</th>
                              <th className="border border-black p-1.5 w-[8%]">UNIT</th>
                              <th className="border border-black p-1.5 w-[12%]">Unit Cost</th>
                              <th className="border border-black p-1.5 w-[13%]">Total Cost</th>
                              <th className="border border-black p-1.5 w-[34%]">DESCRIPTION</th>
                              <th className="border border-black p-1.5 w-[16%]">Inventory Item No.</th>
                              <th className="border border-black p-1.5 w-[10%]">Est. Useful Life</th>
                            </tr>
                          </thead>
                        ) : (
                          <thead className="bg-slate-100 text-black text-center font-bold text-[10.5px] border-b border-black uppercase">
                            <tr>
                              <th className="border border-black p-1.5 w-[7%]">QTY</th>
                              <th className="border border-black p-1.5 w-[9%]">UNIT</th>
                              <th className="border border-black p-1.5 w-[38%]">DESCRIPTION</th>
                              <th className="border border-black p-1.5 w-[18%]">Property Number</th>
                              <th className="border border-black p-1.5 w-[13%]">Date Acquired</th>
                              <th className="border border-black p-1.5 w-[15%]">Amount</th>
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {selectedItems.map((p, idx) => {
                            const qty = getItemQty(p);
                            const cost = getItemCost(p);
                            const lineTotal = cost * qty;
                            const descObj = formatPropertyDescription(p);
                            const acqDate = p.acquisitionDate ? formatAcquiredDate(p.acquisitionDate) : '';
                            const amtStr = cost > 0 ? `₱ ${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
                            const usefulLife = p.estimatedUsefulLife || (cost < 15000 ? '3 years' : '5 years');

                            return isICS ? (
                              <tr key={idx} className="align-top">
                                <td className="border border-black p-1.5 text-center font-bold">{qty}</td>
                                <td className="border border-black p-1.5 text-center">{(p.unit || 'UNIT').toUpperCase()}</td>
                                <td className="border border-black p-1.5 text-right font-mono">
                                  ₱{cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="border border-black p-1.5 text-right font-mono font-bold">
                                  ₱{lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="border border-black p-1.5 leading-snug">
                                  <div className="font-bold text-slate-900">{descObj.mainDesc}</div>
                                  {descObj.serialNo && (
                                    <div className="text-[10px] font-mono text-slate-700 mt-0.5">{descObj.serialNo}</div>
                                  )}
                                </td>
                                <td className="border border-black p-1.5 text-center font-mono font-bold text-slate-900">{p.propertyNumber || 'N/A'}</td>
                                <td className="border border-black p-1.5 text-center">{usefulLife}</td>
                              </tr>
                            ) : (
                              <tr key={idx} className="align-top">
                                <td className="border border-black p-1.5 text-center font-bold">{qty}</td>
                                <td className="border border-black p-1.5 text-center">{(p.unit || 'UNIT').toUpperCase()}</td>
                                <td className="border border-black p-1.5 leading-snug text-left">
                                  <div className="font-bold text-slate-900">{descObj.mainDesc}</div>
                                  {descObj.serialNo && (
                                    <div className="text-[10px] font-mono text-slate-700 mt-0.5">{descObj.serialNo}</div>
                                  )}
                                </td>
                                <td className="border border-black p-1.5 text-center font-mono font-bold text-slate-900">{p.propertyNumber || ''}</td>
                                <td className="border border-black p-1.5 text-center font-mono text-[10.5px]">{acqDate}</td>
                                <td className="border border-black p-1.5 text-right font-mono font-bold">{amtStr}</td>
                              </tr>
                            );
                          })}

                          {/* Nothing Follows Row */}
                          <tr>
                            <td className="border border-black h-5"></td>
                            <td className="border border-black h-5"></td>
                            {isICS ? (
                              <>
                                <td className="border border-black h-5"></td>
                                <td className="border border-black h-5"></td>
                                <td className="border border-black px-2 py-0.5 text-center font-mono text-[10px] text-slate-600 italic">
                                  x-x-x-x- x-x-nothing follows-x-x-x-x-x
                                </td>
                                <td className="border border-black h-5"></td>
                                <td className="border border-black h-5"></td>
                              </>
                            ) : (
                              <>
                                <td className="border border-black px-2 py-0.5 text-center font-mono text-[10px] text-slate-600 italic">
                                  x-x-x-x- x-x-nothing follows-x-x-x-x-x
                                </td>
                                <td className="border border-black h-5"></td>
                                <td className="border border-black h-5"></td>
                                <td className="border border-black h-5"></td>
                              </>
                            )}
                          </tr>

                          {/* Empty Filler Rows */}
                          {Array.from({ length: Math.max(0, 18 - (selectedItems.length + 1)) }).map((_, rIdx) => (
                            <tr key={`fill-${rIdx}`} className="h-5">
                              <td className="border border-black h-5"></td>
                              <td className="border border-black h-5"></td>
                              <td className="border border-black h-5"></td>
                              <td className="border border-black h-5"></td>
                              <td className="border border-black h-5"></td>
                              {isICS && <td className="border border-black h-5"></td>}
                              {isICS && <td className="border border-black h-5"></td>}
                              {!isICS && <td className="border border-black h-5"></td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Dual Signatories Block (directly attached below table) */}
                    <div className="border border-black border-t-0 grid grid-cols-2 text-[11px]">
                      {/* Received by */}
                      <div className="p-3 border-r border-black flex flex-col justify-between min-h-[175px]">
                        <div>
                          <p className="font-bold text-black text-left text-[11px]">Received by:</p>
                          <div className="h-9"></div>
                          <div className="text-center space-y-0.5">
                            <p className="font-extrabold uppercase underline text-black text-[12px] tracking-wide">
                              {slipModal.receivedByName || emp.name}
                            </p>
                            <p className="text-[10px] text-black">Signature Over Printed Name</p>
                            <p className="text-[10px] text-black">of End User</p>
                          </div>
                        </div>

                        <div className="mt-3 text-center space-y-0.5">
                          <p className="font-extrabold uppercase underline text-black text-[11px]">
                            {slipModal.receivedByPosition || emp.position || 'End User'}
                          </p>
                          <p className="text-[10px] text-black">Position / Office</p>
                        </div>

                        <div className="mt-3 text-center space-y-0.5">
                          <p className="underline text-black font-semibold text-[11px]">
                            {formatLongDate(slipModal.issuedDate)}
                          </p>
                          <p className="text-[10px] text-black">Date</p>
                        </div>
                      </div>

                      {/* Issued from */}
                      <div className="p-3 flex flex-col justify-between min-h-[175px]">
                        <div>
                          <p className="font-bold text-black text-left text-[11px]">Issued from:</p>
                          <div className="h-9"></div>
                          <div className="text-center space-y-0.5">
                            <p className="font-extrabold uppercase underline text-black text-[12px] tracking-wide">
                              {slipModal.issuedByName || 'ELMER G. DOLOTALLAS'}
                            </p>
                            <p className="text-[10px] text-black">Signature Over Printed Name of Supply and/or</p>
                            <p className="text-[10px] text-black">Property Custodian</p>
                          </div>
                        </div>

                        <div className="mt-3 text-center space-y-0.5">
                          <p className="underline text-black font-semibold text-[11px]">
                            {slipModal.issuedByPosition || 'Supply Accountable Officer'}
                          </p>
                          <p className="text-[10px] text-black">Position / Office</p>
                        </div>

                        <div className="mt-3 text-center space-y-0.5">
                          <p className="underline text-black font-semibold text-[11px]">
                            {formatLongDate(slipModal.issuedDate)}
                          </p>
                          <p className="text-[10px] text-black">Date</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer Form Code */}
                    <div className="flex justify-end pt-1">
                      <span className="font-mono text-[9px] text-black font-bold tracking-wider">
                        {isICS ? 'PPSC-NFSTI-ICS-2018-01-F4' : 'PPSC-NFSTI-PAR-2018-01-F5'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  <span>Standard: <strong>{isICS ? 'PPSC-NFSTI ICS (RPCSP < ₱50,000)' : 'PPSC-NFSTI-PAR-2018-01-F5 (RPCPPE ≥ ₱50,000)'}</strong></span>
                  <span className="mx-2">•</span>
                  <span>Threshold: <strong>{isICS ? '< ₱50,000' : '≥ ₱50,000'}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSlipModal((prev) => ({ ...prev, isOpen: false, employee: null }))}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Close Preview
                  </button>
                  <button
                    onClick={handleExportWordSlip}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Word (.doc)</span>
                  </button>
                  <button
                    onClick={handlePrintSlip}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Slip / Save PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================= DIRECT PRINT CONTAINER (HIDDEN ON SCREEN, RENDERED IN PRINT MEDIA) ================= */}
      {slipModal.isOpen && slipModal.employee && (() => {
        const emp = slipModal.employee;
        const stats = getEmployeeStats(emp);
        const isICS = slipModal.type === 'ICS';
        const eligibleItems = isICS ? stats.icsProperties : stats.parProperties;
        const selectedItems = eligibleItems.filter((p) =>
          slipModal.selectedItemIds.includes(p.id || p.propertyNumber)
        );

        return (
          <div id="printable-ics-par-document" className="hidden print:block p-8 bg-white font-sans text-black text-xs">
            {/* Institutional Header with Logos */}
            <div className="flex items-center justify-between border-b border-black pb-3">
              <div className="w-20 shrink-0 flex justify-start">
                <img src="/PPSC.webp" alt="PPSC Logo" className="w-16 h-16 object-contain" />
              </div>

              <div className="text-center flex-1 space-y-0.5 px-2">
                <p className="text-[11px] font-medium text-black leading-tight">Republic of the Philippines</p>
                <p className="text-[11px] font-medium text-black leading-tight">Department of the Interior and Local Government</p>
                <p className="text-[12px] font-bold text-sky-700 leading-tight">Philippine Public Safety College</p>
                <p className="text-[13px] font-black text-emerald-900 uppercase tracking-wide leading-tight">
                  NATIONAL FORENSIC SCIENCE TRAINING INSTITUTE
                </p>
                <p className="text-[10px] text-black leading-tight">Camp Vicente Lim, Calamba City, Laguna</p>
              </div>

              <div className="w-20 shrink-0 flex justify-end">
                <img src="/nfsti logo.png" alt="NFSTI Logo" className="w-16 h-16 object-contain" />
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-3">
              <h2 className="text-base font-black uppercase tracking-wider text-black font-serif underline underline-offset-4">
                {isICS ? 'INVENTORY CUSTODIAN SLIP' : 'PROPERTY ACKNOWLEDGEMENT RECEIPT'}
              </h2>
            </div>

            {/* Meta Fields */}
            <div className="flex items-start justify-between text-[11px] mb-2 px-1">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-black">Entity Name :</span>
                  <span className="font-bold underline text-black uppercase">{slipModal.entityName || 'NFSTI'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-black">Fund Cluster:</span>
                  <span className="underline text-black min-w-[120px] inline-block">{slipModal.fundCluster || '________________________'}</span>
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-semibold text-black">{isICS ? 'ICS NO.:' : 'PAR NO.:'}</span>
                  <span className="font-mono font-bold underline text-black text-xs">{slipModal.controlNo}</span>
                </div>
              </div>
            </div>

            {/* Main Items Table */}
            <div className="border border-black overflow-hidden">
              <table className="w-full text-left text-[11px] border-collapse border border-black">
                {isICS ? (
                  <thead className="bg-slate-100 text-black text-center font-bold text-[10px] border-b border-black">
                    <tr>
                      <th className="border border-black p-1.5 w-[7%]">QTY</th>
                      <th className="border border-black p-1.5 w-[8%]">UNIT</th>
                      <th className="border border-black p-1.5 w-[12%]">Unit Cost</th>
                      <th className="border border-black p-1.5 w-[13%]">Total Cost</th>
                      <th className="border border-black p-1.5 w-[34%]">DESCRIPTION</th>
                      <th className="border border-black p-1.5 w-[16%]">Inventory Item No.</th>
                      <th className="border border-black p-1.5 w-[10%]">Est. Useful Life</th>
                    </tr>
                  </thead>
                ) : (
                  <thead className="bg-slate-100 text-black text-center font-bold text-[10.5px] border-b border-black uppercase">
                    <tr>
                      <th className="border border-black p-1.5 w-[7%]">QTY</th>
                      <th className="border border-black p-1.5 w-[9%]">UNIT</th>
                      <th className="border border-black p-1.5 w-[38%]">DESCRIPTION</th>
                      <th className="border border-black p-1.5 w-[18%]">Property Number</th>
                      <th className="border border-black p-1.5 w-[13%]">Date Acquired</th>
                      <th className="border border-black p-1.5 w-[15%]">Amount</th>
                    </tr>
                  </thead>
                )}
                <tbody>
                  {selectedItems.map((p, idx) => {
                    const qty = getItemQty(p);
                    const cost = getItemCost(p);
                    const lineTotal = cost * qty;
                    const descObj = formatPropertyDescription(p);
                    const acqDate = p.acquisitionDate ? formatAcquiredDate(p.acquisitionDate) : '';
                    const amtStr = cost > 0 ? `₱ ${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
                    const usefulLife = p.estimatedUsefulLife || (cost < 15000 ? '3 years' : '5 years');

                    return isICS ? (
                      <tr key={idx} className="align-top">
                        <td className="border border-black p-1.5 text-center font-bold">{qty}</td>
                        <td className="border border-black p-1.5 text-center">{(p.unit || 'UNIT').toUpperCase()}</td>
                        <td className="border border-black p-1.5 text-right font-mono">
                          ₱{cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="border border-black p-1.5 text-right font-mono font-bold">
                          ₱{lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="border border-black p-1.5 leading-snug">
                          <div className="font-bold text-black">{descObj.mainDesc}</div>
                          {descObj.serialNo && (
                            <div className="text-[10px] font-mono text-black mt-0.5">{descObj.serialNo}</div>
                          )}
                        </td>
                        <td className="border border-black p-1.5 text-center font-mono font-bold text-black">{p.propertyNumber || 'N/A'}</td>
                        <td className="border border-black p-1.5 text-center">{usefulLife}</td>
                      </tr>
                    ) : (
                      <tr key={idx} className="align-top">
                        <td className="border border-black p-1.5 text-center font-bold">{qty}</td>
                        <td className="border border-black p-1.5 text-center">{(p.unit || 'UNIT').toUpperCase()}</td>
                        <td className="border border-black p-1.5 leading-snug text-left">
                          <div className="font-bold text-black">{descObj.mainDesc}</div>
                          {descObj.serialNo && (
                            <div className="text-[10px] font-mono text-black mt-0.5">{descObj.serialNo}</div>
                          )}
                        </td>
                        <td className="border border-black p-1.5 text-center font-mono font-bold text-black">{p.propertyNumber || ''}</td>
                        <td className="border border-black p-1.5 text-center font-mono text-[10.5px]">{acqDate}</td>
                        <td className="border border-black p-1.5 text-right font-mono font-bold">{amtStr}</td>
                      </tr>
                    );
                  })}

                  {/* Nothing Follows Row */}
                  <tr>
                    <td className="border border-black h-5"></td>
                    <td className="border border-black h-5"></td>
                    {isICS ? (
                      <>
                        <td className="border border-black h-5"></td>
                        <td className="border border-black h-5"></td>
                        <td className="border border-black px-2 py-0.5 text-center font-mono text-[10px] text-black italic">
                          x-x-x-x- x-x-nothing follows-x-x-x-x-x
                        </td>
                        <td className="border border-black h-5"></td>
                        <td className="border border-black h-5"></td>
                      </>
                    ) : (
                      <>
                        <td className="border border-black px-2 py-0.5 text-center font-mono text-[10px] text-black italic">
                          x-x-x-x- x-x-nothing follows-x-x-x-x-x
                        </td>
                        <td className="border border-black h-5"></td>
                        <td className="border border-black h-5"></td>
                        <td className="border border-black h-5"></td>
                      </>
                    )}
                  </tr>

                  {/* Empty Filler Rows */}
                  {Array.from({ length: Math.max(0, 18 - (selectedItems.length + 1)) }).map((_, rIdx) => (
                    <tr key={`print-fill-${rIdx}`} className="h-5">
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5"></td>
                      <td className="border border-black h-5"></td>
                      {isICS && <td className="border border-black h-5"></td>}
                      {isICS && <td className="border border-black h-5"></td>}
                      {!isICS && <td className="border border-black h-5"></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Dual Signatories Block (directly attached below table) */}
            <div className="border border-black border-t-0 grid grid-cols-2 text-[11px]">
              {/* Received by */}
              <div className="p-3 border-r border-black flex flex-col justify-between min-h-[175px]">
                <div>
                  <p className="font-bold text-black text-left text-[11px]">Received by:</p>
                  <div className="h-9"></div>
                  <div className="text-center space-y-0.5">
                    <p className="font-extrabold uppercase underline text-black text-[12px] tracking-wide">
                      {slipModal.receivedByName || emp.name}
                    </p>
                    <p className="text-[10px] text-black">Signature Over Printed Name</p>
                    <p className="text-[10px] text-black">of End User</p>
                  </div>
                </div>

                <div className="mt-3 text-center space-y-0.5">
                  <p className="font-extrabold uppercase underline text-black text-[11px]">
                    {slipModal.receivedByPosition || emp.position || 'End User'}
                  </p>
                  <p className="text-[10px] text-black">Position / Office</p>
                </div>

                <div className="mt-3 text-center space-y-0.5">
                  <p className="underline text-black font-semibold text-[11px]">
                    {formatLongDate(slipModal.issuedDate)}
                  </p>
                  <p className="text-[10px] text-black">Date</p>
                </div>
              </div>

              {/* Issued from */}
              <div className="p-3 flex flex-col justify-between min-h-[175px]">
                <div>
                  <p className="font-bold text-black text-left text-[11px]">Issued from:</p>
                  <div className="h-9"></div>
                  <div className="text-center space-y-0.5">
                    <p className="font-extrabold uppercase underline text-black text-[12px] tracking-wide">
                      {slipModal.issuedByName || 'ELMER G. DOLOTALLAS'}
                    </p>
                    <p className="text-[10px] text-black">Signature Over Printed Name of Supply and/or</p>
                    <p className="text-[10px] text-black">Property Custodian</p>
                  </div>
                </div>

                <div className="mt-3 text-center space-y-0.5">
                  <p className="underline text-black font-semibold text-[11px]">
                    {slipModal.issuedByPosition || 'Supply Accountable Officer'}
                  </p>
                  <p className="text-[10px] text-black">Position / Office</p>
                </div>

                <div className="mt-3 text-center space-y-0.5">
                  <p className="underline text-black font-semibold text-[11px]">
                    {formatLongDate(slipModal.issuedDate)}
                  </p>
                  <p className="text-[10px] text-black">Date</p>
                </div>
              </div>
            </div>

            {/* Footer Form Code */}
            <div className="flex justify-end pt-1">
              <span className="font-mono text-[9px] text-black font-bold tracking-wider">
                {isICS ? 'PPSC-NFSTI-ICS-2018-01-F4' : 'PPSC-NFSTI-PAR-2018-01-F5'}
              </span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
