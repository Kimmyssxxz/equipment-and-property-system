'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Download,
  FileText,
  Building2,
  User,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Layers,
} from 'lucide-react';
import { StorageManager, authFetch, initialSignatoriesConfig } from '@/lib/storage';

function ReportPreviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('id');
  const categoryQuery = searchParams.get('category');
  const assumedDateQuery = searchParams.get('assumedDate');
  const asOfDateQuery = searchParams.get('asOfDate');

  const [report, setReport] = useState(null);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [apiSignatories, setApiSignatories] = useState(null);
  const [properties, setProperties] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [offices, setOffices] = useState([]);
  const [categories, setCategories] = useState([]);

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

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const activeUser = StorageManager.getActiveUser();
        const currentUsername = (activeUser?.username || 'edolotallas').toLowerCase().trim();

        const [setRes, propRes, empRes, offRes, catRes] = await Promise.all([
          safeFetchJson('/api/settings'),
          safeFetchJson('/api/properties'),
          safeFetchJson('/api/personnel'),
          safeFetchJson('/api/offices'),
          safeFetchJson('/api/categories'),
        ]);

        if (setRes.data?.settings) setSettings(setRes.data.settings);
        if (setRes.data?.signatories) setApiSignatories(setRes.data.signatories);
        if (propRes.data?.properties) {
          const userProps = propRes.data.properties.filter(
            (p) => (p.encodedBy || 'edolotallas').toLowerCase().trim() === currentUsername
          );
          setProperties(userProps);
        }
        if (empRes.data?.personnel || empRes.data?.employees) {
          const rawEmps = empRes.data?.personnel || empRes.data?.employees || [];
          const userEmps = rawEmps.filter(
            (e) => (e.encodedBy || 'edolotallas').toLowerCase().trim() === currentUsername
          );
          setEmployees(userEmps);
        }
        if (offRes.data?.offices) {
          const userOffs = offRes.data.offices.filter(
            (o) => (o.encodedBy || 'edolotallas').toLowerCase().trim() === currentUsername
          );
          setOffices(userOffs);
        }
        if (catRes.data?.categories) setCategories(catRes.data.categories);

        let target = null;

        if (reportId) {
          const repRes = await safeFetchJson(`/api/reports/${encodeURIComponent(reportId)}`);
          if (repRes.data?.report) {
            target = repRes.data.report;
          }
        }

        if (!target && typeof window !== 'undefined') {
          try {
            const cachedStr = sessionStorage.getItem('last_generated_report');
            if (cachedStr) {
              const cachedObj = JSON.parse(cachedStr);
              if (cachedObj && (Array.isArray(cachedObj.snapshotData) || Array.isArray(cachedObj.itemsSnapshot))) {
                target = cachedObj;
              }
            }
          } catch (e) {}
        }

        const typeQuery = (searchParams.get('type') || '').toLowerCase();
        const isUrlRspi = typeQuery === 'rspi' || typeQuery.includes('registry') || typeQuery.includes('issued');
        const isUrlRpcsp = typeQuery === 'rpcsp' || typeQuery.includes('semi-expandable');

        if (!target) {
          const activeEmp = (empRes.data?.personnel || [])[0] || {};
          const activeOff = (offRes.data?.offices || [])[0] || {};
          
          let defaultType = 'REPORT ON PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT (RPCPPE)';
          let defaultTitle = 'REPORT ON THE PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT (RPCPPE)';

          if (isUrlRspi) {
            defaultType = 'REGISTRY OF SEMI-EXPANDABLE PROPERTY ISSUED (RSPI)';
            defaultTitle = 'REGISTRY OF SEMI-EXPANDABLE PROPERTY ISSUED';
          } else if (isUrlRpcsp) {
            defaultType = 'REPORT ON PHYSICAL COUNT OF SEMI-EXPANDABLE PROPERTY (RPCSP)';
            defaultTitle = 'REPORT ON THE PHYSICAL COUNT OF SEMI-EXPANDABLE PROPERTY (RPCSP)';
          }

          target = {
            id: reportId || 'REP-2026-0001',
            reportNumber: reportId || 'REP-2026-0001',
            reportType: defaultType,
            title: defaultTitle,
            asOfDate: asOfDateQuery || new Date().toISOString().slice(0, 10),
            accountablePersonName: activeEmp.name || 'ELMER G. DOLOTALLAS',
            accountablePosition: activeEmp.position || 'Supply Officer',
            assumedDate: assumedDateQuery || activeEmp.assumedDate || '2021-01-15',
            officeName: activeOff.name || 'Supply Office',
            generatedBy: 'Admin',
            status: 'FINALIZED',
            signatories: setRes.data?.signatories || {},
            snapshotData: [],
          };
        } else if (isUrlRspi) {
          target.reportType = 'REGISTRY OF SEMI-EXPANDABLE PROPERTY ISSUED (RSPI)';
          target.title = 'REGISTRY OF SEMI-EXPANDABLE PROPERTY ISSUED';
        } else if (isUrlRpcsp) {
          target.reportType = 'REPORT ON PHYSICAL COUNT OF SEMI-EXPANDABLE PROPERTY (RPCSP)';
          target.title = 'REPORT ON THE PHYSICAL COUNT OF SEMI-EXPANDABLE PROPERTY (RPCSP)';
        }

        if (target) {
          setReport(target);

          const parseVal = (val) => {
            if (val === null || val === undefined) return 0;
            if (typeof val === 'number') return val;
            const cleaned = String(val).replace(/[^0-9.-]/g, '');
            const parsed = parseFloat(cleaned);
            return isNaN(parsed) ? 0 : parsed;
          };

          const propsList = propRes.data?.properties || [];
          const categoriesList = catRes.data?.categories || [];

          let rawItems = Array.isArray(target.snapshotData)
            ? target.snapshotData
            : Array.isArray(target.itemsSnapshot)
            ? target.itemsSnapshot
            : [];

          // Enrich snapshot items with catalog metadata if available
          rawItems = rawItems.map((item) => {
            const prop = propsList.find((p) => p.id === item.propertyId || p.propertyNumber === item.propertyNumber);
            const updatedVal = prop && prop.unitValue !== undefined && prop.unitValue !== null
              ? parseVal(prop.unitValue)
              : parseVal(item.unitValue);
            return {
              ...item,
              unitValue: updatedVal,
              categoryId: prop?.categoryId || item.categoryId,
              article: item.article || prop?.article || 'Asset',
              description: item.description || prop?.description || '',
              brand: item.brand || prop?.brand || '',
              propertyStatus: item.propertyStatus || prop?.status || 'ACTIVE',
              remarks: item.remarks || prop?.remarks || '',
              poNumber: item.poNumber || prop?.poNumber || '',
              officeId: item.officeId || prop?.officeId || null,
              officeName: item.officeName || prop?.officeName || null,
              accountablePersonId: item.accountablePersonId || prop?.accountablePersonId || null,
              acquisitionDate: item.acquisitionDate || prop?.acquisitionDate || prop?.assignmentDate || '',
            };
          });

          // Category filtering if category query parameter exists
          const catFilter = categoryQuery || target.categoryName || target.categoryId;
          if (catFilter && catFilter !== 'ALL' && catFilter !== 'undefined') {
            const catLower = String(catFilter).toLowerCase();
            const matchingCat = categoriesList.find(
              (c) => c.id === catFilter || c.code?.toLowerCase() === catLower || c.name?.toLowerCase() === catLower
            );

            rawItems = rawItems.filter((item) => {
              const itemCatId = String(item.categoryId || '').toLowerCase();
              if (matchingCat) {
                const cId = String(matchingCat.id).toLowerCase();
                const cCode = String(matchingCat.code).toLowerCase();
                const cName = String(matchingCat.name).toLowerCase();
                return itemCatId === cId || itemCatId === cCode || itemCatId === cName;
              }
              const prop = propsList.find((p) => p.id === item.propertyId || p.propertyNumber === item.propertyNumber);
              const pCatId = String(prop?.categoryId || '').toLowerCase();
              const pCatName = String(prop?.categoryName || prop?.category?.name || '').toLowerCase();
              return itemCatId.includes(catLower) || pCatId.includes(catLower) || pCatName.includes(catLower) || catLower.includes(pCatName);
            });
          }

          // Enforce Capital Asset Threshold for RPCPPE (>= ₱50k) vs RSPI/RPCSP (< ₱50k)
          const repTypeUpper = (target.reportType || target.title || '').toUpperCase();
          const isRspiTarget = repTypeUpper.includes('REGISTRY') || repTypeUpper.includes('RSPI') || isUrlRspi;
          const isRpcppeTarget = !isRspiTarget && (repTypeUpper.includes('RPCPPE') || repTypeUpper.includes('PROPERTY, PLANT'));
          const isRpcspTarget = !isRspiTarget && !isRpcppeTarget && (repTypeUpper.includes('RPCSP') || repTypeUpper.includes('SEMI-EXPANDABLE'));

          if (isRpcppeTarget) {
            rawItems = rawItems.filter((item) => parseVal(item.unitValue) >= 50000);
          } else if (isRspiTarget || isRpcspTarget) {
            rawItems = rawItems.filter((item) => parseVal(item.unitValue) < 50000);
          }

          setItems(rawItems);
        }
      } catch (e) {
        console.error('Error loading report preview:', e);
      }
    };

    fetchReportData();
  }, [reportId]);

  if (!report) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center text-slate-500 font-sans">
        Loading official report document...
      </div>
    );
  }

  // Calculate totals
  const totalValue = items.reduce((sum, item) => sum + (item.unitValue || 0) * (item.quantityPerCard || 1), 0);
  const totalShortageQty = items
    .filter((i) => i.status === 'SHORTAGE')
    .reduce((sum, i) => sum + Math.abs(i.difference || 1), 0);
  const totalShortageVal = items
    .filter((i) => i.status === 'SHORTAGE')
    .reduce((sum, i) => sum + (i.unitValue || 0) * Math.abs(i.difference || 1), 0);

  const totalOverageQty = items
    .filter((i) => i.status === 'OVERAGE')
    .reduce((sum, i) => sum + (i.difference || 1), 0);
  const totalOverageVal = items
    .filter((i) => i.status === 'OVERAGE')
    .reduce((sum, i) => sum + (i.unitValue || 0) * (i.difference || 1), 0);

  const configuredSigs = {
    ...initialSignatoriesConfig,
    ...(typeof window !== 'undefined' ? StorageManager.getSignatoriesConfig() : {}),
    ...(apiSignatories || {}),
    ...(settings?.signatories || {}),
  };
  const repSigs = report?.signatories || {};

  const sigs = {
    member1Name: repSigs.member1Name || repSigs.preparedByName || configuredSigs.member1Name || configuredSigs.preparedByName || 'ELMER G. DOLOTALLAS',
    member1Title: repSigs.member1Title || repSigs.preparedByTitle || configuredSigs.member1Title || configuredSigs.preparedByTitle || 'Supply Accountable Officer',

    member2Name: repSigs.member2Name || repSigs.teamLeaderName || configuredSigs.member2Name || configuredSigs.teamLeaderName || 'GLORIA C. PERIDO',
    member2Title: repSigs.member2Title || repSigs.teamLeaderTitle || configuredSigs.member2Title || configuredSigs.teamLeaderTitle || 'Budget Officer',

    member3Name: repSigs.member3Name || configuredSigs.member3Name || 'JENELYN N. EDEN',
    member3Title: repSigs.member3Title || configuredSigs.member3Title || 'Supply Section Representative',

    certifiedCorrectByName: repSigs.certifiedCorrectByName || configuredSigs.certifiedCorrectByName || 'MA. CARLA G. FELIPE, RN',
    certifiedCorrectByTitle: repSigs.certifiedCorrectByTitle || configuredSigs.certifiedCorrectByTitle || 'Chief, Admin',

    approvedByName: repSigs.approvedByName || configuredSigs.approvedByName || 'ATTY. ERCY NANETTE P MADRIAGA, DPSSG',
    approvedByTitle: repSigs.approvedByTitle || configuredSigs.approvedByTitle || 'Director, NFSTI',

    verifiedByName: repSigs.verifiedByName || configuredSigs.verifiedByName || 'YVES ARDEN CABANLONG',
    verifiedByTitle: repSigs.verifiedByTitle || configuredSigs.verifiedByTitle || 'State Auditor IV/ Audit Team Leader, RO IV A',
  };

  const typeParam = (searchParams.get('type') || '').toLowerCase();
  const isIIRUP = typeParam === 'iirup' || (report.reportType || report.title || '').toUpperCase().includes('IIRUP') || (report.reportType || report.title || '').toUpperCase().includes('UNSERVICEABLE');
  const isRSPI = !isIIRUP && (typeParam === 'rspi' || (report.reportType || report.title || '').toUpperCase().includes('REGISTRY') || (report.reportType || report.title || '').toUpperCase().includes('RSPI') || (report.reportType || '').toUpperCase().includes('ISSUED'));
  const isRPCSP = !isIIRUP && !isRSPI && (typeParam === 'rpcsp' || (report.reportType || report.title || '').toUpperCase().includes('SEMI-EXPANDABLE') || (report.reportType || '').toUpperCase().includes('RPCSP'));
  const isRPCI = !isIIRUP && !isRSPI && !isRPCSP && ((report.reportType || report.title || '').toUpperCase().includes('INVENTORY') || (report.reportType || '').toUpperCase().includes('RPCI'));

  const resolvedAccountablePersonName =
    report.accountablePersonName ||
    employees.find((e) => e.id === report.accountablePersonId)?.name ||
    'ELMER G. DOLOTALLAS';

  const resolvedAccountablePosition =
    report.accountablePosition ||
    employees.find((e) => e.id === report.accountablePersonId)?.position ||
    'Supply Officer';

  let reportMainHeader = 'REPORT ON THE PHYSICAL COUNT OF PROPERTY, PLANT AND EQUIPMENT';
  let reportSubHeaderLabel = '(Type of Property, Plant and Equipment)';
  let defaultTypeLabel = 'PROPERTY, PLANT AND EQUIPMENT (RPCPPE)';

  if (isIIRUP) {
    reportMainHeader = 'INVENTORY AND INSPECTION REPORT OF UNSERVICEABLE PROPERTY';
    reportSubHeaderLabel = '(Unserviceable Property)';
    defaultTypeLabel = 'UNSERVICEABLE PROPERTY (IIRUP)';
  } else if (isRSPI) {
    reportMainHeader = 'REGISTRY OF SEMI-EXPANDABLE PROPERTY ISSUED';
    reportSubHeaderLabel = '(Semi-expendable Property)';
    defaultTypeLabel = 'OFFICE EQUIPMENT';
  } else if (isRPCI) {
    reportMainHeader = 'REPORT ON THE PHYSICAL COUNT OF INVENTORIES';
    reportSubHeaderLabel = '(Type of Inventory)';
    defaultTypeLabel = 'INVENTORIES AND SUPPLIES (RPCI)';
  } else if (isRPCSP) {
    reportMainHeader = 'REPORT ON THE PHYSICAL COUNT OF SEMI-EXPANDABLE PROPERTY';
    reportSubHeaderLabel = '(Type of Semi-Expendable Property)';
    defaultTypeLabel = 'SEMI-EXPANDABLE PROPERTY (RPCSP)';
  }

  // 1. Check URL query param, direct report properties, and signatories metadata
  let catId = report?.categoryId || report?.signatories?.categoryId;
  let catNameFromPayload = categoryQuery || report?.categoryName || report?.category || report?.signatories?.categoryName;

  // 2. If missing, check items inside report snapshot
  if (!catNameFromPayload && items && items.length > 0) {
    const firstItemCatName = items[0]?.category || items[0]?.categoryName;
    const firstItemCatId = items[0]?.categoryId;
    if (firstItemCatName) {
      catNameFromPayload = firstItemCatName;
    } else if (firstItemCatId) {
      catId = catId || firstItemCatId;
    }
  }

  // 3. Lookup in master categories list
  const catObj = categories.find(
    (c) => c.id === catId || c.code === catId || c.name === catNameFromPayload || c.name === catId
  );
  
  const resolvedCatName = catNameFromPayload || catObj?.name || (catId && catId !== 'ALL' ? catId : '');

  const ppeTypeName = (resolvedCatName && resolvedCatName !== 'ALL')
    ? resolvedCatName.toUpperCase()
    : defaultTypeLabel;

  // Helper: format YYYY-MM-DD or ISO timestamp -> "Month DD, YYYY" (e.g. August 12, 2026)
  const formatLongDate = (d) => {
    if (!d) return '';
    const dateOnly = String(d).split('T')[0];
    const dt = new Date(dateOnly + 'T00:00:00');
    if (isNaN(dt.getTime())) {
      const fallbackDt = new Date(d);
      if (isNaN(fallbackDt.getTime())) return d;
      return fallbackDt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Helper: format YYYY-MM-DD -> "dated on Month DD, YYYY"
  const formatDatedOn = (dateStr) => {
    if (!dateStr) return '';
    const dateOnly = String(dateStr).split('T')[0];
    const d = new Date(dateOnly + 'T00:00:00');
    if (isNaN(d.getTime())) {
      const fallbackD = new Date(dateStr);
      if (isNaN(fallbackD.getTime())) return `dated on ${dateStr}`;
      return `dated on ${fallbackD.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    }
    const formatted = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    return `dated on ${formatted}`;
  };

  // Helper to detect unserviceable / condemned / disposed / BER items
  const checkIsUnserviceable = (item, prop) => {
    const pStatus = String(item?.propertyStatus || prop?.status || item?.status || '').toUpperCase();
    const pRemarks = String(item?.remarks || prop?.remarks || '').toUpperCase();
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
      pRemarks.includes('DAMAGED') ||
      pRemarks.includes('BER') ||
      pRemarks.includes('DEFECTIVE')
    );
  };

  // Helper to render multiple positions on distinct lines
  const renderPositions = (titleStr, defaultStr = '') => {
    const text = titleStr || defaultStr;
    if (!text) return null;
    const lines = text.split(/[\/|\n]/).map((l) => l.trim()).filter(Boolean);
    return (
      <div className="mt-3 space-y-0.5">
        {lines.map((line, idx) => (
          <p key={idx} className="text-[10.5px] text-slate-700 font-sans leading-tight whitespace-nowrap">
            {line}
          </p>
        ))}
      </div>
    );
  };

  // Export to Microsoft Word (.docx / .doc) Document
  const handleExportWord = () => {
    if (!report) return;

    const orgName = settings?.orgName || 'NATIONAL FORENSIC SCIENCE TRAINING INSTITUTE';
    const officeAddress = settings?.officeAddress || 'Camp Vicente Lim, Mayapa Calamba City Laguna';
    const asOfFormatted = formatLongDate(asOfDateQuery || report.asOfDate) || report.asOfDate;
    const assumedFormatted = formatLongDate(assumedDateQuery || report.assumedDate || report.signatories?.assumedDate) || formatLongDate(new Date());

    if (isIIRUP) {
      const iirupItems = items.filter((item) => {
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

      const groupedItems = iirupItems.reduce((acc, item) => {
        const cat = item.categoryName || item.category || item.categoryCode || 'OFFICE EQUIPMENT';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {});

      let rowsHtml = '';
      let grandTotalCost = 0;

      if (Object.keys(groupedItems).length === 0) {
        rowsHtml = `<tr><td colspan="18" style="text-align:center; padding: 25px;">No property items marked as UNSERVICEABLE or FOR DISPOSAL recorded.</td></tr>`;
      } else {
        Object.entries(groupedItems).forEach(([catName, catItems]) => {
          rowsHtml += `
            <tr style="background-color:#f9fafb; font-weight:bold;">
              <td></td>
              <td colspan="17" style="font-weight:bold; text-transform:uppercase;">${catName}</td>
            </tr>
          `;
          catItems.forEach((item) => {
            const qty = parseInt(item.quantityPerCard, 10) || 1;
            const uVal = parseFloat(item.unitValue) || 0;
            const totalCost = uVal * qty;
            grandTotalCost += totalCost;

            const acqDate = item.acquisitionDate || item.date || report.asOfDate || '';
            const dateStr = acqDate ? String(acqDate).split('T')[0] : '';
            const propNo = item.propertyNumber || item.semiExpendablePropertyNo || '';
            const itemDesc = item.description ? `${item.article || ''}, ${item.description}` : (item.article || 'Equipment');

            rowsHtml += `
              <tr>
                <td style="text-align:center;">${dateStr}</td>
                <td>${itemDesc}</td>
                <td style="text-align:center; font-weight:bold;">${propNo}</td>
                <td style="text-align:center; font-weight:bold;">${qty}</td>
                <td style="text-align:right;">₱${uVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="text-align:right; font-weight:bold;">₱${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="text-align:center;">-</td>
                <td style="text-align:center;">-</td>
                <td style="text-align:center;">-</td>
                <td>${item.remarks || 'unserviceable'}</td>
                <td style="text-align:center;">-</td>
                <td style="text-align:center;">-</td>
                <td style="text-align:center;">-</td>
                <td style="text-align:center;">-</td>
                <td style="text-align:center;">-</td>
                <td style="text-align:center;">-</td>
                <td style="text-align:center;">-</td>
                <td style="text-align:center;">-</td>
              </tr>
            `;
          });
        });

        rowsHtml += `
          <tr style="font-weight:bold; background-color:#f3f4f6;">
            <td colspan="5" style="text-align:right;">TOTAL COST:</td>
            <td style="text-align:right; font-weight:bold;">₱${grandTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td colspan="12"></td>
          </tr>
        `;
      }

      const htmlDocument = `
        <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>IIRUP Document</title>
        <style>
          @page WordSection1 { size: 13.0in 8.5in; mso-page-orientation: landscape; margin: 0.5in; }
          div.WordSection1 { page: WordSection1; }
          body { font-family: Arial, sans-serif; font-size: 8.5pt; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th, td { border: 1pt solid #000; padding: 4px; font-size: 8pt; }
          th { background-color: #f3f4f6; font-weight: bold; text-align: center; }
        </style>
        </head>
        <body>
        <div class="WordSection1">
          <div style="text-align:center; margin-bottom:15px;">
            <h2 style="font-size:12pt; font-weight:bold; text-transform:uppercase; margin-bottom:3px;">INVENTORY AND INSPECTION REPORT OF UNSERVICEABLE PROPERTY</h2>
            <p style="font-size:10pt; font-weight:bold; text-transform:uppercase; text-decoration:underline; margin:3px 0;">${ppeTypeName || 'OFFICE EQUIPMENT'}</p>
            <p style="font-size:9pt; font-style:italic; margin-top:2px; margin-bottom:10px;">(Type of Property, Plant and Equipment)</p>
            <p style="font-size:9pt; margin-top:5px;">
              <b>As of:</b> <u>${asOfFormatted}</u> &nbsp;&nbsp;&nbsp;&nbsp;
              For which <u><b>${resolvedAccountablePersonName}</b></u> (<i>${resolvedAccountablePosition}</i>) is accountable, having assumed such accountability on <u>${assumedFormatted}</u>
            </p>
          </div>

          <table>
            <thead>
              <tr>
                <th colspan="10">INVENTORY</th>
                <th colspan="5">INSPECTION and DISPOSAL</th>
                <th colspan="3">RECORDS OF SALE</th>
              </tr>
              <tr>
                <th rowspan="2">Date Acquired</th>
                <th rowspan="2">Particulars/Articles</th>
                <th rowspan="2">Property No.</th>
                <th rowspan="2">Qty</th>
                <th rowspan="2">Unit Cost</th>
                <th rowspan="2">Total Cost</th>
                <th rowspan="2">Accumulated Depreciation</th>
                <th rowspan="2">Accumulated Impairment Losses</th>
                <th rowspan="2">Carrying Amount</th>
                <th rowspan="2">Remarks</th>
                <th colspan="5">DISPOSAL</th>
                <th rowspan="2">Appraised Value</th>
                <th rowspan="2">OR No.</th>
                <th rowspan="2">Amount</th>
              </tr>
              <tr>
                <th>Sale</th>
                <th>Transfer</th>
                <th>Destruction</th>
                <th>Others (Specify)</th>
                <th>Total</th>
              </tr>
              <tr style="font-size:7.5pt; text-align:center;">
                <th>(1)</th><th>(2)</th><th>(3)</th><th>(4)</th><th>(5)</th><th>(6)</th><th>(7)</th><th>(8)</th><th>(9)</th><th>(10)</th>
                <th>(11)</th><th>(12)</th><th>(13)</th><th>(14)</th><th>(15)</th><th>(16)</th><th>(17)</th><th>(18)</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <br/><br/>

          <table style="width:100%; border:none; margin-top:20px; font-family:Arial,sans-serif; page-break-inside:avoid;">
            <tr style="border:none; vertical-align:top;">
              <!-- 1. Certified Correct by (2x2 Grid: Elmer & Carla on Top, Gloria & Jenelyn at Bottom) -->
              <td style="border:none; width:48%; padding-right:15px; vertical-align:top;">
                <p style="font-weight:bold; font-size:9.5pt; margin-bottom:14px; white-space:nowrap;">Certified Correct by:</p>
                <table style="width:100%; border:none;">
                  <!-- Row 1: Elmer G. Dolotallas & Ma. Carla G. Felipe, RN -->
                  <tr style="border:none; vertical-align:top;">
                    <td style="border:none; width:50%; padding-right:10px; padding-bottom:16px; white-space:nowrap;">
                      <p style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; text-decoration:underline; margin:0; white-space:nowrap;">
                        ${sigs.member1Name}
                      </p>
                      <p style="font-size:8pt; margin-top:3px; color:#222; line-height:1.2; white-space:nowrap;">
                        ${(sigs.member1Title || '').split(/[\/|\n]/).map(s => s.trim()).filter(Boolean).join('<br/>')}
                      </p>
                    </td>
                    <td style="border:none; width:50%; padding-bottom:16px; white-space:nowrap;">
                      <p style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; text-decoration:underline; margin:0; white-space:nowrap;">
                        ${sigs.certifiedCorrectByName}
                      </p>
                      <p style="font-size:8pt; margin-top:3px; color:#222; line-height:1.2; white-space:nowrap;">
                        ${(sigs.certifiedCorrectByTitle || '').split(/[\/|\n]/).map(s => s.trim()).filter(Boolean).join('<br/>')}
                      </p>
                    </td>
                  </tr>
                  <!-- Row 2 (Sa baba): Gloria C. Perido & Jenelyn N. Eden -->
                  <tr style="border:none; vertical-align:top;">
                    <td style="border:none; width:50%; padding-right:10px; white-space:nowrap;">
                      <p style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; text-decoration:underline; margin:0; white-space:nowrap;">
                        ${sigs.member2Name}
                      </p>
                      <p style="font-size:8pt; margin-top:3px; color:#222; line-height:1.2; white-space:nowrap;">
                        ${(sigs.member2Title || '').split(/[\/|\n]/).map(s => s.trim()).filter(Boolean).join('<br/>')}
                      </p>
                    </td>
                    <td style="border:none; width:50%; white-space:nowrap;">
                      <p style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; text-decoration:underline; margin:0; white-space:nowrap;">
                        ${sigs.member3Name}
                      </p>
                      <p style="font-size:8pt; margin-top:3px; color:#222; line-height:1.2; white-space:nowrap;">
                        ${(sigs.member3Title || '').split(/[\/|\n]/).map(s => s.trim()).filter(Boolean).join('<br/>')}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>

              <!-- 2. Approved by -->
              <td style="border:none; width:27%; padding-right:15px; vertical-align:top; white-space:nowrap;">
                <p style="font-weight:bold; font-size:9.5pt; margin-bottom:14px; white-space:nowrap;">Approved by:</p>
                <p style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; text-decoration:underline; margin:0; white-space:nowrap;">
                  ${sigs.approvedByName}
                </p>
                <p style="font-size:8pt; margin-top:3px; color:#222; line-height:1.2; white-space:nowrap;">
                  ${(sigs.approvedByTitle || '').split(/[\/|\n]/).map(s => s.trim()).filter(Boolean).join('<br/>')}
                </p>
              </td>

              <!-- 3. Verified by -->
              <td style="border:none; width:25%; vertical-align:top; white-space:nowrap;">
                <p style="font-weight:bold; font-size:9.5pt; margin-bottom:14px; white-space:nowrap;">Verified by:</p>
                <p style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; text-decoration:underline; margin:0; white-space:nowrap;">
                  ${sigs.verifiedByName}
                </p>
                <p style="font-size:8pt; margin-top:3px; color:#222; line-height:1.2; white-space:nowrap;">
                  ${(sigs.verifiedByTitle || '').split(/[\/|\n]/).map(s => s.trim()).filter(Boolean).join('<br/>')}
                </p>
              </td>
            </tr>
          </table>
        </div>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + htmlDocument], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.reportNumber || 'IIRUP-Report'}_${new Date().toISOString().slice(0, 10)}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    if (isRSPI) {
      const rowsHtml = items.length > 0
        ? items.map((item, index) => {
            const uVal = parseFloat(item.unitValue) || 0;
            const prop = properties.find((p) => p.id === item.propertyId || p.propertyNumber === item.propertyNumber);
            const actualOffId = item.officeId || prop?.officeId;
            const actualEmpId = item.accountablePersonId || item.employeeId || prop?.accountablePersonId;
            const office = offices.find((o) => o.id === actualOffId);
            const employee = employees.find((e) => e.id === actualEmpId);

            const isIssued = Boolean(actualOffId || actualEmpId || item.issuedTo || (item.officeName && item.officeName !== 'Unassigned Office'));

            let recipientLoc = 'Unissued (In Storage)';
            if (office?.name && employee?.name) {
              recipientLoc = `${office.name} — ${employee.name}`;
            } else if (office?.name) {
              recipientLoc = office.name;
            } else if (employee?.name) {
              recipientLoc = employee.name;
            } else if (item.officeName && item.officeName !== 'Unassigned Office') {
              recipientLoc = item.officeName;
            } else if (item.issuedTo) {
              recipientLoc = item.issuedTo;
            }

            const acqDate = prop?.acquisitionDate || item.acquisitionDate || item.date || report.asOfDate || '';
            const dateStr = acqDate ? String(acqDate).split('T')[0] : '';
            const icsNo = isIssued ? (item.icsNumber || item.icsNo || prop?.poNumber || (`ICS-2025-${String(index + 247).padStart(4, '0')}`)) : 'Unissued';
            const propNo = item.propertyNumber || prop?.propertyNumber || `SE-OE-07-2021-${String(index + 1).padStart(4, '0')}`;
            const brandText = prop?.brand || item.brand ? `Brand: ${prop?.brand || item.brand}, ` : '';
            const itemDesc = item.description ? `${brandText}${item.article || ''}, ${item.description}` : `${brandText}${item.article || 'Equipment'}`;
            const usefulLife = prop?.estimatedUsefulLife || item.estimatedUsefulLife || (uVal < 15000 ? '3' : '5');

            return `
              <tr>
                <td style="text-align:center;">${dateStr}</td>
                <td style="text-align:center; font-weight:bold;">${icsNo}</td>
                <td style="text-align:center; font-weight:bold;">${propNo}</td>
                <td>${itemDesc}</td>
                <td style="text-align:center; font-weight:bold;">${usefulLife}</td>
                <td style="text-align:center; font-weight:bold;">${isIssued ? (item.quantityPerCard || 1) : 0}</td>
                <td>${recipientLoc}</td>
                <td></td><td></td><td></td><td></td><td></td>
                <td style="text-align:center; font-weight:bold;">${!isIssued ? (item.quantityPerCard || 1) : 0}</td>
                <td style="text-align:right; font-weight:bold;">₱${uVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>${item.remarks || (!isIssued ? 'Unissued in storage' : '')}</td>
              </tr>
            `;
          }).join('')
        : `<tr><td colspan="15" style="text-align:center; padding: 25px;">No entries recorded for RSPI.</td></tr>`;

      const htmlDocument = `
        <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>RSPI Document</title>
        <style>
          @page WordSection1 { size: 13.0in 8.5in; mso-page-orientation: landscape; margin: 0.5in; }
          div.WordSection1 { page: WordSection1; }
          body { font-family: Arial, sans-serif; font-size: 9pt; }
          table { border-collapse: collapse; width: 100%; margin-top: 10px; }
          th, td { border: 1pt solid #000; padding: 4px; font-size: 8.5pt; }
          th { background-color: #f3f4f6; font-weight: bold; text-align: center; }
        </style>
        </head>
        <body>
        <div class="WordSection1">
          <p style="font-weight:bold; font-size:9pt;">Entity Name: <u>${settings?.orgName || 'NATIONAL FORENSIC SCIENCE TRAINING INSTITUTE'}</u></p>
          <p style="font-weight:bold; font-size:9pt;">Semi-expendable Property: <u>${ppeTypeName || 'OFFICE EQUIPMENT'}</u></p>
          <h2 style="text-align:center; font-size:13pt; font-weight:bold; text-transform:uppercase; margin: 15px 0;">REGISTRY OF SEMI-EXPANDABLE PROPERTY ISSUED</h2>
          <table>
            <thead>
              <tr>
                <th rowspan="2">Date</th>
                <th colspan="2">Reference</th>
                <th rowspan="2">Item Description</th>
                <th rowspan="2">Estimated Useful Life</th>
                <th colspan="2">Issued</th>
                <th colspan="2">Returned</th>
                <th colspan="2">Re-issued</th>
                <th>Disposed</th>
                <th>Balance</th>
                <th rowspan="2">Amount</th>
                <th rowspan="2">Remarks</th>
              </tr>
              <tr>
                <th>ITR/ICS/RRSP No.</th>
                <th>Semi-expendable Property No.</th>
                <th>Qty.</th>
                <th>Office/Officer</th>
                <th>Qty.</th>
                <th>Office/Officer</th>
                <th>Qty.</th>
                <th>Office/Officer</th>
                <th>Qty.</th>
                <th>Qty.</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <br/><br/>
          <p style="font-weight:bold; font-size:9.5pt;">Prepared by :</p>
          <p style="font-weight:bold; font-size:10.5pt; text-transform:uppercase; text-decoration:underline;">
            ${sigs.certifiedCorrectByName || sigs.preparedByName || report.accountablePersonName || 'ELMER G. DOLOTALLAS'}
          </p>
          <p style="font-size:9pt;">${sigs.certifiedCorrectByTitle || 'Supply Accountable Officer'}</p>
        </div>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff' + htmlDocument], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.reportNumber || 'RSPI-Report'}_${new Date().toISOString().slice(0, 10)}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return;
    }

    const rowsHtml = items.length > 0
      ? items.map((item) => {
          const qty = parseInt(item.quantityPerCard, 10) || 1;
          const uVal = parseFloat(item.unitValue) || 0;
          const isShortage = item.status === 'SHORTAGE';
          const isOverage = item.status === 'OVERAGE';
          const diffQty = Math.abs(item.difference || 1);
          const shortQtyStr = isShortage ? `${diffQty}` : isOverage ? `+${diffQty}` : '-';
          const shortValStr = (isShortage || isOverage)
            ? `₱${(uVal * diffQty).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            : '-';

          const prop = properties.find((p) => p.id === item.propertyId || p.propertyNumber === item.propertyNumber);
          const isUnserviceable = checkIsUnserviceable(item, prop);

          // Office, PO, Acq Date
          const officeName = item.officeName || (offices.find((o) => o.id === item.officeId)?.name) || (offices.find((o) => o.id === prop?.officeId)?.name) || '';
          const poNum = item.poNumber || prop?.poNumber || '';
          const acqDate = item.acquisitionDate || prop?.acquisitionDate || '';

          const remarksList = [];
          if (isUnserviceable) {
            const rawRemark = (item.remarks && item.remarks.toLowerCase().includes('unserviceable'))
              ? item.remarks
              : (prop?.remarks && prop.remarks.toLowerCase().includes('unserviceable'))
              ? prop.remarks
              : 'UNSERVICEABLE';
            remarksList.push(`<strong style="color:#dc2626; font-size:9pt;">${rawRemark.toUpperCase()}</strong>`);
          }
          if (officeName) remarksList.push(officeName.toUpperCase());
          if (poNum) remarksList.push(poNum);
          if (acqDate) remarksList.push(formatDatedOn(acqDate));

          const remarksText = remarksList.join('<br/>') || 'N/A';
          const rowStyle = isUnserviceable ? 'color: #dc2626; font-weight: bold;' : '';

          return `
            <tr style="${rowStyle}">
              <td style="${isUnserviceable ? 'color:#dc2626;' : ''}">${item.article || ''}</td>
              <td style="${isUnserviceable ? 'color:#dc2626;' : ''}">${item.description || ''}</td>
              <td style="text-align:center; ${isUnserviceable ? 'color:#dc2626; font-weight:bold;' : ''}">${item.propertyNumber || ''}</td>
              <td style="text-align:center; ${isUnserviceable ? 'color:#dc2626;' : ''}">${item.unit || 'unit'}</td>
              <td style="text-align:right; ${isUnserviceable ? 'color:#dc2626; font-weight:bold;' : ''}">₱${uVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td style="text-align:center; ${isUnserviceable ? 'color:#dc2626;' : ''}">${qty}</td>
              <td style="text-align:center; ${isUnserviceable ? 'color:#dc2626;' : ''}">${item.physicalCount !== null && item.physicalCount !== undefined ? item.physicalCount : qty}</td>
              <td style="text-align:center; ${isUnserviceable ? 'color:#dc2626;' : ''}">${shortQtyStr}</td>
              <td style="text-align:right; ${isUnserviceable ? 'color:#dc2626;' : ''}">${shortValStr}</td>
              <td style="${isUnserviceable ? 'color:#dc2626;' : ''}">${remarksText}</td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="10" style="text-align:center; padding: 25px; color: #888;">No physical count rows recorded for this ${ppeTypeName} report.</td></tr>`;

    // Members list HTML
    const membersList = [
      sigs.member1Name || 'ELMER G. DOLOTALLAS',
      sigs.member2Name || 'GLORIA C. PERIDO',
      sigs.member3Name || 'JENELYN N. EDEN',
      sigs.certifiedCorrectByName || 'MA. CARLA G. FELIPE, RN',
    ].filter(Boolean);

    const membersHtml = membersList.length > 0
      ? `<div style="margin-top:15px;"><p style="font-weight:bold; font-size:9pt; margin-bottom:5px;">Member:</p>${membersList.map((m) => `<p style="font-weight:bold; font-size:10pt; margin:3px 0;">${m}</p>`).join('')}</div>`
      : '';

    const htmlDocument = `
      <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office'
            xmlns:w='urn:schemas-microsoft-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${report.reportNumber} - ${reportMainHeader}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForCustomXhtml/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page WordSection1 {
            size: 13.0in 8.5in;
            mso-page-orientation: landscape;
            margin: 0.5in 0.5in 0.5in 0.5in;
          }
          div.WordSection1 {
            page: WordSection1;
          }
          body {
            font-family: 'Arial', sans-serif;
            font-size: 10pt;
            color: #000;
          }
          .title-main {
            font-size: 14pt;
            font-weight: 900;
            text-align: center;
            text-transform: uppercase;
            font-family: Arial, sans-serif;
          }
          .title-category {
            font-size: 10.5pt;
            font-weight: 900;
            text-align: center;
            text-transform: uppercase;
            text-decoration: underline;
            margin-top: 3px;
          }
          .title-sub {
            font-size: 9.5pt;
            font-style: italic;
            text-align: center;
            margin-top: 2px;
            color: #333;
          }
          .header-border {
            border-bottom: 1.5pt solid #000;
            padding-bottom: 12px;
            margin-bottom: 15px;
          }
          .meta-info {
            margin-top: 10px;
            margin-bottom: 15px;
            font-size: 9.5pt;
            text-align: center;
          }
          table.report-table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 10px;
          }
          table.report-table th, table.report-table td {
            border: 1pt solid #000;
            padding: 5px 6px;
            font-size: 9pt;
          }
          table.report-table th {
            background-color: #f3f4f6;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
          }
          .sig-table {
            width: 100%;
            border: none;
            margin-top: 30px;
          }
          .sig-table td {
            border: none;
            vertical-align: top;
            padding: 10px;
          }
          .underline {
            border-bottom: 1pt solid #000;
            padding-bottom: 2px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="WordSection1">
          <div class="header-border">
            <div class="title-main">${reportMainHeader}</div>
            <div class="title-category">${ppeTypeName}</div>
            <div class="title-sub">${reportSubHeaderLabel}</div>

            <div class="meta-info">
              <strong>As of:</strong> <span class="underline">&nbsp;&nbsp;${asOfFormatted}&nbsp;&nbsp;</span>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
              For which <span class="underline">&nbsp;&nbsp;${(report.accountablePersonName || 'ELMER G. DOLOTALLAS').toUpperCase()}&nbsp;&nbsp;</span>
              <em>(${report.accountablePosition || 'Supply Officer'})</em>
              is accountable, having assumed such accountability on <span class="underline">&nbsp;&nbsp;${assumedFormatted}&nbsp;&nbsp;</span>
            </div>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th rowspan="2" width="10%">ARTICLE</th>
                <th rowspan="2" width="18%">DESCRIPTION</th>
                <th rowspan="2" width="10%">PROPERTY NUMBER</th>
                <th rowspan="2" width="5%">UNIT OF MEASURE</th>
                <th rowspan="2" width="8%">UNIT VALUE</th>
                <th rowspan="2" width="5%">QUANTITY PER PROPERTY CARD</th>
                <th rowspan="2" width="5%">QUANTITY PER PHYSICAL COUNT</th>
                <th colspan="2">SHORTAGE / OVERAGE</th>
                <th rowspan="2" width="20%">REMARKS</th>
              </tr>
              <tr>
                <th width="4%">Qty</th>
                <th width="5%">Value</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr style="font-weight: bold; background-color: #fafafa;">
                <td colspan="4" style="text-align: right; text-transform: uppercase;">TOTAL VALUE:</td>
                <td style="text-align: right; font-weight: bold;">₱${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td colspan="2" style="text-align: center; text-transform: uppercase; font-size: 8.5pt;">Variance Totals:</td>
                <td style="text-align: center;">${totalShortageQty > 0 ? `${totalShortageQty}` : '-'}</td>
                <td style="text-align: right;">${totalShortageVal > 0 ? `₱${totalShortageVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <table style="width:100%; border:none; margin-top:20px; font-family:Arial,sans-serif; page-break-inside:avoid;">
            <tr style="border:none; vertical-align:top;">
              <!-- 1. Certified Correct by (2x2 Grid: Elmer & Carla on Top, Gloria & Jenelyn at Bottom) -->
              <td style="border:none; width:48%; padding-right:15px; vertical-align:top;">
                <p style="font-weight:bold; font-size:9.5pt; margin-bottom:14px; white-space:nowrap;">Certified Correct by:</p>
                <table style="width:100%; border:none;">
                  <!-- Row 1: Elmer G. Dolotallas & Ma. Carla G. Felipe, RN -->
                  <tr style="border:none; vertical-align:top;">
                    <td style="border:none; width:50%; padding-right:10px; padding-bottom:16px; white-space:nowrap;">
                      <p style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; text-decoration:underline; margin:0; white-space:nowrap;">
                        ${sigs.member1Name}
                      </p>
                      <p style="font-size:8pt; margin-top:3px; color:#222; line-height:1.2; white-space:nowrap;">
                        ${(sigs.member1Title || '').split(/[\/|\n]/).map(s => s.trim()).filter(Boolean).join('<br/>')}
                      </p>
                    </td>
                    <td style="border:none; width:50%; padding-bottom:16px; white-space:nowrap;">
                      <p style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; text-decoration:underline; margin:0; white-space:nowrap;">
                        ${sigs.certifiedCorrectByName}
                      </p>
                      <p style="font-size:8pt; margin-top:3px; color:#222; line-height:1.2; white-space:nowrap;">
                        ${(sigs.certifiedCorrectByTitle || '').split(/[\/|\n]/).map(s => s.trim()).filter(Boolean).join('<br/>')}
                      </p>
                    </td>
                  </tr>
                  <!-- Row 2 (Sa baba): Gloria C. Perido & Jenelyn N. Eden -->
                  <tr style="border:none; vertical-align:top;">
                    <td style="border:none; width:50%; padding-right:10px; white-space:nowrap;">
                      <p style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; text-decoration:underline; margin:0; white-space:nowrap;">
                        ${sigs.member2Name}
                      </p>
                      <p style="font-size:8pt; margin-top:3px; color:#222; line-height:1.2; white-space:nowrap;">
                        ${(sigs.member2Title || '').split(/[\/|\n]/).map(s => s.trim()).filter(Boolean).join('<br/>')}
                      </p>
                    </td>
                    <td style="border:none; width:50%; white-space:nowrap;">
                      <p style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; text-decoration:underline; margin:0; white-space:nowrap;">
                        ${sigs.member3Name}
                      </p>
                      <p style="font-size:8pt; margin-top:3px; color:#222; line-height:1.2; white-space:nowrap;">
                        ${(sigs.member3Title || '').split(/[\/|\n]/).map(s => s.trim()).filter(Boolean).join('<br/>')}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>

              <!-- 2. Approved by -->
              <td style="border:none; width:27%; padding-right:15px; vertical-align:top; white-space:nowrap;">
                <p style="font-weight:bold; font-size:9.5pt; margin-bottom:14px; white-space:nowrap;">Approved by:</p>
                <p style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; text-decoration:underline; margin:0; white-space:nowrap;">
                  ${sigs.approvedByName}
                </p>
                <p style="font-size:8pt; margin-top:3px; color:#222; line-height:1.2; white-space:nowrap;">
                  ${(sigs.approvedByTitle || '').split(/[\/|\n]/).map(s => s.trim()).filter(Boolean).join('<br/>')}
                </p>
              </td>

              <!-- 3. Verified by -->
              <td style="border:none; width:25%; vertical-align:top; white-space:nowrap;">
                <p style="font-weight:bold; font-size:9.5pt; margin-bottom:14px; white-space:nowrap;">Verified by:</p>
                <p style="font-weight:bold; font-size:9.5pt; text-transform:uppercase; text-decoration:underline; margin:0; white-space:nowrap;">
                  ${sigs.verifiedByName}
                </p>
                <p style="font-size:8pt; margin-top:3px; color:#222; line-height:1.2; white-space:nowrap;">
                  ${(sigs.verifiedByTitle || '').split(/[\/|\n]/).map(s => s.trim()).filter(Boolean).join('<br/>')}
                </p>
              </td>
            </tr>
          </table>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlDocument], {
      type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const docPrefix = isRPCSP ? 'RPCSP' : isRPCI ? 'RPCI' : 'RPCPPE';
    a.download = `${report.reportNumber || docPrefix + '-Report'}_${new Date().toISOString().slice(0, 10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6 lg:px-8">
      {/* Top Action Header Bar (Hidden during print) */}
      <div className="no-print max-w-[1400px] mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg shadow-slate-900/5">
        <div className="flex items-center gap-3">
          <Link
            href="/reports"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Reports</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold text-slate-900 leading-none">
                Official Report Preview: {report.reportNumber}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                Long Bond Paper (8.5&quot; x 13&quot;) — Landscape
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate max-w-2xl">
              {reportMainHeader} ({ppeTypeName})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportWord}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-md shadow-blue-200 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Save as Word / DOCX</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-md shadow-emerald-200 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report / Save as PDF (Long Landscape)</span>
          </button>
        </div>
      </div>

      {/* ================= OFFICIAL PRINTABLE LONG SIZE BOND PAPER LANDSCAPE REPORT SHEET ================= */}
      <div className="report-sheet max-w-[1400px] w-full mx-auto bg-white border border-slate-300 shadow-2xl p-8 sm:p-10 text-black font-serif print:shadow-none print:border-none print:m-0 print:p-0 print:max-w-none">
        {isIIRUP ? (
          <>
            {/* Document Header matching requested RPCPPE format layout */}
            <div className="text-center space-y-1 mb-5 border-b border-black pb-3 font-sans">
              <div className="pt-2">
                <h3 className="text-base sm:text-lg font-black tracking-wide uppercase font-sans">
                  INVENTORY AND INSPECTION REPORT OF UNSERVICEABLE PROPERTY
                </h3>
                <p className="text-xs font-black uppercase font-sans text-slate-900 mt-0.5 underline underline-offset-4">
                  {ppeTypeName || 'OFFICE EQUIPMENT'}
                </p>
                <p className="text-[11px] italic text-slate-700 mt-0.5">
                  (Type of Property, Plant and Equipment)
                </p>
              </div>

              <div className="pt-2 text-xs font-sans flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
                <p>
                  <strong>As of:</strong>{' '}
                  <span className="font-bold border-b border-black px-4">{formatLongDate(asOfDateQuery || report.asOfDate) || report.asOfDate}</span>
                </p>
                <p>
                  For which{' '}
                  <span className="font-extrabold border-b border-black px-6 uppercase text-xs">
                    {resolvedAccountablePersonName}
                  </span>{' '}
                  <span className="text-[10px] italic text-slate-600">({resolvedAccountablePosition})</span>
                </p>
                <p>
                  is accountable, having assumed such accountability on{' '}
                  <span className="font-bold border-b border-black px-4">
                    {formatLongDate(assumedDateQuery || report.assumedDate || report.signatories?.assumedDate) || formatLongDate(new Date())}
                  </span>
                </p>
              </div>
            </div>

            {/* 18-Column Official IIRUP Table */}
            <div className="overflow-x-auto my-3">
              <table className="w-full text-[10.5px] font-sans border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-100 text-black text-center font-bold uppercase text-[10px]">
                    <th className="border border-black p-1.5" colSpan="10">INVENTORY</th>
                    <th className="border border-black p-1.5" colSpan="5">INSPECTION and DISPOSAL</th>
                    <th className="border border-black p-1.5" colSpan="3">RECORDS OF SALE</th>
                  </tr>
                  <tr className="bg-slate-100 text-black text-center font-bold uppercase text-[9px]">
                    <th className="border border-black p-1 w-[7%]" rowSpan="2">Date Acquired</th>
                    <th className="border border-black p-1 w-[18%]" rowSpan="2">Particulars/Articles</th>
                    <th className="border border-black p-1 w-[10%]" rowSpan="2">Property No.</th>
                    <th className="border border-black p-1 w-[3%]" rowSpan="2">Qty</th>
                    <th className="border border-black p-1 w-[6%]" rowSpan="2">Unit Cost</th>
                    <th className="border border-black p-1 w-[7%]" rowSpan="2">Total Cost</th>
                    <th className="border border-black p-1 w-[5%]" rowSpan="2">Accumulated Depreciation</th>
                    <th className="border border-black p-1 w-[5%]" rowSpan="2">Accumulated Impairment Losses</th>
                    <th className="border border-black p-1 w-[5%]" rowSpan="2">Carrying Amount</th>
                    <th className="border border-black p-1 w-[6%]" rowSpan="2">Remarks</th>
                    <th className="border border-black p-1" colSpan="5">DISPOSAL</th>
                    <th className="border border-black p-1 w-[5%]" rowSpan="2">Appraised Value</th>
                    <th className="border border-black p-1 w-[5%]" rowSpan="2">OR No.</th>
                    <th className="border border-black p-1 w-[5%]" rowSpan="2">Amount</th>
                  </tr>
                  <tr className="bg-slate-100 text-black text-center font-bold uppercase text-[8.5px]">
                    <th className="border border-black p-0.5 w-[3%]">Sale</th>
                    <th className="border border-black p-0.5 w-[3%]">Transfer</th>
                    <th className="border border-black p-0.5 w-[3%]">Destruction</th>
                    <th className="border border-black p-0.5 w-[3%]">Others (Specify)</th>
                    <th className="border border-black p-0.5 w-[3%]">Total</th>
                  </tr>
                  <tr className="bg-slate-100 text-black text-center font-bold text-[8px]">
                    <th className="border border-black p-0.5">(1)</th>
                    <th className="border border-black p-0.5">(2)</th>
                    <th className="border border-black p-0.5">(3)</th>
                    <th className="border border-black p-0.5">(4)</th>
                    <th className="border border-black p-0.5">(5)</th>
                    <th className="border border-black p-0.5">(6)</th>
                    <th className="border border-black p-0.5">(7)</th>
                    <th className="border border-black p-0.5">(8)</th>
                    <th className="border border-black p-0.5">(9)</th>
                    <th className="border border-black p-0.5">(10)</th>
                    <th className="border border-black p-0.5">(11)</th>
                    <th className="border border-black p-0.5">(12)</th>
                    <th className="border border-black p-0.5">(13)</th>
                    <th className="border border-black p-0.5">(14)</th>
                    <th className="border border-black p-0.5">(15)</th>
                    <th className="border border-black p-0.5">(16)</th>
                    <th className="border border-black p-0.5">(17)</th>
                    <th className="border border-black p-0.5">(18)</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const iirupItems = items.filter((item) => {
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

                    if (iirupItems.length === 0) {
                      return (
                        <tr>
                          <td colSpan="18" className="border border-black py-8 text-center text-slate-400 font-sans font-medium">
                            No property items marked as UNSERVICEABLE or FOR DISPOSAL recorded for this report.
                          </td>
                        </tr>
                      );
                    }

                    const grouped = iirupItems.reduce((acc, item) => {
                      const cat = item.categoryName || item.category || item.categoryCode || 'OFFICE EQUIPMENT';
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(item);
                      return acc;
                    }, {});

                    let grandTotalCost = 0;

                    return (
                      <>
                          {Object.entries(grouped).map(([catName, catItems], catIdx) => (
                            <React.Fragment key={catIdx}>
                              <tr className="bg-slate-50 font-bold uppercase text-[10px]">
                                <td className="border border-black p-1"></td>
                                <td className="border border-black p-1 font-black text-black" colSpan="17">
                                  {catName}
                                </td>
                              </tr>
                              {catItems.map((item, idx) => {
                                const uVal = parseFloat(item.unitValue) || 0;
                                const qty = parseInt(item.quantityPerCard, 10) || 1;
                                const totalCost = uVal * qty;
                                grandTotalCost += totalCost;

                                const prop = properties.find((p) => p.id === item.propertyId || p.propertyNumber === item.propertyNumber);
                                const acqDate = prop?.acquisitionDate || item.acquisitionDate || item.date || report.asOfDate || '';
                                const dateStr = acqDate ? String(acqDate).split('T')[0] : '';
                                const propNo = item.propertyNumber || prop?.propertyNumber || item.semiExpendablePropertyNo || '';
                                const brandText = prop?.brand || item.brand ? `Brand: ${prop?.brand || item.brand}, ` : '';
                                const itemDesc = item.description ? `${brandText}${item.article || ''}, ${item.description}` : `${brandText}${item.article || 'Equipment'}`;

                                return (
                                  <tr key={idx} className="align-top text-[10px]">
                                    <td className="border border-black p-1 text-center font-mono">{dateStr}</td>
                                    <td className="border border-black p-1 whitespace-pre-line font-medium">{itemDesc}</td>
                                    <td className="border border-black p-1 text-center font-mono font-bold">{propNo}</td>
                                    <td className="border border-black p-1 text-center font-bold">{qty}</td>
                                    <td className="border border-black p-1 text-right font-mono font-semibold">
                                      ₱{uVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="border border-black p-1 text-right font-mono font-bold">
                                      ₱{totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="border border-black p-1 text-center text-slate-400 font-mono">-</td>
                                    <td className="border border-black p-1 text-center text-slate-400 font-mono">-</td>
                                    <td className="border border-black p-1 text-center text-slate-400 font-mono">-</td>
                                    <td className="border border-black p-1 text-[9.5px] text-slate-800">{item.remarks || 'unserviceable'}</td>
                                    <td className="border border-black p-1 text-center text-slate-400"></td>
                                    <td className="border border-black p-1 text-center text-slate-400"></td>
                                    <td className="border border-black p-1 text-center text-slate-400"></td>
                                    <td className="border border-black p-1 text-center text-slate-400"></td>
                                    <td className="border border-black p-1 text-center text-slate-400"></td>
                                    <td className="border border-black p-1 text-center text-slate-400"></td>
                                    <td className="border border-black p-1 text-center text-slate-400"></td>
                                    <td className="border border-black p-1 text-center text-slate-400"></td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                          <tr className="bg-slate-100 font-bold border-t-2 border-black">
                            <td colSpan="5" className="border border-black p-1.5 text-right uppercase text-[10px]">
                              TOTAL COST:
                            </td>
                            <td className="border border-black p-1.5 text-right font-mono font-black text-black">
                              ₱{grandTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td colSpan="12" className="border border-black p-1.5"></td>
                          </tr>
                        </>
                      );
                    })()}
                </tbody>
              </table>
            </div>

            {/* Signatories Footer matching official format */}
            <div className="mt-6 pt-3 font-sans text-xs break-inside-avoid print:break-inside-avoid">
              <div className="grid grid-cols-12 gap-6 text-left items-start">
                {/* 1. Certified Correct by (Takes 6 of 12 columns: 2x2 grid) */}
                <div className="col-span-6 space-y-1">
                  <p className="font-bold text-[11px] mb-4 text-black whitespace-nowrap">Certified Correct by:</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {/* Row 1, Col 1: Member 1 */}
                    <div className="space-y-1">
                      <div className="min-h-[24px] flex items-end">
                        <p className="font-extrabold uppercase border-b border-black pb-0.5 inline-block text-[11px] text-black whitespace-nowrap">
                          {sigs.member1Name}
                        </p>
                      </div>
                      {renderPositions(sigs.member1Title, 'Supply Accountable Officer')}
                    </div>

                    {/* Row 1, Col 2: Chairperson */}
                    <div className="space-y-1">
                      <div className="min-h-[24px] flex items-end">
                        <p className="font-extrabold uppercase border-b border-black pb-0.5 inline-block text-[11px] text-black whitespace-nowrap">
                          {sigs.certifiedCorrectByName}
                        </p>
                      </div>
                      {renderPositions(sigs.certifiedCorrectByTitle, 'Chief, Admin')}
                    </div>

                    {/* Row 2, Col 1 (Sa baba): Member 2 */}
                    <div className="space-y-1 pt-1">
                      <div className="min-h-[24px] flex items-end">
                        <p className="font-extrabold uppercase border-b border-black pb-0.5 inline-block text-[11px] text-black whitespace-nowrap">
                          {sigs.member2Name}
                        </p>
                      </div>
                      {renderPositions(sigs.member2Title, 'Budget Officer')}
                    </div>

                    {/* Row 2, Col 2 (Sa baba): Member 3 */}
                    <div className="space-y-1 pt-1">
                      <div className="min-h-[24px] flex items-end">
                        <p className="font-extrabold uppercase border-b border-black pb-0.5 inline-block text-[11px] text-black whitespace-nowrap">
                          {sigs.member3Name}
                        </p>
                      </div>
                      {renderPositions(sigs.member3Title, 'Chief, GSS')}
                    </div>
                  </div>
                </div>

                {/* 2. Approved by (Takes 3 of 12 columns) */}
                <div className="col-span-3 space-y-1">
                  <p className="font-bold text-[11px] mb-4 text-black whitespace-nowrap">Approved by:</p>
                  <div className="space-y-1">
                    <div className="min-h-[24px] flex items-end">
                      <p className="font-extrabold uppercase border-b border-black pb-0.5 inline-block text-[11px] text-black whitespace-nowrap">
                        {sigs.approvedByName}
                      </p>
                    </div>
                    {renderPositions(sigs.approvedByTitle, 'Director, NFSTI')}
                  </div>
                </div>

                {/* 3. Verified by (Takes 3 of 12 columns) */}
                <div className="col-span-3 space-y-1">
                  <p className="font-bold text-[11px] mb-4 text-black whitespace-nowrap">Verified by:</p>
                  <div className="space-y-1">
                    <div className="min-h-[24px] flex items-end">
                      <p className="font-extrabold uppercase border-b border-black pb-0.5 inline-block text-[11px] text-black whitespace-nowrap">
                        {sigs.verifiedByName}
                      </p>
                    </div>
                    {renderPositions(sigs.verifiedByTitle, 'State Auditor IV/ Audit Team Leader, RO IV A')}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : isRSPI ? (
          <>
            {/* RSPI Header from Official Photo */}
            <div className="mb-6 space-y-3 font-sans">
              <div className="flex justify-between items-start text-xs font-bold uppercase tracking-tight text-black">
                <div>
                  <p>Entity Name: <span className="font-extrabold underline">{settings?.orgName || 'NATIONAL FORENSIC SCIENCE TRAINING INSTITUTE'}</span></p>
                  <p className="mt-1">Semi-expendable Property: <span className="font-extrabold underline">{ppeTypeName || 'OFFICE EQUIPMENT'}</span></p>
                </div>
                <div className="text-right">
                  <p>Fund Cluster: <span className="font-normal underline min-w-[140px] inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
                  <p className="mt-1">Sheet No.: <span className="font-normal underline min-w-[140px] inline-block">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></p>
                </div>
              </div>

              <div className="text-center pt-2 pb-1 border-b border-black">
                <h2 className="text-lg font-black uppercase tracking-wider font-sans">
                  REGISTRY OF SEMI-EXPANDABLE PROPERTY ISSUED
                </h2>
              </div>
            </div>

            {/* 12-Column Table matching photo */}
            <div className="overflow-x-auto my-3">
              <table className="w-full text-[11px] font-sans border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-100 text-black text-center font-bold uppercase">
                    <th className="border border-black p-1.5 w-[6%]" rowSpan="2">Date</th>
                    <th className="border border-black p-1.5" colSpan="2">Reference</th>
                    <th className="border border-black p-1.5 w-[22%]" rowSpan="2">Item Description</th>
                    <th className="border border-black p-1.5 w-[6%]" rowSpan="2">Estimated Useful Life</th>
                    <th className="border border-black p-1" colSpan="2">Issued</th>
                    <th className="border border-black p-1" colSpan="2">Returned</th>
                    <th className="border border-black p-1" colSpan="2">Re-issued</th>
                    <th className="border border-black p-1 w-[4%]">Disposed</th>
                    <th className="border border-black p-1 w-[4%]">Balance</th>
                    <th className="border border-black p-1.5 w-[9%]" rowSpan="2">Amount</th>
                    <th className="border border-black p-1.5 w-[7%]" rowSpan="2">Remarks</th>
                  </tr>
                  <tr className="bg-slate-100 text-black text-center font-bold uppercase text-[10px]">
                    <th className="border border-black p-1 w-[9%] text-[9.5px]">ITR/ICS/RRSP No.</th>
                    <th className="border border-black p-1 w-[11%] text-[9.5px]">Semi-expendable Property No.</th>
                    <th className="border border-black p-1 w-[3%]">Qty.</th>
                    <th className="border border-black p-1 w-[10%]">Office/Officer</th>
                    <th className="border border-black p-1 w-[3%]">Qty.</th>
                    <th className="border border-black p-1 w-[7%]">Office/Officer</th>
                    <th className="border border-black p-1 w-[3%]">Qty.</th>
                    <th className="border border-black p-1 w-[7%]">Office/Officer</th>
                    <th className="border border-black p-1 w-[4%]">Qty.</th>
                    <th className="border border-black p-1 w-[4%]">Qty.</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="15" className="border border-black py-8 text-center text-slate-400">
                        No semi-expendable property issue entries recorded for this registry.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const unitVal = item.unitValue || 0;
                      const prop = properties.find((p) => p.id === item.propertyId || p.propertyNumber === item.propertyNumber);
                      const actualOffId = item.officeId || prop?.officeId;
                      const actualEmpId = item.accountablePersonId || item.employeeId || prop?.accountablePersonId;
                      const office = offices.find((o) => o.id === actualOffId);
                      const employee = employees.find((e) => e.id === actualEmpId);

                      const isIssued = Boolean(actualOffId || actualEmpId || item.issuedTo || (item.officeName && item.officeName !== 'Unassigned Office'));

                      let recipientLoc = 'Unissued (In Storage)';
                      if (office?.name && employee?.name) {
                        recipientLoc = `${office.name} — ${employee.name}`;
                      } else if (office?.name) {
                        recipientLoc = office.name;
                      } else if (employee?.name) {
                        recipientLoc = employee.name;
                      } else if (item.officeName && item.officeName !== 'Unassigned Office') {
                        recipientLoc = item.officeName;
                      } else if (item.issuedTo) {
                        recipientLoc = item.issuedTo;
                      }

                      const acqDate = prop?.acquisitionDate || item.acquisitionDate || item.date || report.asOfDate || '';
                      const dateStr = acqDate ? String(acqDate).split('T')[0] : '';
                      const icsNo = isIssued ? (item.icsNumber || item.icsNo || prop?.poNumber || (`ICS-2025-${String(index + 247).padStart(4, '0')}`)) : 'Unissued';
                      const propNo = item.propertyNumber || prop?.propertyNumber || `SE-OE-07-2021-${String(index + 1).padStart(4, '0')}`;
                      
                      const brandText = prop?.brand || item.brand ? `Brand: ${prop?.brand || item.brand}, ` : '';
                      const itemDesc = item.description ? `${brandText}${item.article || ''}, ${item.description}` : `${brandText}${item.article || 'Semi-Expendable Equipment'}`;
                      const usefulLife = prop?.estimatedUsefulLife || item.estimatedUsefulLife || (unitVal < 15000 ? '3' : '5');

                      return (
                        <tr key={index} className="align-top text-[11px]">
                          <td className="border border-black p-1.5 text-center font-mono">{dateStr}</td>
                          <td className="border border-black p-1.5 text-center font-mono font-bold">{icsNo}</td>
                          <td className="border border-black p-1.5 text-center font-mono font-bold">{propNo}</td>
                          <td className="border border-black p-1.5 whitespace-pre-line">{itemDesc}</td>
                          <td className="border border-black p-1.5 text-center font-bold">{usefulLife}</td>
                          <td className="border border-black p-1 text-center font-bold">{isIssued ? (item.quantityPerCard || 1) : 0}</td>
                          <td className="border border-black p-1.5 font-medium">{recipientLoc}</td>
                          <td className="border border-black p-1 text-center text-slate-400"></td>
                          <td className="border border-black p-1.5 text-slate-400"></td>
                          <td className="border border-black p-1 text-center text-slate-400"></td>
                          <td className="border border-black p-1.5 text-slate-400"></td>
                          <td className="border border-black p-1 text-center text-slate-400"></td>
                          <td className="border border-black p-1 text-center font-bold">{!isIssued ? (item.quantityPerCard || 1) : 0}</td>
                          <td className="border border-black p-1.5 text-right font-mono font-bold">₱{unitVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="border border-black p-1.5 text-[10px] text-slate-700">{item.remarks || (!isIssued ? 'Unissued in storage' : '')}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Signatory Footer from Photo */}
            <div className="mt-10 pt-4 font-sans text-xs">
              <div className="w-72 space-y-7">
                <p className="font-bold text-xs text-black">Prepared by :</p>
                <div>
                  <p className="font-extrabold uppercase text-slate-900 text-xs tracking-wide">
                    {sigs.certifiedCorrectByName || sigs.preparedByName || report.accountablePersonName || 'ELMER G. DOLOTALLAS'}
                  </p>
                  <p className="text-[11px] text-slate-700 font-sans mt-0.5">
                    {sigs.certifiedCorrectByTitle || 'Supply Accountable Officer'}
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Document Header */}
            <div className="text-center space-y-1 mb-5 border-b border-black pb-3">
              <div className="pt-2">
                <h3 className="text-base sm:text-lg font-black tracking-wide uppercase font-sans">
                  {reportMainHeader}
                </h3>
                <p className="text-xs font-black uppercase font-sans text-slate-900 mt-0.5 underline underline-offset-4">
                  {ppeTypeName}
                </p>
                <p className="text-[11px] italic text-slate-700 mt-0.5">
                  {reportSubHeaderLabel}
                </p>
              </div>

              <div className="pt-2 text-xs font-sans flex flex-wrap items-center justify-center gap-x-6 gap-y-1">
                <p>
                  <strong>As of:</strong>{' '}
                  <span className="font-bold border-b border-black px-4">{formatLongDate(asOfDateQuery || report.asOfDate) || report.asOfDate}</span>
                </p>
                <p>
                  For which{' '}
                  <span className="font-extrabold border-b border-black px-6 uppercase text-xs">
                    {resolvedAccountablePersonName}
                  </span>{' '}
                  <span className="text-[10px] italic text-slate-600">({resolvedAccountablePosition})</span>
                </p>
                <p>
                  is accountable, having assumed such accountability on{' '}
                  <span className="font-bold border-b border-black px-4">
                    {formatLongDate(assumedDateQuery || report.assumedDate || report.signatories?.assumedDate) || formatLongDate(new Date())}
                  </span>
                </p>
              </div>
            </div>

            {/* Official Formal 10-Column Landscape Inventory Table */}
            <div className="overflow-x-auto my-3">
              <table className="w-full text-[12px] font-sans border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-100 text-black text-center font-bold uppercase">
                    <th className="border border-black p-2 w-[10%]" rowSpan="2">
                      ARTICLE
                    </th>
                    <th className="border border-black p-2 w-[18%]" rowSpan="2">
                      DESCRIPTION
                    </th>
                    <th className="border border-black p-2 w-[10%]" rowSpan="2">
                      PROPERTY NUMBER
                    </th>
                    <th className="border border-black p-2 w-[5%]" rowSpan="2">
                      UNIT OF MEASURE
                    </th>
                    <th className="border border-black p-2 w-[8%]" rowSpan="2">
                      UNIT VALUE
                    </th>
                    <th className="border border-black p-2 w-[5%]" rowSpan="2">
                      QUANTITY PER PROPERTY CARD
                    </th>
                    <th className="border border-black p-2 w-[5%]" rowSpan="2">
                      QUANTITY PER PHYSICAL COUNT
                    </th>
                    <th className="border border-black p-1" colSpan="2">
                      SHORTAGE / OVERAGE
                    </th>
                    <th className="border border-black p-2 w-[20%]" rowSpan="2">
                      REMARKS
                    </th>
                  </tr>
                  <tr className="bg-slate-100 text-black text-center font-bold uppercase text-[11px]">
                    <th className="border border-black p-1 w-[4%]">Qty</th>
                    <th className="border border-black p-1 w-[5%]">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="border border-black py-8 text-center text-slate-400">
                        No physical count rows recorded for this {ppeTypeName} report.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => {
                      const unitVal = item.unitValue || 0;
                      const isShortage = item.status === 'SHORTAGE' || (item.difference !== null && item.difference < 0);
                      const isOverage = item.status === 'OVERAGE' || (item.difference !== null && item.difference > 0);
                      const diffQty = Math.abs(item.difference || 0);

                      const prop = properties.find((p) => p.id === item.propertyId || p.propertyNumber === item.propertyNumber);
                      const isUnserviceable = checkIsUnserviceable(item, prop);

                      const actualOffId = item.officeId || prop?.officeId;
                      const office = offices.find((o) => o.id === actualOffId);
                      const officeName = office?.name || (item.officeName && item.officeName !== 'Unassigned Office' ? item.officeName : prop?.officeName) || '';
                      const poNum = prop?.poNumber || item.poNumber || prop?.poNo || item.poNo || '';
                      const acqDate = prop?.acquisitionDate || item.acquisitionDate || prop?.assignmentDate || item.assignmentDate || '';

                      const unserviceableRemarkText = (item.remarks && item.remarks.toLowerCase().includes('unserviceable'))
                        ? item.remarks
                        : (prop?.remarks && prop.remarks.toLowerCase().includes('unserviceable'))
                        ? prop.remarks
                        : 'Unserviceable';

                      return (
                        <tr
                          key={index}
                          className={`align-top ${isUnserviceable ? 'text-red-600 font-semibold bg-red-50/50 print:text-red-600' : 'text-black'}`}
                          style={isUnserviceable ? { color: '#dc2626' } : undefined}
                        >
                          <td className={`border border-black p-2 font-bold ${isUnserviceable ? 'text-red-600' : ''}`}>{item.article}</td>
                          <td className={`border border-black p-2 whitespace-pre-line text-[11px] ${isUnserviceable ? 'text-red-600 font-medium' : ''}`}>{item.description}</td>
                          <td className={`border border-black p-2 font-mono font-bold text-center ${isUnserviceable ? 'text-red-600' : ''}`}>{item.propertyNumber}</td>
                          <td className={`border border-black p-2 text-center ${isUnserviceable ? 'text-red-600' : ''}`}>{item.unit || 'unit'}</td>
                          <td className={`border border-black p-2 text-right font-mono font-bold ${isUnserviceable ? 'text-red-600' : ''}`}>₱{unitVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                          <td className={`border border-black p-2 text-center font-bold ${isUnserviceable ? 'text-red-600' : ''}`}>{item.quantityPerCard || 1}</td>
                          <td className={`border border-black p-2 text-center font-bold ${isUnserviceable ? 'text-red-600' : ''}`}>{item.physicalCount !== null ? item.physicalCount : item.quantityPerCard || 1}</td>
                          <td className={`border border-black p-2 text-center font-mono font-bold ${isUnserviceable ? 'text-red-600' : ''}`}>{isShortage ? `${diffQty}` : isOverage ? `+${diffQty}` : '-'}</td>
                          <td className={`border border-black p-2 text-right font-mono font-bold ${isUnserviceable ? 'text-red-600' : ''}`}>{isShortage || isOverage ? `₱${(unitVal * diffQty).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}</td>
                          <td className="border border-black p-2 text-[11px] leading-tight font-sans space-y-1">
                            {isUnserviceable && (
                              <div className="font-extrabold text-red-600 uppercase border border-red-400 bg-red-100/90 px-1.5 py-0.5 rounded text-[10.5px] inline-block tracking-wide print:text-red-600 print:border-red-600">
                                {unserviceableRemarkText.toUpperCase()}
                              </div>
                            )}
                            {officeName ? <div className={`font-bold uppercase ${isUnserviceable ? 'text-red-700' : 'text-black'}`}>{officeName}</div> : <div className="font-bold text-slate-400 uppercase">UNASSIGNED OFFICE</div>}
                            {poNum ? <div className={`font-semibold ${isUnserviceable ? 'text-red-600' : 'text-slate-800'}`}>{poNum}</div> : <div className="text-slate-500 font-medium">PO N/A</div>}
                            {acqDate ? <div className={`font-normal ${isUnserviceable ? 'text-red-600' : 'text-slate-700'}`}>{formatDatedOn(acqDate)}</div> : <div className="text-slate-400 italic">dated on N/A</div>}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  <tr className="bg-slate-50 font-bold border-t-2 border-black">
                    <td colSpan="4" className="border border-black p-2 text-right uppercase">TOTAL VALUE:</td>
                    <td className="border border-black p-2 text-right font-mono font-black">₱{totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td colSpan="2" className="border border-black p-2 text-center text-[11px] uppercase">Variance Totals:</td>
                    <td className="border border-black p-2 text-center font-mono">{totalShortageQty > 0 ? `${totalShortageQty}` : '-'}</td>
                    <td className="border border-black p-2 text-right font-mono">{totalShortageVal > 0 ? `₱${totalShortageVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-'}</td>
                    <td className="border border-black p-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Official Configurable Signatories Section */}
            <div className="mt-6 pt-3 font-sans text-xs break-inside-avoid print:break-inside-avoid">
              <div className="grid grid-cols-12 gap-6 text-left items-start">
                {/* 1. Certified Correct by (Takes 6 of 12 columns: 2x2 grid) */}
                <div className="col-span-6 space-y-1">
                  <p className="font-bold text-[11px] mb-4 text-black whitespace-nowrap">Certified Correct by:</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                    {/* Row 1, Col 1: Member 1 */}
                    <div className="space-y-1">
                      <div className="min-h-[24px] flex items-end">
                        <p className="font-extrabold uppercase border-b border-black pb-0.5 inline-block text-[11px] text-black whitespace-nowrap">
                          {sigs.member1Name}
                        </p>
                      </div>
                      {renderPositions(sigs.member1Title, 'Supply Accountable Officer')}
                    </div>

                    {/* Row 1, Col 2: Chairperson */}
                    <div className="space-y-1">
                      <div className="min-h-[24px] flex items-end">
                        <p className="font-extrabold uppercase border-b border-black pb-0.5 inline-block text-[11px] text-black whitespace-nowrap">
                          {sigs.certifiedCorrectByName}
                        </p>
                      </div>
                      {renderPositions(sigs.certifiedCorrectByTitle, 'Chief, Admin')}
                    </div>

                    {/* Row 2, Col 1 (Sa baba): Member 2 */}
                    <div className="space-y-1 pt-1">
                      <div className="min-h-[24px] flex items-end">
                        <p className="font-extrabold uppercase border-b border-black pb-0.5 inline-block text-[11px] text-black whitespace-nowrap">
                          {sigs.member2Name}
                        </p>
                      </div>
                      {renderPositions(sigs.member2Title, 'Budget Officer')}
                    </div>

                    {/* Row 2, Col 2 (Sa baba): Member 3 */}
                    <div className="space-y-1 pt-1">
                      <div className="min-h-[24px] flex items-end">
                        <p className="font-extrabold uppercase border-b border-black pb-0.5 inline-block text-[11px] text-black whitespace-nowrap">
                          {sigs.member3Name}
                        </p>
                      </div>
                      {renderPositions(sigs.member3Title, 'Chief, GSS')}
                    </div>
                  </div>
                </div>

                {/* 2. Approved by (Takes 3 of 12 columns) */}
                <div className="col-span-3 space-y-1">
                  <p className="font-bold text-[11px] mb-4 text-black whitespace-nowrap">Approved by:</p>
                  <div className="space-y-1">
                    <div className="min-h-[24px] flex items-end">
                      <p className="font-extrabold uppercase border-b border-black pb-0.5 inline-block text-[11px] text-black whitespace-nowrap">
                        {sigs.approvedByName}
                      </p>
                    </div>
                    {renderPositions(sigs.approvedByTitle, 'Director, NFSTI')}
                  </div>
                </div>

                {/* 3. Verified by (Takes 3 of 12 columns) */}
                <div className="col-span-3 space-y-1">
                  <p className="font-bold text-[11px] mb-4 text-black whitespace-nowrap">Verified by:</p>
                  <div className="space-y-1">
                    <div className="min-h-[24px] flex items-end">
                      <p className="font-extrabold uppercase border-b border-black pb-0.5 inline-block text-[11px] text-black whitespace-nowrap">
                        {sigs.verifiedByName}
                      </p>
                    </div>
                    {renderPositions(sigs.verifiedByTitle, 'State Auditor IV/ Audit Team Leader, RO IV A')}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ReportPreviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 flex items-center justify-center text-slate-500">Loading Preview...</div>}>
      <ReportPreviewContent />
    </Suspense>
  );
}
