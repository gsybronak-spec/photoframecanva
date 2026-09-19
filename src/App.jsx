import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import MetricsRow from './components/MetricsRow';
import CampaignEditor from './components/CampaignEditor';
import CampaignList from './components/CampaignList';
import AnalyticsSection from './components/AnalyticsSection';
import PreviewModal from './components/PreviewModal';
import AdminAuthModal from './components/AdminAuthModal';

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
  description: '',
  status: 'Draft',
  campaign_image_url: '',
  campaign_x: 0,
  campaign_y: 0,
  campaign_width: 100,
  campaign_height: 100,
  campaign_rotation: 0,
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

  // Load Data after Authentication
  const loadDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [metricsRes, campsRes] = await Promise.all([
        authFetch('/api/admin/metrics'),
        authFetch('/api/admin/campaigns'),
      ]);

      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        setMetrics(mData);
      }

      if (campsRes.ok) {
        const cData = await campsRes.json();
        setCampaigns(cData.campaigns || []);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  }, [isAuthenticated, authFetch]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, loadDashboardData]);

  // Campaign Selection (Load into Studio)
  const handleSelectCampaign = async (id) => {
    try {
      const res = await authFetch(`/api/admin/campaigns/${id}`);
      if (res.ok) {
        const { campaign: c } = await res.json();
        setCampaign({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description || '',
          status: c.status || 'Draft',
          campaign_image_url: c.campaign_image_url || '',
          campaign_x: c.campaign_x ?? 0,
          campaign_y: c.campaign_y ?? 0,
          campaign_width: c.campaign_width ?? 100,
          campaign_height: c.campaign_height ?? 100,
          campaign_rotation: c.campaign_rotation ?? 0,
        });

        if (c.photo_config) {
          setPhotoConfig({
            enabled: Boolean(c.photo_config.enabled),
            shape: c.photo_config.shape || 'Square',
            x: c.photo_config.x ?? 32,
            y: c.photo_config.y ?? 42,
            width: c.photo_config.width ?? 35,
            height: c.photo_config.height ?? 28,
            rotation: c.photo_config.rotation ?? 0,
          });
        } else {
          setPhotoConfig(DEFAULT_PHOTO_CONFIG);
        }

        if (c.name_config) {
          setNameConfig({
            enabled: Boolean(c.name_config.enabled),
            x: c.name_config.x ?? 18,
            y: c.name_config.y ?? 78,
            width: c.name_config.width ?? 64,
            height: c.name_config.height ?? 10,
            rotation: c.name_config.rotation ?? 0,
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
    setPhotoConfig((prev) => ({ ...prev, enabled: true }));
    setActiveLayer('photo');
    showToast('Photo Area overlay added.');
  };

  const handleRemovePhotoArea = () => {
    setPhotoConfig((prev) => ({ ...prev, enabled: false }));
    setActiveLayer('campaign');
    showToast('Photo Area removed.');
  };

  const handleAddNameArea = () => {
    setNameConfig((prev) => ({ ...prev, enabled: true }));
    setActiveLayer('name');
    showToast('Name Area overlay added.');
  };

  const handleRemoveNameArea = () => {
    setNameConfig((prev) => ({ ...prev, enabled: false }));
    setActiveLayer('campaign');
    showToast('Name Area removed.');
  };

  // Artwork File Upload
  const handleArtworkUpload = async (file) => {
    if (!file) return;

    setUploadingArtwork(true);
    try {
      const formData = new FormData();
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

      setCampaign((prev) => ({
        ...prev,
        campaign_image_url: data.url,
      }));
      setActiveLayer('campaign');
      showToast('Artwork uploaded to storage as base layer.');
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

      // 1. Create campaign first if new
      if (!targetId) {
        const createRes = await authFetch('/api/admin/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: campaign.name,
            slug: campaign.slug,
            description: campaign.description,
            status: campaign.status,
          }),
        });

        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.error || 'Failed to create campaign');
        }
        targetId = createData.campaign.id;
      }

      // 2. Save full composition parameters to database
      const savePayload = {
        name: campaign.name,
        slug: campaign.slug,
        description: campaign.description,
        status: campaign.status,
        campaign_image_url: campaign.campaign_image_url,
        campaign_x: campaign.campaign_x,
        campaign_y: campaign.campaign_y,
        campaign_width: campaign.campaign_width,
        campaign_height: campaign.campaign_height,
        campaign_rotation: campaign.campaign_rotation,
        photo_config: photoConfig,
        name_config: nameConfig,
      };

      const putRes = await authFetch(`/api/admin/campaigns/${targetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload),
      });

      const putData = await putRes.json();
      if (!putRes.ok) {
        throw new Error(putData.error || 'Failed to save campaign composition');
      }

      setCampaign((prev) => ({
        ...prev,
        id: targetId,
        slug: putData.campaign.slug,
      }));

      setSaveMessage({
        type: 'success',
        text: `Campaign saved successfully. Composition persisted to database at /campaign/${putData.campaign.slug}`,
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
        <div className="text-center font-bold text-[#1f4a3f]">Loading YogFrame Admin...</div>
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
            showToast('Welcome to YogFrame Admin Studio');
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
