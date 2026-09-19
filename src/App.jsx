import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MetricsRow from './components/MetricsRow';
import CampaignEditor from './components/CampaignEditor';
import CampaignList from './components/CampaignList';
import AnalyticsSection from './components/AnalyticsSection';
import PreviewModal from './components/PreviewModal';
import AdminAuthModal from './components/AdminAuthModal';
import UserPortal from './user/UserPortal';
import { normalizeCoord } from './utils/geoUtils';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

const DEFAULT_CAMPAIGN = {
  id: null,
  name: '',
  slug: '',
  district: '',
  description: '',
  status: 'Draft',
  campaign_image_url: '',
  campaign_x: 0,
  campaign_y: 0,
  campaign_width: 100,
  campaign_height: 100,
  campaign_rotation: 0,
  canvas_width: 1080,
  canvas_height: 1350,
};

const DEFAULT_PHOTO_CONFIG = {
  enabled: false,
  shape: 'Square',
  x: 32,
  y: 42,
  width: 35,
  height: 28,
  rotation: 0,
};

const DEFAULT_NAME_CONFIG = {
  enabled: false,
  x: 18,
  y: 78,
  width: 64,
  height: 10,
  rotation: 0,
  font_family: 'DM Sans',
  font_size: 26,
  font_color: '#fff8e9',
  font_weight: 'bold',
  alignment: 'center',
  letter_spacing: 1,
};

export default function App() {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const campaignMatch = currentPath.match(/^\/campaign\/([a-zA-Z0-9\-_]+)/);
  if (campaignMatch) {
    return <UserPortal slug={campaignMatch[1]} />;
  }

  const [authToken, setAuthToken] = useState(() => localStorage.getItem('yogframe_admin_token'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);

  const [metrics, setMetrics] = useState({
    activeCampaigns: 0,
    draftCampaigns: 0,
    pausedCampaigns: 0,
    archivedCampaigns: 0,
    totalCampaigns: 0,
    totalFrames: 0,
    totalShares: 0,
    downloads: 0,
    whatsappShares: 0,
    facebookShares: 0,
    instagramShares: 0,
    linkShares: 0,
  });

  const [campaigns, setCampaigns] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [campaign, setCampaign] = useState(DEFAULT_CAMPAIGN);
  const [photoConfig, setPhotoConfig] = useState(DEFAULT_PHOTO_CONFIG);
  const [nameConfig, setNameConfig] = useState(DEFAULT_NAME_CONFIG);
  const [activeLayer, setActiveLayer] = useState('campaign'); // 'campaign' | 'photo' | 'name'

  const [saving, setSaving] = useState(false);
  const [uploadingArtwork, setUploadingArtwork] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [previewModalCampaign, setPreviewModalCampaign] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Authorized Fetch Helper
  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${authToken}`,
      };
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        localStorage.removeItem('yogframe_admin_token');
        setAuthToken(null);
        setIsAuthenticated(false);
        throw new Error('Session expired. Please log in again.');
      }
      return res;
    },
    [authToken]
  );

  // Check Auth on Mount
  useEffect(() => {
    async function checkAuth() {
      if (!authToken) {
        setAuthChecking(false);
        return;
      }
      try {
        const res = await fetch('/api/admin/me', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (res.ok) {
          setIsAuthenticated(true);
        } else {
          setAuthToken(null);
          localStorage.removeItem('yogframe_admin_token');
        }
      } catch (err) {
        console.error('Auth verification error:', err);
      } finally {
        setAuthChecking(false);
      }
    }
    checkAuth();
  }, [authToken]);

  // Load Data after Authentication with Pagination and Filters
  const loadDashboardData = useCallback(
    async (overrides = {}) => {
      if (!isAuthenticated) return;
      try {
        const curPage = overrides.page !== undefined ? overrides.page : page;
        const curStatus = overrides.status !== undefined ? overrides.status : statusFilter;
        const curDistrict = overrides.district !== undefined ? overrides.district : districtFilter;
        const curSearch = overrides.search !== undefined ? overrides.search : searchQuery;

        const params = new URLSearchParams({
          page: String(curPage),
          limit: '25',
        });
        if (curStatus && curStatus !== 'All') params.set('status', curStatus);
        if (curDistrict && curDistrict !== 'All') params.set('district', curDistrict);
        if (curSearch && curSearch.trim()) params.set('search', curSearch.trim());

        const [metricsRes, campsRes] = await Promise.all([
          authFetch('/api/admin/metrics'),
          authFetch(`/api/admin/campaigns?${params.toString()}`),
        ]);

        if (metricsRes.ok) {
          const mData = await metricsRes.json();
          setMetrics(mData);
        }

        if (campsRes.ok) {
          const cData = await campsRes.json();
          setCampaigns(cData.campaigns || []);
          if (cData.pagination) {
            setPagination(cData.pagination);
          } else {
            setPagination({
              page: curPage,
              limit: 25,
              total: (cData.campaigns || []).length,
              totalPages: Math.ceil(((cData.campaigns || []).length) / 25) || 1,
            });
          }
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      }
    },
    [isAuthenticated, authFetch, page, statusFilter, districtFilter, searchQuery]
  );

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, loadDashboardData]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    loadDashboardData({ page: newPage });
  };

  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
    loadDashboardData({ status: newStatus, page: 1 });
  };

  const handleDistrictFilterChange = (newDistrict) => {
    setDistrictFilter(newDistrict);
    setPage(1);
    loadDashboardData({ district: newDistrict, page: 1 });
  };

  const handleSearchChange = (newSearch) => {
    setSearchQuery(newSearch);
    setPage(1);
    loadDashboardData({ search: newSearch, page: 1 });
  };

  // Campaign Selection (Load into Studio)
  const handleSelectCampaign = async (id) => {
    try {
      const res = await authFetch(`/api/admin/campaigns/${id}`);
      if (res.ok) {
        const { campaign: c } = await res.json();
        const cw = Number(c.canvas_width) || 1080;
        const ch = Number(c.canvas_height) || 1350;

        setCampaign({
          id: c.id,
          name: c.name,
          slug: c.slug,
          district: c.district || '',
          description: c.description || '',
          status: c.status || 'Draft',
          campaign_image_url: c.campaign_image_url || '',
          campaign_x: normalizeCoord(c.campaign_x, cw, 0),
          campaign_y: normalizeCoord(c.campaign_y, ch, 0),
          campaign_width: Math.max(5, normalizeCoord(c.campaign_width, cw, 100)),
          campaign_height: Math.max(5, normalizeCoord(c.campaign_height, ch, 100)),
          campaign_rotation: Number(c.campaign_rotation) || 0,
          canvas_width: cw,
          canvas_height: ch,
        });

        if (c.photo_config) {
          setPhotoConfig({
            enabled: Boolean(c.photo_config.enabled),
            shape: c.photo_config.shape || 'Square',
            x: normalizeCoord(c.photo_config.x, cw, 30),
            y: normalizeCoord(c.photo_config.y, ch, 35),
            width: Math.max(5, normalizeCoord(c.photo_config.width, cw, 40)),
            height: Math.max(5, normalizeCoord(c.photo_config.height, ch, 30)),
            rotation: Number(c.photo_config.rotation) || 0,
          });
        } else {
          setPhotoConfig(DEFAULT_PHOTO_CONFIG);
        }

        if (c.name_config) {
          setNameConfig({
            enabled: Boolean(c.name_config.enabled),
            x: normalizeCoord(c.name_config.x, cw, 20),
            y: normalizeCoord(c.name_config.y, ch, 75),
            width: Math.max(5, normalizeCoord(c.name_config.width, cw, 60)),
            height: Math.max(3, normalizeCoord(c.name_config.height, ch, 10)),
            rotation: Number(c.name_config.rotation) || 0,
            font_family: c.name_config.font_family || 'DM Sans',
            font_size: c.name_config.font_size || 26,
            font_color: c.name_config.font_color || '#fff8e9',
            font_weight: c.name_config.font_weight || 'bold',
            alignment: c.name_config.alignment || 'center',
            letter_spacing: c.name_config.letter_spacing ?? 1,
          });
        } else {
          setNameConfig(DEFAULT_NAME_CONFIG);
        }

        setActiveLayer('campaign');
        setSaveMessage(null);
        showToast(`Loaded campaign "${c.name}" into Studio`);

        // Scroll to editor
        const el = document.getElementById('campaign-form');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      showToast(err.message || 'Failed to load campaign');
    }
  };

  // Create New Campaign Template
  const handleNewCampaign = () => {
    setCampaign(DEFAULT_CAMPAIGN);
    setPhotoConfig(DEFAULT_PHOTO_CONFIG);
    setNameConfig(DEFAULT_NAME_CONFIG);
    setActiveLayer('campaign');
    setSaveMessage(null);
    showToast('Ready for new campaign. Enter name and upload artwork.');

    const el = document.getElementById('campaign-form');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Form Field Updates
  const handleUpdateCampaignField = (field, value) => {
    setCampaign((prev) => {
      const updated = { ...prev, [field]: value };
      // Auto-generate slug when typing name if slug is untouched or identical to previous slugified name
      if (field === 'name') {
        const prevSlug = slugify(prev.name || '');
        if (!prev.slug || prev.slug === prevSlug) {
          updated.slug = slugify(value);
        }
      }
      return updated;
    });
  };

  // Artwork & Config Geometry Updates
  const handleUpdateCampaignGeometry = (geo) => {
    setCampaign((prev) => ({ ...prev, ...geo }));
  };

  const handleUpdatePhotoGeometry = (geo) => {
    setPhotoConfig((prev) => ({ ...prev, ...geo }));
  };

  const handleUpdateNameGeometry = (geo) => {
    setNameConfig((prev) => ({ ...prev, ...geo }));
  };

  // Layer Creation & Removal (Only on demand)
  const handleAddPhotoArea = () => {
    setPhotoConfig((prev) => ({
      ...prev,
      enabled: true,
      x: prev.x ?? 30,
      y: prev.y ?? 35,
      width: prev.width ?? 40,
      height: prev.height ?? 30,
    }));
    setActiveLayer('photo');
    showToast('Photo Area overlay added to canvas.');
  };

  const handleRemovePhotoArea = () => {
    setPhotoConfig((prev) => ({ ...prev, enabled: false }));
    setActiveLayer('campaign');
    showToast('Photo Area removed.');
  };

  const handleAddNameArea = () => {
    setNameConfig((prev) => ({
      ...prev,
      enabled: true,
      x: prev.x ?? 20,
      y: prev.y ?? 75,
      width: prev.width ?? 60,
      height: prev.height ?? 10,
    }));
    setActiveLayer('name');
    showToast('Name Area overlay added to canvas.');
  };

  const handleRemoveNameArea = () => {
    setNameConfig((prev) => ({ ...prev, enabled: false }));
    setActiveLayer('campaign');
    showToast('Name Area removed.');
  };

  // Artwork File Upload with Cover-style Initial Placement
  const handleArtworkUpload = async (file) => {
    if (!file) return;

    setUploadingArtwork(true);
    try {
      // 1. Read image natural dimensions to calculate initial exact cover fit
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = objectUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      const imgW = img.naturalWidth || 1080;
      const imgH = img.naturalHeight || 1350;
      const imgAspect = imgW / imgH;

      const targetW = campaign.canvas_width || 1080;
      const targetH = campaign.canvas_height || 1350;
      const canvasAspect = targetW / targetH;

      let initW = 100;
      let initH = 100;
      let initX = 0;
      let initY = 0;

      if (imgAspect > canvasAspect) {
        // Image is wider than canvas -> height 100%, width expanded & centered
        initH = 100;
        initW = Math.round((imgAspect / canvasAspect) * 1000) / 10;
        initX = Math.round(((100 - initW) / 2) * 10) / 10;
        initY = 0;
      } else {
        // Image is taller than canvas -> width 100%, height expanded & centered
        initW = 100;
        initH = Math.round((canvasAspect / imgAspect) * 1000) / 10;
        initY = Math.round(((100 - initH) / 2) * 10) / 10;
        initX = 0;
      }

      URL.revokeObjectURL(objectUrl);

      // 2. Upload artwork file to Supabase Storage
      const formData = new FormData();
      formData.append('artwork', file);
      formData.append('image', file);
      if (campaign.id) {
        formData.append('campaignId', campaign.id);
      }

      const res = await authFetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload artwork');
      }

      const uploadedUrl = data.url || data.imageUrl;
      setCampaign((prev) => ({
        ...prev,
        campaign_image_url: uploadedUrl,
        campaign_x: initX,
        campaign_y: initY,
        campaign_width: initW,
        campaign_height: initH,
        campaign_rotation: 0,
      }));
      setActiveLayer('campaign');
      showToast('Artwork uploaded to storage as base layer with exact cover fit.');
    } catch (err) {
      showToast(`Upload failed: ${err.message}`);
    } finally {
      setUploadingArtwork(false);
    }
  };

  // Save / Persist Campaign (Requirement 15)
  const handleSaveCampaign = async () => {
    if (!campaign.name || !campaign.name.trim()) {
      showToast('Please enter a campaign name');
      return;
    }

    if (!campaign.campaign_image_url) {
      showToast('Upload your campaign artwork before saving');
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      let targetId = campaign.id;

      // 1. Normalized Save Payload
      const savePayload = {
        name: campaign.name,
        slug: campaign.slug,
        district: campaign.district && campaign.district.trim() ? campaign.district.trim() : null,
        description: campaign.description,
        status: campaign.status,
        campaign_image_url: campaign.campaign_image_url,
        campaign_x: campaign.campaign_x ?? 0,
        campaign_y: campaign.campaign_y ?? 0,
        campaign_width: campaign.campaign_width ?? 100,
        campaign_height: campaign.campaign_height ?? 100,
        campaign_rotation: campaign.campaign_rotation ?? 0,
        canvas_width: Number(campaign.canvas_width) || 1080,
        canvas_height: Number(campaign.canvas_height) || 1350,
        photo_config: photoConfig,
        name_config: nameConfig,
      };

      // 2. Create campaign first if new
      if (!targetId) {
        const createRes = await authFetch('/api/admin/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(savePayload),
        });

        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.error || 'Failed to create campaign');
        }
        targetId = createData.campaign.id;
      }

      // 3. Save full composition parameters to database
      const putRes = await authFetch(`/api/admin/campaigns/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload),
      });

      const putData = await putRes.json();
      if (!putRes.ok) {
        throw new Error(putData.error || 'Failed to save campaign composition');
      }

      const savedCampaign = putData.campaign || {};
      const savedSlug = savedCampaign.slug || campaign.slug || '';

      setCampaign((prev) => ({
        ...prev,
        id: targetId,
        slug: savedSlug,
        district: savedCampaign.district !== undefined ? (savedCampaign.district || '') : prev.district,
        canvas_width: savedCampaign.canvas_width || prev.canvas_width || 1080,
        canvas_height: savedCampaign.canvas_height || prev.canvas_height || 1350,
        campaign_image_url: savedCampaign.campaign_image_url || prev.campaign_image_url,
      }));

      setSaveMessage({
        type: 'success',
        text: `Campaign saved successfully. Composition persisted to database at /campaign/${savedSlug}`,
      });

      showToast(`Campaign "${campaign.name}" saved!`);
      loadDashboardData();
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err.message || 'Could not save campaign composition.',
      });
      showToast(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Status Change (Activate, Pause, Archive)
  const handleStatusChange = async (id, status) => {
    try {
      const res = await authFetch(`/api/admin/campaigns/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status');
      }

      if (campaign.id === id) {
        setCampaign((prev) => ({ ...prev, status }));
      }

      showToast(`Campaign status updated to ${status}`);
      loadDashboardData();
    } catch (err) {
      showToast(err.message);
    }
  };

  // Delete Campaign
  const handleDeleteCampaign = async (id) => {
    try {
      const res = await authFetch(`/api/admin/campaigns/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete campaign');
      }

      if (campaign.id === id) {
        handleNewCampaign();
      }

      showToast('Campaign deleted successfully');
      loadDashboardData();
    } catch (err) {
      showToast(err.message);
    }
  };

  // Preview Modal
  const handleOpenPreview = (camp) => {
    if (camp.id === campaign.id) {
      setPreviewModalCampaign({
        ...campaign,
        photo_config: photoConfig,
        name_config: nameConfig,
      });
    } else {
      setPreviewModalCampaign(camp);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('yogframe_admin_token');
    setAuthToken(null);
    setIsAuthenticated(false);
    showToast('Logged out of Admin session');
  };

  if (authChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#faf6ed]">
        <div className="text-center font-bold text-[#1f4a3f]">Loading YogBoardFrame Admin...</div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen text-[#17362f]">
      {/* Admin Authentication Gate */}
      {!isAuthenticated && (
        <AdminAuthModal
          onAuthenticated={(token) => {
            setAuthToken(token);
            setIsAuthenticated(true);
            showToast('Welcome to YogBoardFrame Admin Studio');
          }}
        />
      )}

      {/* Hero Header */}
      <Header
        onNewCampaign={handleNewCampaign}
        onLogout={handleLogout}
        activeCampaignCount={metrics.activeCampaigns}
      />

      <main className="max-w-[1140px] mx-auto px-4 pb-16">
        {/* Top 4 Metrics Cards */}
        <MetricsRow metrics={metrics} />

        {/* Campaign Studio & Composition Editor */}
        <CampaignEditor
          campaign={campaign}
          photoConfig={photoConfig}
          nameConfig={nameConfig}
          activeLayer={activeLayer}
          onSelectLayer={setActiveLayer}
          onUpdateCampaignField={handleUpdateCampaignField}
          onUpdateCampaignGeometry={handleUpdateCampaignGeometry}
          onUpdatePhotoGeometry={handleUpdatePhotoGeometry}
          onUpdateNameGeometry={handleUpdateNameGeometry}
          onAddPhotoArea={handleAddPhotoArea}
          onRemovePhotoArea={handleRemovePhotoArea}
          onAddNameArea={handleAddNameArea}
          onRemoveNameArea={handleRemoveNameArea}
          onArtworkUpload={handleArtworkUpload}
          onSaveCampaign={handleSaveCampaign}
          saving={saving}
          uploadingArtwork={uploadingArtwork}
          saveMessage={saveMessage}
        />

        {/* Analytics Section with Chart.js */}
        <AnalyticsSection metrics={metrics} />

        {/* Multi-Campaign Management List */}
        <CampaignList
          campaigns={campaigns}
          selectedCampaignId={campaign.id}
          onSelectCampaign={handleSelectCampaign}
          onNewCampaign={handleNewCampaign}
          onStatusChange={handleStatusChange}
          onDeleteCampaign={handleDeleteCampaign}
          onPreviewCampaign={handleOpenPreview}
          onToast={showToast}
          pagination={pagination}
          onPageChange={handlePageChange}
          search={searchQuery}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          districtFilter={districtFilter}
          onDistrictFilterChange={handleDistrictFilterChange}
        />
      </main>

      {/* Composition Preview Modal */}
      {previewModalCampaign && (
        <PreviewModal
          campaign={previewModalCampaign}
          photoConfig={previewModalCampaign.photo_config || photoConfig}
          nameConfig={previewModalCampaign.name_config || nameConfig}
          onClose={() => setPreviewModalCampaign(null)}
          onToast={showToast}
        />
      )}

      {/* Toast Notification */}
      <div
        id="toast"
        className={`toast rounded-full bg-[#17362f] border border-[#f5c75a]/30 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-2xl ${
          toastMessage ? 'show' : ''
        }`}
        role="status"
      >
        {toastMessage}
      </div>
    </div>
  );
}
