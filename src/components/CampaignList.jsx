import React, { useState } from 'react';
import {
  Search,
  Filter,
  Copy,
  Check,
  Edit3,
  Eye,
  Play,
  Pause,
  Archive,
  Trash2,
  Calendar,
  Layers,
  Share2,
  ExternalLink,
  Plus,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { GUJARAT_DISTRICTS } from '../utils/gujaratDistricts';

export default function CampaignList({
  campaigns = [],
  selectedCampaignId,
  onSelectCampaign,
  onNewCampaign,
  onStatusChange,
  onDeleteCampaign,
  onPreviewCampaign,
  onToast,
  pagination = { page: 1, limit: 25, total: 0, totalPages: 1 },
  onPageChange,
  search: controlledSearch,
  onSearchChange,
  statusFilter: controlledStatus,
  onStatusFilterChange,
  districtFilter: controlledDistrict,
  onDistrictFilterChange,
}) {
  const [localSearch, setLocalSearch] = useState('');
  const [localStatus, setLocalStatus] = useState('All');
  const [localDistrict, setLocalDistrict] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  const search = controlledSearch !== undefined ? controlledSearch : localSearch;
  const statusFilter = controlledStatus !== undefined ? controlledStatus : localStatus;
  const districtFilter = controlledDistrict !== undefined ? controlledDistrict : localDistrict;

  const handleSearchChange = (val) => {
    if (onSearchChange) onSearchChange(val);
    else setLocalSearch(val);
  };

  const handleStatusChange = (val) => {
    if (onStatusFilterChange) onStatusFilterChange(val);
    else setLocalStatus(val);
  };

  const handleDistrictChange = (val) => {
    if (onDistrictFilterChange) onDistrictFilterChange(val);
    else setLocalDistrict(val);
  };

  // If server-side pagination is active, campaigns array is already filtered & paginated.
  // Otherwise, apply client-side filtering fallback.
  const displayCampaigns = onPageChange
    ? campaigns
    : campaigns.filter((c) => {
        const matchesSearch =
          (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.slug || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.district || '').toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
        const matchesDistrict = districtFilter === 'All' || c.district === districtFilter;
        return matchesSearch && matchesStatus && matchesDistrict;
      });

  const handleCopyLink = (campaign) => {
    const fullUrl = `${window.location.origin}/campaign/${campaign.slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(campaign.id);
    onToast(`Copied campaign link: /campaign/${campaign.slug}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  const totalCount = pagination?.total != null ? pagination.total : campaigns.length;

  return (
    <section className="mt-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#79987e]">
            MULTI-CAMPAIGN PORTFOLIO
          </p>
          <h2 className="brand-serif mt-1 text-2xl sm:text-3xl font-bold text-[#17362f]">
            All Campaign Frames ({totalCount})
          </h2>
        </div>

        <button
          onClick={onNewCampaign}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f4a3f] hover:bg-[#16382f] text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Campaign</span>
        </button>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns by name, slug, or district..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-xl border border-[#e5dccd] bg-white py-2.5 pl-10 pr-4 text-xs sm:text-sm text-[#17362f] placeholder-gray-400 focus:border-[#db9b35] focus:outline-none focus:ring-2 focus:ring-[#db9b35]/20 shadow-sm"
          />
        </div>

        {/* District & Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* District Dropdown Filter */}
          <div className="flex items-center gap-1.5 rounded-xl border border-[#e8dfcf] bg-white px-3 py-1.5 shadow-sm">
            <MapPin className="h-3.5 w-3.5 text-[#db9b35]" />
            <select
              value={districtFilter}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#17362f] focus:outline-none cursor-pointer"
            >
              <option value="All">All Gujarat Districts</option>
              {GUJARAT_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-1 shadow-sm">
            {['All', 'Active', 'Draft', 'Paused', 'Archived'].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  statusFilter === status
                    ? 'bg-[#1f4a3f] text-white shadow-sm'
                    : 'text-[#52665e] hover:text-[#17362f]'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Campaign Cards Grid */}
      {displayCampaigns.length === 0 ? (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-[#e8dfcf] bg-white p-8 sm:p-12 text-center">
          <p className="text-sm font-semibold text-[#52665e]">
            {search || statusFilter !== 'All' || districtFilter !== 'All'
              ? 'No campaigns match your search or filter.'
              : 'No campaigns created yet. Click "Create New Campaign" to start!'}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayCampaigns.map((camp) => {
            const isSelected = selectedCampaignId === camp.id;
            const createdDate = new Date(camp.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });

            return (
              <article
                key={camp.id}
                className={`soft-card flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all ${
                  isSelected
                    ? 'border-[#db9b35] ring-2 ring-[#db9b35]/30'
                    : 'border-[#e8dfcf] hover:border-[#bda980] hover:shadow-md'
                }`}
              >
                <div>
                  {/* Card Header with Status & District Badges */}
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusBadge(
                          camp.status
                        )}`}
                      >
                        {camp.status}
                      </span>

                      {camp.district && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#d8d0c2] bg-[#f5ede0] px-2.5 py-0.5 text-[10px] font-bold text-[#1f4a3f]">
                          <MapPin className="h-2.5 w-2.5 text-[#db9b35]" />
                          <span>{camp.district}</span>
                        </span>
                      )}
                    </div>

                    <span className="flex items-center gap-1 text-[11px] text-[#79987e] font-medium">
                      <Calendar className="h-3 w-3" />
                      <span>{createdDate}</span>
                    </span>
                  </div>

                  {/* Artwork Preview Thumbnail & Title */}
                  <div className="mt-3.5 flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#e8dfcf] bg-[#f5efe4] checker grid place-items-center">
                      {camp.campaign_image_url ? (
                        <img
                          src={camp.campaign_image_url}
                          alt={camp.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Layers className="h-6 w-6 text-gray-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3
                        className="truncate text-sm sm:text-base font-bold text-[#17362f] cursor-pointer hover:text-[#1f4a3f]"
                        title={camp.name}
                        onClick={() => onSelectCampaign(camp.id)}
                      >
                        {camp.name}
                      </h3>
                      <p className="mt-0.5 truncate font-mono text-[11px] text-[#79987e]">
                        /campaign/{camp.slug}
                      </p>
                      {camp.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-[#52665e]">
                          {camp.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats Bar */}
                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#faf6ed] p-2 text-center border border-[#e8dfcf]">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#52665e]">
                        Frames
                      </p>
                      <p className="font-mono text-sm font-extrabold text-[#17362f]">
                        {camp.frames_count ?? 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#52665e]">
                        Shares
                      </p>
                      <p className="font-mono text-sm font-extrabold text-[#17362f]">
                        {camp.shares_count ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 border-t border-[#e8dfcf] pt-3 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectCampaign(camp.id)}
                      title="Edit in Studio"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#e5dccd] bg-white px-2.5 py-1.5 text-xs font-bold text-[#17362f] hover:bg-[#f6efe4] transition-colors"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-[#1f4a3f]" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onPreviewCampaign(camp)}
                      title="Preview Composition"
                      className="inline-flex items-center gap-1 rounded-lg border border-[#e5dccd] bg-white px-2.5 py-1.5 text-xs font-bold text-[#17362f] hover:bg-[#f6efe4] transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#79987e]" />
                      <span>Preview</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(camp)}
                      title="Copy Public Link"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-[#e5dccd] bg-white text-[#17362f] hover:bg-[#f6efe4] transition-colors"
                    >
                      {copiedId === camp.id ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-gray-600" />
                      )}
                    </button>
                  </div>

                  {/* Status Toggle Quick Buttons */}
                  <div className="flex items-center gap-1">
                    {camp.status !== 'Active' && (
                      <button
                        type="button"
                        onClick={() => onStatusChange(camp.id, 'Active')}
                        title="Activate Campaign"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[#c4dcce] bg-[#eaf2ed] text-[#1f4a3f] hover:bg-[#d6eade] transition-colors"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                      </button>
                    )}

                    {camp.status === 'Active' && (
                      <button
                        type="button"
                        onClick={() => onStatusChange(camp.id, 'Paused')}
                        title="Pause Campaign"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[#e5e7eb] bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {camp.status !== 'Archived' && (
                      <button
                        type="button"
                        onClick={() => onStatusChange(camp.id, 'Archived')}
                        title="Archive Campaign"
                        className="grid h-8 w-8 place-items-center rounded-lg border border-[#f2cfc2] bg-[#faece5] text-[#be6c45] hover:bg-[#f5ddd4] transition-colors"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete campaign "${camp.name}"? This cannot be undone.`)) {
                          onDeleteCampaign(camp.id);
                        }
                      }}
                      title="Delete Campaign"
                      className="grid h-8 w-8 place-items-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#e8dfcf] pt-4">
          <p className="text-xs font-medium text-[#52665e]">
            Showing{' '}
            <span className="font-bold text-[#17362f]">
              {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}
            </span>{' '}
            to{' '}
            <span className="font-bold text-[#17362f]">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{' '}
            of <span className="font-bold text-[#17362f]">{pagination.total}</span> campaigns
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange && onPageChange(pagination.page - 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-[#e5dccd] bg-white px-3 py-1.5 text-xs font-bold text-[#17362f] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#faf6ed] transition-colors shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs font-bold text-[#1f4a3f] px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange && onPageChange(pagination.page + 1)}
              className="inline-flex items-center gap-1 rounded-xl border border-[#e5dccd] bg-white px-3 py-1.5 text-xs font-bold text-[#17362f] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#faf6ed] transition-colors shadow-sm"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
