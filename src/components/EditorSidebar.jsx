import React, { useRef } from 'react';
import {
  Image as ImageIcon,
  UserRound,
  Type,
  Plus,
  Trash2,
  RotateCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  UploadCloud,
} from 'lucide-react';

const GOOGLE_FONTS = [
  'DM Sans',
  'Playfair Display',
  'Space Mono',
  'Plus Jakarta Sans',
  'Inter',
  'Lora',
  'Montserrat',
  'Cinzel',
];

export default function EditorSidebar({
  campaign,
  photoConfig,
  nameConfig,
  activeLayer,
  onSelectLayer,
  onAddPhotoArea,
  onRemovePhotoArea,
  onAddNameArea,
  onRemoveNameArea,
  onUpdateCampaignGeometry,
  onUpdatePhotoGeometry,
  onUpdateNameGeometry,
  onArtworkUpload,
  uploadingArtwork,
}) {
  const replaceInputRef = useRef(null);

  const handleReplaceFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onArtworkUpload(file);
    }
  };

  return (
    <aside className="rounded-2xl border border-[#e8dfcf] bg-white p-4 sm:p-5 shadow-sm">
      {/* 1. LAYER SYSTEM (Requirement 10) */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-[#52665e]">
            Layers Hierarchy
          </p>
          <span className="text-[10px] text-[#79987e] font-semibold">
            {1 + (photoConfig?.enabled ? 1 : 0) + (nameConfig?.enabled ? 1 : 0)} Active
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {/* Layer 1: Campaign Artwork (Always Base) */}
          <button
            type="button"
            onClick={() => onSelectLayer('campaign')}
            className={`layer-row flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-bold border ${
              activeLayer === 'campaign'
                ? 'active border-[#1f4a3f]'
                : 'border-[#e8dfcf] bg-[#fdfbf6] text-[#17362f] hover:bg-[#f6efe4]'
            }`}
          >
            <span className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              <span>Base Artwork</span>
            </span>
            <span className="layer-meta text-[10px] font-mono opacity-80 uppercase">
              Layer 1
            </span>
          </button>

          {/* Layer 2: Photo Area (If added) */}
          {photoConfig?.enabled && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSelectLayer('photo')}
                className={`layer-row flex flex-1 items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-bold border ${
                  activeLayer === 'photo'
                    ? 'active border-[#1f4a3f]'
                    : 'border-[#e8dfcf] bg-[#fdfbf6] text-[#17362f] hover:bg-[#f6efe4]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <UserRound className="h-4 w-4" />
                  <span>Photo Area ({photoConfig.shape})</span>
                </span>
                <span className="layer-meta text-[10px] font-mono opacity-80 uppercase">
                  Layer 2
                </span>
              </button>
              <button
                type="button"
                onClick={onRemovePhotoArea}
                title="Remove Photo Area"
                className="grid h-9 w-9 place-items-center rounded-xl border border-[#e8dfcf] text-[#be6c45] hover:bg-[#fbeeed] transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Layer 3: Name Area (If added) */}
          {nameConfig?.enabled && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onSelectLayer('name')}
                className={`layer-row flex flex-1 items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-xs font-bold border ${
                  activeLayer === 'name'
                    ? 'active border-[#1f4a3f]'
                    : 'border-[#e8dfcf] bg-[#fdfbf6] text-[#17362f] hover:bg-[#f6efe4]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  <span>Name Area</span>
                </span>
                <span className="layer-meta text-[10px] font-mono opacity-80 uppercase">
                  Layer 3
                </span>
              </button>
              <button
                type="button"
                onClick={onRemoveNameArea}
                title="Remove Name Area"
                className="grid h-9 w-9 place-items-center rounded-xl border border-[#e8dfcf] text-[#be6c45] hover:bg-[#fbeeed] transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. ADD LAYER BUTTONS (Created ONLY on demand) */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAddPhotoArea}
          disabled={photoConfig?.enabled}
          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-3 text-xs font-bold transition-all ${
            photoConfig?.enabled
              ? 'opacity-40 border-[#e8dfcf] bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-[#e5dccd] bg-[#fdfbf6] text-[#17362f] hover:bg-[#f4ebe0] hover:border-[#db9b35]'
          }`}
        >
          <Plus className="h-3.5 w-3.5 text-[#db9b35]" />
          <span>Add Photo Area</span>
        </button>

        <button
          type="button"
          onClick={onAddNameArea}
          disabled={nameConfig?.enabled}
          className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-3 text-xs font-bold transition-all ${
            nameConfig?.enabled
              ? 'opacity-40 border-[#e8dfcf] bg-gray-50 text-gray-400 cursor-not-allowed'
              : 'border-[#e5dccd] bg-[#fdfbf6] text-[#17362f] hover:bg-[#f4ebe0] hover:border-[#db9b35]'
          }`}
        >
          <Plus className="h-3.5 w-3.5 text-[#db9b35]" />
          <span>Add Name</span>
        </button>
      </div>

      <hr className="my-5 border-[#e8dfcf]" />

      {/* 3. CONTEXTUAL LAYER CONTROLS */}
      {/* ----------------- A. Artwork Controls ----------------- */}
      {activeLayer === 'campaign' && (
        <div id="campaign-controls" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17362f]">
              Artwork Geometry & Transform
            </h3>
            <span className="text-[10px] text-[#79987e] font-mono">Layer 1</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label className="control-label">
              X Position (%)
              <input
                type="number"
                step="0.5"
                className="number-field"
                value={Math.round((campaign.campaign_x ?? 0) * 10) / 10}
                onChange={(e) =>
                  onUpdateCampaignGeometry({ campaign_x: parseFloat(e.target.value) || 0 })
                }
              />
            </label>

            <label className="control-label">
              Y Position (%)
              <input
                type="number"
                step="0.5"
                className="number-field"
                value={Math.round((campaign.campaign_y ?? 0) * 10) / 10}
                onChange={(e) =>
                  onUpdateCampaignGeometry({ campaign_y: parseFloat(e.target.value) || 0 })
                }
              />
            </label>

            <label className="control-label">
              Width (%)
              <input
                type="number"
                step="0.5"
                min="5"
                className="number-field"
                value={Math.round((campaign.campaign_width ?? 100) * 10) / 10}
                onChange={(e) =>
                  onUpdateCampaignGeometry({
                    campaign_width: Math.max(5, parseFloat(e.target.value) || 10),
                  })
                }
              />
            </label>

            <label className="control-label">
              Height (%)
              <input
                type="number"
                step="0.5"
                min="5"
                className="number-field"
                value={Math.round((campaign.campaign_height ?? 100) * 10) / 10}
                onChange={(e) =>
                  onUpdateCampaignGeometry({
                    campaign_height: Math.max(5, parseFloat(e.target.value) || 10),
                  })
                }
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="control-label">Rotation</label>
              <span className="text-xs font-mono font-bold text-[#1f4a3f]">
                {campaign.campaign_rotation ?? 0}°
              </span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={campaign.campaign_rotation ?? 0}
              onChange={(e) =>
                onUpdateCampaignGeometry({ campaign_rotation: parseInt(e.target.value, 10) || 0 })
              }
              className="range mt-2"
            />
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => replaceInputRef.current?.click()}
              disabled={uploadingArtwork}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#bda980] bg-[#fdfbf6] py-2.5 px-3 text-xs font-bold text-[#17362f] hover:bg-[#f6eee2] transition-colors"
            >
              <UploadCloud className="h-4 w-4 text-[#db9b35]" />
              <span>{uploadingArtwork ? 'Uploading...' : 'Replace Campaign Artwork'}</span>
            </button>
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleReplaceFile}
            />
          </div>
        </div>
      )}

      {/* ----------------- B. Photo Area Controls ----------------- */}
      {activeLayer === 'photo' && photoConfig?.enabled && (
        <div id="photo-controls" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17362f]">
              Photo Area Settings
            </h3>
            <span className="text-[10px] text-[#79987e] font-mono">Layer 2</span>
          </div>

          {/* Shape Selector: Circle / Square */}
          <div>
            <label className="control-label mb-1.5">Photo Shape</label>
            <div className="grid grid-cols-2 rounded-xl bg-[#f2eee6] p-1 gap-1">
              <button
                type="button"
                onClick={() => onUpdatePhotoGeometry({ shape: 'Square' })}
                className={`rounded-lg py-2 text-xs font-bold transition-all ${
                  photoConfig.shape === 'Square'
                    ? 'bg-white text-[#17362f] shadow-sm'
                    : 'text-[#6b7c74] hover:text-[#17362f]'
                }`}
              >
                Square
              </button>
              <button
                type="button"
                onClick={() => onUpdatePhotoGeometry({ shape: 'Circle' })}
                className={`rounded-lg py-2 text-xs font-bold transition-all ${
                  photoConfig.shape === 'Circle'
                    ? 'bg-white text-[#17362f] shadow-sm'
                    : 'text-[#6b7c74] hover:text-[#17362f]'
                }`}
              >
                Circle
              </button>
            </div>
          </div>

          {/* Geometry Inputs */}
          <div className="grid grid-cols-2 gap-2.5">
            <label className="control-label">
              X (%)
              <input
                type="number"
                step="0.5"
                className="number-field"
                value={Math.round((photoConfig.x ?? 32) * 10) / 10}
                onChange={(e) =>
                  onUpdatePhotoGeometry({ x: parseFloat(e.target.value) || 0 })
                }
              />
            </label>

            <label className="control-label">
              Y (%)
              <input
                type="number"
                step="0.5"
                className="number-field"
                value={Math.round((photoConfig.y ?? 42) * 10) / 10}
                onChange={(e) =>
                  onUpdatePhotoGeometry({ y: parseFloat(e.target.value) || 0 })
                }
              />
            </label>

            <label className="control-label">
              Width (%)
              <input
                type="number"
                step="0.5"
                min="5"
                className="number-field"
                value={Math.round((photoConfig.width ?? 35) * 10) / 10}
                onChange={(e) =>
                  onUpdatePhotoGeometry({ width: Math.max(5, parseFloat(e.target.value) || 10) })
                }
              />
            </label>

            <label className="control-label">
              Height (%)
              <input
                type="number"
                step="0.5"
                min="5"
                className="number-field"
                value={Math.round((photoConfig.height ?? 28) * 10) / 10}
                onChange={(e) =>
                  onUpdatePhotoGeometry({ height: Math.max(5, parseFloat(e.target.value) || 10) })
                }
              />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="control-label">Rotation</label>
              <span className="text-xs font-mono font-bold text-[#1f4a3f]">
                {photoConfig.rotation ?? 0}°
              </span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={photoConfig.rotation ?? 0}
              onChange={(e) =>
                onUpdatePhotoGeometry({ rotation: parseInt(e.target.value, 10) || 0 })
              }
              className="range mt-2"
            />
          </div>

          <p className="text-[11px] leading-5 text-[#6c7d75] bg-[#faf6ed] p-2.5 rounded-xl border border-[#e8dfcf]">
            This area serves as a placeholder mask. During frame generation on the user side, the user's photo will be centered and masked into this region.
          </p>
        </div>
      )}

      {/* ----------------- C. Name Area Controls ----------------- */}
      {activeLayer === 'name' && nameConfig?.enabled && (
        <div id="name-controls" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17362f]">
              Name Typography & Position
            </h3>
            <span className="text-[10px] text-[#79987e] font-mono">Layer 3</span>
          </div>

          {/* Font Family */}
          <div>
            <label className="control-label">Font Family</label>
            <select
              className="editor-select"
              value={nameConfig.font_family || 'DM Sans'}
              onChange={(e) => onUpdateNameGeometry({ font_family: e.target.value })}
            >
              {GOOGLE_FONTS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          {/* Geometry Inputs */}
          <div className="grid grid-cols-2 gap-2.5">
            <label className="control-label">
              X (%)
              <input
                type="number"
                step="0.5"
                className="number-field"
                value={Math.round((nameConfig.x ?? 18) * 10) / 10}
                onChange={(e) =>
                  onUpdateNameGeometry({ x: parseFloat(e.target.value) || 0 })
                }
              />
            </label>

            <label className="control-label">
              Y (%)
              <input
                type="number"
                step="0.5"
                className="number-field"
                value={Math.round((nameConfig.y ?? 78) * 10) / 10}
                onChange={(e) =>
                  onUpdateNameGeometry({ y: parseFloat(e.target.value) || 0 })
                }
              />
            </label>

            <label className="control-label">
              Width (%)
              <input
                type="number"
                step="0.5"
                min="5"
                className="number-field"
                value={Math.round((nameConfig.width ?? 64) * 10) / 10}
                onChange={(e) =>
                  onUpdateNameGeometry({ width: Math.max(5, parseFloat(e.target.value) || 10) })
                }
              />
            </label>

            <label className="control-label">
              Height (%)
              <input
                type="number"
                step="0.5"
                min="3"
                className="number-field"
                value={Math.round((nameConfig.height ?? 10) * 10) / 10}
                onChange={(e) =>
                  onUpdateNameGeometry({ height: Math.max(3, parseFloat(e.target.value) || 5) })
                }
              />
            </label>
          </div>

          {/* Font Color & Alignment */}
          <div className="grid grid-cols-2 gap-2.5">
            <label className="control-label">
              Color
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="color"
                  value={nameConfig.font_color || '#fff8e9'}
                  onChange={(e) => onUpdateNameGeometry({ font_color: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-[#e5dccd] bg-[#fdfbf6] p-1"
                />
                <input
                  type="text"
                  value={nameConfig.font_color || '#fff8e9'}
                  onChange={(e) => onUpdateNameGeometry({ font_color: e.target.value })}
                  className="number-field !mt-0 flex-1 font-mono text-xs uppercase"
                />
              </div>
            </label>

            <div>
              <label className="control-label">Alignment</label>
              <div className="mt-1 flex items-center rounded-xl border border-[#e5dccd] bg-[#fdfbf6] p-1">
                <button
                  type="button"
                  title="Left align"
                  onClick={() => onUpdateNameGeometry({ alignment: 'left' })}
                  className={`flex-1 grid place-items-center py-1.5 rounded-lg text-xs ${
                    nameConfig.alignment === 'left' ? 'bg-[#1f4a3f] text-white' : 'text-[#52665e]'
                  }`}
                >
                  <AlignLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Center align"
                  onClick={() => onUpdateNameGeometry({ alignment: 'center' })}
                  className={`flex-1 grid place-items-center py-1.5 rounded-lg text-xs ${
                    nameConfig.alignment === 'center' ? 'bg-[#1f4a3f] text-white' : 'text-[#52665e]'
                  }`}
                >
                  <AlignCenter className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Right align"
                  onClick={() => onUpdateNameGeometry({ alignment: 'right' })}
                  className={`flex-1 grid place-items-center py-1.5 rounded-lg text-xs ${
                    nameConfig.alignment === 'right' ? 'bg-[#1f4a3f] text-white' : 'text-[#52665e]'
                  }`}
                >
                  <AlignRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Weight & Letter Spacing */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="control-label">Font Weight</label>
              <button
                type="button"
                onClick={() =>
                  onUpdateNameGeometry({
                    font_weight: nameConfig.font_weight === 'bold' ? 'normal' : 'bold',
                  })
                }
                className={`mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                  nameConfig.font_weight === 'bold'
                    ? 'border-[#1f4a3f] bg-[#1f4a3f] text-white'
                    : 'border-[#e5dccd] bg-[#fdfbf6] text-[#17362f]'
                }`}
              >
                <Bold className="h-3.5 w-3.5" />
                <span>{nameConfig.font_weight === 'bold' ? 'Bold (700)' : 'Regular (400)'}</span>
              </button>
            </div>

            <label className="control-label">
              Letter Spacing (px)
              <input
                type="number"
                min="-2"
                max="16"
                className="number-field"
                value={nameConfig.letter_spacing ?? 1}
                onChange={(e) =>
                  onUpdateNameGeometry({ letter_spacing: parseInt(e.target.value, 10) || 0 })
                }
              />
            </label>
          </div>

          {/* Font Size Range */}
          <div>
            <div className="flex items-center justify-between">
              <label className="control-label">Font Size</label>
              <span className="text-xs font-mono font-bold text-[#1f4a3f]">
                {nameConfig.font_size || 26}px
              </span>
            </div>
            <input
              type="range"
              min="12"
              max="72"
              value={nameConfig.font_size || 26}
              onChange={(e) =>
                onUpdateNameGeometry({ font_size: parseInt(e.target.value, 10) || 26 })
              }
              className="range mt-2"
            />
          </div>
        </div>
      )}
    </aside>
  );
}
