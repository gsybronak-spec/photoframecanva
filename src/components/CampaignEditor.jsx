import React, { useState } from 'react';
import { Eye, EyeOff, Save, RefreshCw, Link as LinkIcon, AlertCircle, CheckCircle, LayoutTemplate } from 'lucide-react';
import CanvasStage from './CanvasStage';
import EditorSidebar from './EditorSidebar';
import { PRESET_CATEGORIES, SIZE_PRESETS, findMatchingPreset } from '../utils/sizePresets';

export default function CampaignEditor({
  campaign,
  photoConfig,
  nameConfig,
  activeLayer,
  onSelectLayer,
  onUpdateCampaignField,
  onUpdateCampaignGeometry,
  onUpdatePhotoGeometry,
  onUpdateNameGeometry,
  onAddPhotoArea,
  onRemovePhotoArea,
  onAddNameArea,
  onRemoveNameArea,
  onArtworkUpload,
  onSaveCampaign,
  saving,
  uploadingArtwork,
  saveMessage,
}) {
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const activePreset = findMatchingPreset(campaign.canvas_width, campaign.canvas_height);
  const [selectedCategory, setSelectedCategory] = useState(activePreset.category || 'Instagram');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveCampaign();
  };

  const publicUrl = campaign.slug ? `/campaign/${campaign.slug}` : '';

  return (
    <section className="mt-8">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#79987e]">
          CAMPAIGN STUDIO & FRAME BUILDER
        </p>
        <h2 className="brand-serif mt-1 text-2xl sm:text-3xl font-bold text-[#17362f]">
          {campaign.id ? 'Edit Campaign Composition' : 'Design New Campaign Frame'}
        </h2>
      </div>

      <form id="campaign-form" onSubmit={handleSubmit} className="soft-card mt-5 rounded-[26px] bg-white p-4 sm:p-7 shadow-sm">
        {/* Campaign Info Fields */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Campaign Name */}
          <div className="sm:col-span-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#52665e]" htmlFor="campaign-name">
              Campaign Name *
            </label>
            <input
              id="campaign-name"
              required
              placeholder="e.g. International Yoga Day 2026"
              className="w-full rounded-xl border border-[#e5dccd] bg-[#fdfbf6] px-4 py-2.5 text-sm font-medium text-[#17362f] placeholder-gray-400 focus:border-[#db9b35] focus:outline-none focus:ring-2 focus:ring-[#db9b35]/20"
              value={campaign.name || ''}
              onChange={(e) => onUpdateCampaignField('name', e.target.value)}
            />
          </div>

          {/* Campaign Slug */}
          <div className="sm:col-span-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#52665e]" htmlFor="campaign-slug">
              Campaign Slug *
            </label>
            <div className="relative">
              <input
                id="campaign-slug"
                required
                placeholder="e.g. international-yoga-day-2026"
                className="w-full rounded-xl border border-[#e5dccd] bg-[#fdfbf6] px-4 py-2.5 text-sm font-mono text-[#17362f] placeholder-gray-400 focus:border-[#db9b35] focus:outline-none focus:ring-2 focus:ring-[#db9b35]/20"
                value={campaign.slug || ''}
                onChange={(e) => onUpdateCampaignField('slug', e.target.value)}
              />
            </div>
          </div>

          {/* Status */}
          <div className="sm:col-span-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#52665e]" htmlFor="campaign-status">
              Publication Status
            </label>
            <select
              id="campaign-status"
              className="w-full rounded-xl border border-[#e5dccd] bg-[#fdfbf6] px-4 py-2.5 text-sm font-semibold text-[#17362f] focus:border-[#db9b35] focus:outline-none focus:ring-2 focus:ring-[#db9b35]/20"
              value={campaign.status || 'Draft'}
              onChange={(e) => onUpdateCampaignField('status', e.target.value)}
            >
              <option value="Draft">Draft (Editing in progress)</option>
              <option value="Active">Active (Live & public)</option>
              <option value="Paused">Paused (Temporarily hidden)</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Campaign Description */}
        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[#52665e]" htmlFor="campaign-description">
            Campaign Description (Optional)
          </label>
          <textarea
            id="campaign-description"
            rows="2"
            placeholder="Provide context or instructions for this yoga event campaign..."
            className="w-full resize-none rounded-xl border border-[#e5dccd] bg-[#fdfbf6] px-4 py-2.5 text-sm text-[#17362f] placeholder-gray-400 focus:border-[#db9b35] focus:outline-none focus:ring-2 focus:ring-[#db9b35]/20"
            value={campaign.description || ''}
            onChange={(e) => onUpdateCampaignField('description', e.target.value)}
          />
        </div>

        {/* PhotoFrame Size Presets Section */}
        <div className="mt-5 rounded-2xl border border-[#e8dfcf] bg-[#faf6ed] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <LayoutTemplate className="h-4 w-4 text-[#1f4a3f]" />
                <label className="block text-xs font-bold uppercase tracking-wider text-[#1f4a3f]">
                  PhotoFrame Size & Output Dimensions
                </label>
              </div>
              <p className="mt-0.5 text-xs text-[#52665e]">
                Choose target output aspect ratio. Canvas and generated exports will match this exact size.
              </p>
            </div>

            {/* Small visual aspect ratio badge & preview */}
            <div className="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2 border border-[#e8dfcf] shadow-sm">
              <div
                className="border-2 border-[#1f4a3f] bg-[#e9e1d1] rounded-sm transition-all"
                style={{
                  width: `${Math.min(28, Math.max(12, Math.round(22 * ((campaign.canvas_width || 1080) / (campaign.canvas_height || 1350)))))}px`,
                  height: '22px',
                }}
                title={`Aspect ratio: ${campaign.canvas_width || 1080} × ${campaign.canvas_height || 1350}`}
              />
              <div className="text-right">
                <span className="block font-mono text-xs font-extrabold text-[#17362f]">
                  {campaign.canvas_width || 1080} × {campaign.canvas_height || 1350} px
                </span>
                <span className="block text-[10px] font-bold text-[#79987e] uppercase">
                  {activePreset.aspectRatio || 'Preset'}
                </span>
              </div>
            </div>
          </div>

          {/* Category Tabs: Instagram | Facebook | WhatsApp | Custom */}
          <div className="mt-3.5 flex flex-wrap gap-1.5 border-b border-[#e8dfcf] pb-2.5">
            {PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  if (cat !== 'Custom') {
                    const firstOfCat = SIZE_PRESETS.find((p) => p.category === cat);
                    if (firstOfCat) {
                      onUpdateCampaignField('canvas_width', firstOfCat.width);
                      onUpdateCampaignField('canvas_height', firstOfCat.height);
                    }
                  }
                }}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#1f4a3f] text-white shadow-sm'
                    : 'bg-white text-[#52665e] border border-[#e8dfcf] hover:bg-[#f6efe4]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Presets Grid for Selected Category */}
          {selectedCategory !== 'Custom' ? (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {SIZE_PRESETS.filter((p) => p.category === selectedCategory).map((preset) => {
                const isSelected =
                  (campaign.canvas_width || 1080) === preset.width &&
                  (campaign.canvas_height || 1350) === preset.height;

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      onUpdateCampaignField('canvas_width', preset.width);
                      onUpdateCampaignField('canvas_height', preset.height);
                    }}
                    className={`flex flex-col text-left rounded-xl p-3 border transition-all ${
                      isSelected
                        ? 'border-[#db9b35] bg-white ring-2 ring-[#db9b35]/30 shadow-sm'
                        : 'border-[#e8dfcf] bg-white hover:border-[#1f4a3f]/40 hover:bg-[#fdfbf6]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#17362f]">{preset.name}</span>
                      <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded ${isSelected ? 'bg-[#f4e6c8] text-[#935e20]' : 'bg-[#f0ebe1] text-[#6b7280]'}`}>
                        {preset.badge}
                      </span>
                    </div>
                    <span className="mt-1 font-mono text-[11px] font-semibold text-[#1f4a3f]">
                      {preset.width} × {preset.height} px
                    </span>
                    <span className="mt-0.5 text-[10px] text-[#52665e] line-clamp-1">
                      {preset.description}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Custom Dimensions Inputs */
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-[#e8dfcf]">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#52665e]" htmlFor="custom-width">
                  Output Width (px)
                </label>
                <input
                  id="custom-width"
                  type="number"
                  min="300"
                  max="4000"
                  value={campaign.canvas_width || 1080}
                  onChange={(e) => onUpdateCampaignField('canvas_width', Math.max(100, parseInt(e.target.value) || 1080))}
                  className="mt-1 w-full rounded-lg border border-[#e5dccd] bg-[#fdfbf6] px-3 py-2 text-xs font-mono font-bold text-[#17362f] focus:border-[#db9b35] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#52665e]" htmlFor="custom-height">
                  Output Height (px)
                </label>
                <input
                  id="custom-height"
                  type="number"
                  min="300"
                  max="4000"
                  value={campaign.canvas_height || 1350}
                  onChange={(e) => onUpdateCampaignField('canvas_height', Math.max(100, parseInt(e.target.value) || 1350))}
                  className="mt-1 w-full rounded-lg border border-[#e5dccd] bg-[#fdfbf6] px-3 py-2 text-xs font-mono font-bold text-[#17362f] focus:border-[#db9b35] focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Public URL Indicator */}
        {publicUrl && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#faf6ed] px-3.5 py-2 text-xs border border-[#e8dfcf]">
            <LinkIcon className="h-3.5 w-3.5 text-[#79987e]" />
            <span className="font-medium text-[#52665e]">Public Endpoint:</span>
            <code className="font-mono font-bold text-[#1f4a3f]">{publicUrl}</code>
            <span className="ml-auto text-[10px] text-[#79987e] font-semibold">Strict Query Isolation</span>
          </div>
        )}

        {/* Action Bar / Preview Toggle */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e8dfcf] pt-4">
          <div>
            <p className="text-sm font-bold text-[#17362f]">Interactive Frame Canvas</p>
            <p className="text-xs text-[#52665e]">
              Directly drag, stretch, or rotate elements. Values save permanently to the database.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
              isPreviewMode
                ? 'border-[#db9b35] bg-[#db9b35] text-[#17362f]'
                : 'border-[#e8dfcf] bg-[#fdfbf6] text-[#17362f] hover:bg-[#f6efe4]'
            }`}
          >
            {isPreviewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{isPreviewMode ? 'Exit Preview' : 'Live Preview'}</span>
          </button>
        </div>

        {/* 2-Column Editor Grid */}
        <div className="editor-grid mt-4">
          <CanvasStage
            campaign={campaign}
            photoConfig={photoConfig}
            nameConfig={nameConfig}
            activeLayer={activeLayer}
            onSelectLayer={onSelectLayer}
            onUpdateCampaignGeometry={onUpdateCampaignGeometry}
            onUpdatePhotoGeometry={onUpdatePhotoGeometry}
            onUpdateNameGeometry={onUpdateNameGeometry}
            onArtworkUpload={onArtworkUpload}
            isPreviewMode={isPreviewMode}
            uploadingArtwork={uploadingArtwork}
          />

          <EditorSidebar
            campaign={campaign}
            photoConfig={photoConfig}
            nameConfig={nameConfig}
            activeLayer={activeLayer}
            onSelectLayer={onSelectLayer}
            onAddPhotoArea={onAddPhotoArea}
            onRemovePhotoArea={onRemovePhotoArea}
            onAddNameArea={onAddNameArea}
            onRemoveNameArea={onRemoveNameArea}
            onUpdateCampaignGeometry={onUpdateCampaignGeometry}
            onUpdatePhotoGeometry={onUpdatePhotoGeometry}
            onUpdateNameGeometry={onUpdateNameGeometry}
            onArtworkUpload={onArtworkUpload}
            uploadingArtwork={uploadingArtwork}
          />
        </div>

        {/* Save Campaign Button & Feedback */}
        <div className="mt-7">
          <button
            type="submit"
            disabled={saving || !campaign.campaign_image_url}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-4 px-6 text-sm font-extrabold text-white shadow-lg transition-all active:scale-[0.99] ${
              !campaign.campaign_image_url
                ? 'bg-gray-400 cursor-not-allowed opacity-80'
                : 'bg-[#1f4a3f] hover:bg-[#163b32]'
            }`}
          >
            {saving ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Persisting Composition to Database...</span>
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>
                  {campaign.campaign_image_url
                    ? 'Save Campaign Composition'
                    : 'Upload Artwork Before Saving'}
                </span>
              </>
            )}
          </button>

          {saveMessage && (
            <div
              className={`mt-3 flex items-center justify-center gap-2 rounded-xl p-3 text-xs sm:text-sm font-bold ${
                saveMessage.type === 'error'
                  ? 'bg-[#faece5] text-[#be6c45]'
                  : 'bg-[#eaf2ed] text-[#33714e]'
              }`}
            >
              {saveMessage.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <span>{saveMessage.text}</span>
            </div>
          )}
        </div>
      </form>
    </section>
  );
}
