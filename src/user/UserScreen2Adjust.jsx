import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { compositeFinalYogFrame, loadImage } from './canvasRenderer';

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
  const [photoZoom, setPhotoZoom] = useState(1); // 1.0 to 3.5
  const [photoAspect, setPhotoAspect] = useState(1); // naturalWidth / naturalHeight
  const [artworkLoaded, setArtworkLoaded] = useState(false);
  const [artworkError, setArtworkError] = useState('');
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');

  const maskRef = useRef(null);
  const photoPanLayerRef = useRef(null);
  const photoScaleLayerRef = useRef(null);

  // Gesture refs for zero-lag 60fps/120fps hardware-accelerated interactions
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const activePointersRef = useRef(new Map());
  const dragStartRef = useRef(null);
  const pinchStartRef = useRef(null);
  const rafIdRef = useRef(null);

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

  // 1. Preload Artwork and User Photo on mount
  useEffect(() => {
    let isMounted = true;

    // Preload Artwork with CORS
    loadImage(campaign.campaign_image_url, true)
      .then(() => {
        if (isMounted) {
          setArtworkLoaded(true);
          setArtworkError('');
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Artwork preload error:', err);
          setArtworkLoaded(false);
          setArtworkError('Campaign artwork could not be loaded. Please refresh and try again.');
        }
      });

    // Preload User Photo with CORS and compute natural aspect ratio
    loadImage(userPhotoUrl, false)
      .then((img) => {
        if (isMounted) {
          const aspect = (img.naturalWidth || 1) / (img.naturalHeight || 1);
          setPhotoAspect(aspect);
          setPhotoLoaded(true);
          setPhotoError('');
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('User photo preload error:', err);
          setPhotoLoaded(false);
          setPhotoError('User photo could not be loaded. Please select a photo again.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [campaign.campaign_image_url, userPhotoUrl]);

  // Synchronize DOM elements smoothly without React re-render delay
  const updateTransformDOM = useCallback(() => {
    if (photoPanLayerRef.current) {
      photoPanLayerRef.current.style.transform = `translate(${panRef.current.x}%, ${panRef.current.y}%)`;
    }
    if (photoScaleLayerRef.current) {
      photoScaleLayerRef.current.style.transform = `translate(-50%, -50%) scale(${zoomRef.current})`;
    }
  }, []);

  const scheduleUpdate = useCallback(() => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(updateTransformDOM);
  }, [updateTransformDOM]);

  // Calculate Mask Aspect Ratio
  // Frame has 4:5 aspect ratio (0.8). Mask has photoGeo.w% width and photoGeo.h% height
  const getMaskAspect = () => {
    if (maskRef.current) {
      const rect = maskRef.current.getBoundingClientRect();
      if (rect.height > 0) return rect.width / rect.height;
    }
    const pw = photoGeo.w || 35;
    const ph = photoGeo.h || 28;
    const canvasRatio = (campaign.canvas_width || 1080) / (campaign.canvas_height || 1350);
    return (pw / ph) * canvasRatio;
  };

  const currentMaskAspect = getMaskAspect();

  // Multi-Touch & Pointer Event Handling (Single unified pipeline)
  const handlePointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      e.target.setPointerCapture(e.pointerId);
    } catch (err) {}

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const maskEl = maskRef.current;
    const rect = maskEl ? maskEl.getBoundingClientRect() : { width: 100, height: 100 };

    if (activePointersRef.current.size === 1) {
      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialPanX: panRef.current.x,
        initialPanY: panRef.current.y,
        maskW: rect.width || 1,
        maskH: rect.height || 1,
      };
    } else if (activePointersRef.current.size === 2) {
      const [p1, p2] = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      pinchStartRef.current = {
        initialDist: Math.max(dist, 10),
        initialZoom: zoomRef.current,
      };
    }
  };

  const handlePointerMove = (e) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    e.preventDefault();

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 1. Two-pointer Pinch-to-Zoom
    if (activePointersRef.current.size === 2 && pinchStartRef.current) {
      const [p1, p2] = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const ratio = currentDist / pinchStartRef.current.initialDist;
      const newZoom = Math.min(3.5, Math.max(1, Math.round(pinchStartRef.current.initialZoom * ratio * 100) / 100));
      zoomRef.current = newZoom;
      scheduleUpdate();
      return;
    }

    // 2. Single-pointer Pan Drag
    if (activePointersRef.current.size === 1 && dragStartRef.current) {
      const { startX, startY, initialPanX, initialPanY, maskW, maskH } = dragStartRef.current;
      const deltaX = ((e.clientX - startX) / maskW) * 100;
      const deltaY = ((e.clientY - startY) / maskH) * 100;

      // Generous pan limits allowing full user alignment freedom (head, chest, body)
      const maxPan = Math.max(140, Math.round(140 * zoomRef.current));
      const targetX = Math.max(-maxPan, Math.min(maxPan, initialPanX + deltaX));
      const targetY = Math.max(-maxPan, Math.min(maxPan, initialPanY + deltaY));

      panRef.current = { x: targetX, y: targetY };
      scheduleUpdate();
    }
  };

  const handlePointerUp = (e) => {
    try {
      e.target.releasePointerCapture(e.pointerId);
    } catch (err) {}

    activePointersRef.current.delete(e.pointerId);

    if (activePointersRef.current.size < 2) {
      pinchStartRef.current = null;
    }

    if (activePointersRef.current.size === 0) {
      dragStartRef.current = null;
      // Synchronize final values to React state for button rendering & generation
      setPhotoPan({
        x: Math.round(panRef.current.x * 10) / 10,
        y: Math.round(panRef.current.y * 10) / 10,
      });
      setPhotoZoom(Math.round(zoomRef.current * 100) / 100);
    } else if (activePointersRef.current.size === 1) {
      // Transition from pinch back to 1-finger drag smoothly without jumping
      const [remaining] = Array.from(activePointersRef.current.values());
      const maskEl = maskRef.current;
      const rect = maskEl ? maskEl.getBoundingClientRect() : { width: 100, height: 100 };
      dragStartRef.current = {
        startX: remaining.x,
        startY: remaining.y,
        initialPanX: panRef.current.x,
        initialPanY: panRef.current.y,
        maskW: rect.width || 1,
        maskH: rect.height || 1,
      };
    }
  };

  // Zoom control helpers
  const handleZoomChange = (newZoom) => {
    const clamped = Math.min(3.5, Math.max(1, Math.round(newZoom * 100) / 100));
    zoomRef.current = clamped;
    setPhotoZoom(clamped);
    scheduleUpdate();
  };

  // Reset Photo adjustment
  const handleReset = () => {
    panRef.current = { x: 0, y: 0 };
    zoomRef.current = 1;
    setPhotoPan({ x: 0, y: 0 });
    setPhotoZoom(1);
    scheduleUpdate();
  };

  // Generate Final Frame
  const handleGenerateFrame = async () => {
    if (artworkError) {
      setGenerationError(artworkError);
      return;
    }

    setGenerating(true);
    setGenerationError('');

    try {
      // Synchronize latest ref values before compositing
      const finalPan = { ...panRef.current };
      const finalZoom = zoomRef.current;

      // 1. Composite high-resolution image on client canvas (strictly in browser memory)
      const generatedDataUrl = await compositeFinalYogFrame({
        campaign,
        photoConfig,
        nameConfig,
        userName,
        userPhotoUrl,
        photoPan: finalPan,
        photoZoom: finalZoom,
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
      setGenerationError(err.message || 'Campaign artwork could not be loaded. Please refresh and try again.');
    } finally {
      setGenerating(false);
    }
  };

  // Base cover sizing styles for photo inside mask
  // Matches exact math in canvasRenderer.js:
  // if photoAspect > maskAspect => height: 100%, width: (photoAspect / maskAspect) * 100%
  // else => width: 100%, height: (maskAspect / photoAspect) * 100%
  const isWiderThanMask = photoAspect > currentMaskAspect;
  const photoWStyle = isWiderThanMask
    ? `${(photoAspect / currentMaskAspect) * 100}%`
    : '100%';
  const photoHStyle = isWiderThanMask
    ? '100%'
    : `${(currentMaskAspect / photoAspect) * 100}%`;

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

      {/* Critical Artwork Load Error Alert */}
      {artworkError && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs font-semibold text-red-700 shadow-sm">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{artworkError}</span>
        </div>
      )}

      {/* Interactive Adjustment Canvas */}
      <div className="mt-4 soft-card rounded-[24px] bg-white p-3 border border-[#e8dfcf] shadow-sm">
        <div
          className="relative w-full overflow-hidden rounded-2xl bg-[#e9e1d1] checker shadow-inner select-none"
          style={{
            aspectRatio: `${campaign.canvas_width || 1080} / ${campaign.canvas_height || 1350}`,
            maxHeight: '68vh',
            margin: '0 auto',
          }}
        >
          {/* LAYER 1: Photo Area Mask (Admin Shape & Position) - BEHIND Frame Artwork */}
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
                zIndex: 2,
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
              >
                {/* 
                  Independent Transform Model:
                  Layer A: Pan translation layer (relative to mask coordinates)
                  Layer B: Zoom scale layer (unconstrained photo intact behind mask)
                */}
                <div
                  ref={photoPanLayerRef}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    transform: `translate(${photoPan.x}%, ${photoPan.y}%)`,
                    willChange: 'transform',
                  }}
                >
                  <div
                    ref={photoScaleLayerRef}
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: '50%',
                      width: photoWStyle,
                      height: photoHStyle,
                      transform: `translate(-50%, -50%) scale(${photoZoom})`,
                      transformOrigin: 'center center',
                      willChange: 'transform',
                      pointerEvents: 'none',
                    }}
                  >
                    <img
                      src={userPhotoUrl}
                      alt="User portrait"
                      crossOrigin="anonymous"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'fill',
                        display: 'block',
                        pointerEvents: 'none',
                        userSelect: 'none',
                      }}
                      draggable={false}
                    />
                  </div>
                </div>

                {/* Subtle Position Hint Overlay on Mask */}
                <div className="absolute inset-0 pointer-events-none grid place-items-center opacity-0 hover:opacity-100 transition-opacity bg-black/10">
                  <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                    <Move className="h-3 w-3" />
                    <span>Drag to move</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* LAYER 2: Admin Campaign Artwork PNG (ABOVE User Photo) */}
          <div
            style={{
              position: 'absolute',
              left: `${campGeo.x}%`,
              top: `${campGeo.y}%`,
              width: `${campGeo.w}%`,
              height: `${campGeo.h}%`,
              transform: `rotate(${campGeo.rot}deg)`,
              transformOrigin: 'center center',
              zIndex: 5,
              pointerEvents: 'none',
            }}
          >
            <img
              src={campaign.campaign_image_url}
              alt={campaign.name}
              crossOrigin="anonymous"
              className="w-full h-full object-fill pointer-events-none"
              draggable={false}
              onError={() =>
                setArtworkError(
                  'Campaign artwork could not be loaded. Please refresh and try again.'
                )
              }
            />
          </div>

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
              onClick={() => handleZoomChange(zoomRef.current - 0.15)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#e5dccd] bg-white text-[#17362f] shadow-sm hover:bg-[#f6efe4] active:scale-95 transition-transform"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <input
              type="range"
              min="1"
              max="3.5"
              step="0.05"
              value={photoZoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value) || 1)}
              className="range flex-1 accent-[#1f4a3f]"
            />

            <button
              type="button"
              onClick={() => handleZoomChange(zoomRef.current + 0.15)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-[#e5dccd] bg-white text-[#17362f] shadow-sm hover:bg-[#f6efe4] active:scale-95 transition-transform"
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
          disabled={generating || !artworkLoaded || !!artworkError}
          onClick={handleGenerateFrame}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#db9b35] hover:bg-[#e6a844] py-4 px-6 text-sm font-extrabold text-[#17362f] shadow-lg transition-all active:scale-95 disabled:opacity-75 disabled:pointer-events-none"
        >
          {generating ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Compositing High-Res YogBoardFrame...</span>
            </>
          ) : !artworkLoaded && !artworkError ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span>Loading Campaign Artwork...</span>
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              <span>Generate My YogBoardFrame</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
