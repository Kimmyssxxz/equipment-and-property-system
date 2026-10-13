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
    type: 'ICS', // 'ICS' (< ₱50k RPCSP) or 'PAR' (≥ ₱50k RPCPPE)
    employee: null,
    selectedItemIds: [],
    controlNo: '',
    fundCluster: '01 - Regular Agency Fund',
    issuedDate: new Date().toISOString().slice(0, 10),
    issuedByName: '',
    issuedByPosition: 'Supply Officer / Property Custodian',
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
  const openGenerateSlipModal = (emp, requestedType = 'ICS') => {
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
    const year = new Date().getFullYear();
    const cleanId = String(emp.employeeId || '001').replace(/[^0-9]/g, '').slice(-4).padStart(4, '0') || '0001';
    const autoControlNo = `${targetType}-${year}-${cleanId}`;

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
      'Supply Accountable Officer / Property Custodian';

    setSlipModal({
      isOpen: true,
      type: targetType,
      employee: emp,
      selectedItemIds: targetItems.map((p) => p.id || p.propertyNumber),
      controlNo: autoControlNo,
      fundCluster: '01 - Regular Agency Fund',
      issuedDate: new Date().toISOString().slice(0, 10),
      issuedByName: defaultIssuedName,
      issuedByPosition: defaultIssuedPos,
      receivedByName: emp.name || '',
      receivedByPosition: `${emp.position || 'Accountable Officer'} - ${getOfficeName(emp.officeId)}`,
    });
  };

  const switchSlipType = (newType) => {
    if (!slipModal.employee) return;
    const stats = getEmployeeStats(slipModal.employee);
    const targetItems = newType === 'ICS' ? stats.icsProperties : stats.parProperties;
    const year = new Date().getFullYear();
    const cleanId = String(slipModal.employee.employeeId || '001').replace(/[^0-9]/g, '').slice(-4).padStart(4, '0') || '0001';
    
    setSlipModal((prev) => ({
      ...prev,
      type: newType,
      controlNo: `${newType}-${year}-${cleanId}`,
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

    const orgName = settings?.orgName || 'NATIONAL FISHERIES RESEARCH AND DEVELOPMENT INSTITUTE';
    const officeAddr = settings?.officeAddress || 'Corporate 101 Bldg., Mother Ignacia Ave., Quezon City';
    const docTitle = isICS ? 'INVENTORY CUSTODIAN SLIP' : 'PROPERTY ACKNOWLEDGEMENT RECEIPT';
    const appendixNo = isICS ? 'Appendix 59' : 'Appendix 71';
    const controlLabel = isICS ? 'ICS No.:' : 'PAR No.:';
    
    let rowsHtml = '';
    let totalQty = 0;
    let totalCost = 0;

    if (isICS) {
      rowsHtml = selectedItems.length > 0 ? selectedItems.map((p) => {
        const qty = getItemQty(p);
        const cost = getItemCost(p);
        const lineTotal = cost * qty;
        totalQty += qty;
        totalCost += lineTotal;
        const brandStr = p.brand ? `Brand: ${p.brand}, ` : '';
        const modelStr = p.model ? `Model: ${p.model}, ` : '';
        const snStr = p.serialNumber ? `SN: ${p.serialNumber}, ` : '';
        const desc = `${p.article || 'Item'} - ${brandStr}${modelStr}${snStr}${p.description || ''}`;
        const usefulLife = p.estimatedUsefulLife || (cost < 15000 ? '3 years' : '5 years');
        return `
          <tr>
            <td style="text-align:center;">${qty}</td>
            <td style="text-align:center;">${p.unit || 'unit'}</td>
            <td style="text-align:right;">₱${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="text-align:right; font-weight:bold;">₱${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${desc}</td>
            <td style="text-align:center; font-family:monospace; font-weight:bold;">${p.propertyNumber || 'N/A'}</td>
            <td style="text-align:center;">${usefulLife}</td>
          </tr>
        `;
      }).join('') : `<tr><td colspan="7" style="text-align:center; padding:15px;">No items selected</td></tr>`;
    } else {
      rowsHtml = selectedItems.length > 0 ? selectedItems.map((p) => {
        const qty = getItemQty(p);
        const cost = getItemCost(p);
        const lineTotal = cost * qty;
        totalQty += qty;
        totalCost += lineTotal;
        const brandStr = p.brand ? `Brand: ${p.brand}, ` : '';
        const modelStr = p.model ? `Model: ${p.model}, ` : '';
        const snStr = p.serialNumber ? `SN: ${p.serialNumber}, ` : '';
        const desc = `${p.article || 'Property'} - ${brandStr}${modelStr}${snStr}${p.description || ''}`;
        const acqDate = p.acquisitionDate ? new Date(p.acquisitionDate).toLocaleDateString() : 'N/A';
        return `
          <tr>
            <td style="text-align:center;">${qty}</td>
            <td style="text-align:center;">${p.unit || 'unit'}</td>
            <td>${desc}</td>
            <td style="text-align:center; font-family:monospace; font-weight:bold;">${p.propertyNumber || 'N/A'}</td>
            <td style="text-align:center;">${acqDate}</td>
            <td style="text-align:right;">₱${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="text-align:right; font-weight:bold;">₱${lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `;
      }).join('') : `<tr><td colspan="7" style="text-align:center; padding:15px;">No items selected</td></tr>`;
    }

    const htmlDocument = `
      <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${docTitle} - ${emp.name}</title>
        <style>
          @page WordSection1 { size: 8.5in 11.0in; margin: 0.6in; }
          div.WordSection1 { page: WordSection1; }
          body { font-family: Arial, sans-serif; font-size: 9.5pt; color: #000; }
          table { border-collapse: collapse; width: 100%; margin-top: 8px; }
          th, td { border: 1pt solid #000; padding: 4px 6px; font-size: 9pt; }
          th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
          .meta-table td { border: none; padding: 2px 4px; font-size: 9pt; }
          .sig-table td { border: 1pt solid #000; padding: 8px; vertical-align: top; }
        </style>
      </head>
      <body>
      <div class="WordSection1">
        <div style="text-align: right; font-size: 8pt; font-style: italic;">${appendixNo}</div>
        <div style="text-align: center; margin-bottom: 12px;">
          <p style="margin: 0; font-size: 8.5pt; text-transform: uppercase;">Republic of the Philippines</p>
          <h3 style="margin: 2px 0; font-size: 11pt; text-transform: uppercase;">${orgName}</h3>
          <p style="margin: 0; font-size: 8pt; color: #444;">${officeAddr}</p>
          <h2 style="margin: 10px 0 4px 0; font-size: 12pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">${docTitle}</h2>
        </div>

        <table class="meta-table" style="width: 100%; margin-bottom: 6px;">
          <tr>
            <td style="width: 60%;"><strong>Fund Cluster:</strong> <u>${slipModal.fundCluster || '01 - Regular Agency Fund'}</u></td>
            <td style="width: 40%; text-align: right;"><strong>${controlLabel}</strong> <u>${slipModal.controlNo}</u></td>
          </tr>
          <tr>
            <td><strong>Accountable Custodian:</strong> <u>${emp.name}</u></td>
            <td style="text-align: right;"><strong>Date:</strong> <u>${slipModal.issuedDate}</u></td>
          </tr>
          <tr>
            <td><strong>Position / Office:</strong> <u>${emp.position || 'Officer'} - ${getOfficeName(emp.officeId)}</u></td>
            <td style="text-align: right;"><strong>Employee ID:</strong> <u>${emp.employeeId}</u></td>
          </tr>
        </table>

        <table>
          <thead>
            ${isICS ? `
              <tr>
                <th style="width: 6%;">Qty</th>
                <th style="width: 7%;">Unit</th>
                <th style="width: 14%;">Unit Cost</th>
                <th style="width: 15%;">Total Cost</th>
                <th style="width: 32%;">Description</th>
                <th style="width: 16%;">Inventory Item No.</th>
                <th style="width: 10%;">Est. Useful Life</th>
              </tr>
            ` : `
              <tr>
                <th style="width: 6%;">Qty</th>
                <th style="width: 7%;">Unit</th>
                <th style="width: 35%;">Description</th>
                <th style="width: 16%;">Property Number</th>
                <th style="width: 12%;">Date Acquired</th>
                <th style="width: 12%;">Unit Value</th>
                <th style="width: 12%;">Total Amount</th>
              </tr>
            `}
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="font-weight: bold; background-color: #f9f9f9;">
              <td style="text-align: center;">${totalQty}</td>
              <td style="text-align: center;">units</td>
              ${isICS ? `
                <td colspan="1" style="text-align: right;">TOTAL:</td>
                <td style="text-align: right;">₱${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td colspan="3"></td>
              ` : `
                <td colspan="4" style="text-align: right;">TOTAL AMOUNT:</td>
                <td style="text-align: right;">₱${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              `}
            </tr>
          </tbody>
        </table>

        <!-- Signatures Table -->
        <table class="sig-table" style="margin-top: 15px; width: 100%;">
          ${isICS ? `
            <tr>
              <td style="width: 50%;">
                <p style="margin: 0 0 25px 0; font-size: 8.5pt;"><strong>Received from:</strong></p>
                <p style="margin: 0; text-align: center; font-weight: bold; text-transform: uppercase; text-decoration: underline;">${slipModal.issuedByName || 'ELMER G. DOLOTALLAS'}</p>
                <p style="margin: 2px 0 0 0; text-align: center; font-size: 8pt; color: #333;">${slipModal.issuedByPosition || 'Supply and/or Property Custodian'}</p>
                <p style="margin: 15px 0 0 0; font-size: 8pt;">Date: <u>${slipModal.issuedDate}</u></p>
              </td>
              <td style="width: 50%;">
                <p style="margin: 0 0 25px 0; font-size: 8.5pt;"><strong>Received by:</strong></p>
                <p style="margin: 0; text-align: center; font-weight: bold; text-transform: uppercase; text-decoration: underline;">${slipModal.receivedByName || emp.name}</p>
                <p style="margin: 2px 0 0 0; text-align: center; font-size: 8pt; color: #333;">${slipModal.receivedByPosition || emp.position}</p>
                <p style="margin: 15px 0 0 0; font-size: 8pt;">Date: <u>${slipModal.issuedDate}</u></p>
              </td>
            </tr>
          ` : `
            <tr>
              <td style="width: 50%;">
                <p style="margin: 0 0 25px 0; font-size: 8.5pt;"><strong>Received by:</strong></p>
                <p style="margin: 0; text-align: center; font-weight: bold; text-transform: uppercase; text-decoration: underline;">${slipModal.receivedByName || emp.name}</p>
                <p style="margin: 2px 0 0 0; text-align: center; font-size: 8pt; color: #333;">${slipModal.receivedByPosition || emp.position}</p>
                <p style="margin: 15px 0 0 0; font-size: 8pt;">Date: <u>${slipModal.issuedDate}</u></p>
              </td>
              <td style="width: 50%;">
                <p style="margin: 0 0 25px 0; font-size: 8.5pt;"><strong>Issued by:</strong></p>
                <p style="margin: 0; text-align: center; font-weight: bold; text-transform: uppercase; text-decoration: underline;">${slipModal.issuedByName || 'ELMER G. DOLOTALLAS'}</p>
                <p style="margin: 2px 0 0 0; text-align: center; font-size: 8pt; color: #333;">${slipModal.issuedByPosition || 'Supply and/or Property Custodian'}</p>
                <p style="margin: 15px 0 0 0; font-size: 8pt;">Date: <u>${slipModal.issuedDate}</u></p>
              </td>
            </tr>
          `}
        </table>
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
                        <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors group">
                          {/* ID & Name */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => setSelectedEmployeeForDetails(emp)}
                              className="text-left font-extrabold text-slate-900 hover:text-emerald-700 hover:underline transition-colors flex items-center gap-1.5 cursor-pointer group/name"
                              title="Click to view personnel details & accountability portfolio"
                            >
                              <UserCheck className="w-4 h-4 text-emerald-600 shrink-0 group-hover/name:scale-110 transition-transform" />
                              <span>{emp.name}</span>
                            </button>
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

                          {/* Assigned Properties Count & Slip Breakdown */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1.5 items-start">
                              <button
                                onClick={() => setSelectedEmployeeForDetails(emp)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                                title="Click to view assigned items & custody portfolio"
                              >
                                <Package className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{stats.propertiesCount} {stats.propertiesCount === 1 ? 'Item' : 'Items'}</span>
                              </button>
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
                          <td className="py-3.5 px-4 text-right">
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
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {isICS ? 'ICS Control No.' : 'PAR Control No.'}
                  </label>
                  <input
                    type="text"
                    value={slipModal.controlNo}
                    onChange={(e) => setSlipModal({ ...slipModal, controlNo: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-mono font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    placeholder="e.g. ICS-2026-0001"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Fund Cluster
                  </label>
                  <input
                    type="text"
                    value={slipModal.fundCluster}
                    onChange={(e) => setSlipModal({ ...slipModal, fundCluster: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-medium text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    placeholder="01 - Regular Agency Fund"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Slip Date
                  </label>
                  <input
                    type="date"
                    value={slipModal.issuedDate}
                    onChange={(e) => setSlipModal({ ...slipModal, issuedDate: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-medium text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {isICS ? 'Received from (Supply Officer)' : 'Issued by (Supply Officer)'}
                  </label>
                  <input
                    type="text"
                    value={slipModal.issuedByName}
                    onChange={(e) => setSlipModal({ ...slipModal, issuedByName: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-medium text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    placeholder="Officer Name"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Supply Officer Position
                  </label>
                  <input
                    type="text"
                    value={slipModal.issuedByPosition}
                    onChange={(e) => setSlipModal({ ...slipModal, issuedByPosition: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-medium text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                    placeholder="Supply Accountable Officer"
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
                  <div className="bg-white w-full max-w-4xl p-8 sm:p-10 border border-slate-300 shadow-xl text-black font-sans text-xs space-y-4">
                    {/* Appendix Label */}
                    <div className="text-right text-[10px] italic font-serif text-slate-600">
                      {isICS ? 'Appendix 59' : 'Appendix 71'}
                    </div>

                    {/* Official Republic Header */}
                    <div className="text-center space-y-0.5 border-b border-black pb-3">
                      <p className="text-[10px] uppercase font-bold tracking-widest text-slate-700">Republic of the Philippines</p>
                      <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">{orgName}</h3>
                      <p className="text-[10px] text-slate-600">{officeAddr}</p>
                      <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 pt-2 font-serif underline underline-offset-4">
                        {isICS ? 'INVENTORY CUSTODIAN SLIP' : 'PROPERTY ACKNOWLEDGEMENT RECEIPT'}
                      </h2>
                    </div>

                    {/* Meta Fields Grid */}
                    <div className="grid grid-cols-2 gap-4 text-[11px] pt-1">
                      <div className="space-y-1">
                        <p>
                          <span className="font-bold text-slate-700">Fund Cluster:</span>{' '}
                          <span className="font-semibold underline">{slipModal.fundCluster || '01 - Regular Agency Fund'}</span>
                        </p>
                        <p>
                          <span className="font-bold text-slate-700">Accountable Custodian:</span>{' '}
                          <span className="font-extrabold uppercase underline">{emp.name}</span>
                        </p>
                        <p>
                          <span className="font-bold text-slate-700">Position / Office:</span>{' '}
                          <span className="font-semibold underline">{emp.position || 'Officer'} - {getOfficeName(emp.officeId)}</span>
                        </p>
                      </div>

                      <div className="space-y-1 text-right">
                        <p>
                          <span className="font-bold text-slate-700">{isICS ? 'ICS No.:' : 'PAR No.:'}</span>{' '}
                          <span className="font-mono font-bold text-emerald-900 underline">{slipModal.controlNo}</span>
                        </p>
                        <p>
                          <span className="font-bold text-slate-700">Employee ID:</span>{' '}
                          <span className="font-mono font-semibold underline">{emp.employeeId}</span>
                        </p>
                        <p>
                          <span className="font-bold text-slate-700">Date:</span>{' '}
                          <span className="font-semibold underline">{slipModal.issuedDate}</span>
                        </p>
                      </div>
                    </div>

                    {/* Official Table */}
                    <div className="border border-black overflow-hidden my-2">
                      <table className="w-full text-left text-[11px] border-collapse">
                        {isICS ? (
                          /* ICS Appendix 59 Table Header */
                          <thead className="bg-slate-100 text-black text-center font-bold text-[10px] border-b border-black">
                            <tr>
                              <th className="border border-black p-1.5 w-[6%]">Quantity</th>
                              <th className="border border-black p-1.5 w-[7%]">Unit</th>
                              <th className="border border-black p-1.5 w-[13%]">Unit Cost</th>
                              <th className="border border-black p-1.5 w-[14%]">Total Cost</th>
                              <th className="border border-black p-1.5 w-[34%]">Description</th>
                              <th className="border border-black p-1.5 w-[16%]">Inventory Item No.</th>
                              <th className="border border-black p-1.5 w-[10%]">Est. Useful Life</th>
                            </tr>
                          </thead>
                        ) : (
                          /* PAR Appendix 71 Table Header */
                          <thead className="bg-slate-100 text-black text-center font-bold text-[10px] border-b border-black">
                            <tr>
                              <th className="border border-black p-1.5 w-[6%]">Quantity</th>
                              <th className="border border-black p-1.5 w-[7%]">Unit</th>
                              <th className="border border-black p-1.5 w-[36%]">Description</th>
                              <th className="border border-black p-1.5 w-[16%]">Property Number</th>
                              <th className="border border-black p-1.5 w-[11%]">Date Acquired</th>
                              <th className="border border-black p-1.5 w-[12%]">Unit Value</th>
                              <th className="border border-black p-1.5 w-[12%]">Total Amount</th>
                            </tr>
                          </thead>
                        )}
                        <tbody className="divide-y divide-black">
                          {selectedItems.map((p, idx) => {
                            const qty = getItemQty(p);
                            const cost = getItemCost(p);
                            const lineTotal = cost * qty;
                            const brandStr = p.brand ? `Brand: ${p.brand}, ` : '';
                            const modelStr = p.model ? `Model: ${p.model}, ` : '';
                            const snStr = p.serialNumber ? `SN: ${p.serialNumber}, ` : '';
                            const usefulLife = p.estimatedUsefulLife || (cost < 15000 ? '3 years' : '5 years');
                            const acqDate = p.acquisitionDate ? new Date(p.acquisitionDate).toLocaleDateString() : 'N/A';

                            return isICS ? (
                              <tr key={idx} className="align-top">
                                <td className="border border-black p-1.5 text-center font-bold">{qty}</td>
                                <td className="border border-black p-1.5 text-center">{p.unit || 'unit'}</td>
                                <td className="border border-black p-1.5 text-right font-mono">
                                  ₱{cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="border border-black p-1.5 text-right font-mono font-bold">
                                  ₱{lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="border border-black p-1.5 leading-snug">
                                  <div className="font-bold text-slate-900">{p.article}</div>
                                  <div className="text-[10px] text-slate-600">{brandStr}{modelStr}{snStr}{p.description}</div>
                                </td>
                                <td className="border border-black p-1.5 text-center font-mono font-bold text-slate-900">{p.propertyNumber || 'N/A'}</td>
                                <td className="border border-black p-1.5 text-center">{usefulLife}</td>
                              </tr>
                            ) : (
                              <tr key={idx} className="align-top">
                                <td className="border border-black p-1.5 text-center font-bold">{qty}</td>
                                <td className="border border-black p-1.5 text-center">{p.unit || 'unit'}</td>
                                <td className="border border-black p-1.5 leading-snug">
                                  <div className="font-bold text-slate-900">{p.article}</div>
                                  <div className="text-[10px] text-slate-600">{brandStr}{modelStr}{snStr}{p.description}</div>
                                </td>
                                <td className="border border-black p-1.5 text-center font-mono font-bold text-slate-900">{p.propertyNumber || 'N/A'}</td>
                                <td className="border border-black p-1.5 text-center font-mono text-[10px]">{acqDate}</td>
                                <td className="border border-black p-1.5 text-right font-mono">
                                  ₱{cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="border border-black p-1.5 text-right font-mono font-bold">
                                  ₱{lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Totals Summary Row */}
                          <tr className="bg-slate-50 font-bold border-t border-black">
                            <td className="border border-black p-1.5 text-center">{totalQty}</td>
                            <td className="border border-black p-1.5 text-center">units</td>
                            {isICS ? (
                              <>
                                <td className="border border-black p-1.5 text-right uppercase text-[10px]">TOTAL:</td>
                                <td className="border border-black p-1.5 text-right font-mono font-bold">
                                  ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td colSpan="3" className="border border-black p-1.5"></td>
                              </>
                            ) : (
                              <>
                                <td colSpan="4" className="border border-black p-1.5 text-right uppercase text-[10px]">TOTAL AMOUNT:</td>
                                <td className="border border-black p-1.5 text-right font-mono font-bold">
                                  ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </>
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Dual Signatories Block */}
                    <div className="grid grid-cols-2 gap-0 border border-black pt-0 text-[11px] mt-4">
                      {isICS ? (
                        <>
                          {/* ICS Appendix 59: Left is Received from, Right is Received by */}
                          <div className="p-3 border-r border-black space-y-4">
                            <p className="font-bold text-slate-800">Received from:</p>
                            <div className="pt-6 text-center space-y-0.5">
                              <p className="font-extrabold uppercase underline tracking-wide text-slate-900">
                                {slipModal.issuedByName || 'ELMER G. DOLOTALLAS'}
                              </p>
                              <p className="text-[10px] text-slate-700">Signature Over Printed Name</p>
                              <p className="text-[10.5px] font-semibold text-slate-800 pt-1">
                                {slipModal.issuedByPosition || 'Supply and/or Property Custodian'}
                              </p>
                              <p className="text-[10px] text-slate-600">Position / Office</p>
                            </div>
                            <div className="pt-2 text-slate-700">
                              <span>Date: </span>
                              <span className="underline font-semibold">{slipModal.issuedDate}</span>
                            </div>
                          </div>

                          <div className="p-3 space-y-4">
                            <p className="font-bold text-slate-800">Received by:</p>
                            <div className="pt-6 text-center space-y-0.5">
                              <p className="font-extrabold uppercase underline tracking-wide text-slate-900">
                                {slipModal.receivedByName || emp.name}
                              </p>
                              <p className="text-[10px] text-slate-700">Signature Over Printed Name</p>
                              <p className="text-[10.5px] font-semibold text-slate-800 pt-1">
                                {slipModal.receivedByPosition || emp.position}
                              </p>
                              <p className="text-[10px] text-slate-600">Position / Office</p>
                            </div>
                            <div className="pt-2 text-slate-700">
                              <span>Date: </span>
                              <span className="underline font-semibold">{slipModal.issuedDate}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* PAR Appendix 71: Left is Received by, Right is Issued by */}
                          <div className="p-3 border-r border-black space-y-4">
                            <p className="font-bold text-slate-800">Received by:</p>
                            <div className="pt-6 text-center space-y-0.5">
                              <p className="font-extrabold uppercase underline tracking-wide text-slate-900">
                                {slipModal.receivedByName || emp.name}
                              </p>
                              <p className="text-[10px] text-slate-700">Signature Over Printed Name</p>
                              <p className="text-[10.5px] font-semibold text-slate-800 pt-1">
                                {slipModal.receivedByPosition || emp.position}
                              </p>
                              <p className="text-[10px] text-slate-600">Position / Office</p>
                            </div>
                            <div className="pt-2 text-slate-700">
                              <span>Date: </span>
                              <span className="underline font-semibold">{slipModal.issuedDate}</span>
                            </div>
                          </div>

                          <div className="p-3 space-y-4">
                            <p className="font-bold text-slate-800">Issued by:</p>
                            <div className="pt-6 text-center space-y-0.5">
                              <p className="font-extrabold uppercase underline tracking-wide text-slate-900">
                                {slipModal.issuedByName || 'ELMER G. DOLOTALLAS'}
                              </p>
                              <p className="text-[10px] text-slate-700">Signature Over Printed Name</p>
                              <p className="text-[10.5px] font-semibold text-slate-800 pt-1">
                                {slipModal.issuedByPosition || 'Supply and/or Property Custodian'}
                              </p>
                              <p className="text-[10px] text-slate-600">Position / Office</p>
                            </div>
                            <div className="pt-2 text-slate-700">
                              <span>Date: </span>
                              <span className="underline font-semibold">{slipModal.issuedDate}</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  <span>Document Standard: <strong>{isICS ? 'GAM Appendix 59 (ICS)' : 'GAM Appendix 71 (PAR)'}</strong></span>
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

        const totalQty = selectedItems.reduce((acc, p) => acc + getItemQty(p), 0);
        const totalAmount = selectedItems.reduce((acc, p) => acc + getItemCost(p) * getItemQty(p), 0);
        const orgName = settings?.orgName || 'NATIONAL FISHERIES RESEARCH AND DEVELOPMENT INSTITUTE';
        const officeAddr = settings?.officeAddress || 'Corporate 101 Bldg., Mother Ignacia Ave., Quezon City';

        return (
          <div id="printable-ics-par-document" className="hidden print:block p-8 bg-white font-sans text-black text-xs space-y-4">
            <div className="text-right text-[10px] italic font-serif text-black">
              {isICS ? 'Appendix 59' : 'Appendix 71'}
            </div>

            <div className="text-center space-y-0.5 border-b border-black pb-3">
              <p className="text-[10px] uppercase font-bold tracking-widest text-black">Republic of the Philippines</p>
              <h3 className="text-sm font-black uppercase tracking-wide text-black">{orgName}</h3>
              <p className="text-[10px] text-black">{officeAddr}</p>
              <h2 className="text-sm font-black uppercase tracking-wider text-black pt-2 font-serif underline underline-offset-4">
                {isICS ? 'INVENTORY CUSTODIAN SLIP' : 'PROPERTY ACKNOWLEDGEMENT RECEIPT'}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11px] pt-1">
              <div className="space-y-1">
                <p>
                  <span className="font-bold">Fund Cluster:</span>{' '}
                  <span className="underline">{slipModal.fundCluster || '01 - Regular Agency Fund'}</span>
                </p>
                <p>
                  <span className="font-bold">Accountable Custodian:</span>{' '}
                  <span className="font-extrabold uppercase underline">{emp.name}</span>
                </p>
                <p>
                  <span className="font-bold">Position / Office:</span>{' '}
                  <span className="underline">{emp.position || 'Officer'} - {getOfficeName(emp.officeId)}</span>
                </p>
              </div>

              <div className="space-y-1 text-right">
                <p>
                  <span className="font-bold">{isICS ? 'ICS No.:' : 'PAR No.:'}</span>{' '}
                  <span className="font-mono font-bold underline">{slipModal.controlNo}</span>
                </p>
                <p>
                  <span className="font-bold">Employee ID:</span>{' '}
                  <span className="font-mono underline">{emp.employeeId}</span>
                </p>
                <p>
                  <span className="font-bold">Date:</span>{' '}
                  <span className="underline">{slipModal.issuedDate}</span>
                </p>
              </div>
            </div>

            <div className="border border-black overflow-hidden my-2">
              <table className="w-full text-left text-[11px] border-collapse">
                {isICS ? (
                  <thead className="bg-slate-100 text-black text-center font-bold text-[10px] border-b border-black">
                    <tr>
                      <th className="border border-black p-1.5 w-[6%]">Quantity</th>
                      <th className="border border-black p-1.5 w-[7%]">Unit</th>
                      <th className="border border-black p-1.5 w-[13%]">Unit Cost</th>
                      <th className="border border-black p-1.5 w-[14%]">Total Cost</th>
                      <th className="border border-black p-1.5 w-[34%]">Description</th>
                      <th className="border border-black p-1.5 w-[16%]">Inventory Item No.</th>
                      <th className="border border-black p-1.5 w-[10%]">Est. Useful Life</th>
                    </tr>
                  </thead>
                ) : (
                  <thead className="bg-slate-100 text-black text-center font-bold text-[10px] border-b border-black">
                    <tr>
                      <th className="border border-black p-1.5 w-[6%]">Quantity</th>
                      <th className="border border-black p-1.5 w-[7%]">Unit</th>
                      <th className="border border-black p-1.5 w-[36%]">Description</th>
                      <th className="border border-black p-1.5 w-[16%]">Property Number</th>
                      <th className="border border-black p-1.5 w-[11%]">Date Acquired</th>
                      <th className="border border-black p-1.5 w-[12%]">Unit Value</th>
                      <th className="border border-black p-1.5 w-[12%]">Total Amount</th>
                    </tr>
                  </thead>
                )}
                <tbody className="divide-y divide-black">
                  {selectedItems.map((p, idx) => {
                    const qty = getItemQty(p);
                    const cost = getItemCost(p);
                    const lineTotal = cost * qty;
                    const brandStr = p.brand ? `Brand: ${p.brand}, ` : '';
                    const modelStr = p.model ? `Model: ${p.model}, ` : '';
                    const snStr = p.serialNumber ? `SN: ${p.serialNumber}, ` : '';
                    const usefulLife = p.estimatedUsefulLife || (cost < 15000 ? '3 years' : '5 years');
                    const acqDate = p.acquisitionDate ? new Date(p.acquisitionDate).toLocaleDateString() : 'N/A';

                    return isICS ? (
                      <tr key={idx} className="align-top">
                        <td className="border border-black p-1.5 text-center font-bold">{qty}</td>
                        <td className="border border-black p-1.5 text-center">{p.unit || 'unit'}</td>
                        <td className="border border-black p-1.5 text-right font-mono">
                          ₱{cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="border border-black p-1.5 text-right font-mono font-bold">
                          ₱{lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="border border-black p-1.5 leading-snug">
                          <div className="font-bold">{p.article}</div>
                          <div className="text-[10px] text-slate-700">{brandStr}{modelStr}{snStr}{p.description}</div>
                        </td>
                        <td className="border border-black p-1.5 text-center font-mono font-bold">{p.propertyNumber || 'N/A'}</td>
                        <td className="border border-black p-1.5 text-center">{usefulLife}</td>
                      </tr>
                    ) : (
                      <tr key={idx} className="align-top">
                        <td className="border border-black p-1.5 text-center font-bold">{qty}</td>
                        <td className="border border-black p-1.5 text-center">{p.unit || 'unit'}</td>
                        <td className="border border-black p-1.5 leading-snug">
                          <div className="font-bold">{p.article}</div>
                          <div className="text-[10px] text-slate-700">{brandStr}{modelStr}{snStr}{p.description}</div>
                        </td>
                        <td className="border border-black p-1.5 text-center font-mono font-bold">{p.propertyNumber || 'N/A'}</td>
                        <td className="border border-black p-1.5 text-center font-mono text-[10px]">{acqDate}</td>
                        <td className="border border-black p-1.5 text-right font-mono">
                          ₱{cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="border border-black p-1.5 text-right font-mono font-bold">
                          ₱{lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}

                  <tr className="bg-slate-50 font-bold border-t border-black">
                    <td className="border border-black p-1.5 text-center">{totalQty}</td>
                    <td className="border border-black p-1.5 text-center">units</td>
                    {isICS ? (
                      <>
                        <td className="border border-black p-1.5 text-right uppercase text-[10px]">TOTAL:</td>
                        <td className="border border-black p-1.5 text-right font-mono font-bold">
                          ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td colSpan="3" className="border border-black p-1.5"></td>
                      </>
                    ) : (
                      <>
                        <td colSpan="4" className="border border-black p-1.5 text-right uppercase text-[10px]">TOTAL AMOUNT:</td>
                        <td className="border border-black p-1.5 text-right font-mono font-bold">
                          ₱{totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-0 border border-black pt-0 text-[11px] mt-4">
              {isICS ? (
                <>
                  <div className="p-3 border-r border-black space-y-4">
                    <p className="font-bold">Received from:</p>
                    <div className="pt-6 text-center space-y-0.5">
                      <p className="font-extrabold uppercase underline tracking-wide">
                        {slipModal.issuedByName || 'ELMER G. DOLOTALLAS'}
                      </p>
                      <p className="text-[10px]">Signature Over Printed Name</p>
                      <p className="text-[10.5px] font-semibold pt-1">
                        {slipModal.issuedByPosition || 'Supply and/or Property Custodian'}
                      </p>
                      <p className="text-[10px]">Position / Office</p>
                    </div>
                    <div className="pt-2">
                      <span>Date: </span>
                      <span className="underline font-semibold">{slipModal.issuedDate}</span>
                    </div>
                  </div>

                  <div className="p-3 space-y-4">
                    <p className="font-bold">Received by:</p>
                    <div className="pt-6 text-center space-y-0.5">
                      <p className="font-extrabold uppercase underline tracking-wide">
                        {slipModal.receivedByName || emp.name}
                      </p>
                      <p className="text-[10px]">Signature Over Printed Name</p>
                      <p className="text-[10.5px] font-semibold pt-1">
                        {slipModal.receivedByPosition || emp.position}
                      </p>
                      <p className="text-[10px]">Position / Office</p>
                    </div>
                    <div className="pt-2">
                      <span>Date: </span>
                      <span className="underline font-semibold">{slipModal.issuedDate}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 border-r border-black space-y-4">
                    <p className="font-bold">Received by:</p>
                    <div className="pt-6 text-center space-y-0.5">
                      <p className="font-extrabold uppercase underline tracking-wide">
                        {slipModal.receivedByName || emp.name}
                      </p>
                      <p className="text-[10px]">Signature Over Printed Name</p>
                      <p className="text-[10.5px] font-semibold pt-1">
                        {slipModal.receivedByPosition || emp.position}
                      </p>
                      <p className="text-[10px]">Position / Office</p>
                    </div>
                    <div className="pt-2">
                      <span>Date: </span>
                      <span className="underline font-semibold">{slipModal.issuedDate}</span>
                    </div>
                  </div>

                  <div className="p-3 space-y-4">
                    <p className="font-bold">Issued by:</p>
                    <div className="pt-6 text-center space-y-0.5">
                      <p className="font-extrabold uppercase underline tracking-wide">
                        {slipModal.issuedByName || 'ELMER G. DOLOTALLAS'}
                      </p>
                      <p className="text-[10px]">Signature Over Printed Name</p>
                      <p className="text-[10.5px] font-semibold pt-1">
                        {slipModal.issuedByPosition || 'Supply and/or Property Custodian'}
                      </p>
                      <p className="text-[10px]">Position / Office</p>
                    </div>
                    <div className="pt-2">
                      <span>Date: </span>
                      <span className="underline font-semibold">{slipModal.issuedDate}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
