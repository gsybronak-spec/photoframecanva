import React, { useRef, useState } from 'react';
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
  Lock,
  ChevronDown,
  ChevronUp,
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

// =============================================================
// SUB-COMPONENT: Artwork Section (Permanently Locked Base Frame)
// =============================================================
export function ArtworkSection({
  campaign,
  onArtworkUpload,
  uploadingArtwork,
  isCollapsible = false,
  defaultOpen = true,
}) {
  const replaceInputRef = useRef(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const canvasW = Number(campaign.canvas_width) || 1080;
  const canvasH = Number(campaign.canvas_height) || 1350;

  const handleReplaceFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onArtworkUpload(file);
    }
    e.target.value = '';
  };

  return (
    <div className="rounded-2xl border border-[#e8dfcf] bg-white p-4 sm:p-5 shadow-sm">
      <div
        className={`flex items-center justify-between ${isCollapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={() => isCollapsible && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#eaf2ed] text-[#1f4a3f]">
            <ImageIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17362f] flex items-center gap-1.5">
              <span>Campaign Artwork</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf2ed] border border-[#c4dcce] px-2 py-0.5 text-[9px] font-bold text-[#1f4a3f]">
                <Lock className="h-2.5 w-2.5" />
                Locked
              </span>
            </h3>
            <p className="text-[11px] text-[#52665e]">Base frame • Fixed position and size</p>
          </div>
        </div>

        {isCollapsible && (
          <button type="button" className="text-[#79987e] p-1">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {(!isCollapsible || isOpen) && (
        <div className="mt-3.5 space-y-3 pt-2 border-t border-[#e8dfcf]/60">
          {campaign.campaign_image_url ? (
            <div className="flex items-center gap-3 rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-[#e8dfcf] bg-white checker grid place-items-center">
                <img
                  src={campaign.campaign_image_url}
                  alt="Base Artwork Frame"
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#17362f] flex items-center gap-1">
                  <span>🔒 Artwork Locked</span>
                </p>
                <div className="mt-1 space-y-0.5 text-[11px] font-mono text-[#52665e]">
                  <p>Position: Fixed (0, 0)</p>
                  <p>Size: {canvasW} × {canvasH} px</p>
                  <p>Rotation: 0°</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-[#bda980] bg-[#faf6ed] p-4 text-center">
              <p className="text-xs font-semibold text-[#52665e]">
                No artwork uploaded yet. Click below to select frame image.
              </p>
            </div>
          )}

          {/* Replace / Upload Artwork Button */}
          <div>
            <button
              type="button"
              onClick={() => replaceInputRef.current?.click()}
              disabled={uploadingArtwork}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#bda980] bg-[#fdfbf6] py-2.5 px-4 text-xs sm:text-sm font-bold text-[#17362f] hover:bg-[#f6eee2] transition-colors shadow-sm active:scale-[0.99]"
            >
              <UploadCloud className="h-4 w-4 text-[#db9b35]" />
              <span>
                {uploadingArtwork
                  ? 'Uploading artwork...'
                  : campaign.campaign_image_url
                  ? 'Replace Campaign Artwork'
                  : 'Upload Campaign Artwork'}
              </span>
            </button>
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleReplaceFile}
            />
            <p className="mt-1 text-center text-[10px] text-[#79987e]">
              Fits canvas preserving aspect ratio. Artwork layer is fixed and non-draggable.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// SUB-COMPONENT: Photo Area Section (Interactive Mask)
// =============================================================
export function PhotoAreaSection({
  photoConfig,
  onAddPhotoArea,
  onRemovePhotoArea,
  onUpdatePhotoGeometry,
  isCollapsible = false,
  defaultOpen = true,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!photoConfig?.enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e8dfcf] bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#eaf2ed] text-[#417264]">
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17362f]">
                Photo Area
              </h3>
              <p className="text-[11px] text-[#52665e]">User photo placement placeholder</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAddPhotoArea}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#db9b35] bg-[#faf6ed] hover:bg-[#f4ebe0] text-[#17362f] px-3.5 py-2 text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5 text-[#db9b35]" />
            <span>+ Add Photo Area</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#c4dcce] bg-white p-4 sm:p-5 shadow-sm">
      <div
        className={`flex items-center justify-between ${isCollapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={() => isCollapsible && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#eaf2ed] text-[#1f4a3f]">
            <UserRound className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17362f] flex items-center gap-1.5">
              <span>Photo Area</span>
              <span className="inline-flex items-center rounded-full bg-[#eaf2ed] border border-[#c4dcce] px-2 py-0.5 text-[9px] font-bold text-[#1f4a3f]">
                {photoConfig.shape || 'Square'} • Editable
              </span>
            </h3>
            <p className="text-[11px] text-[#52665e]">Adjust shape, size, rotation, and position</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onRemovePhotoArea}
            title="Remove Photo Area"
            className="flex min-h-[36px] items-center gap-1 rounded-lg border border-[#e8dfcf] px-2.5 py-1 text-[11px] font-bold text-[#be6c45] hover:bg-[#fbeeed] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </button>

          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="text-[#79987e] p-1.5"
            >
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {(!isCollapsible || isOpen) && (
        <div className="mt-3.5 space-y-3.5 pt-3 border-t border-[#e8dfcf]/60">
          {/* Shape Selector: Circle / Square */}
          <div>
            <label className="control-label mb-1.5">Photo Shape</label>
            <div className="grid grid-cols-2 rounded-xl bg-[#f2eee6] p-1 gap-1">
              <button
                type="button"
                onClick={() => onUpdatePhotoGeometry({ shape: 'Square' })}
                className={`min-h-[40px] rounded-lg py-2 text-xs font-bold transition-all ${
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
                className={`min-h-[40px] rounded-lg py-2 text-xs font-bold transition-all ${
                  photoConfig.shape === 'Circle'
                    ? 'bg-white text-[#17362f] shadow-sm'
                    : 'text-[#6b7c74] hover:text-[#17362f]'
                }`}
              >
                Circle
              </button>
            </div>
          </div>

          {/* 2-Column Compact Numeric Geometry Controls */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <label className="control-label">
              X Position (%)
              <input
                type="number"
                step="0.5"
                className="number-field min-h-[44px] text-base sm:text-sm font-mono font-bold"
                value={Math.round((photoConfig.x ?? 30) * 10) / 10}
                onChange={(e) =>
                  onUpdatePhotoGeometry({ x: parseFloat(e.target.value) || 0 })
                }
              />
            </label>

            <label className="control-label">
              Y Position (%)
              <input
                type="number"
                step="0.5"
                className="number-field min-h-[44px] text-base sm:text-sm font-mono font-bold"
                value={Math.round((photoConfig.y ?? 35) * 10) / 10}
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
                className="number-field min-h-[44px] text-base sm:text-sm font-mono font-bold"
                value={Math.round((photoConfig.width ?? 40) * 10) / 10}
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
                className="number-field min-h-[44px] text-base sm:text-sm font-mono font-bold"
                value={Math.round((photoConfig.height ?? 30) * 10) / 10}
                onChange={(e) =>
                  onUpdatePhotoGeometry({ height: Math.max(5, parseFloat(e.target.value) || 10) })
                }
              />
            </label>
          </div>

          {/* Rotation Control */}
          <div>
            <div className="flex items-center justify-between">
              <label className="control-label">Rotation</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#1f4a3f]">
                  {photoConfig.rotation ?? 0}°
                </span>
                {Number(photoConfig.rotation) !== 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdatePhotoGeometry({ rotation: 0 })}
                    className="text-[10px] font-bold text-[#be6c45] hover:underline"
                  >
                    Reset 0°
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={photoConfig.rotation ?? 0}
              onChange={(e) =>
                onUpdatePhotoGeometry({ rotation: parseInt(e.target.value, 10) || 0 })
              }
              className="range mt-2 min-h-[36px]"
            />
          </div>

          <p className="text-[11px] text-[#52665e] bg-[#faf6ed] p-2.5 rounded-xl border border-[#e8dfcf]">
            User's photo will appear behind the transparent campaign frame inside this designated area.
          </p>
        </div>
      )}
    </div>
  );
}

// =============================================================
// SUB-COMPONENT: Name Area Section (Interactive Typography)
// =============================================================
export function NameAreaSection({
  nameConfig,
  onAddNameArea,
  onRemoveNameArea,
  onUpdateNameGeometry,
  isCollapsible = false,
  defaultOpen = true,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!nameConfig?.enabled) {
    return (
      <div className="rounded-2xl border border-dashed border-[#e8dfcf] bg-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#faece5] text-[#be6c45]">
              <Type className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#17362f]">
                Name Area
              </h3>
              <p className="text-[11px] text-[#52665e]">Participant name typography overlay</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAddNameArea}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#db9b35] bg-[#faf6ed] hover:bg-[#f4ebe0] text-[#17362f] px-3.5 py-2 text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            <Plus className="h-3.5 w-3.5 text-[#db9b35]" />
            <span>+ Add Name Area</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#f5c75a]/70 bg-white p-4 sm:p-5 shadow-sm">
      <div
        className={`flex items-center justify-between ${isCollapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={() => isCollapsible && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-[#fdf5e7] text-[#db9b35]">
            <Type className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17362f] flex items-center gap-1.5">
              <span>Name Area</span>
              <span className="inline-flex items-center rounded-full bg-[#fdf5e7] border border-[#f5c75a]/60 px-2 py-0.5 text-[9px] font-bold text-[#935e20]">
                Typography • Editable
              </span>
            </h3>
            <p className="text-[11px] text-[#52665e]">Font, style, size, color, and positioning</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onRemoveNameArea}
            title="Remove Name Area"
            className="flex min-h-[36px] items-center gap-1 rounded-lg border border-[#e8dfcf] px-2.5 py-1 text-[11px] font-bold text-[#be6c45] hover:bg-[#fbeeed] transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </button>

          {isCollapsible && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="text-[#79987e] p-1.5"
            >
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {(!isCollapsible || isOpen) && (
        <div className="mt-3.5 space-y-3.5 pt-3 border-t border-[#e8dfcf]/60">
          {/* Font Family */}
          <div>
            <label className="control-label">Font Family</label>
            <select
              className="editor-select min-h-[44px] text-base sm:text-sm"
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

          {/* 2-Column: Font Size & Letter Spacing */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <label className="control-label">
              Font Size (px)
              <input
                type="number"
                min="12"
                max="96"
                className="number-field min-h-[44px] text-base sm:text-sm font-mono font-bold"
                value={nameConfig.font_size || 26}
                onChange={(e) =>
                  onUpdateNameGeometry({ font_size: parseInt(e.target.value, 10) || 26 })
                }
              />
            </label>

            <label className="control-label">
              Letter Spacing (px)
              <input
                type="number"
                min="-2"
                max="16"
                className="number-field min-h-[44px] text-base sm:text-sm font-mono font-bold"
                value={nameConfig.letter_spacing ?? 1}
                onChange={(e) =>
                  onUpdateNameGeometry({ letter_spacing: parseInt(e.target.value, 10) || 0 })
                }
              />
            </label>
          </div>

          {/* Color & Alignment */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <label className="control-label">
              Color
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="color"
                  value={nameConfig.font_color || '#fff8e9'}
                  onChange={(e) => onUpdateNameGeometry({ font_color: e.target.value })}
                  className="h-11 w-12 cursor-pointer rounded-lg border border-[#e5dccd] bg-[#fdfbf6] p-1 shrink-0"
                />
                <input
                  type="text"
                  value={nameConfig.font_color || '#fff8e9'}
                  onChange={(e) => onUpdateNameGeometry({ font_color: e.target.value })}
                  className="number-field !mt-0 min-h-[44px] flex-1 font-mono text-xs uppercase"
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
                  className={`flex-1 min-h-[36px] grid place-items-center rounded-lg text-xs transition-colors ${
                    nameConfig.alignment === 'left' ? 'bg-[#1f4a3f] text-white shadow-sm' : 'text-[#52665e]'
                  }`}
                >
                  <AlignLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Center align"
                  onClick={() => onUpdateNameGeometry({ alignment: 'center' })}
                  className={`flex-1 min-h-[36px] grid place-items-center rounded-lg text-xs transition-colors ${
                    nameConfig.alignment === 'center' ? 'bg-[#1f4a3f] text-white shadow-sm' : 'text-[#52665e]'
                  }`}
                >
                  <AlignCenter className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Right align"
                  onClick={() => onUpdateNameGeometry({ alignment: 'right' })}
                  className={`flex-1 min-h-[36px] grid place-items-center rounded-lg text-xs transition-colors ${
                    nameConfig.alignment === 'right' ? 'bg-[#1f4a3f] text-white shadow-sm' : 'text-[#52665e]'
                  }`}
                >
                  <AlignRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Weight Toggle */}
          <div>
            <label className="control-label">Font Weight</label>
            <div className="mt-1 grid grid-cols-2 rounded-xl bg-[#f2eee6] p-1 gap-1">
              <button
                type="button"
                onClick={() => onUpdateNameGeometry({ font_weight: 'normal' })}
                className={`min-h-[40px] rounded-lg py-2 text-xs font-bold transition-all ${
                  nameConfig.font_weight !== 'bold'
                    ? 'bg-white text-[#17362f] shadow-sm'
                    : 'text-[#6b7c74] hover:text-[#17362f]'
                }`}
              >
                Regular (400)
              </button>
              <button
                type="button"
                onClick={() => onUpdateNameGeometry({ font_weight: 'bold' })}
                className={`min-h-[40px] rounded-lg py-2 text-xs font-bold transition-all ${
                  nameConfig.font_weight === 'bold'
                    ? 'bg-[#1f4a3f] text-white shadow-sm'
                    : 'text-[#6b7c74] hover:text-[#17362f]'
                }`}
              >
                Bold (700)
              </button>
            </div>
          </div>

          {/* 2-Column Geometry Inputs */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            <label className="control-label">
              X Position (%)
              <input
                type="number"
                step="0.5"
                className="number-field min-h-[44px] text-base sm:text-sm font-mono font-bold"
                value={Math.round((nameConfig.x ?? 20) * 10) / 10}
                onChange={(e) =>
                  onUpdateNameGeometry({ x: parseFloat(e.target.value) || 0 })
                }
              />
            </label>

            <label className="control-label">
              Y Position (%)
              <input
                type="number"
                step="0.5"
                className="number-field min-h-[44px] text-base sm:text-sm font-mono font-bold"
                value={Math.round((nameConfig.y ?? 75) * 10) / 10}
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
                className="number-field min-h-[44px] text-base sm:text-sm font-mono font-bold"
                value={Math.round((nameConfig.width ?? 60) * 10) / 10}
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
                className="number-field min-h-[44px] text-base sm:text-sm font-mono font-bold"
                value={Math.round((nameConfig.height ?? 10) * 10) / 10}
                onChange={(e) =>
                  onUpdateNameGeometry({ height: Math.max(3, parseFloat(e.target.value) || 5) })
                }
              />
            </label>
          </div>

          {/* Rotation Control */}
          <div>
            <div className="flex items-center justify-between">
              <label className="control-label">Rotation</label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#1f4a3f]">
                  {nameConfig.rotation ?? 0}°
                </span>
                {Number(nameConfig.rotation) !== 0 && (
                  <button
                    type="button"
                    onClick={() => onUpdateNameGeometry({ rotation: 0 })}
                    className="text-[10px] font-bold text-[#be6c45] hover:underline"
                  >
                    Reset 0°
                  </button>
                )}
              </div>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={nameConfig.rotation ?? 0}
              onChange={(e) =>
                onUpdateNameGeometry({ rotation: parseInt(e.target.value, 10) || 0 })
              }
              className="range mt-2 min-h-[36px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================
// MAIN DEFAULT EXPORT: EditorSidebar (for Desktop Studio layout)
// =============================================================
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
  onUpdatePhotoGeometry,
  onUpdateNameGeometry,
  onArtworkUpload,
  uploadingArtwork,
}) {
  return (
    <aside className="space-y-4">
      {/* 1. Artwork Section (Locked) */}
      <ArtworkSection
        campaign={campaign}
        onArtworkUpload={onArtworkUpload}
        uploadingArtwork={uploadingArtwork}
      />

      {/* 2. Photo Area Section */}
      <PhotoAreaSection
        photoConfig={photoConfig}
        onAddPhotoArea={onAddPhotoArea}
        onRemovePhotoArea={onRemovePhotoArea}
        onUpdatePhotoGeometry={onUpdatePhotoGeometry}
      />

      {/* 3. Name Area Section */}
      <NameAreaSection
        nameConfig={nameConfig}
        onAddNameArea={onAddNameArea}
        onRemoveNameArea={onRemoveNameArea}
        onUpdateNameGeometry={onUpdateNameGeometry}
      />
    </aside>
  );
}
