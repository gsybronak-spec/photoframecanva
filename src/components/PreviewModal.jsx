import React from 'react';
import { X, Copy, ExternalLink, UserRound, Sparkles } from 'lucide-react';

export default function PreviewModal({ campaign, photoConfig, nameConfig, onClose, onToast }) {
  if (!campaign) return null;

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}/campaign/${campaign.slug}`;
    navigator.clipboard.writeText(fullUrl);
    onToast(`Copied public link: ${fullUrl}`);
  };

  const campGeo = {
    x: campaign.campaign_x ?? 0,
    y: campaign.campaign_y ?? 0,
    w: campaign.campaign_width ?? 100,
    h: campaign.campaign_height ?? 100,
    rot: campaign.campaign_rotation ?? 0,
  };

  const photoGeo = {
    x: photoConfig?.x ?? 32,
    y: photoConfig?.y ?? 42,
    w: photoConfig?.width ?? 35,
    h: photoConfig?.height ?? 28,
    rot: photoConfig?.rotation ?? 0,
  };

  const nameGeo = {
    x: nameConfig?.x ?? 18,
    y: nameConfig?.y ?? 78,
    w: nameConfig?.width ?? 64,
    h: nameConfig?.height ?? 10,
    rot: nameConfig?.rotation ?? 0,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-[28px] border border-[#e8dfcf] bg-white p-5 sm:p-7 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#e8dfcf] pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#79987e]">
              FINAL COMPOSITION PREVIEW
            </span>
            <h3 className="brand-serif text-xl sm:text-2xl font-bold text-[#17362f]">
              {campaign.name}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview Stage (Clean Frame without Handles) */}
        <div className="mt-5 flex justify-center">
          <div className="relative w-full max-w-sm aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e1d1] checker shadow-inner">
            {/* Layer 1: Base Artwork */}
            {campaign.campaign_image_url ? (
              <div
                style={{
                  position: 'absolute',
                  left: `${campGeo.x}%`,
                  top: `${campGeo.y}%`,
                  width: `${campGeo.w}%`,
                  height: `${campGeo.h}%`,
                  transform: `rotate(${campGeo.rot}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                <img
                  src={campaign.campaign_image_url}
                  alt={campaign.name}
                  className="w-full h-full object-fill pointer-events-none"
                />
              </div>
            ) : (
              <div className="grid h-full place-items-center text-xs text-gray-500">
                No artwork uploaded
              </div>
            )}

            {/* Layer 2: Photo Area Mask */}
            {photoConfig?.enabled && (
              <div
                style={{
                  position: 'absolute',
                  left: `${photoGeo.x}%`,
                  top: `${photoGeo.y}%`,
                  width: `${photoGeo.w}%`,
                  height: `${photoGeo.h}%`,
                  transform: `rotate(${photoGeo.rot}deg)`,
                  transformOrigin: 'center center',
                }}
              >
                <div
                  className={`photo-placeholder ${
                    photoConfig.shape === 'Circle' ? 'circle' : 'square'
                  }`}
                  style={{
                    borderColor: 'rgba(255, 255, 255, 0.7)',
                    backgroundColor: 'rgba(255, 253, 247, 0.22)',
                  }}
                >
                  <UserRound className="h-8 w-8 text-white/90 drop-shadow" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white drop-shadow">
                    User Photo
                  </span>
                </div>
              </div>
            )}

            {/* Layer 3: Name Area */}
            {nameConfig?.enabled && (
              <div
                style={{
                  position: 'absolute',
                  left: `${nameGeo.x}%`,
                  top: `${nameGeo.y}%`,
                  width: `${nameGeo.w}%`,
                  height: `${nameGeo.h}%`,
                  transform: `rotate(${nameGeo.rot}deg)`,
                  transformOrigin: 'center center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent:
                    nameConfig.alignment === 'left'
                      ? 'flex-start'
                      : nameConfig.alignment === 'right'
                      ? 'flex-end'
                      : 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: `"${nameConfig.font_family || 'DM Sans'}", sans-serif`,
                    fontSize: `${nameConfig.font_size || 26}px`,
                    fontWeight: nameConfig.font_weight === 'bold' ? '700' : '400',
                    color: nameConfig.font_color || '#fff8e9',
                    letterSpacing: `${nameConfig.letter_spacing ?? 1}px`,
                    textAlign: nameConfig.alignment || 'center',
                    textShadow: '0 2px 8px rgba(0, 0, 0, 0.6)',
                  }}
                >
                  YOUR NAME
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Public URL Box */}
        <div className="mt-5 rounded-2xl border border-[#e8dfcf] bg-[#faf6ed] p-3.5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#52665e]">
              Dedicated Public Campaign Link
            </p>
            <p className="truncate font-mono text-xs font-bold text-[#1f4a3f]">
              /campaign/{campaign.slug}
            </p>
          </div>

          <button
            onClick={handleCopyLink}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1f4a3f] px-3 py-2 text-xs font-bold text-white hover:bg-[#16382f] transition-all"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Link</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-[#e5dccd] bg-white py-2.5 text-xs font-bold text-[#17362f] hover:bg-[#f6efe4] transition-colors"
        >
          Close Preview
        </button>
      </div>
    </div>
  );
}
