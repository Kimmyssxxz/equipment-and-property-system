'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import {
  FileSpreadsheet,
  FileText,
  Search,
  Plus,
  Printer,
  Download,
  Eye,
  Building2,
  Monitor,
  Radio,
  Armchair,
  User,
  Calendar,
  Layers,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Edit3,
  Sliders,
  Tag,
  Package,
  ClipboardList,
  Boxes,
  ArrowUpRight,
  Trash2,
  Clock,
  Database,
  Check,
} from 'lucide-react';
import { StorageManager, authFetch } from '@/lib/storage';

// Official Government Physical Inventory Report Standards
const REPORT_TYPES = {
  rpcppe: {
    id: 'rpcppe',
    code: 'RPCPPE',
    shortName: 'RPCPPE',
    name: 'REPORT ON PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT (RPCPPE)',
    reportType: 'REPORT ON PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT (RPCPPE)',
    ppeTitle: 'REPORT ON THE PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT (RPCPPE)',
    categoryLabel: 'Property, Plant & Equipment (Capital Assets)',
    description: 'Annual physical inventory report for capitalized equipment, plant, vehicles, fixtures, and institutional properties.',
    icon: Building2,
    badgeColor: 'bg-emerald-100 text-emerald-950 border-emerald-300',
    tagColor: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  rspi: {
    id: 'rspi',
    code: 'RSPI',
    shortName: 'RSPI',
    name: 'REGISTRY OF SEMI-EXPANDABLE PROPERTY ISSUED (RSPI)',
    reportType: 'REGISTRY OF SEMI-EXPANDABLE PROPERTY ISSUED (RSPI)',
    ppeTitle: 'REGISTRY OF SEMI-EXPANDABLE PROPERTY ISSUED',
    categoryLabel: 'Semi-Expendable Property Issued Registry',
    description: 'Official registry log tracking issued semi-expendable properties with ICS No., Useful Life, Issued Recipient, and Amount.',
    icon: ClipboardList,
    badgeColor: 'bg-blue-100 text-blue-950 border-blue-300',
    tagColor: 'text-blue-800 bg-blue-50 border-blue-200',
  },
  rpcsp: {
    id: 'rpcsp',
    code: 'RPCSP',
    shortName: 'RPCSP',
    name: 'REPORT ON PHYSICAL COUNT OF SEMI-EXPANDABLE PROPERTY (RPCSP)',
    reportType: 'REPORT ON PHYSICAL COUNT OF SEMI-EXPANDABLE PROPERTY (RPCSP)',
    ppeTitle: 'REPORT ON THE PHYSICAL COUNT OF SEMI-EXPANDABLE PROPERTY (RPCSP)',
    categoryLabel: 'Semi-Expendable Property (Below ₱50,000 threshold)',
    description: 'Physical count and custodianship report for tangible items below the capitalization threshold (semi-expendable).',
    icon: FileSpreadsheet,
    badgeColor: 'bg-purple-100 text-purple-950 border-purple-300',
    tagColor: 'text-purple-800 bg-purple-50 border-purple-200',
  },
  iirup: {
    id: 'iirup',
    code: 'IIRUP',
    shortName: 'IIRUP',
    name: 'INVENTORY AND INSPECTION REPORT OF UNSERVICEABLE PROPERTY (IIRUP)',
    reportType: 'INVENTORY AND INSPECTION REPORT OF UNSERVICEABLE PROPERTY (IIRUP)',
    ppeTitle: 'INVENTORY AND INSPECTION REPORT OF UNSERVICEABLE PROPERTY',
    categoryLabel: 'Unserviceable Property Inspection & Disposal',
    description: 'Official report for inventory, inspection, valuation, and disposal of unserviceable equipment and properties.',
    icon: Trash2,
    badgeColor: 'bg-amber-100 text-amber-950 border-amber-300',
    tagColor: 'text-amber-800 bg-amber-50 border-amber-200',
  },
};

function ReportsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTypeParam = searchParams.get('type') || searchParams.get('category') || 'rpcppe';
  
  // Normalization for backward compatibility
  let selectedTypeId = 'rpcppe';
  if (rawTypeParam.toLowerCase().includes('iirup') || rawTypeParam.toLowerCase().includes('unserviceable') || rawTypeParam.toLowerCase().includes('inspection')) {
    selectedTypeId = 'iirup';
  } else if (rawTypeParam.toLowerCase().includes('rspi') || rawTypeParam.toLowerCase().includes('registry') || rawTypeParam.toLowerCase().includes('issued')) {
    selectedTypeId = 'rspi';
  } else if (rawTypeParam.toLowerCase().includes('rpcsp') || rawTypeParam.toLowerCase().includes('semi')) {
    selectedTypeId = 'rpcsp';
  } else {
    selectedTypeId = 'rpcppe';
  }

  const preselectedSessionId = searchParams.get('sessionId');
  const preselectedOfficerId = searchParams.get('officerId');

  const currentReportType = REPORT_TYPES[selectedTypeId] || REPORT_TYPES.rpcppe;
  const TypeIcon = currentReportType.icon;

  const [reports, setReports] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [properties, setProperties] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Form State
  const [accountableOfficerId, setAccountableOfficerId] = useState('');
  const [officeId, setOfficeId] = useState('');
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assumedDate, setAssumedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [inventorySessionId, setInventorySessionId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);

  // Custom Signatories Form Toggle
  const [showSignatoriesConfig, setShowSignatoriesConfig] = useState(false);
  const [customSignatories, setCustomSignatories] = useState({
    member1Name: 'ELMER G. DOLOTALLAS',
    member1Title: 'Member, NFSTI Inventory Committee / Supply Accountable Officer',
    member2Name: 'GLORIA C. PERIDO',
    member2Title: 'Member, NFSTI Inventory Committee / Budget Officer',
    member3Name: 'JENELYN N. EDEN',
    member3Title: 'Member, NFSTI Inventory Committee / Chief, GSS',
    certifiedCorrectByName: 'MA. CARLA G. FELIPE, RN',
    certifiedCorrectByTitle: 'Chairperson, NFSTI Inventory Committee / Chief, Admin',
    approvedByName: 'ATTY. ERCY NANETTE P MADRIAGA, DPSSG',
    approvedByTitle: 'Director, NFSTI',
    verifiedByName: 'YVES ARDEN CABANLONG',
    verifiedByTitle: 'State Auditor IV/ Audit Team Leader, RO IV A',
    member4Name: '',
    member5Name: '',
    preparedByName: 'ELMER G. DOLOTALLAS',
    preparedByTitle: 'Member, NFSTI Inventory Committee / Supply Accountable Officer',
    teamLeaderName: 'GLORIA C. PERIDO',
    teamLeaderTitle: 'Member, NFSTI Inventory Committee / Budget Officer',
  });

  const [notification, setNotification] = useState(null);

  const safeFetchJson = async (url, options = {}) => {
    try {
      const res = await authFetch(url, options);
      const text = await res.text();
      if (!text || text.trim().startsWith('<')) {
        return { ok: false, status: res.status, data: null };
      }
      return { ok: res.ok, status: res.status, data: JSON.parse(text) };
    } catch (e) {
      return { ok: false, status: 500, data: null };
    }
  };

  const loadData = async () => {
    try {
      const activeUser = StorageManager.getActiveUser();
      const currentUsername = (activeUser?.username || 'edolotallas').toLowerCase().trim();

      const [empRes, offRes, catRes, propRes, repRes, sessRes, sigRes] = await Promise.all([
        safeFetchJson('/api/personnel'),
        safeFetchJson('/api/offices'),
        safeFetchJson('/api/categories'),
        safeFetchJson('/api/properties'),
        safeFetchJson('/api/reports'),
        safeFetchJson('/api/inventory-sessions'),
        safeFetchJson('/api/settings'),
      ]);

      const rawEmps = empRes.data?.personnel || empRes.data?.employees || [];
      const rawOffs = offRes.data?.offices || [];
      const cats = catRes.data?.categories || [];
      const rawProps = propRes.data?.properties || [];
      const rawReps = repRes.data?.reports || [];
      const rawSess = sessRes.data?.sessions || [];
      const sigs = sigRes.data?.signatories;

      const emps = rawEmps.filter((e) => (e.encodedBy || 'edolotallas').toLowerCase().trim() === currentUsername);
      const offs = rawOffs.filter((o) => (o.encodedBy || 'edolotallas').toLowerCase().trim() === currentUsername);
      const props = rawProps.filter((p) => (p.encodedBy || 'edolotallas').toLowerCase().trim() === currentUsername);
      const reps = rawReps.filter((r) => {
        const genBy = (r.generatedBy || '').toLowerCase();
        if (currentUsername === 'queenie_ppsc') return genBy.includes('queenie');
        if (currentUsername === 'edolotallas') return !genBy.includes('queenie');
        return genBy.includes(currentUsername);
      });
      const sessList = rawSess.filter((s) => {
        const invP = (s.inventoryPerson || s.accountableOfficerName || s.finalizedBy || '').toLowerCase();
        if (currentUsername === 'queenie_ppsc') return invP.includes('queenie');
        if (currentUsername === 'edolotallas') return !invP.includes('queenie');
        return invP.includes(currentUsername);
      });

      setEmployees(emps);
      setOffices(offs);
      setCategories(cats);
      setProperties(props);
      setReports(reps);
      setSessions(sessList);
      if (sigs && Object.keys(sigs).length > 0) {
        setCustomSignatories((prev) => ({
          ...prev,
          ...sigs,
          member1Name: sigs.member1Name || sigs.preparedByName || prev.member1Name,
          member1Title: sigs.member1Title || sigs.preparedByTitle || prev.member1Title,
          member2Name: sigs.member2Name || sigs.teamLeaderName || prev.member2Name,
          member2Title: sigs.member2Title || sigs.teamLeaderTitle || prev.member2Title,
          certifiedCorrectByName: sigs.certifiedCorrectByName || prev.certifiedCorrectByName,
          certifiedCorrectByTitle: sigs.certifiedCorrectByTitle || prev.certifiedCorrectByTitle,
          approvedByName: sigs.approvedByName || prev.approvedByName,
          approvedByTitle: sigs.approvedByTitle || prev.approvedByTitle,
          verifiedByName: sigs.verifiedByName || prev.verifiedByName,
          verifiedByTitle: sigs.verifiedByTitle || prev.verifiedByTitle,
        }));
      }
      setDbConnected(true);

      // Set initial selections
      if (emps.length > 0 && !accountableOfficerId) {
        setAccountableOfficerId(preselectedOfficerId || emps[0].id);
      } else if (emps.length === 0) {
        setAccountableOfficerId('');
      }
      if (offs.length > 0 && !officeId) {
        setOfficeId(offs[0].id);
      } else if (offs.length === 0) {
        setOfficeId('');
      }
      if (sessList.length > 0 && !inventorySessionId) {
        setInventorySessionId(preselectedSessionId || sessList[0].id);
      } else if (sessList.length === 0) {
        setInventorySessionId('');
      }
    } catch (e) {
      console.error('Error loading reports data:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [rawTypeParam, preselectedSessionId, preselectedOfficerId]);

  // When session is selected, auto-populate officer & office
  const handleSessionChange = (sessId) => {
    setInventorySessionId(sessId);
    const session = sessions.find((s) => s.id === sessId);
    if (session) {
      if (session.accountableOfficerId) setAccountableOfficerId(session.accountableOfficerId);
      if (session.officeId) setOfficeId(session.officeId);
      if (session.asOfDate) setAsOfDate(session.asOfDate);
    }
  };

  // Generate Report Handler (Connected to Supabase Backend)
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const emp = employees.find((em) => em.id === accountableOfficerId);
      const off = offices.find((o) => o.id === officeId);
      const session = inventorySessionId ? sessions.find((s) => s.id === inventorySessionId) : null;
      const allProps = properties;

      // Category matching helper (ID, Code, or Name)
      const isCategoryMatch = (itemCatId, targetFilterId) => {
        if (!targetFilterId || targetFilterId === 'ALL') return true;
        if (!itemCatId) return false;
        if (itemCatId === targetFilterId) return true;
        const targetCat = categories.find(
          (c) => c.id === targetFilterId || c.code === targetFilterId || c.name === targetFilterId
        );
        if (!targetCat) return itemCatId.toLowerCase() === targetFilterId.toLowerCase();
        return (
          itemCatId === targetCat.id ||
          itemCatId.toLowerCase() === targetCat.code.toLowerCase() ||
          itemCatId.toLowerCase() === targetCat.name.toLowerCase()
        );
      };

      // Helper for numeric parsing of unit values (handles numbers or strings with commas/symbols)
      const parseVal = (val) => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return val;
        const cleaned = String(val).replace(/[^0-9.-]/g, '');
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      };

      // Pull count items from Session or Master Property Registry Catalog
      let items = [];
      if (selectedTypeId !== 'rspi' && session && inventorySessionId !== 'DIRECT_CATALOG') {
        try {
          const countRes = await fetch(`/api/physical-counts?sessionId=${session.id}`);
          const countData = await countRes.json();
          if (countRes.ok && Array.isArray(countData.counts)) {
            // ONLY include items that have actually been physically scanned / counted in this inventory session!
            const scannedCounts = countData.counts.filter((c) => {
              const hasCount = c.physicalCount !== null && c.physicalCount !== undefined;
              const notPending = c.status !== 'PENDING';
              return hasCount && notPending;
            });

            items = scannedCounts.map((c) => {
              const prop = allProps.find((p) => p.id === c.propertyId || p.propertyNumber === c.propertyNumber) || {};
              const finalUnitValue = prop.unitValue !== undefined && prop.unitValue !== null
                ? parseVal(prop.unitValue)
                : parseVal(c.unitValue);

              const cardQty = c.quantityPerCard || prop.quantityPerCard || 1;
              const actualCount = c.physicalCount !== null && c.physicalCount !== undefined ? c.physicalCount : cardQty;
              const diff = c.difference !== null && c.difference !== undefined ? c.difference : (actualCount - cardQty);

              return {
                id: c.id || prop.id,
                propertyId: c.propertyId || prop.id,
                propertyNumber: c.propertyNumber || prop.propertyNumber || 'N/A',
                article: c.article || prop.article || 'Asset',
                description: c.description || prop.description || '',
                categoryId: prop.categoryId || c.categoryId,
                unit: prop.unit || c.unit || 'unit',
                unitValue: finalUnitValue,
                quantityPerCard: cardQty,
                physicalCount: actualCount,
                difference: diff,
                status: c.status || (diff === 0 ? 'OK' : diff < 0 ? 'SHORTAGE' : 'OVERAGE'),
                propertyStatus: prop.status || 'ACTIVE',
                remarks: c.remarks || prop.remarks || '',
                serialNumber: prop.serialNumber || '',
                poNumber: prop.poNumber || '',
                brand: prop.brand || '',
                officeId: prop.officeId || c.officeId || null,
                officeName: prop.officeName || c.officeName || null,
                accountablePersonId: prop.accountablePersonId || c.accountablePersonId || null,
                accountablePersonName: prop.accountablePersonName || c.accountablePersonName || null,
                acquisitionDate: prop.acquisitionDate || prop.assignmentDate || '',
              };
            });

            if (selectedCategoryFilter && selectedCategoryFilter !== 'ALL') {
              items = items.filter((item) => isCategoryMatch(item.categoryId, selectedCategoryFilter));
            }
          }
        } catch (cntErr) {
          console.warn('Count fetch fallback:', cntErr);
        }
      } else if (selectedTypeId === 'rspi') {
        // RSPI: Registry of Semi-Expendable Property Issued (pulled from assigned properties)
        const matchingProps = allProps.filter((p) => {
          const matchOfficer = !accountableOfficerId || p.accountablePersonId === accountableOfficerId;
          const matchCat = isCategoryMatch(p.categoryId, selectedCategoryFilter);
          return matchOfficer && matchCat;
        });

        items = matchingProps.map((p) => ({
          id: 'prop-item-' + p.id,
          propertyId: p.id,
          propertyNumber: p.propertyNumber,
          article: p.article,
          description: p.description,
          categoryId: p.categoryId,
          unit: p.unit || 'unit',
          unitValue: parseVal(p.unitValue),
          quantityPerCard: p.quantityPerCard || 1,
          physicalCount: p.quantityPerCard || 1,
          difference: 0,
          status: 'OK',
          propertyStatus: p.status || 'ACTIVE',
          remarks: p.remarks || '',
          serialNumber: p.serialNumber || '',
          poNumber: p.poNumber || '',
          brand: p.brand || '',
          officeId: p.officeId || null,
          officeName: p.officeName || null,
          accountablePersonId: p.accountablePersonId || null,
          accountablePersonName: p.accountablePersonName || null,
          acquisitionDate: p.acquisitionDate || p.assignmentDate || '',
        }));
      } else {
        // Direct Catalog Mode (when explicitly chosen)
        const matchingProps = allProps.filter((p) => {
          const matchOfficer = !accountableOfficerId || p.accountablePersonId === accountableOfficerId;
          const matchCat = isCategoryMatch(p.categoryId, selectedCategoryFilter);
          return matchOfficer && matchCat;
        });

        items = matchingProps.map((p) => ({
          id: 'prop-item-' + p.id,
          propertyId: p.id,
          propertyNumber: p.propertyNumber,
          article: p.article,
          description: p.description,
          categoryId: p.categoryId,
          unit: p.unit || 'unit',
          unitValue: parseVal(p.unitValue),
          quantityPerCard: p.quantityPerCard || 1,
          physicalCount: p.quantityPerCard || 1,
          difference: 0,
          status: 'OK',
          propertyStatus: p.status || 'ACTIVE',
          remarks: p.remarks || '',
          serialNumber: p.serialNumber || '',
          poNumber: p.poNumber || '',
          brand: p.brand || '',
          officeId: p.officeId || null,
          officeName: p.officeName || null,
          accountablePersonId: p.accountablePersonId || null,
          accountablePersonName: p.accountablePersonName || null,
          acquisitionDate: p.acquisitionDate || p.assignmentDate || '',
        }));
      }

      // Government Accounting Standard Threshold & Status Filtering:
      // RPCPPE (Capital Assets) >= ₱50,000
      // RSPI / RPCSP (Semi-Expendable Property) < ₱50,000
      // IIRUP: ONLY Unserviceable or For Disposal / Condemned / Disposed Items
      if (selectedTypeId === 'rpcppe') {
        items = items.filter((item) => parseVal(item.unitValue) >= 50000);
      } else if (selectedTypeId === 'rpcsp' || selectedTypeId === 'rspi') {
        items = items.filter((item) => parseVal(item.unitValue) < 50000);
      } else if (selectedTypeId === 'iirup') {
        items = items.filter((item) => {
          const prop = properties.find((p) => p.id === item.propertyId || p.propertyNumber === item.propertyNumber);
          const pStatus = (item.propertyStatus || prop?.status || item.status || '').toUpperCase();
          const pRemarks = (item.remarks || prop?.remarks || '').toUpperCase();

          return (
            pStatus === 'UNSERVICEABLE' ||
            pStatus === 'CONDEMNED' ||
            pStatus === 'DISPOSED' ||
            pStatus === 'FOR_DISPOSAL' ||
            pStatus.includes('UNSERVICEABLE') ||
            pStatus.includes('DISPOSAL') ||
            pRemarks.includes('UNSERVICEABLE') ||
            pRemarks.includes('DISPOSAL') ||
            pRemarks.includes('CONDEMNED') ||
            pRemarks.includes('DAMAGED')
          );
        });
      }

      const reportNumber = `REP-2026-${String(reports.length + 1).padStart(4, '0')}`;
      const finalTitle = currentReportType.name;

      const selectedCat = categories.find((c) => c.id === selectedCategoryFilter || c.code === selectedCategoryFilter || c.name === selectedCategoryFilter);
      const categoryName = selectedCat ? selectedCat.name : (selectedCategoryFilter !== 'ALL' ? selectedCategoryFilter : '');

      const payload = {
        reportNumber,
        reportType: currentReportType.name,
        categoryId: selectedCategoryFilter,
        categoryName: categoryName,
        title: finalTitle,
        asOfDate: asOfDate || new Date().toISOString().slice(0, 10),
        assumedDate,
        accountablePersonId: accountableOfficerId,
        accountablePersonName: emp ? emp.name : 'ELMER G. DOLOTALLAS',
        accountablePosition: emp ? emp.position : 'Supply Officer',
        officeId,
        inventorySessionId: inventorySessionId || 'DIRECT_CATALOG',
        generatedBy: 'Admin',
        status: 'FINALIZED',
        signatories: {
          ...customSignatories,
          categoryId: selectedCategoryFilter,
          categoryName: categoryName,
          assumedDate: assumedDate,
        },
        snapshotData: items,
        itemsSnapshot: items,
      };

      try {
        sessionStorage.setItem('last_generated_report', JSON.stringify(payload));
      } catch (e) {}

      let targetReportId = payload.reportNumber;
      try {
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.report && data.report.id) {
          targetReportId = data.report.id;
          setReports((prev) => [data.report, ...prev]);
        }
      } catch (apiErr) {
        console.warn('Backend POST report notice, using local report:', apiErr);
      }

      setIsGenerating(false);
      router.push(`/reports/preview?id=${encodeURIComponent(targetReportId)}&type=${selectedTypeId}&category=${encodeURIComponent(categoryName || '')}&assumedDate=${encodeURIComponent(assumedDate || '')}&asOfDate=${encodeURIComponent(asOfDate || '')}`);
    } catch (err) {
      console.error('Failed to generate report:', err);
      setIsGenerating(false);
      alert('Error generating report: ' + err.message);
    }
  };

  // Delete report handler (Connected to Supabase)
  const handleDeleteReport = async (reportId, e) => {
    if (e) e.stopPropagation();
    if (!confirm('Are you sure you want to delete this official report record from the database?')) return;

    try {
      await fetch(`/api/reports?id=${reportId}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('API delete report error:', err);
    }

    const updated = reports.filter((r) => r.id !== reportId);
    setReports(updated);
    StorageManager.saveReports(updated);

    setNotification({
      title: 'Report Deleted',
      message: 'Official report was deleted from database records.',
    });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered reports matching current active report type
  const matchingReports = reports.filter((r) => {
    if (!r.reportType && !r.title) return true;
    const t = (r.reportType || r.title || '').toLowerCase();
    if (currentReportType.id === 'rpcppe') {
      return t.includes('rpcppe') || t.includes('property, plant') || t.includes('office equipment') || t.includes('equipment report');
    }
    if (currentReportType.id === 'rspi') {
      return t.includes('rspi') || t.includes('registry') || t.includes('issued') || t.includes('rpci') || t.includes('inventory');
    }
    if (currentReportType.id === 'rpcsp') {
      return t.includes('rpcsp') || t.includes('semi-expandable') || t.includes('semi-expendable');
    }
    return true;
  });

  return (
    <div className="min-h-screen p-2.5 sm:p-6 lg:p-8 flex justify-center items-start">
      <div className="w-full max-w-[1540px] flex gap-5 lg:gap-6 items-start">
        {/* Floating Sidebar */}
        <Sidebar totalItems={reports.length} />

        {/* Floating Main Content Container */}
        <main className="flex-1 min-w-0 bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl sm:rounded-[32px] shadow-2xl shadow-slate-900/10 p-4 sm:p-6 lg:p-8 flex flex-col space-y-5 sm:space-y-6 overflow-hidden">
          {/* Top Navbar */}
          <Navbar
            pageTitle={currentReportType.name}
            icon={FileSpreadsheet}
          />

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
                ✕
              </button>
            </div>
          )}

          {/* 3 Report Types Switcher Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
            {Object.values(REPORT_TYPES).map((type) => {
              const Icon = type.icon;
              const isSelected = type.id === currentReportType.id;
              return (
                <Link
                  key={type.id}
                  href={`/reports?type=${type.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200/50 scale-[1.01]'
                      : 'bg-white hover:bg-emerald-50 text-slate-700 border border-slate-200/70 hover:border-emerald-200'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-black block leading-tight truncate">
                      {type.shortName}
                    </span>
                    <span
                      className={`text-[10px] block truncate ${
                        isSelected ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      {type.categoryLabel}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Active Report Type Banner */}
          <div className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-xs shrink-0">
                <TypeIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200 inline-block">
                    Standard Government Inventory Report
                  </span>
                  {dbConnected && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <Database className="w-2.5 h-2.5" />
                      <span>Supabase Live</span>
                    </span>
                  )}
                </div>
                <h2 className="text-sm sm:text-base font-black text-slate-900 mt-0.5">
                  {currentReportType.name}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{currentReportType.description}</p>
              </div>
            </div>
          </div>

          {/* Section 1: Generate Report Interactive Form */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>Generate New {currentReportType.shortName} Report</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Fill in the details below to generate and preview the formal official document in Long Bond Paper landscape format.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSignatoriesConfig(!showSignatoriesConfig)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                <span>{showSignatoriesConfig ? 'Hide Signatories Settings' : 'Customize Report Signatories'}</span>
              </button>
            </div>

            <form onSubmit={handleGenerateReport} className="space-y-4">
              {/* Single Horizontal Line Layout for Form Fields */}
              <div className={`grid grid-cols-1 gap-3.5 items-end ${selectedTypeId === 'rspi' ? 'lg:grid-cols-4' : 'xl:grid-cols-5 md:grid-cols-3'}`}>
                {/* 1. Formal Report Standard */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                    1. Formal Report Standard
                  </label>
                  <input
                    type="text"
                    disabled
                    value={currentReportType.shortName}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs font-bold text-emerald-950 shadow-2xs cursor-not-allowed"
                  />
                </div>

                {/* 2. Link to Inventory Session (RPCPPE & RPCSP ONLY) */}
                {selectedTypeId !== 'rspi' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                      2. Inventory Session Reference *
                    </label>
                    <select
                      value={inventorySessionId}
                      onChange={(e) => handleSessionChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs truncate"
                    >
                      <option value="DIRECT_CATALOG">⚡ All Registered Assets (Direct Property Registry)</option>
                      {sessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          [{s.sessionCode}] {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 3. Accountable Officer */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                    {selectedTypeId !== 'rspi' ? '3.' : '2.'} Accountable Custodian / Officer *
                  </label>
                  <select
                    value={accountableOfficerId}
                    onChange={(e) => setAccountableOfficerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs truncate"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.position})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Accountability Assumption Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                    {selectedTypeId !== 'rspi' ? '4.' : '3.'} Assumption Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={assumedDate}
                    onChange={(e) => setAssumedDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
                  />
                </div>

                {/* 5. Category Filter */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 whitespace-nowrap">
                    {selectedTypeId !== 'rspi' ? '5.' : '4.'} Category Filter
                  </label>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs truncate"
                  >
                    <option value="ALL">All Equipment Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        [{cat.code}] {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Collapsible Signatories Configuration */}
              {showSignatoriesConfig && (
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div>
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                        Official Document Signatories Configuration (COA Format)
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Custom signatories for official RPCPPE, RPCSP, and IIRUP reports
                      </p>
                    </div>
                  </div>

                  {/* 1. Certified Correct by */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">
                        1. Certified Correct by (Inventory Committee)
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        4 Committee Signatories
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Member 1 */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">
                          Member 1 (Supply Officer)
                        </label>
                        <input
                          type="text"
                          value={customSignatories.member1Name || ''}
                          onChange={(e) => setCustomSignatories({ ...customSignatories, member1Name: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                          placeholder="e.g. ELMER G. DOLOTALLAS"
                        />
                        <input
                          type="text"
                          value={customSignatories.member1Title || ''}
                          onChange={(e) => setCustomSignatories({ ...customSignatories, member1Title: e.target.value })}
                          className="w-full px-3 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600"
                          placeholder="Supply Accountable Officer"
                        />
                      </div>

                      {/* Member 2 */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">
                          Member 2 (Budget Officer)
                        </label>
                        <input
                          type="text"
                          value={customSignatories.member2Name || ''}
                          onChange={(e) => setCustomSignatories({ ...customSignatories, member2Name: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                          placeholder="e.g. GLORIA C. PERIDO"
                        />
                        <input
                          type="text"
                          value={customSignatories.member2Title || ''}
                          onChange={(e) => setCustomSignatories({ ...customSignatories, member2Title: e.target.value })}
                          className="w-full px-3 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600"
                          placeholder="Budget Officer"
                        />
                      </div>

                      {/* Member 3 */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">
                          Member 3 (Committee Member)
                        </label>
                        <input
                          type="text"
                          value={customSignatories.member3Name || ''}
                          onChange={(e) => setCustomSignatories({ ...customSignatories, member3Name: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                          placeholder="e.g. JENELYN N. EDEN"
                        />
                        <input
                          type="text"
                          value={customSignatories.member3Title || ''}
                          onChange={(e) => setCustomSignatories({ ...customSignatories, member3Title: e.target.value })}
                          className="w-full px-3 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600"
                          placeholder="Supply Section Representative"
                        />
                      </div>

                      {/* Chairperson */}
                      <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                        <label className="block text-[10px] font-bold text-slate-600 uppercase">
                          Chairperson (Certified Correct by)
                        </label>
                        <input
                          type="text"
                          value={customSignatories.certifiedCorrectByName || ''}
                          onChange={(e) => setCustomSignatories({ ...customSignatories, certifiedCorrectByName: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900"
                          placeholder="e.g. MA. CARLA G. FELIPE, RN"
                        />
                        <input
                          type="text"
                          value={customSignatories.certifiedCorrectByTitle || ''}
                          onChange={(e) => setCustomSignatories({ ...customSignatories, certifiedCorrectByTitle: e.target.value })}
                          className="w-full px-3 py-1 rounded-lg bg-white border border-slate-200 text-[11px] text-slate-600"
                          placeholder="Chief, Admin"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 2. Approved by */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">2. Approved by (Director)</label>
                      <input
                        type="text"
                        value={customSignatories.approvedByName || ''}
                        onChange={(e) => setCustomSignatories({ ...customSignatories, approvedByName: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                        placeholder="e.g. ATTY. ERCY NANETTE P MADRIAGA, DPSSG"
                      />
                      <input
                        type="text"
                        value={customSignatories.approvedByTitle || ''}
                        onChange={(e) => setCustomSignatories({ ...customSignatories, approvedByTitle: e.target.value })}
                        className="w-full px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600"
                        placeholder="e.g. Director, NFSTI"
                      />
                    </div>

                    {/* 3. Verified by */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">
                        3. Verified by (State Auditor / Audit Team Leader)
                      </label>
                      <input
                        type="text"
                        value={customSignatories.verifiedByName || ''}
                        onChange={(e) => setCustomSignatories({ ...customSignatories, verifiedByName: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900"
                        placeholder="e.g. YVES ARDEN CABANLONG"
                      />
                      <input
                        type="text"
                        value={customSignatories.verifiedByTitle || ''}
                        onChange={(e) => setCustomSignatories({ ...customSignatories, verifiedByTitle: e.target.value })}
                        className="w-full px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600"
                        placeholder="e.g. State Auditor IV/ Audit Team Leader, RO IV A"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-7 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>
                    {isGenerating
                      ? 'Saving to Supabase Database...'
                      : `Generate ${currentReportType.shortName} Report & Open Official Preview`}
                  </span>
                </button>
              </div>
            </form>
          </div>


        </main>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Official Government Reports...</div>}>
      <ReportsContent />
    </Suspense>
  );
}
