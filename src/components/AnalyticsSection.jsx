import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController,
} from 'chart.js';
import {
  TrendingUp,
  MessageCircle,
  Share2,
  Instagram,
  Facebook,
  DownloadCloud,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Table,
  Filter,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController
);

export default function AnalyticsSection({ metrics = {} }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Top-level overall counts
  const activeCampaigns = metrics.activeCampaigns ?? 0;
  const draftCampaigns = metrics.draftCampaigns ?? 0;
  const totalCampaigns = metrics.totalCampaigns ?? (activeCampaigns + draftCampaigns);
  const totalFrames = metrics.totalFrames ?? 0;
  const totalShares = metrics.totalShares ?? 0;

  const whatsappShares = metrics.whatsappShares ?? 0;
  const facebookShares = metrics.facebookShares ?? 0;
  const instagramShares = metrics.instagramShares ?? 0;
  const linkShares = metrics.linkShares ?? 0;
  const downloads = metrics.downloads ?? 0;

  // Campaign-wise data list
  const campaigns = useMemo(() => metrics.campaigns || [], [metrics.campaigns]);

  // Campaign table state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [sortField, setSortField] = useState('generated_count');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Overall Chart Rendering
  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: ['Active Campaigns', 'Frames Generated', 'Total Downloads', 'Total Shares'],
        datasets: [
          {
            data: [activeCampaigns, totalFrames, downloads, totalShares],
            backgroundColor: ['#417264', '#db9b35', '#2563eb', '#be6c45'],
            borderRadius: 8,
            maxBarThickness: 52,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#17362f',
            titleFont: { family: 'DM Sans', weight: 'bold' },
            bodyFont: { family: 'DM Sans' },
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: (context) => ` ${context.parsed.y.toLocaleString('en-IN')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#52665e',
              font: { family: 'DM Sans', weight: 'bold', size: 11 },
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(232, 223, 207, 0.6)' },
            ticks: {
              color: '#52665e',
              font: { family: 'DM Sans', size: 11 },
              stepSize: 1,
              callback: (value) => value.toLocaleString('en-IN'),
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [activeCampaigns, totalFrames, downloads, totalShares]);

  // Unique districts for filter dropdown
  const uniqueDistricts = useMemo(() => {
    const set = new Set();
    campaigns.forEach((c) => {
      if (c.district && c.district.trim()) {
        set.add(c.district.trim());
      }
    });
    return Array.from(set).sort();
  }, [campaigns]);

  // Handle Sort Toggle
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // Filtered & Sorted Campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.slug || '').toLowerCase().includes(q) ||
        (c.district || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      const matchesDistrict = districtFilter === 'All' || c.district === districtFilter;

      return matchesSearch && matchesStatus && matchesDistrict;
    });
  }, [campaigns, searchTerm, statusFilter, districtFilter]);

  const sortedCampaigns = useMemo(() => {
    const list = [...filteredCampaigns];
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal || '').toLowerCase();
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      aVal = Number(aVal || 0);
      bVal = Number(bVal || 0);
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [filteredCampaigns, sortField, sortDirection]);

  // Pagination for campaign table
  const totalItems = sortedCampaigns.length;
  const totalPages = pageSize === 'All' ? 1 : Math.ceil(totalItems / pageSize) || 1;
  const paginatedCampaigns = useMemo(() => {
    if (pageSize === 'All') return sortedCampaigns;
    const start = (currentPage - 1) * pageSize;
    return sortedCampaigns.slice(start, start + pageSize);
  }, [sortedCampaigns, currentPage, pageSize]);

  // Aggregate totals across all filtered campaigns for table footer
  const filteredTotals = useMemo(() => {
    return filteredCampaigns.reduce(
      (acc, c) => ({
        generated: acc.generated + Number(c.generated_count || 0),
        downloads: acc.downloads + Number(c.downloads_count || 0),
        shares: acc.shares + Number(c.shares_count || 0),
        whatsapp: acc.whatsapp + Number(c.whatsapp_count || 0),
        facebook: acc.facebook + Number(c.facebook_count || 0),
        instagram: acc.instagram + Number(c.instagram_count || 0),
        link: acc.link + Number(c.link_count || 0),
      }),
      { generated: 0, downloads: 0, shares: 0, whatsapp: 0, facebook: 0, instagram: 0, link: 0 }
    );
  }, [filteredCampaigns]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-[#eaf2ed] text-[#1f4a3f] border-[#c4dcce]';
      case 'Draft':
        return 'bg-[#faece5] text-[#be6c45] border-[#f2cfc2]';
      case 'Paused':
        return 'bg-[#f5f5f5] text-[#6b7280] border-[#e5e7eb]';
      case 'Archived':
        return 'bg-[#fee2e2] text-[#b91c1c] border-[#fca5a5]';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40 group-hover:opacity-100" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-[#1f4a3f]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#1f4a3f]" />
    );
  };

  return (
    <section className="soft-card mt-10 rounded-[26px] p-5 sm:p-7 border border-[#e8dfcf] bg-white shadow-sm">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#79987e]">
            REAL ENGAGEMENT METRICS
          </p>
          <h2 className="brand-serif mt-1 text-2xl font-bold text-[#17362f]">
            Campaign Performance & Analytics
          </h2>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#eaf2ed] text-[#417264]">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>

      {/* 2. Chart Canvas */}
      <div className="mt-6 h-56 sm:h-64 w-full">
        <canvas ref={chartRef} aria-label="Campaign metrics chart" />
      </div>

      {/* 3. Social & Channel Breakdown (Real database events) */}
      <div className="mt-8 border-t border-[#e8dfcf] pt-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#52665e]">
            Platform Share & Download Breakdown
          </p>
          <span className="text-[11px] font-mono text-[#79987e]">
            Total Shares: {Number(totalShares).toLocaleString('en-IN')} | Downloads: {Number(downloads).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {/* WhatsApp */}
          <div className="rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-3 text-center">
            <div className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-green-100 text-green-700">
              <MessageCircle className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#52665e]">WhatsApp</p>
            <p className="font-mono text-base font-extrabold text-[#17362f]">
              {Number(whatsappShares).toLocaleString('en-IN')}
            </p>
          </div>

          {/* Facebook */}
          <div className="rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-3 text-center">
            <div className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-blue-100 text-blue-700">
              <Facebook className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#52665e]">Facebook</p>
            <p className="font-mono text-base font-extrabold text-[#17362f]">
              {Number(facebookShares).toLocaleString('en-IN')}
            </p>
          </div>

          {/* Instagram */}
          <div className="rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-3 text-center">
            <div className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-pink-100 text-pink-700">
              <Instagram className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#52665e]">Instagram</p>
            <p className="font-mono text-base font-extrabold text-[#17362f]">
              {Number(instagramShares).toLocaleString('en-IN')}
            </p>
          </div>

          {/* Link / Direct */}
          <div className="rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-3 text-center">
            <div className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-[#eaf2ed] text-[#417264]">
              <Share2 className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#52665e]">Link / Referral</p>
            <p className="font-mono text-base font-extrabold text-[#17362f]">
              {Number(linkShares).toLocaleString('en-IN')}
            </p>
          </div>

          {/* Downloads */}
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-3 text-center">
            <div className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-[#e6f0fa] text-[#2563eb]">
              <DownloadCloud className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#52665e]">Downloads</p>
            <p className="font-mono text-base font-extrabold text-[#17362f]">
              {Number(downloads).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      </div>

      {/* 4. Campaign-Wise Analytics Section */}
      <div className="mt-10 border-t border-[#e8dfcf] pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Table className="h-4 w-4 text-[#db9b35]" />
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#79987e]">
                CAMPAIGN-WISE BREAKDOWN
              </p>
            </div>
            <h3 className="brand-serif mt-0.5 text-xl font-bold text-[#17362f]">
              Individual Campaign Analytics
            </h3>
            <p className="text-xs text-[#52665e] mt-0.5">
              Accurate, real-time database counts per campaign. Sum of all campaigns equals the global totals.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="rounded-xl bg-[#faf6ed] border border-[#e8dfcf] px-3 py-1.5 font-mono text-xs text-[#17362f]">
              <strong>{campaigns.length}</strong> campaigns loaded
            </span>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by name, slug, district..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-[#e5dccd] bg-[#faf6ed] py-2 pl-9 pr-3 text-xs text-[#17362f] placeholder-gray-400 focus:border-[#db9b35] focus:outline-none focus:ring-1 focus:ring-[#db9b35]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-[#52665e]">
              <Filter className="h-3.5 w-3.5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-[#e5dccd] bg-[#faf6ed] py-1.5 px-2.5 text-xs text-[#17362f] focus:outline-none focus:border-[#db9b35]"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Paused">Paused</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            {/* District Filter */}
            {uniqueDistricts.length > 0 && (
              <select
                value={districtFilter}
                onChange={(e) => {
                  setDistrictFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="rounded-xl border border-[#e5dccd] bg-[#faf6ed] py-1.5 px-2.5 text-xs text-[#17362f] focus:outline-none focus:border-[#db9b35]"
              >
                <option value="All">All Districts</option>
                {uniqueDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            {/* Page Size */}
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === 'All' ? 'All' : Number(e.target.value);
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-[#e5dccd] bg-[#faf6ed] py-1.5 px-2.5 text-xs text-[#17362f] focus:outline-none focus:border-[#db9b35]"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value="All">All campaigns</option>
            </select>
          </div>
        </div>

        {/* Campaign Table (Desktop View >= md) */}
        <div className="hidden md:block mt-3 overflow-x-auto rounded-xl border border-[#e8dfcf]">
          <table className="min-w-full divide-y divide-[#e8dfcf] text-left text-xs">
            <thead className="bg-[#faf6ed] font-semibold text-[#17362f]">
              <tr>
                {/* Campaign Name & Slug */}
                <th
                  onClick={() => handleSort('name')}
                  className="group cursor-pointer px-3.5 py-3 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Campaign</span>
                    {renderSortIcon('name')}
                  </div>
                </th>

                {/* District */}
                <th
                  onClick={() => handleSort('district')}
                  className="group cursor-pointer px-3 py-3 select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>District</span>
                    {renderSortIcon('district')}
                  </div>
                </th>

                {/* Status */}
                <th
                  onClick={() => handleSort('status')}
                  className="group cursor-pointer px-2.5 py-3 select-none text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Status</span>
                    {renderSortIcon('status')}
                  </div>
                </th>

                {/* Total Generated */}
                <th
                  onClick={() => handleSort('generated_count')}
                  className="group cursor-pointer px-3 py-3 select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1.5 text-[#17362f]">
                    <span>Generated</span>
                    {renderSortIcon('generated_count')}
                  </div>
                </th>

                {/* Downloads */}
                <th
                  onClick={() => handleSort('downloads_count')}
                  className="group cursor-pointer px-3 py-3 select-none text-right bg-[#e6f0fa]/40"
                >
                  <div className="flex items-center justify-end gap-1.5 text-[#2563eb]">
                    <span>Downloads</span>
                    {renderSortIcon('downloads_count')}
                  </div>
                </th>

                {/* Total Shares */}
                <th
                  onClick={() => handleSort('shares_count')}
                  className="group cursor-pointer px-3 py-3 select-none text-right bg-[#faece5]/40"
                >
                  <div className="flex items-center justify-end gap-1.5 text-[#be6c45]">
                    <span>Total Shares</span>
                    {renderSortIcon('shares_count')}
                  </div>
                </th>

                {/* WhatsApp */}
                <th
                  onClick={() => handleSort('whatsapp_count')}
                  className="group cursor-pointer px-2.5 py-3 select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1 text-green-700">
                    <span>WhatsApp</span>
                    {renderSortIcon('whatsapp_count')}
                  </div>
                </th>

                {/* Facebook */}
                <th
                  onClick={() => handleSort('facebook_count')}
                  className="group cursor-pointer px-2.5 py-3 select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1 text-blue-700">
                    <span>Facebook</span>
                    {renderSortIcon('facebook_count')}
                  </div>
                </th>

                {/* Instagram */}
                <th
                  onClick={() => handleSort('instagram_count')}
                  className="group cursor-pointer px-2.5 py-3 select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1 text-pink-700">
                    <span>Instagram</span>
                    {renderSortIcon('instagram_count')}
                  </div>
                </th>

                {/* Link */}
                <th
                  onClick={() => handleSort('link_count')}
                  className="group cursor-pointer px-2.5 py-3 select-none text-right"
                >
                  <div className="flex items-center justify-end gap-1 text-[#417264]">
                    <span>Link</span>
                    {renderSortIcon('link_count')}
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#e8dfcf] bg-white text-[#17362f]">
              {paginatedCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    No campaigns found matching the specified filters.
                  </td>
                </tr>
              ) : (
                paginatedCampaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-[#faf7f0]/60 transition-colors">
                    {/* Campaign Name & Slug */}
                    <td className="px-3.5 py-2.5 max-w-[220px]">
                      <div className="font-bold truncate text-[#17362f]" title={camp.name}>
                        {camp.name}
                      </div>
                      <a
                        href={`/campaign/${camp.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-[#79987e] hover:text-[#1f4a3f] truncate max-w-full"
                      >
                        <span>/{camp.slug}</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-60 shrink-0" />
                      </a>
                    </td>

                    {/* District */}
                    <td className="px-3 py-2.5 text-[#52665e] whitespace-nowrap">
                      {camp.district || <span className="text-gray-300">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-2.5 py-2.5 text-center whitespace-nowrap">
                      <span
                        className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                          camp.status
                        )}`}
                      >
                        {camp.status || 'Active'}
                      </span>
                    </td>

                    {/* Generated */}
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-[#17362f] whitespace-nowrap">
                      {Number(camp.generated_count || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Downloads */}
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-[#2563eb] bg-[#e6f0fa]/20 whitespace-nowrap">
                      {Number(camp.downloads_count || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Total Shares */}
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-[#be6c45] bg-[#faece5]/20 whitespace-nowrap">
                      {Number(camp.shares_count || 0).toLocaleString('en-IN')}
                    </td>

                    {/* WhatsApp */}
                    <td className="px-2.5 py-2.5 text-right font-mono text-[#17362f] whitespace-nowrap">
                      {Number(camp.whatsapp_count || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Facebook */}
                    <td className="px-2.5 py-2.5 text-right font-mono text-[#17362f] whitespace-nowrap">
                      {Number(camp.facebook_count || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Instagram */}
                    <td className="px-2.5 py-2.5 text-right font-mono text-[#17362f] whitespace-nowrap">
                      {Number(camp.instagram_count || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Link */}
                    <td className="px-2.5 py-2.5 text-right font-mono text-[#17362f] whitespace-nowrap">
                      {Number(camp.link_count || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Table Footer: Total Row */}
            <tfoot className="bg-[#faf6ed] font-bold text-[#17362f] border-t-2 border-[#db9b35]/40">
              <tr>
                <td colSpan={3} className="px-3.5 py-3 text-[#17362f] uppercase tracking-wider text-[11px]">
                  Total ({filteredCampaigns.length} campaigns)
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm text-[#17362f]">
                  {filteredTotals.generated.toLocaleString('en-IN')}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm text-[#2563eb] bg-[#e6f0fa]/40">
                  {filteredTotals.downloads.toLocaleString('en-IN')}
                </td>
                <td className="px-3 py-3 text-right font-mono text-sm text-[#be6c45] bg-[#faece5]/40">
                  {filteredTotals.shares.toLocaleString('en-IN')}
                </td>
                <td className="px-2.5 py-3 text-right font-mono text-xs text-green-800">
                  {filteredTotals.whatsapp.toLocaleString('en-IN')}
                </td>
                <td className="px-2.5 py-3 text-right font-mono text-xs text-blue-800">
                  {filteredTotals.facebook.toLocaleString('en-IN')}
                </td>
                <td className="px-2.5 py-3 text-right font-mono text-xs text-pink-800">
                  {filteredTotals.instagram.toLocaleString('en-IN')}
                </td>
                <td className="px-2.5 py-3 text-right font-mono text-xs text-[#1f4a3f]">
                  {filteredTotals.link.toLocaleString('en-IN')}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Campaign Stacked Cards (Mobile View < md) */}
        <div className="block md:hidden mt-3 space-y-3">
          {paginatedCampaigns.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-[#e8dfcf] bg-white p-6 text-center text-xs text-gray-500">
              No campaigns found matching the specified filters.
            </div>
          ) : (
            paginatedCampaigns.map((camp) => (
              <div
                key={camp.id}
                className="rounded-2xl border border-[#e8dfcf] bg-white p-3.5 sm:p-4 shadow-sm space-y-3"
              >
                {/* Campaign Header: Name, District & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-sm text-[#17362f] truncate" title={camp.name}>
                      {camp.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-[#52665e] font-medium">
                        {camp.district || 'All Gujarat'}
                      </span>
                      <a
                        href={`/campaign/${camp.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-[#79987e] hover:text-[#1f4a3f]"
                      >
                        <span>/{camp.slug}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>

                  <span
                    className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${getStatusBadge(
                      camp.status
                    )}`}
                  >
                    {camp.status || 'Active'}
                  </span>
                </div>

                {/* Primary 3-Metric Block */}
                <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#faf6ed] p-2.5 text-center border border-[#e8dfcf]">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#52665e]">
                      Generated
                    </p>
                    <p className="font-mono text-sm font-extrabold text-[#17362f] mt-0.5">
                      {Number(camp.generated_count || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb]">
                      Downloads
                    </p>
                    <p className="font-mono text-sm font-extrabold text-[#2563eb] mt-0.5">
                      {Number(camp.downloads_count || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#be6c45]">
                      Shares
                    </p>
                    <p className="font-mono text-sm font-extrabold text-[#be6c45] mt-0.5">
                      {Number(camp.shares_count || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Platform Shares 4-Box Grid */}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-[#faf6ed]/70 px-2.5 py-1.5 border border-[#e8dfcf]/60">
                    <span className="text-[#52665e] flex items-center gap-1 font-medium text-[11px]">
                      <MessageCircle className="h-3 w-3 text-green-700" />
                      <span>WhatsApp</span>
                    </span>
                    <span className="font-mono font-bold text-[#17362f]">
                      {Number(camp.whatsapp_count || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-[#faf6ed]/70 px-2.5 py-1.5 border border-[#e8dfcf]/60">
                    <span className="text-[#52665e] flex items-center gap-1 font-medium text-[11px]">
                      <Facebook className="h-3 w-3 text-blue-700" />
                      <span>Facebook</span>
                    </span>
                    <span className="font-mono font-bold text-[#17362f]">
                      {Number(camp.facebook_count || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-[#faf6ed]/70 px-2.5 py-1.5 border border-[#e8dfcf]/60">
                    <span className="text-[#52665e] flex items-center gap-1 font-medium text-[11px]">
                      <Instagram className="h-3 w-3 text-pink-700" />
                      <span>Instagram</span>
                    </span>
                    <span className="font-mono font-bold text-[#17362f]">
                      {Number(camp.instagram_count || 0).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-[#faf6ed]/70 px-2.5 py-1.5 border border-[#e8dfcf]/60">
                    <span className="text-[#52665e] flex items-center gap-1 font-medium text-[11px]">
                      <Share2 className="h-3 w-3 text-[#417264]" />
                      <span>Link</span>
                    </span>
                    <span className="font-mono font-bold text-[#17362f]">
                      {Number(camp.link_count || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Mobile Total Parity Summary Card */}
          {filteredCampaigns.length > 0 && (
            <div className="rounded-2xl border-2 border-[#db9b35]/40 bg-[#faf6ed] p-3.5 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-[#17362f]">
                  Total ({filteredCampaigns.length} Campaigns)
                </h4>
                <span className="text-[10px] font-bold text-[#79987e] uppercase">
                  Parity Sum
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-white p-2 text-center border border-[#e8dfcf]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#52665e]">
                    Generated
                  </p>
                  <p className="font-mono text-sm font-extrabold text-[#17362f] mt-0.5">
                    {filteredTotals.generated.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb]">
                    Downloads
                  </p>
                  <p className="font-mono text-sm font-extrabold text-[#2563eb] mt-0.5">
                    {filteredTotals.downloads.toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#be6c45]">
                    Shares
                  </p>
                  <p className="font-mono text-sm font-extrabold text-[#be6c45] mt-0.5">
                    {filteredTotals.shares.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-white px-2 py-1 border border-[#e8dfcf]/60">
                  <span className="text-[#52665e] flex items-center gap-1 font-medium text-[11px]">
                    <MessageCircle className="h-3 w-3 text-green-700" />
                    <span>WhatsApp</span>
                  </span>
                  <span className="font-mono font-bold text-green-800">
                    {filteredTotals.whatsapp.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white px-2 py-1 border border-[#e8dfcf]/60">
                  <span className="text-[#52665e] flex items-center gap-1 font-medium text-[11px]">
                    <Facebook className="h-3 w-3 text-blue-700" />
                    <span>Facebook</span>
                  </span>
                  <span className="font-mono font-bold text-blue-800">
                    {filteredTotals.facebook.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white px-2 py-1 border border-[#e8dfcf]/60">
                  <span className="text-[#52665e] flex items-center gap-1 font-medium text-[11px]">
                    <Instagram className="h-3 w-3 text-pink-700" />
                    <span>Instagram</span>
                  </span>
                  <span className="font-mono font-bold text-pink-800">
                    {filteredTotals.instagram.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white px-2 py-1 border border-[#e8dfcf]/60">
                  <span className="text-[#52665e] flex items-center gap-1 font-medium text-[11px]">
                    <Share2 className="h-3 w-3 text-[#417264]" />
                    <span>Link</span>
                  </span>
                  <span className="font-mono font-bold text-[#1f4a3f]">
                    {filteredTotals.link.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table Pagination */}
        {pageSize !== 'All' && totalPages > 1 && (
          <div className="mt-3 flex items-center justify-between text-xs text-[#52665e] px-1">
            <span>
              Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)} to{' '}
              {Math.min(currentPage * pageSize, totalItems)} of {totalItems} campaigns
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1 rounded-lg border border-[#e5dccd] bg-[#faf6ed] px-2.5 py-1 disabled:opacity-40 hover:bg-[#ede5d8]"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>
              <span className="font-mono text-xs font-bold text-[#17362f] px-1.5">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-[#e5dccd] bg-[#faf6ed] px-2.5 py-1 disabled:opacity-40 hover:bg-[#ede5d8]"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
