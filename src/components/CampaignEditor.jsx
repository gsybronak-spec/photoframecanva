import React, { useState } from 'react';
import { Eye, EyeOff, Save, RefreshCw, Link as LinkIcon, AlertCircle, CheckCircle } from 'lucide-react';
import CanvasStage from './CanvasStage';
import EditorSidebar from './EditorSidebar';

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
