'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import {
  ClipboardList,
  Search,
  Plus,
  QrCode,
  Scan,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  User,
  Layers,
  Save,
  Check,
  X,
  Lock,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  FileSpreadsheet,
  Camera,
  Tag,
  Edit3,
  Trash2,
  Calendar,
  Filter,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  FolderOpen,
  Sparkles,
  RotateCcw,
  Volume2,
  Database,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { StorageManager } from '@/lib/storage';
import QRCodeDisplay from '@/components/QRCodeDisplay';

const CameraQRScanner = dynamic(() => import('@/components/CameraQRScanner'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center bg-slate-900 rounded-2xl text-emerald-400 font-bold text-xs animate-pulse flex items-center justify-center gap-2">
      <Camera className="w-5 h-5 animate-spin" />
      <span>Initializing Camera Feed...</span>
    </div>
  ),
});

// Audio Beep Feedback using Web Audio API
const playScanBeep = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 chime
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.16);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.16);
  } catch (e) {
    // Suppress if audio autoplay policy blocks
  }
};

export default function PhysicalInventoryPage() {
  const [sessions, setSessions] = useState([]);
  const [allCounts, setAllCounts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [properties, setProperties] = useState([]);

  // Lottie Animated Status Modal (Success & Failed)
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Custom Deletion / Reset Confirmation Modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    itemToDelete: null,
    deleteType: '',
  });

  // Selected active session for Table View. If null, displays the Session Blocks Grid.
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Session Blocks Grid search and pagination
  const [sessionSearch, setSessionSearch] = useState('');
  const [sessionPage, setSessionPage] = useState(1);
  const SESSIONS_PER_PAGE = 6;

  // Filter & Search & Pagination inside the active session table
  const [search, setSearch] = useState('');
  // Default to 'SCANNED' so only scanned / inventoried items appear first!
  const [statusTab, setStatusTab] = useState('SCANNED'); // SCANNED, UNSCANNED, ALL, OK, SHORTAGE, OVERAGE
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [tablePage, setTablePage] = useState(1);
  const ROWS_PER_PAGE = 8;

  // Fast-Scan Bar State (for direct barcode reader guns / rapid entry)
  const [inlineScanCode, setInlineScanCode] = useState('');
  const [lastScannedId, setLastScannedId] = useState(null);

  // Scanner Mode: 'CAMERA' or 'MANUAL'
  const [scannerMode, setScannerMode] = useState('CAMERA');

  // New Session Modal
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [sessionFormData, setSessionFormData] = useState({
    sessionCode: '',
    title: '',
    asOfDate: '',
    countingDate: '',
    inventoryPerson: 'Elmer G. Dolotallas',
    officeId: '',
    categoryFilter: 'ALL',
    remarks: '',
  });

  // Edit Session Modal
  const [isEditSessionModalOpen, setIsEditSessionModalOpen] = useState(false);
  const [editSessionFormData, setEditSessionFormData] = useState({
    id: '',
    sessionCode: '',
    title: '',
    asOfDate: '',
    countingDate: '',
    remarks: '',
  });

  // Barcode / QR Scanner Modal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedItem, setScannedItem] = useState(null);
  const [scanPhysicalCount, setScanPhysicalCount] = useState(1);
  const [scanRemarks, setScanRemarks] = useState('');

  // Row Inline Editing
  const [editingCountId, setEditingCountId] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [inputRemarks, setInputRemarks] = useState('');

  const [notification, setNotification] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const [dbConnected, setDbConnected] = useState(false);

  const [assignmentsHistory, setAssignmentsHistory] = useState([]);

  const loadData = async () => {
    try {
      const emps = StorageManager.getEmployees() || [];
      const offs = StorageManager.getOffices() || [];
      const cats = StorageManager.getCategories() || [];
      const props = StorageManager.getProperties() || [];
      const asgns = StorageManager.getAssignmentsHistory() || [];

      setEmployees(emps);
      setOffices(offs);
      setCategories(cats);
      setProperties(props);
      setAssignmentsHistory(asgns);

      // Fetch all entities concurrently from API endpoints
      let loadedSessions = [];
      let loadedCounts = [];

      try {
        const [sessRes, cntsRes, propsRes, asgnRes, empRes, offRes, catRes] = await Promise.all([
          fetch('/api/inventory-sessions', { cache: 'no-store' }),
          fetch('/api/physical-counts', { cache: 'no-store' }),
          fetch('/api/properties', { cache: 'no-store' }),
          fetch('/api/assignments', { cache: 'no-store' }),
          fetch('/api/personnel', { cache: 'no-store' }),
          fetch('/api/offices', { cache: 'no-store' }),
          fetch('/api/categories', { cache: 'no-store' }),
        ]);

        const [sessData, cntsData, propsData, asgnData, empData, offData, catData] = await Promise.all([
          sessRes.json().catch(() => ({})),
          cntsRes.json().catch(() => ({})),
          propsRes.json().catch(() => ({})),
          asgnRes.json().catch(() => ({})),
          empRes.json().catch(() => ({})),
          offRes.json().catch(() => ({})),
          catRes.json().catch(() => ({})),
        ]);

        if (catData.success && Array.isArray(catData.categories)) {
          setCategories(catData.categories);
          StorageManager.saveCategories(catData.categories);
        }

        if (offData.success && Array.isArray(offData.offices)) {
          setOffices(offData.offices);
          StorageManager.saveOffices(offData.offices);
        }

        if (empData.success && Array.isArray(empData.employees)) {
          setEmployees(empData.employees);
          StorageManager.saveEmployees(empData.employees);
        }

        if (asgnData.success && Array.isArray(asgnData.assignments)) {
          setAssignmentsHistory(asgnData.assignments);
          StorageManager.saveAssignmentsHistory(asgnData.assignments);
        }

        if (sessRes.ok && sessData.success && Array.isArray(sessData.sessions)) {
          setDbConnected(true);
          loadedSessions = sessData.sessions;
          StorageManager.saveInventorySessions?.(sessData.sessions);
        } else {
          loadedSessions = StorageManager.getInventorySessions();
        }

        if (cntsRes.ok && cntsData.success && Array.isArray(cntsData.counts)) {
          loadedCounts = cntsData.counts;
          StorageManager.savePhysicalCounts?.(cntsData.counts);
        } else {
          loadedCounts = StorageManager.getPhysicalCounts();
        }

        if (propsRes.ok && propsData.success && Array.isArray(propsData.properties) && propsData.properties.length > 0) {
          const apiProps = propsData.properties.map((p) => ({
            ...p,
            propertyNumber: p.propertyNumber || p.property_number || p.propertyNo || p.id,
            article: p.article || p.name || 'Equipment Item',
            unitValue: p.unitValue || p.unit_value || p.cost || 0,
            quantityPerCard: p.quantityPerCard || p.quantity_per_card || p.quantity || 1,
            accountablePersonName: p.accountablePersonName || p.accountable_person_name || p.accountableOfficer || '',
            officeName: p.officeName || p.office_name || p.office || '',
          }));
          setProperties(apiProps);
          StorageManager.saveProperties(apiProps);
        }
      } catch (apiErr) {
        console.warn('API fetch notice, using local cache:', apiErr);
        loadedSessions = StorageManager.getInventorySessions();
        loadedCounts = StorageManager.getPhysicalCounts();
      }

      setSessions(loadedSessions);
      setAllCounts(loadedCounts);
    } catch (e) {
      console.error('Error loading inventory data:', e);
      setSessions(StorageManager.getInventorySessions());
      setAllCounts(StorageManager.getPhysicalCounts());
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset table pagination when search/filter changes
  useEffect(() => {
    setTablePage(1);
  }, [search, statusTab, selectedCategoryFilter, activeSessionId]);

  // Reset session blocks pagination when search changes
  useEffect(() => {
    setSessionPage(1);
  }, [sessionSearch]);

  // Helper to get Category Name of a property or counted item
  const getCategoryName = (item) => {
    if (!item) return 'Office Equipment';
    if (item.categoryName && item.categoryName !== 'Office Equipment') return item.categoryName;
    if (item.category_name) return item.category_name;
    if (item.category && typeof item.category === 'string') return item.category;

    const prop = properties.find(
      (p) =>
        p.id === item.propertyId ||
        p.id === item.id ||
        (p.propertyNumber && item.propertyNumber && p.propertyNumber.toLowerCase() === item.propertyNumber.toLowerCase())
    );

    if (prop) {
      if (prop.categoryName) return prop.categoryName;
      if (prop.category_name) return prop.category_name;
      if (prop.category && typeof prop.category === 'string') return prop.category;
      if (prop.property_categories?.name) return prop.property_categories.name;

      const catId = prop.categoryId || prop.category_id;
      if (catId) {
        const cat = categories.find(
          (c) => c.id === catId || c.code === catId || (c.name && c.name.toLowerCase() === String(catId).toLowerCase())
        );
        if (cat) return cat.name;
      }
    }

    const itemCatId = item.categoryId || item.category_id;
    if (itemCatId) {
      const cat = categories.find((c) => c.id === itemCatId || c.code === itemCatId);
      if (cat) return cat.name;
    }

    return 'Office Equipment';
  };

  // Helper to get Custodian (Accountable Officer) Name
  const getCustodianName = (item) => {
    if (!item) return 'Unassigned';

    const isValidName = (val) =>
      val && typeof val === 'string' && val.trim() && val !== 'Assigned Officer' && val !== 'Unassigned';

    if (isValidName(item.accountableOfficerName)) return item.accountableOfficerName;
    if (isValidName(item.accountablePersonName)) return item.accountablePersonName;
    if (isValidName(item.accountableOfficer)) return item.accountableOfficer;
    if (isValidName(item.accountable_person_name)) return item.accountable_person_name;
    if (isValidName(item.employeeName)) return item.employeeName;

    const prop = properties.find(
      (p) =>
        p.id === item.propertyId ||
        p.id === item.id ||
        (p.propertyNumber && item.propertyNumber && p.propertyNumber.toLowerCase() === item.propertyNumber.toLowerCase())
    );

    if (prop) {
      if (isValidName(prop.accountablePersonName)) return prop.accountablePersonName;
      if (isValidName(prop.accountableOfficerName)) return prop.accountableOfficerName;
      if (isValidName(prop.accountableOfficer)) return prop.accountableOfficer;
      if (isValidName(prop.accountable_person_name)) return prop.accountable_person_name;
      if (isValidName(prop.employeeName)) return prop.employeeName;

      const empId = prop.employeeId || prop.accountablePersonId || prop.employee_id;
      if (empId) {
        const emp = employees.find((e) => e.id === empId);
        if (emp) return emp.name || emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
      }
    }

    // Check active assignment history
    const propId = item.propertyId || item.id || (prop ? prop.id : null);
    if (propId && assignmentsHistory.length > 0) {
      const asgn = assignmentsHistory.find(
        (a) =>
          (a.propertyId === propId ||
            (a.propertyNumber && item.propertyNumber && a.propertyNumber.toLowerCase() === item.propertyNumber.toLowerCase())) &&
          a.status !== 'RETURNED'
      );
      if (asgn) {
        if (isValidName(asgn.employeeName)) return asgn.employeeName;
        if (isValidName(asgn.accountablePersonName)) return asgn.accountablePersonName;
        if (asgn.employeeId) {
          const emp = employees.find((e) => e.id === asgn.employeeId);
          if (emp) return emp.name || emp.fullName;
        }
      }
    }

    const itemEmpId = item.employeeId || item.accountablePersonId;
    if (itemEmpId) {
      const emp = employees.find((e) => e.id === itemEmpId);
      if (emp) return emp.name || emp.fullName;
    }

    return 'Unassigned';
  };

  // Helper to get Office Name
  const getOfficeName = (item) => {
    if (!item) return 'Unassigned Office';

    const isValidOffice = (val) =>
      val && typeof val === 'string' && val.trim() && val !== 'Assigned Office' && val !== 'Unassigned Office';

    if (isValidOffice(item.officeName)) return item.officeName;
    if (isValidOffice(item.office_name)) return item.office_name;
    if (isValidOffice(item.office)) return item.office;

    const prop = properties.find(
      (p) =>
        p.id === item.propertyId ||
        p.id === item.id ||
        (p.propertyNumber && item.propertyNumber && p.propertyNumber.toLowerCase() === item.propertyNumber.toLowerCase())
    );

    if (prop) {
      if (isValidOffice(prop.officeName)) return prop.officeName;
      if (isValidOffice(prop.office_name)) return prop.office_name;
      if (isValidOffice(prop.office)) return prop.office;
      if (isValidOffice(prop.location)) return prop.location;

      const offId = prop.officeId || prop.office_id;
      if (offId) {
        const off = offices.find((o) => o.id === offId);
        if (off) return off.name || off.officeName || off.code;
      }
    }

    const itemOffId = item.officeId || item.office_id;
    if (itemOffId) {
      const off = offices.find((o) => o.id === itemOffId);
      if (off) return off.name || off.officeName || off.code;
    }

    return 'Unassigned Office';
  };

  // Open New Session Modal
  const openNewSessionModal = () => {
    setErrorMessage('');
    const nextCode = `INV-2026-${String(sessions.length + 1).padStart(2, '0')}`;
    setSessionFormData({
      sessionCode: nextCode,
      title: 'Physical Inventory of Office Equipment (FY 2026)',
      asOfDate: new Date().toISOString().slice(0, 10),
      countingDate: new Date().toISOString().slice(0, 10),
      accountableOfficerId: employees[0]?.id || '',
      officeId: offices[0]?.id || '',
      categoryFilter: 'ALL',
      remarks: 'Official physical counting session',
    });
    setIsNewSessionModalOpen(true);
  };

  // Create Session (Connected to Supabase)
  const handleCreateSession = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!sessionFormData.sessionCode.trim() || !sessionFormData.title.trim()) {
      setErrorMessage('Session Code and Title are required.');
      return;
    }

    try {
      let createdSession = null;

      // 1. Post to Backend API
      try {
        const res = await fetch('/api/inventory-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionFormData),
        });
        const data = await res.json();
        if (res.ok && data.success && data.session) {
          createdSession = data.session;
        }
      } catch (apiErr) {
        console.warn('Fallback creating session locally:', apiErr);
      }

      // 2. Local Storage Manager fallback
      if (!createdSession) {
        const result = StorageManager.createInventorySession(sessionFormData);
        createdSession = result.session;
      }

      await loadData();
      setIsNewSessionModalOpen(false);
      setActiveSessionId(createdSession.id);
      setStatusTab('SCANNED');

      setNotification({
        title: 'Inventory Session Saved to Database!',
        message: `Session "${createdSession.sessionCode}" is ready. Scan stickers to record items into this session.`,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err) {
      setErrorMessage(err.message || 'Error creating inventory session.');
    }
  };

  // Open Edit Session Modal
  const openEditSessionModal = (session, e) => {
    if (e) e.stopPropagation();
    setErrorMessage('');
    setEditSessionFormData({
      id: session.id,
      sessionCode: session.sessionCode,
      title: session.title,
      asOfDate: session.asOfDate || new Date().toISOString().slice(0, 10),
      countingDate: session.countingDate || new Date().toISOString().slice(0, 10),
      remarks: session.remarks || '',
    });
    setIsEditSessionModalOpen(true);
  };

  const handleUpdateSession = async (e) => {
    e.preventDefault();
    if (!editSessionFormData.title.trim() || !editSessionFormData.sessionCode.trim()) {
      setErrorMessage('Session Code and Title are required.');
      return;
    }
    try {
      try {
        await fetch('/api/inventory-sessions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editSessionFormData),
        });
      } catch (e) {}

      StorageManager.updateInventorySession(editSessionFormData.id, editSessionFormData);
      await loadData();
      setIsEditSessionModalOpen(false);
      setNotification({
        title: 'Session Details Updated!',
        message: `Inventory session "${editSessionFormData.title}" has been updated in database.`,
      });
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Error updating session.');
    }
  };

  // Request Session Deletion -> Trigger Confirmation Modal
  const handleDeleteSession = (session, e) => {
    if (e) e.stopPropagation();
    setDeleteConfirmModal({
      isOpen: true,
      title: 'Delete Inventory Session?',
      message: `Are you sure you want to delete session [${session.sessionCode}] "${session.title}"? This will permanently remove its associated physical count entries.`,
      itemToDelete: session,
      deleteType: 'session',
    });
  };

  // Central Scan Execution Function (Connected to Supabase Backend)
  const handleExecuteScan = async (code, customCount = null, customRemarks = '') => {
    if (!code || !code.trim()) return;
    const targetSessionId = activeSessionId || (sessions.length > 0 ? sessions[0].id : null);
    if (!targetSessionId) {
      alert('Please create or select an inventory session first.');
      return;
    }

    try {
      let scanResult = null;

      // 1. Post Scan to Backend Supabase API
      try {
        const res = await fetch('/api/physical-counts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: targetSessionId,
            scannedCode: code.trim(),
            physicalCount: customCount,
            remarks: customRemarks,
            countedBy: 'Admin',
          }),
        });

        const data = await res.json();
        if (res.ok && data.success && data.count) {
          scanResult = { count: data.count, isNewScan: data.isNewScan };
        }
      } catch (apiErr) {
        console.warn('API scan fallback:', apiErr);
      }

      // 2. Fallback to StorageManager if API was offline
      if (!scanResult) {
        scanResult = StorageManager.scanPropertyIntoSession({
          sessionId: targetSessionId,
          scannedCode: code.trim(),
          physicalCount: customCount,
          remarks: customRemarks,
          countedBy: 'Admin',
        });
      } else {
        // Sync local storage
        StorageManager.scanPropertyIntoSession({
          sessionId: targetSessionId,
          scannedCode: code.trim(),
          physicalCount: customCount,
          remarks: customRemarks,
          countedBy: 'Admin',
        });
      }

      playScanBeep();
      await loadData();
      setLastScannedId(scanResult.count.id);
      setInlineScanCode('');
      setStatusTab('SCANNED'); // Ensure the scanned tab is visible

      setNotification({
        title: scanResult.isNewScan ? '✅ Sticker Scanned & Saved to Database!' : '🔄 Scan Count Updated in Database!',
        message: `"${scanResult.count.propertyNumber}" (${scanResult.count.article}) - Count: ${scanResult.count.physicalCount}/${scanResult.count.quantityPerCard} [${scanResult.count.status}]`,
      });
      setTimeout(() => setNotification(null), 5000);

      // Clear highlight after 4 seconds
      setTimeout(() => {
        setLastScannedId((prev) => (prev === scanResult.count.id ? null : prev));
      }, 4000);

      return scanResult.count;
    } catch (err) {
      alert(err.message || 'Error scanning property code.');
    }
  };

  // Quick 1-Click Match Count (Connected to Supabase)
  const handleQuickMatch = async (item) => {
    try {
      try {
        await fetch('/api/physical-counts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: item.sessionId || activeSessionId,
            countId: item.id,
            propertyId: item.propertyId,
            physicalCount: item.quantityPerCard || 1,
            remarks: item.remarks || 'Verified in good physical condition',
            countedBy: 'Admin',
          }),
        });
      } catch (e) {}

      StorageManager.recordPhysicalCount({
        countId: item.id,
        physicalCount: item.quantityPerCard || 1,
        remarks: item.remarks || 'Verified in good physical condition',
        countedBy: 'Admin',
      });
      playScanBeep();
      await loadData();
      setLastScannedId(item.id);
      setNotification({
        title: 'Count Verified in Database',
        message: `Marked "${item.propertyNumber}" as verified (${item.quantityPerCard} unit).`,
      });
      setTimeout(() => setNotification(null), 3000);
      setTimeout(() => setLastScannedId((prev) => (prev === item.id ? null : prev)), 4000);
    } catch (err) {
      alert(err.message);
    }
  };

  // Reset / Delete count item -> Trigger Confirmation Modal
  const handleResetItem = (item) => {
    setDeleteConfirmModal({
      isOpen: true,
      title: 'Reset Physical Scan Count?',
      message: `Are you sure you want to reset scan count for property [${item.propertyNumber}] (${item.article})? It will return to the Unscanned list.`,
      itemToDelete: item,
      deleteType: 'reset-count',
    });
  };

  // Execute Deletion / Reset after user confirms in Confirmation Modal
  const handleExecuteDelete = async () => {
    const { itemToDelete, deleteType } = deleteConfirmModal;
    if (!itemToDelete) return;

    setDeleteConfirmModal({ isOpen: false, title: '', message: '', itemToDelete: null, deleteType: '' });

    try {
      if (deleteType === 'session') {
        try {
          await fetch(`/api/inventory-sessions?id=${itemToDelete.id}`, { method: 'DELETE' });
        } catch (e) {}

        if (activeSessionId === itemToDelete.id) {
          setActiveSessionId(null);
        }
        await loadData();

        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Session Deleted!',
          message: `Inventory session [${itemToDelete.sessionCode}] "${itemToDelete.title}" was deleted successfully.`,
        });
      } else if (deleteType === 'reset-count') {
        try {
          await fetch(`/api/physical-counts?countId=${itemToDelete.id}`, { method: 'DELETE' });
        } catch (e) {}

        StorageManager.resetPhysicalCount({ countId: itemToDelete.id });
        await loadData();

        setStatusModal({
          isOpen: true,
          type: 'success',
          title: 'Count Reset Successful!',
          message: `Property "${itemToDelete.propertyNumber}" (${itemToDelete.article}) count was reset to pending unscanned.`,
        });
      }
    } catch (err) {
      setStatusModal({
        isOpen: true,
        type: 'failed',
        title: 'Delete Operation Failed!',
        message: err.message || 'An error occurred during deletion/reset.',
      });
    }
  };

  // Remarks & Verification Modal State
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [itemForVerification, setItemForVerification] = useState(null);
  const [verifyCount, setVerifyCount] = useState(1);
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [isSavingVerification, setIsSavingVerification] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('GOOD');

  const REMARKS_PRESETS = [
    { id: 'GOOD', label: 'Good Condition (Maayos)', text: 'In good working condition' },
    { id: 'REPAIR', label: 'For Repair', text: 'Serviceable - For repair / needs maintenance' },
    { id: 'BER', label: 'Unserviceable (BER)', text: 'Unserviceable (BER) - Beyond Economic Repair' },
  ];

  // Resolve Scanned Property String
  const resolveScannedProperty = (rawCode) => {
    if (!rawCode || !String(rawCode).trim()) return null;
    let code = String(rawCode).trim();
    if (code.startsWith('{') && code.endsWith('}')) {
      try {
        const parsed = JSON.parse(code);
        code = parsed.propertyNumber || parsed.property_number || parsed.propertyNo || parsed.id || code;
      } catch (e) {}
    }

    const clean = code.toLowerCase().trim();
    const cleanAlpha = clean.replace(/[^a-z0-9]/g, '');

    const matchesCode = (val) => {
      if (!val) return false;
      const str = String(val).toLowerCase().trim();
      return str === clean || str.replace(/[^a-z0-9]/g, '') === cleanAlpha;
    };

    // 1. Check in session active counts
    const activeMatch = allCounts.find(
      (c) =>
        (c.sessionId === activeSessionId || !activeSessionId) &&
        (matchesCode(c.propertyNumber) ||
         matchesCode(c.scannedCode) ||
         matchesCode(c.propertyId))
    );
    if (activeMatch) return activeMatch;

    // 2. Check in properties registry
    const propMatch = properties.find(
      (p) =>
        matchesCode(p.propertyNumber) ||
        matchesCode(p.property_number) ||
        matchesCode(p.propertyNo) ||
        matchesCode(p.id)
    );
    if (propMatch) {
      return {
        id: 'temp-' + propMatch.id,
        sessionId: activeSessionId,
        propertyId: propMatch.id,
        propertyNumber: propMatch.propertyNumber || propMatch.property_number || propMatch.propertyNo || code,
        article: propMatch.article || propMatch.name || 'Equipment Item',
        description: propMatch.description || '',
        unit: propMatch.unit || 'unit',
        unitValue: propMatch.unitValue || propMatch.unit_value || propMatch.cost || 0,
        quantityPerCard: propMatch.quantityPerCard || propMatch.quantity_per_card || propMatch.quantity || 1,
        physicalCount: propMatch.quantityPerCard || propMatch.quantity_per_card || propMatch.quantity || 1,
        difference: 0,
        status: 'OK',
        remarks: 'In good working condition',
        accountableOfficerName: propMatch.accountablePersonName || propMatch.accountable_person_name || propMatch.accountableOfficer || '',
        officeName: propMatch.officeName || propMatch.office_name || propMatch.office || '',
      };
    }

    return null;
  };

  // Open Verification Modal for any item
  const openVerificationModal = (item) => {
    if (!item) return;
    const expected = item.quantityPerCard || 1;
    const initialCount = item.physicalCount !== null && item.physicalCount !== undefined ? item.physicalCount : expected;
    const initialRem = item.remarks || 'In good working condition';

    setItemForVerification(item);
    setVerifyCount(initialCount);
    setVerifyRemarks(initialRem);
    setSelectedPresetId('GOOD');
    setIsVerifyModalOpen(true);
  };

  // Central Scan Trigger -> Opens Remarks & Verification Modal
  const handleInitiateScan = (code) => {
    if (!code || !code.trim()) return;
    const targetSessionId = activeSessionId || (sessions.length > 0 ? sessions[0].id : null);
    if (!targetSessionId) {
      alert('Pumili muna o gumawa ng Inventory Session bago mag-scan.');
      return;
    }

    const matched = resolveScannedProperty(code);
    if (matched) {
      playScanBeep();
      openVerificationModal(matched);
      setInlineScanCode('');
    } else {
      alert(`Property sticker with code "${code}" was not found in the property registry.`);
    }
  };

  // Confirm Verification & Save to Supabase
  const handleConfirmVerification = async () => {
    if (!itemForVerification) return;
    const targetSessionId = activeSessionId || (sessions.length > 0 ? sessions[0].id : null);
    if (!targetSessionId) {
      alert('Please create or select an inventory session first.');
      return;
    }

    setIsSavingVerification(true);

    try {
      const finalRemarks = verifyRemarks.trim() || 'In good working condition';

      // 1. Post to /api/physical-counts in Supabase
      const res = await fetch('/api/physical-counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: targetSessionId,
          countId: itemForVerification.id && !itemForVerification.id.startsWith('temp-') ? itemForVerification.id : undefined,
          propertyId: itemForVerification.propertyId || itemForVerification.id,
          scannedCode: itemForVerification.propertyNumber,
          physicalCount: verifyCount,
          remarks: finalRemarks,
          countedBy: 'Admin',
        }),
      });

      const data = await res.json();

      // 2. Update local storage for offline parity
      StorageManager.scanPropertyIntoSession({
        sessionId: targetSessionId,
        scannedCode: itemForVerification.propertyNumber,
        physicalCount: verifyCount,
        remarks: finalRemarks,
        countedBy: 'Admin',
      });

      playScanBeep();
      await loadData();

      const savedCountId = data?.count?.id || itemForVerification.id;
      setLastScannedId(savedCountId);
      setIsVerifyModalOpen(false);
      setIsScannerOpen(false);
      setStatusTab('SCANNED');

      setNotification({
        title: '✅ Count & Remarks Saved!',
        message: `"${itemForVerification.propertyNumber}" (${itemForVerification.article}) • Count: ${verifyCount} • Remarks: "${finalRemarks}"`,
      });

      setStatusModal({
        isOpen: true,
        type: 'success',
        title: 'Count & Verification Saved!',
        message: `Physical count for "${itemForVerification.propertyNumber} (${itemForVerification.article})" was recorded: ${verifyCount} unit(s) • Remarks: "${finalRemarks}".`,
      });

      setTimeout(() => setNotification(null), 5000);
      setTimeout(() => setLastScannedId((prev) => (prev === savedCountId ? null : prev)), 4000);
    } catch (err) {
      setStatusModal({
        isOpen: true,
        type: 'failed',
        title: 'Failed to Save Count!',
        message: err.message || 'Error saving count verification.',
      });
    } finally {
      setIsSavingVerification(false);
    }
  };

  // Open Scanner for active session or generally
  const openScanner = (sessionId = null, e = null) => {
    if (e) e.stopPropagation();
    setBarcodeInput('');
    setScannedItem(null);
    setIsScannerOpen(true);
  };

  // Manual / Modal Scan Lookup
  const handleScanLookup = () => {
    if (!barcodeInput.trim()) return;
    const matched = resolveScannedProperty(barcodeInput.trim());
    if (matched) {
      openVerificationModal(matched);
      setIsScannerOpen(false);
      setBarcodeInput('');
    } else {
      alert(`Property "${barcodeInput.trim()}" not found.`);
    }
  };

  // Filtered Sessions for Block Grid
  const filteredSessions = sessions.filter((s) => {
    if (!sessionSearch.trim()) return true;
    const q = sessionSearch.toLowerCase();
    return (
      s.sessionCode.toLowerCase().includes(q) ||
      s.title.toLowerCase().includes(q) ||
      (s.accountableOfficerName && s.accountableOfficerName.toLowerCase().includes(q)) ||
      (s.officeName && s.officeName.toLowerCase().includes(q))
    );
  });

  const totalSessionPages = Math.max(1, Math.ceil(filteredSessions.length / SESSIONS_PER_PAGE));
  const paginatedSessions = filteredSessions.slice(
    (sessionPage - 1) * SESSIONS_PER_PAGE,
    sessionPage * SESSIONS_PER_PAGE
  );

  // Active Session Details
  const currentActiveSession = sessions.find((s) => s.id === activeSessionId);
  const activeSessionCounts = currentActiveSession
    ? allCounts.filter((c) => c.sessionId === currentActiveSession.id)
    : [];

  // Active Session Stats
  const totalItems = activeSessionCounts.length;
  const countedCount = activeSessionCounts.filter((c) => c.physicalCount !== null).length;
  const pendingCount = activeSessionCounts.filter((c) => c.physicalCount === null).length;
  const okCount = activeSessionCounts.filter((c) => c.status === 'OK' && c.physicalCount !== null).length;
  const shortageCount = activeSessionCounts.filter((c) => c.status === 'SHORTAGE' && c.physicalCount !== null).length;
  const overageCount = activeSessionCounts.filter((c) => c.status === 'OVERAGE' && c.physicalCount !== null).length;
  const progressPct = totalItems > 0 ? Math.round((countedCount / totalItems) * 100) : 0;

  // Filtered counts for Active Session Table
  const filteredActiveCounts = activeSessionCounts.filter((c) => {
    const matchesSearch =
      !search ||
      c.propertyNumber.toLowerCase().includes(search.toLowerCase()) ||
      c.article.toLowerCase().includes(search.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(search.toLowerCase()));

    let matchesTab = true;
    if (statusTab === 'SCANNED') matchesTab = c.physicalCount !== null;
    else if (statusTab === 'UNSCANNED') matchesTab = c.physicalCount === null;
    else if (statusTab === 'OK') matchesTab = c.status === 'OK' && c.physicalCount !== null;
    else if (statusTab === 'SHORTAGE') matchesTab = c.status === 'SHORTAGE' && c.physicalCount !== null;
    else if (statusTab === 'OVERAGE') matchesTab = c.status === 'OVERAGE' && c.physicalCount !== null;
    else if (statusTab === 'ALL') matchesTab = true;

    const matchesCategory =
      selectedCategoryFilter === 'ALL' ||
      (() => {
        const prop = properties.find((p) => p.id === c.propertyId || p.propertyNumber === c.propertyNumber);
        return prop?.categoryId === selectedCategoryFilter;
      })();

    return matchesSearch && matchesTab && matchesCategory;
  });

  const totalTablePages = Math.max(1, Math.ceil(filteredActiveCounts.length / ROWS_PER_PAGE));
  const paginatedTableCounts = filteredActiveCounts.slice(
    (tablePage - 1) * ROWS_PER_PAGE,
    tablePage * ROWS_PER_PAGE
  );

  return (
    <div className="min-h-screen p-2.5 sm:p-6 lg:p-8 flex justify-center items-start">
      <div className="w-full max-w-[1540px] flex gap-5 lg:gap-6 items-start">
        {/* Floating Sidebar */}
        <Sidebar totalItems={allCounts.length} />

        {/* Floating Main Content Container */}
        <main className="flex-1 min-w-0 bg-white/90 backdrop-blur-xl border border-white/80 rounded-2xl sm:rounded-[32px] shadow-2xl shadow-slate-900/10 p-4 sm:p-6 lg:p-8 flex flex-col space-y-5 sm:space-y-6 overflow-hidden">
          {/* Top Navbar */}
          <Navbar pageTitle="Physical Inventory & Field Counting" icon={ClipboardList} />

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

          {/* ================= VIEW 1: COMPACT SESSION BLOCKS GRID ================= */}
          {!activeSessionId ? (
            <div className="space-y-5">
              {/* Header Action & Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-xs p-4 rounded-2xl shadow-xs">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-extrabold text-slate-900 leading-tight">
                      Physical Inventory Sessions
                    </h2>
                    {dbConnected && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Database className="w-2.5 h-2.5" />
                        <span>Supabase Live</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Click any session block below to open its property counting sheet and start scanning stickers
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Session Search Bar */}
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={sessionSearch}
                      onChange={(e) => setSessionSearch(e.target.value)}
                      placeholder="Search session..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>

                  <button
                    onClick={openNewSessionModal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ New Session Block</span>
                  </button>
                </div>
              </div>

              {/* Compact Grid of Session Blocks */}
              {filteredSessions.length === 0 ? (
                <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">No Inventory Sessions Found</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {sessionSearch ? 'No sessions matched your search query.' : 'Create your first session block to start scanning stickers.'}
                  </p>
                  <button
                    onClick={openNewSessionModal}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Start New Session</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedSessions.map((session) => {
                    const sessionCounts = allCounts.filter((c) => c.sessionId === session.id);
                    const total = sessionCounts.length;
                    const counted = sessionCounts.filter((c) => c.physicalCount !== null).length;
                    const pending = sessionCounts.filter((c) => c.physicalCount === null).length;
                    const shortages = sessionCounts.filter((c) => c.status === 'SHORTAGE' && c.physicalCount !== null).length;
                    const pct = total > 0 ? Math.round((counted / total) * 100) : 0;

                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          setActiveSessionId(session.id);
                          setStatusTab('SCANNED');
                        }}
                        className="group bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-900/5 transition-all p-4 flex flex-col justify-between space-y-3 cursor-pointer relative overflow-hidden"
                      >
                        {/* Top Thin Accent Line */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />

                        {/* Block Header */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-mono text-[11px] font-black text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                              {session.sessionCode}
                            </span>
                            {session.status === 'FINALIZED' && (
                              <span className="text-[9.5px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                                Locked / Final
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">
                            {session.title}
                          </h3>

                          <div className="space-y-1 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                            <p className="flex items-center gap-1.5 truncate">
                              <User className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{session.inventoryPerson || session.accountableOfficerName || 'All Personnel'}</span>
                            </p>
                            <p className="flex items-center gap-1.5 text-slate-400">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>Cut-off: {session.asOfDate || '2026-12-31'}</span>
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar & Stat Badges */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className="text-slate-600">Scanned Items</span>
                            <span className="text-emerald-700 font-extrabold">
                              {counted}/{total} ({pct}%)
                            </span>
                          </div>

                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full bg-emerald-600 transition-all duration-300"
                            />
                            <div
                              style={{ width: `${100 - pct}%` }}
                              className="h-full bg-amber-400/80 transition-all duration-300"
                            />
                          </div>

                          {/* 4 Mini Stat Blocks */}
                          <div className="grid grid-cols-4 gap-1 text-center pt-1">
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <span className="text-[9px] text-slate-400 font-bold block uppercase">Total</span>
                              <span className="text-xs font-black text-slate-800">{total}</span>
                            </div>
                            <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                              <span className="text-[9px] text-emerald-700 font-bold block uppercase">Scanned</span>
                              <span className="text-xs font-black text-emerald-900">{counted}</span>
                            </div>
                            <div className="bg-amber-50 p-1.5 rounded-lg border border-amber-100">
                              <span className="text-[9px] text-amber-700 font-bold block uppercase">Pending</span>
                              <span className="text-xs font-black text-amber-900">{pending}</span>
                            </div>
                            <div className="bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                              <span className="text-[9px] text-rose-700 font-bold block uppercase">Shortage</span>
                              <span className="text-xs font-black text-rose-900">{shortages}</span>
                            </div>
                          </div>

                          {/* Block Footer Actions */}
                          <div className="pt-2 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                              <span>Open Property Counting Table</span>
                              <ChevronRight className="w-3 h-3" />
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => openEditSessionModal(session, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Edit Session"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleDeleteSession(session, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Session"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Grid Pagination Bar */}
              {totalSessionPages > 1 && (
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/90 text-xs shadow-xs">
                  <span className="text-slate-500 text-[11px]">
                    Showing {(sessionPage - 1) * SESSIONS_PER_PAGE + 1} to{' '}
                    {Math.min(sessionPage * SESSIONS_PER_PAGE, filteredSessions.length)} of{' '}
                    {filteredSessions.length} sessions
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSessionPage((p) => Math.max(1, p - 1))}
                      disabled={sessionPage === 1}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-xs font-bold"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {Array.from({ length: totalSessionPages }, (_, i) => i + 1).map((pg) => (
                      <button
                        key={pg}
                        onClick={() => setSessionPage(pg)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          sessionPage === pg
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pg}
                      </button>
                    ))}

                    <button
                      onClick={() => setSessionPage((p) => Math.min(totalSessionPages, p + 1))}
                      disabled={sessionPage === totalSessionPages}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 text-xs font-bold"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ================= VIEW 2: ACTIVE SESSION COUNTING TABLE ================= */
            <div className="space-y-5 animate-in fade-in">
              {/* Back to Sessions Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 bg-white/80 backdrop-blur-xs p-4 rounded-2xl shadow-xs">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveSessionId(null)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Sessions</span>
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                        {currentActiveSession?.sessionCode}
                      </span>
                      <h2 className="text-base font-extrabold text-slate-900">
                        {currentActiveSession?.title}
                      </h2>
                      {dbConnected && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <Database className="w-2.5 h-2.5" />
                          <span>Supabase Live</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Inventory Person: {currentActiveSession?.inventoryPerson || currentActiveSession?.inventoryPersonName || 'All Personnel'} • As-of: {currentActiveSession?.asOfDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={(e) => openEditSessionModal(currentActiveSession, e)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-slate-200"
                    title="Edit Session Details"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>

                  <Link
                    href={`/reports?sessionId=${currentActiveSession?.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm shadow-emerald-200 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Generate Report</span>
                  </Link>
                </div>
              </div>

              {/* FAST STICKER SCAN BAR (Barcode Reader Gun & Rapid Property Lookup) */}
              <div className="bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                      <Scan className="w-5 h-5 text-emerald-600 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-slate-900">
                          Property Sticker Scanner & Field Verification
                        </h3>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          <span>Live Ready</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        I-scan ang QR code o Barcode sticker gamit ang barcode gun para agarang mai-record sa inventory.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fast Input Form (Supports USB/Bluetooth Barcode Reader Gun) */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (inlineScanCode.trim()) {
                      handleInitiateScan(inlineScanCode);
                    }
                  }}
                  className="flex flex-col sm:flex-row gap-2.5 pt-0.5"
                >
                  <div className="relative flex-1">
                    <Scan className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={inlineScanCode}
                      onChange={(e) => setInlineScanCode(e.target.value)}
                      placeholder="I-scan gamit ang Barcode Gun o i-type ang Property Number (e.g. PROP-20260812-0001) tapos pindutin ang Enter..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!inlineScanCode.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-200 shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    <span>Scan & Verify</span>
                  </button>
                </form>
              </div>

              {/* Progress & Stat Pills */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">
                    Progress: {countedCount} of {totalItems} items verified ({progressPct}% Complete)
                  </span>
                  <span className="text-emerald-700 font-extrabold">{progressPct}%</span>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${progressPct}%` }}
                    className="h-full bg-emerald-600 transition-all duration-300"
                  />
                  <div
                    style={{ width: `${100 - progressPct}%` }}
                    className="h-full bg-amber-400/80 transition-all duration-300"
                  />
                </div>

                {/* Summary Stat Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-0.5">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[9.5px] text-slate-400 font-bold uppercase">Total Expected</span>
                    <p className="text-sm font-black text-slate-900">{totalItems}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center ring-1 ring-emerald-400/40">
                    <span className="text-[9.5px] text-emerald-700 font-bold uppercase">Scanned (Counted)</span>
                    <p className="text-sm font-black text-emerald-900">{countedCount}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <span className="text-[9.5px] text-amber-700 font-bold uppercase">Unscanned</span>
                    <p className="text-sm font-black text-amber-900">{pendingCount}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                    <span className="text-[9.5px] text-emerald-700 font-bold uppercase">OK (Zero Diff)</span>
                    <p className="text-sm font-black text-emerald-900">{okCount}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-center">
                    <span className="text-[9.5px] text-rose-700 font-bold uppercase">Shortage</span>
                    <p className="text-sm font-black text-rose-900">{shortageCount}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-center">
                    <span className="text-[9.5px] text-blue-700 font-bold uppercase">Overage</span>
                    <p className="text-sm font-black text-blue-900">{overageCount}</p>
                  </div>
                </div>
              </div>

              {/* Table Container with Pagination */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Filter Tabs & Search */}
                <div className="p-3.5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-2.5 bg-slate-50/50">
                  {/* Status Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
                    {[
                      { id: 'SCANNED', label: 'Scanned Items (Na-Inventory)', count: countedCount },
                      { id: 'UNSCANNED', label: 'Unscanned / Missing', count: pendingCount },
                      { id: 'ALL', label: 'All Registered', count: totalItems },
                      { id: 'OK', label: 'OK (Zero Diff)', count: okCount },
                      { id: 'SHORTAGE', label: 'Shortages', count: shortageCount },
                      { id: 'OVERAGE', label: 'Overages', count: overageCount },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setStatusTab(tab.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          statusTab === tab.id
                            ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/30'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`text-[9.5px] font-black px-1.5 py-0.2 rounded-full ${
                            statusTab === tab.id ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Category & Search */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-2xs w-full sm:w-auto">
                      <Tag className="w-3 h-3 text-emerald-600 shrink-0" />
                      <select
                        value={selectedCategoryFilter}
                        onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                        className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                      >
                        <option value="ALL">All Categories</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="relative w-full sm:w-52">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search property..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase tracking-wider font-semibold text-[10.5px]">
                      <tr>
                        <th className="py-3 px-3.5">Property No. & Article</th>
                        <th className="py-3 px-3.5">Category</th>
                        <th className="py-3 px-3.5 text-center">Expected</th>
                        <th className="py-3 px-3.5 text-center">Actual (Count)</th>
                        <th className="py-3 px-3.5 text-center">Difference</th>
                        <th className="py-3 px-3.5">Status</th>
                        <th className="py-3 px-3.5">Remarks</th>
                        <th className="py-3 px-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedTableCounts.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-12 px-4 text-center">
                            {statusTab === 'SCANNED' && countedCount === 0 ? (
                              <div className="max-w-md mx-auto space-y-3">
                                <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                                  <Scan className="w-8 h-8 animate-pulse" />
                                </div>
                                <h4 className="text-base font-black text-slate-900">
                                  Wala Pang Na-Scan na Item sa Session na Ito
                                </h4>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  I-scan ang QR code o Barcode sticker ng bawat kagamitan gamit ang Live Camera o Barcode gun upang isa-isang lumabas dito ang mga na-inventory.
                                </p>
                                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                                  <button
                                    onClick={() => openScanner(currentActiveSession?.id)}
                                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 flex items-center gap-2 cursor-pointer transition-all"
                                  >
                                    <Camera className="w-4 h-4" />
                                    <span>Buksan ang Camera QR Scanner</span>
                                  </button>
                                  <button
                                    onClick={() => setStatusTab('UNSCANNED')}
                                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Tingnan ang {pendingCount} Unscanned Items
                                  </button>
                                </div>
                              </div>
                            ) : statusTab === 'UNSCANNED' && pendingCount === 0 ? (
                              <div className="max-w-md mx-auto space-y-2 py-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                                  <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <h4 className="text-sm font-black text-slate-900">
                                  Lahat ng Kagamitan ay Na-Scan Na!
                                </h4>
                                <p className="text-xs text-slate-500">
                                  100% ng mga nakarehistrong kagamitan para sa session na ito ay matagumpay nang na-inventory.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-1 py-6 text-slate-400 text-xs">
                                <p className="font-bold">No property items found under this filter.</p>
                                <p className="text-[11px]">Subukang baguhin ang category filter o search keyword.</p>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : (
                        paginatedTableCounts.map((item) => {
                          const isEditing = editingCountId === item.id;
                          const expected = item.quantityPerCard || 1;
                          const actual = item.physicalCount;
                          const isRecentlyScanned = lastScannedId === item.id;

                          return (
                            <tr
                              key={item.id}
                              className={`transition-all duration-300 ${
                                isRecentlyScanned
                                  ? 'bg-emerald-100/70 ring-2 ring-emerald-500/40'
                                  : 'hover:bg-slate-50/70'
                              }`}
                            >
                              {/* Property No & Article */}
                              <td className="py-3 px-3.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                                    {item.propertyNumber}
                                  </span>
                                  {isRecentlyScanned && (
                                    <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-1.5 py-0.2 rounded-full animate-pulse">
                                      Scanned
                                    </span>
                                  )}
                                  <span className="font-extrabold text-slate-900 text-xs">{item.article}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-0.5">
                                  <span className="line-clamp-1">{item.description || 'No description'}</span>
                                  {item.countedAt && (
                                    <span className="text-emerald-700 font-medium shrink-0 flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      {new Date(item.countedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  <Tag className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                  <span>{getCategoryName(item)}</span>
                                </span>
                              </td>

                              {/* Qty per Card (Expected) */}
                              <td className="py-3 px-3.5 text-center font-bold text-slate-700">
                                {expected} {item.unit || 'unit'}
                              </td>

                              {/* Physical Count (Input) */}
                              <td className="py-3 px-3.5 text-center">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    value={inputVal}
                                    onChange={(e) => setInputVal(e.target.value)}
                                    className="w-16 px-1.5 py-1 text-center font-black text-xs text-emerald-900 bg-emerald-50 border-2 border-emerald-500 rounded-lg focus:outline-none"
                                    autoFocus
                                  />
                                ) : (
                                  <span
                                    onClick={() => handleStartEdit(item)}
                                    className={`inline-block font-black text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${
                                      actual !== null
                                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                                        : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                                    }`}
                                    title="Click to edit physical count"
                                  >
                                    {actual !== null ? `${actual} ${item.unit || 'unit'}` : 'Unscanned'}
                                  </span>
                                )}
                              </td>

                              {/* Difference */}
                              <td className="py-3 px-3.5 text-center font-mono font-black text-xs">
                                {item.difference !== null ? (
                                  <span
                                    className={
                                      item.difference === 0
                                        ? 'text-emerald-700'
                                        : item.difference < 0
                                        ? 'text-rose-600'
                                        : 'text-blue-600'
                                    }
                                  >
                                    {item.difference > 0 ? `+${item.difference}` : item.difference}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 font-mono">--</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold border ${
                                    item.status === 'OK' && actual !== null
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : item.status === 'SHORTAGE' && actual !== null
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : item.status === 'OVERAGE' && actual !== null
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {actual !== null ? item.status : 'PENDING SCAN'}
                                </span>
                              </td>

                              {/* Remarks */}
                              <td className="py-3 px-3.5">
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={inputRemarks}
                                    onChange={(e) => setInputRemarks(e.target.value)}
                                    placeholder="Remarks"
                                    className="w-full px-2 py-1 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                                  />
                                ) : (
                                  <span className="text-slate-600 text-[11px] truncate block max-w-[130px]">
                                    {item.remarks || '--'}
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => handleSaveCount(item)}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                                    >
                                      <Save className="w-3 h-3" />
                                      <span>Save</span>
                                    </button>
                                    <button
                                      onClick={() => setEditingCountId(null)}
                                      className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5">
                                    {actual === null ? (
                                      <button
                                        onClick={() => openVerificationModal(item)}
                                        title="Verify & Enter Remarks"
                                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Verify & Remarks</span>
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleResetItem(item)}
                                          title="Reset / Unscan Item"
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 cursor-pointer transition-colors"
                                        >
                                          <RotateCcw className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => openVerificationModal(item)}
                                          title="Edit Count & Remarks"
                                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1 border border-slate-200"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                          <span>Edit Remarks</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Pagination Bar */}
                {totalTablePages > 1 && (
                  <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      Showing {(tablePage - 1) * ROWS_PER_PAGE + 1} to{' '}
                      {Math.min(tablePage * ROWS_PER_PAGE, filteredActiveCounts.length)} of{' '}
                      {filteredActiveCounts.length} properties
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                        disabled={tablePage === 1}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 text-xs font-bold"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {Array.from({ length: totalTablePages }, (_, i) => i + 1).map((pg) => (
                        <button
                          key={pg}
                          onClick={() => setTablePage(pg)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                            tablePage === pg
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {pg}
                        </button>
                      ))}

                      <button
                        onClick={() => setTablePage((p) => Math.min(totalTablePages, p + 1))}
                        disabled={tablePage === totalTablePages}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 text-xs font-bold"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ================= MODAL: START NEW SESSION BLOCK ================= */}
      {isNewSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Start New Inventory Session Block
                  </h3>
                  <p className="text-xs text-slate-400">
                    Create a dedicated counting session for physical verification
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewSessionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Session Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionFormData.sessionCode}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, sessionCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Session Title / Scope *
                  </label>
                  <input
                    type="text"
                    required
                    value={sessionFormData.title}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Inventory Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Elmer G. Dolotallas / Inspection Team"
                    value={sessionFormData.inventoryPerson || ''}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, inventoryPerson: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Counting Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={sessionFormData.countingDate}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, countingDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      As-of Date (Report Cut-off) *
                    </label>
                    <input
                      type="date"
                      required
                      value={sessionFormData.asOfDate}
                      onChange={(e) => setSessionFormData({ ...sessionFormData, asOfDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Remarks / Notes
                  </label>
                  <input
                    type="text"
                    value={sessionFormData.remarks}
                    onChange={(e) => setSessionFormData({ ...sessionFormData, remarks: e.target.value })}
                    placeholder="e.g. Annual physical count per COA guidelines"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewSessionModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
                >
                  Create & Open Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDIT SESSION DETAILS ================= */}
      {isEditSessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Edit Inventory Session Details
                  </h3>
                  <p className="text-xs text-slate-400">
                    Update title, session code, or inventory cut-off date
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditSessionModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSession} className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Session Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={editSessionFormData.sessionCode}
                    onChange={(e) => setEditSessionFormData({ ...editSessionFormData, sessionCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Session Title / Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={editSessionFormData.title}
                    onChange={(e) => setEditSessionFormData({ ...editSessionFormData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Counting Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={editSessionFormData.countingDate}
                      onChange={(e) => setEditSessionFormData({ ...editSessionFormData, countingDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      As-of Date (Report Cut-off) *
                    </label>
                    <input
                      type="date"
                      required
                      value={editSessionFormData.asOfDate}
                      onChange={(e) => setEditSessionFormData({ ...editSessionFormData, asOfDate: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Remarks / Notes
                  </label>
                  <input
                    type="text"
                    value={editSessionFormData.remarks}
                    onChange={(e) => setEditSessionFormData({ ...editSessionFormData, remarks: e.target.value })}
                    placeholder="e.g. Official counting session for year 2026"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditSessionModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: LIVE CAMERA & QR SCANNER ================= */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Scan className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900">QR / Barcode Property Scanner</h3>
              </div>
              <button
                onClick={() => {
                  setIsScannerOpen(false);
                  setScannedItem(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs: Live Camera vs Manual Input */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                onClick={() => setScannerMode('CAMERA')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  scannerMode === 'CAMERA'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Live Camera Scanner</span>
              </button>

              <button
                onClick={() => setScannerMode('MANUAL')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  scannerMode === 'MANUAL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                <Scan className="w-4 h-4" />
                <span>Manual / Code Input</span>
              </button>
            </div>

            {/* TAB 1: Live Camera Scanner */}
            {scannerMode === 'CAMERA' && (
              <div className="space-y-3 animate-in fade-in">
                <CameraQRScanner
                  onSwitchToManual={() => setScannerMode('MANUAL')}
                  onScanSuccess={(decodedText) => {
                    handleInitiateScan(decodedText);
                  }}
                />
              </div>
            )}

            {/* TAB 2: Manual / Scanner Gun Input */}
            {scannerMode === 'MANUAL' && (
              <div className="space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Enter Property Number / Scan with Barcode Reader Gun:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleScanLookup()}
                      placeholder="e.g. PROP-20260812-0001"
                      className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all"
                      autoFocus
                    />
                    <button
                      onClick={handleScanLookup}
                      className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                    >
                      Scan & Verify
                    </button>
                  </div>
                </div>

                {/* Quick Preset Buttons for Testing */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Quick Barcode / QR Test Selectors:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {properties.slice(0, 8).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setBarcodeInput(p.propertyNumber);
                          handleInitiateScan(p.propertyNumber);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 border border-slate-200 font-mono text-[10px] font-bold text-slate-700 hover:text-emerald-800 transition-colors cursor-pointer"
                      >
                        {p.propertyNumber}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: ASSET PHYSICAL VERIFICATION & REMARKS ================= */}
      {isVerifyModalOpen && itemForVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Physical Count & Remarks Verification
                  </h3>
                  <p className="text-xs text-slate-400">
                    Suriin ang kagamitan, ilagay ang bilang, at itala ang remarks / kondisyon
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsVerifyModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Asset Identity Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-start gap-4">
              <QRCodeDisplay
                value={itemForVerification.propertyNumber}
                size={84}
                className="shrink-0 rounded-xl bg-white p-1 shadow-2xs border border-slate-200"
              />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black text-emerald-950 bg-emerald-100/90 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                    {itemForVerification.propertyNumber}
                  </span>
                  <span className="text-[10.5px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-emerald-600" />
                    <span>{getCategoryName(itemForVerification)}</span>
                  </span>
                </div>

                <h4 className="font-black text-slate-900 text-sm leading-snug">
                  {itemForVerification.article}
                </h4>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {itemForVerification.description || 'No detailed specifications recorded.'}
                </p>

                <div className="pt-1 flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                  <span>Custodian: <strong className="text-slate-800">{getCustodianName(itemForVerification)}</strong></span>
                  <span>•</span>
                  <span>Office: <strong className="text-slate-800">{getOfficeName(itemForVerification)}</strong></span>
                </div>
              </div>
            </div>

            {/* Verification Inputs */}
            <div className="space-y-4">
              {/* Count Input with Expected vs Actual */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Physical Count Verification
                  </span>
                  {/* Difference Badge */}
                  {(() => {
                    const expected = itemForVerification.quantityPerCard || 1;
                    const diff = verifyCount - expected;
                    if (diff === 0) {
                      return (
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Exact Match (OK)
                        </span>
                      );
                    } else if (diff < 0) {
                      return (
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                          Shortage ({diff} {itemForVerification.unit || 'unit'})
                        </span>
                      );
                    } else {
                      return (
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300">
                          Overage (+{diff} {itemForVerification.unit || 'unit'})
                        </span>
                      );
                    }
                  })()}
                </div>

                <div className="grid grid-cols-2 gap-4 items-center">
                  <div className="p-3 bg-white rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Expected (per Card)</span>
                    <span className="text-base font-black text-slate-900">
                      {itemForVerification.quantityPerCard || 1} {itemForVerification.unit || 'unit'}
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-xl border border-emerald-400 flex items-center justify-between shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setVerifyCount((c) => Math.max(0, c - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center cursor-pointer transition-colors"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={verifyCount}
                      onChange={(e) => setVerifyCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-16 text-center font-mono font-black text-lg text-emerald-950 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setVerifyCount((c) => c + 1)}
                      className="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-black text-sm flex items-center justify-center cursor-pointer transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Remarks / Condition Presets */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Physical Condition & Status Presets (1-Click Selection):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {REMARKS_PRESETS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id || verifyRemarks === preset.text;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setSelectedPresetId(preset.id);
                          setVerifyRemarks(preset.text);
                          if (preset.id !== 'TRANSFERRED') {
                            setTransferOfficeId('');
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs scale-[1.02]'
                            : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Remarks Textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Detailed Remarks / Field Notes / Location (Whereabouts):
                </label>
                <textarea
                  rows={3}
                  value={verifyRemarks}
                  onChange={(e) => setVerifyRemarks(e.target.value)}
                  placeholder="e.g. Serial #12345 verified in good working condition stationed at Ground Floor Laboratory Room 102."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition-all resize-none shadow-2xs"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingVerification}
                onClick={handleConfirmVerification}
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSavingVerification ? 'Saving to Database...' : 'Confirm & Save Count Entry'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETION / RESET CONFIRMATION MODAL */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4 animate-scaleUp">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto shadow-sm">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">{deleteConfirmModal.title || 'Confirm Deletion'}</h3>
              <p className="text-xs font-semibold text-slate-600 px-2 leading-relaxed">
                {deleteConfirmModal.message}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmModal({ isOpen: false, title: '', message: '', itemToDelete: null, deleteType: '' })}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Delete</span>
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
