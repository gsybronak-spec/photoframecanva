import React, { useRef, useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Check,
  RefreshCw,
} from 'lucide-react';
import { compositeFinalYogFrame } from './canvasRenderer';

export default function UserScreen2Adjust({
  campaign,
  photoConfig,
  nameConfig,
  userName,
  userPhotoUrl,
  onBack,
  onGenerateSuccess,
}) {
  const [photoPan, setPhotoPan] = useState({ x: 0, y: 0 }); // % pan inside mask
  const [photoZoom, setPhotoZoom] = useState(1); // 1.0 to 3.0
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');

  const maskRef = useRef(null);
  const interactionRef = useRef(null);
  const pinchRef = useRef(null);

  // Artwork Geometry from Admin
  const campGeo = {
    x: campaign.campaign_x ?? 0,
    y: campaign.campaign_y ?? 0,
    w: campaign.campaign_width ?? 100,
    h: campaign.campaign_height ?? 100,
    rot: campaign.campaign_rotation ?? 0,
  };

  // Photo Area Geometry from Admin
  const photoGeo = {
    x: photoConfig?.x ?? 32,
    y: photoConfig?.y ?? 42,
    w: photoConfig?.width ?? 35,
    h: photoConfig?.height ?? 28,
    rot: photoConfig?.rotation ?? 0,
    shape: photoConfig?.shape || 'Square',
  };

  // Name Area Geometry from Admin
  const nameGeo = {
    x: nameConfig?.x ?? 18,
    y: nameConfig?.y ?? 78,
    w: nameConfig?.width ?? 64,
    h: nameConfig?.height ?? 10,
    rot: nameConfig?.rotation ?? 0,
  };

  // Pointer drag inside photo mask
  const handlePointerDown = (e) => {
    if (e.pointerType === 'touch' && pinchRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const maskEl = maskRef.current;
    if (!maskEl) return;
    const rect = maskEl.getBoundingClientRect();

    interactionRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPan: { ...photoPan },
      maskW: rect.width,
      maskH: rect.height,
    };

    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!interactionRef.current) return;
    e.preventDefault();

    const { startX, startY, startPan, maskW, maskH } = interactionRef.current;
    const deltaX = ((e.clientX - startX) / maskW) * 100;
    const deltaY = ((e.clientY - startY) / maskH) * 100;

    // Constrain pan within reasonable boundaries (-80% to 80%)
    const maxPan = 80 * photoZoom;
    const newX = Math.max(-maxPan, Math.min(maxPan, startPan.x + deltaX));
    const newY = Math.max(-maxPan, Math.min(maxPan, startPan.y + deltaY));

    setPhotoPan({ x: Math.round(newX * 10) / 10, y: Math.round(newY * 10) / 10 });
  };

  const handlePointerUp = (e) => {
    if (interactionRef.current) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {}
      interactionRef.current = null;
    }
  };

  // Touch Pinch-to-Zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchRef.current = {
        startDist: dist,
        startZoom: photoZoom,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = currentDist / pinchRef.current.startDist;
      const newZoom = Math.min(3.5, Math.max(1, pinchRef.current.startZoom * ratio));
      setPhotoZoom(Math.round(newZoom * 100) / 100);
    }
  };

  const handleTouchEnd = () => {
    pinchRef.current = null;
  };

  // Reset Photo adjustment
  const handleReset = () => {
    setPhotoPan({ x: 0, y: 0 });
    setPhotoZoom(1);
  };

  // Generate Final Frame
  const handleGenerateFrame = async () => {
    setGenerating(true);
    setGenerationError('');

    try {
      // 1. Composite high-resolution image on client canvas (strictly in browser memory)
      const generatedDataUrl = await compositeFinalYogFrame({
        campaign,
        photoConfig,
        nameConfig,
        userName,
        userPhotoUrl,
        photoPan,
        photoZoom,
      });

      // Convert data URL to local memory Blob
      const blobRes = await fetch(generatedDataUrl);
      const blob = await blobRes.blob();
      const objectUrl = URL.createObjectURL(blob);

      // 2. Anonymous Campaign Metric Counter (Zero Personal Data Sent)
      fetch(`/api/campaigns/${campaign.id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventType: 'generate' }),
      }).catch((e) => console.warn('Anonymous event warning:', e));

      onGenerateSuccess({
        objectUrl,
        localDataUrl: generatedDataUrl,
      });
    } catch (err) {
      console.error('Frame generation failed:', err);
      setGenerationError(err.message || 'Generation failed. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-5 sm:py-7">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e8dfcf]">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#1f4a3f] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Details</span>
        </button>

        <span className="text-[10px] font-bold uppercase tracking-wider text-[#79987e]">
          Step 2 of 3
        </span>
      </div>

      <div className="mt-3 text-center">
        <h2 className="brand-serif text-xl sm:text-2xl font-bold text-[#17362f]">
          Adjust Your Photo
        </h2>
        <p className="mt-1 text-xs text-[#52665e]">
          Drag inside the mask to position. Use the zoom slider or pinch to resize.
        </p>
      </div>

      {/* Interactive Adjustment Canvas */}
      <div className="mt-4 soft-card rounded-[24px] bg-white p-3 border border-[#e8dfcf] shadow-sm">
        <div className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e1d1] checker shadow-inner select-none">
          {/* LAYER 1: Admin Campaign Artwork (Exact Saved Coordinates & Rotation) */}
          <div
            style={{
              position: 'absolute',
              left: `${campGeo.x}%`,
              top: `${campGeo.y}%`,
              width: `${campGeo.w}%`,
              height: `${campGeo.h}%`,
              transform: `rotate(${campGeo.rot}deg)`,
              transformOrigin: 'center center',
              zIndex: 2,
            }}
          >
            <img
              src={campaign.campaign_image_url}
              alt={campaign.name}
              className="w-full h-full object-fill pointer-events-none"
              draggable={false}
            />
          </div>

          {/* LAYER 2: Photo Area Mask (Admin Shape & Position) */}
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
                zIndex: 5,
              }}
            >
              {/* The Mask Container */}
              <div
                ref={maskRef}
                className={`relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing border-2 border-dashed border-[#f5c75a] shadow-lg ${
                  photoGeo.shape === 'Circle' ? 'rounded-full' : 'rounded-2xl'
                }`}
                style={{ touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                {/* User Photo Image Inside Mask */}
                <div
                  className="w-full h-full flex items-center justify-center pointer-events-none"
                  style={{
                    transform: `translate(${photoPan.x}%, ${photoPan.y}%) scale(${photoZoom})`,
                    transformOrigin: 'center center',
                    transition: interactionRef.current ? 'none' : 'transform 0.08s ease-out',
                  }}
                >
                  <img
                    src={userPhotoUrl}
                    alt="User portrait"
                    className="w-full h-full object-cover pointer-events-none select-none"
                    draggable={false}
                  />
                </div>

                {/* Subtle Position Hint Overlay on Mask */}
                <div className="absolute inset-0 pointer-events-none grid place-items-center opacity-0 hover:opacity-100 transition-opacity bg-black/10">
                  <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    <Move className="h-3 w-3" />
                    <span>Drag</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* LAYER 3: Name Area Overlay (Admin Typography & Geometry) */}
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
                zIndex: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent:
                  nameConfig.alignment === 'left'
                    ? 'flex-start'
                    : nameConfig.alignment === 'right'
                    ? 'flex-end'
                    : 'center',
                pointerEvents: 'none',
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
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                {userName}
              </div>
            </div>
          )}
        </div>

        {/* User Photo Controls: Zoom Slider + Zoom In/Out + Reset */}
        <div className="mt-4 rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-3">
          <div className="flex items-center justify-between text-xs font-bold text-[#52665e]">
            <span className="flex items-center gap-1">
              <span>Photo Zoom</span>
              <span className="font-mono text-[11px] text-[#1f4a3f]">
                {Math.round(photoZoom * 100)}%
              </span>
            </span>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-[11px] text-[#be6c45] hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Position</span>
            </button>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPhotoZoom((z) => Math.max(1, Math.round((z - 0.15) * 100) / 100))}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#e5dccd] bg-white text-[#17362f] shadow-sm hover:bg-[#f6efe4]"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={photoZoom}
              onChange={(e) => setPhotoZoom(parseFloat(e.target.value) || 1)}
              className="range flex-1 accent-[#1f4a3f]"
            />

            <button
              type="button"
              onClick={() => setPhotoZoom((z) => Math.min(3, Math.round((z + 0.15) * 100) / 100))}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#e5dccd] bg-white text-[#17362f] shadow-sm hover:bg-[#f6efe4]"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>

        {generationError && (
          <p className="mt-3 text-center text-xs font-bold text-[#be6c45]">
            {generationError}
          </p>
        )}

        {/* Generate CTA Button */}
        <button
          type="button"
          disabled={generating}
          onClick={handleGenerateFrame}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#db9b35] hover:bg-[#e6a844] py-4 px-6 text-sm font-extrabold text-[#17362f] shadow-lg transition-all active:scale-95 disabled:opacity-75"
        >
          {generating ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Compositing High-Res YogFrame...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              <span>Generate My YogFrame</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
