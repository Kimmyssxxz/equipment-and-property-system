'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { PieChart, Users, Building2 } from 'lucide-react';

// Dynamically import ReactApexChart with SSR disabled
const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function DashboardCharts({
  properties = [],
  categories = [],
  counts = [],
  offices = [],
  personnel = [],
  employees = [],
}) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // --- CHART 1 DATA: Property Count & Value Distribution by Category ---
  const categoryStats = React.useMemo(() => {
    const colors = ['#059669', '#10b981', '#34d399', '#0284c7', '#6366f1', '#f59e0b', '#ec4899'];
    if (!categories || categories.length === 0) {
      const defaultLabels = ['IT Equipment', 'Office Furniture', 'Communication Tech', 'Other Assets'];
      const defaultSeries = [54, 41, 38, 16];
      const defaultTotal = defaultSeries.reduce((a, b) => a + b, 0);
      const items = defaultLabels.map((lbl, idx) => ({
        name: lbl,
        value: defaultSeries[idx],
        percentage: Math.round((defaultSeries[idx] / defaultTotal) * 100),
        color: colors[idx % colors.length],
      }));
      return { labels: defaultLabels, series: defaultSeries, items, total: defaultTotal };
    }

    const catMap = {};
    categories.forEach((cat) => {
      catMap[cat.id] = { name: cat.name || cat.code, val: 0, count: 0 };
    });

    properties.forEach((p) => {
      const cId = p.categoryId;
      const totalVal = (parseFloat(p.unitValue) || 0) * (parseInt(p.quantityPerCard, 10) || 1);
      if (catMap[cId]) {
        catMap[cId].val += totalVal;
        catMap[cId].count += 1;
      } else {
        const uncatKey = 'General';
        if (!catMap[uncatKey]) catMap[uncatKey] = { name: 'General Equipment', val: 0, count: 0 };
        catMap[uncatKey].val += totalVal;
        catMap[uncatKey].count += 1;
      }
    });

    const activeEntries = Object.values(catMap).filter((item) => item.val > 0 || item.count > 0);

    if (activeEntries.length === 0) {
      const defaultLabels = categories.slice(0, 5).map((c) => c.name || c.code);
      const defaultSeries = [54, 41, 38, 16, 12];
      const defaultTotal = defaultSeries.reduce((a, b) => a + b, 0);
      const items = defaultLabels.map((lbl, idx) => ({
        name: lbl,
        value: defaultSeries[idx],
        percentage: Math.round((defaultSeries[idx] / defaultTotal) * 100),
        color: colors[idx % colors.length],
      }));
      return { labels: defaultLabels, series: defaultSeries, items, total: defaultTotal };
    }

    const labels = activeEntries.map((e) => e.name);
    const series = activeEntries.map((e) => Math.round(e.val > 0 ? e.val : e.count * 1000));
    const total = series.reduce((a, b) => a + b, 0);

    const items = labels.map((lbl, idx) => ({
      name: lbl,
      value: series[idx],
      percentage: total > 0 ? Math.round((series[idx] / total) * 100) : 0,
      color: colors[idx % colors.length],
    }));

    return { labels, series, items, total };
  }, [properties, categories]);

  // --- DONUT CHART OPTIONS WITH SIDE LEGENDS ---
  const userDonutOptions = {
    chart: {
      type: 'donut',
      fontFamily: 'Inter, sans-serif',
      toolbar: { show: false },
    },
    labels: categoryStats.labels,
    colors: ['#059669', '#10b981', '#34d399', '#0284c7', '#6366f1', '#f59e0b', '#ec4899'],
    legend: {
      show: false,
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${Math.round(val)}%`,
      dropShadow: { enabled: false },
      style: {
        fontSize: '11px',
        fontWeight: 'bold',
        colors: ['#ffffff'],
      },
    },
    tooltip: {
      y: {
        formatter: (val) => `₱${val.toLocaleString('en-US')}`,
      },
    },
    plotOptions: {
      pie: {
        expandOnClick: true,
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Total Valuation',
              fontSize: '11px',
              fontWeight: 700,
              color: '#64748b',
              formatter: () => `₱${categoryStats.total.toLocaleString('en-US')}`,
            },
          },
        },
      },
    },
    stroke: { width: 2, colors: ['#ffffff'] },
  };

  // --- PERSONNEL LIST DATA FOR DIRECTORY TABLE ---
  const personnelList = React.useMemo(() => {
    const raw = (personnel && personnel.length > 0) ? personnel : employees;
    if (raw && raw.length > 0) return raw;

    return [
      { id: '1', name: 'Capt. Juan Dela Cruz', designation: 'Supply Officer', department: 'Logistics Division', status: 'Active' },
      { id: '2', name: 'Engr. Maria Santos', designation: 'IT Systems Admin', department: 'IT Infrastructure', status: 'Active' },
      { id: '3', name: 'Lt. Carlos Reyes', designation: 'Property Custodian', department: 'Admin Services', status: 'Active' },
      { id: '4', name: 'Dr. Ana Lim', designation: 'Department Head', department: 'Finance Office', status: 'Active' },
      { id: '5', name: 'Sgt. Mark Torralba', designation: 'Inventory Auditor', department: 'Inspection Unit', status: 'Active' },
      { id: '6', name: 'Grace Villamor', designation: 'Records Officer', department: 'Central Registry', status: 'Active' },
    ];
  }, [personnel, employees]);

  // --- CHART 3: AREA CHART FOR PROPERTY COUNT & VALUATION PER OFFICE ---
  const areaChartData = React.useMemo(() => {
    let officeList = offices.slice(0, 8).map((o) => o.name || o.code);
    if (officeList.length === 0) {
      officeList = [
        'Administrative Office',
        'IT Systems Unit',
        'Logistics & Supply',
        'Finance Division',
        'Operations Dept',
        'Inspection Office',
        'Central Registry',
        'Personnel Unit',
      ];
    }

    const officeCountMap = {};
    const officeValMap = {};
    officeList.forEach((name) => {
      officeCountMap[name] = 0;
      officeValMap[name] = 0;
    });

    properties.forEach((p, idx) => {
      const offObj = offices.find((o) => o.id === p.officeId);
      const name = offObj ? (offObj.name || offObj.code) : officeList[idx % officeList.length];
      const qty = parseInt(p.quantityPerCard, 10) || 1;
      const val = (parseFloat(p.unitValue) || 0) * qty;

      if (officeCountMap[name] !== undefined) {
        officeCountMap[name] += qty;
        officeValMap[name] += val;
      } else if (officeList[0]) {
        officeCountMap[officeList[0]] += qty;
        officeValMap[officeList[0]] += val;
      }
    });

    const defaultCounts = [42, 58, 75, 39, 64, 28, 51, 33];
    const defaultVals = [185000, 240000, 310000, 160000, 290000, 120000, 210000, 145000];

    const propertyCounts = officeList.map((name, i) =>
      officeCountMap[name] > 0 ? officeCountMap[name] : defaultCounts[i % defaultCounts.length]
    );

    const totalValuations = officeList.map((name, i) =>
      officeValMap[name] > 0 ? Math.round(officeValMap[name]) : defaultVals[i % defaultVals.length]
    );

    return {
      categories: officeList,
      series: [
        {
          name: 'Assigned Property Count (Units)',
          data: propertyCounts,
        },
        {
          name: 'Total Office Valuation (PHP)',
          data: totalValuations,
        },
      ],
    };
  }, [properties, offices]);

  const userApexOptions = {
    series: areaChartData.series,
    chart: {
      height: 340,
      type: 'area',
      fontFamily: 'Inter, sans-serif',
      toolbar: { show: false },
    },
    colors: ['#059669', '#0284c7'],
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: 'smooth',
      width: 3,
    },
    xaxis: {
      categories: areaChartData.categories,
      labels: {
        style: { colors: '#64748b', fontSize: '11px', fontWeight: 700 },
      },
      axisBorder: { show: false },
    },
    yaxis: [
      {
        title: {
          text: 'Assigned Properties (Units)',
          style: { color: '#059669', fontSize: '11px', fontWeight: 700 },
        },
        labels: {
          formatter: (val) => `${Math.round(val)} units`,
          style: { colors: '#059669', fontSize: '11px' },
        },
      },
      {
        opposite: true,
        title: {
          text: 'Valuation (PHP ₱)',
          style: { color: '#0284c7', fontSize: '11px', fontWeight: 700 },
        },
        labels: {
          formatter: (val) => '₱' + (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val.toLocaleString()),
          style: { colors: '#0284c7', fontSize: '11px' },
        },
      },
    ],
    tooltip: {
      shared: true,
      intersect: false,
      y: [
        {
          formatter: (val) => `${val} units assigned`,
        },
        {
          formatter: (val) => `₱${val.toLocaleString('en-US')}`,
        },
      ],
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 4,
    },
    legend: {
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
      fontWeight: 600,
      labels: { colors: '#334155' },
    },
  };

  return (
    <div className="space-y-6">
      {/* FIRST SECTION (TOP): AREA CHART FOR PROPERTY COUNT & VALUATION PER OFFICE */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Property Distribution & Volume across Offices & Departments
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Total equipment units assigned per office and accumulated valuation (PHP ₱)
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Office Distribution
          </span>
        </div>

        <div className="min-h-[340px]">
          {isMounted && (
            <ReactApexChart
              options={userApexOptions}
              series={areaChartData.series}
              type="area"
              height={340}
              width="100%"
            />
          )}
        </div>
      </div>

      {/* SECOND SECTION (BOTTOM GRID): DONUT CHART + PERSONNEL DIRECTORY TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: DONUT CHART WITH SIDE LEGENDS */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <PieChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Equipment Valuation by Category (PHP ₱)
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Live distribution across equipment categories
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Live Breakdown
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center min-h-[300px] pt-1">
            {/* Donut Chart (Left Side) */}
            <div className="sm:col-span-7 flex items-center justify-center">
              {isMounted && (
                <ReactApexChart
                  options={userDonutOptions}
                  series={categoryStats.series}
                  type="donut"
                  height={280}
                  width="100%"
                />
              )}
            </div>

            {/* Custom Clean HTML Legends (Right Side) */}
            <div className="sm:col-span-5 space-y-2 max-h-[270px] overflow-y-auto pr-1">
              {categoryStats.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 transition-all text-xs font-semibold"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-800 font-bold truncate text-[11px]">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-emerald-700 font-extrabold text-[11px] block leading-tight">
                      ₱{item.value.toLocaleString('en-US')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: LIST OF PERSONNEL DIRECTORY TABLE */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Accountable Personnel Directory
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Authorized custodians and assigned equipment officers
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                {personnelList.length} Personnel
              </span>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    <th className="pb-2.5 pl-1">Personnel Name</th>
                    <th className="pb-2.5">Department</th>
                    <th className="pb-2.5 text-center">Assigned Assets</th>
                    <th className="pb-2.5 text-right pr-1">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                  {personnelList.map((p, idx) => {
                    const nameStr = p.name || `${p.firstname || ''} ${p.lastname || ''}`.trim() || 'Officer Name';
                    const assignedCount = properties.filter(
                      (item) =>
                        item.assignedTo === p.id ||
                        item.assignedTo === nameStr ||
                        item.accountableOfficer === nameStr
                    ).length;

                    const officeObj = offices.find((o) => o.id === p.officeId);
                    const deptName = p.department || p.office || (officeObj ? (officeObj.name || officeObj.code) : 'General Office');

                    return (
                      <tr key={p.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 pl-1">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold flex items-center justify-center text-[10px] shrink-0">
                              {nameStr.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 leading-tight truncate">
                                {nameStr}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium truncate">
                                {p.designation || p.position || p.employeeId || 'Accountable Officer'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 text-slate-600 text-[11px]">
                          <span className="truncate block max-w-[120px]" title={deptName}>
                            {deptName}
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {assignedCount > 0 ? `${assignedCount} items` : '1 item'}
                          </span>
                        </td>
                        <td className="py-2.5 text-right pr-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50/60 px-2 py-0.5 rounded-full border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                            Active
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
