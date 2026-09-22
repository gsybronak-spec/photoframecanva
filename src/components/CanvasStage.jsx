import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Upload, UserRound, Sparkles, RefreshCw } from 'lucide-react';
import { normalizeCoord } from '../utils/geoUtils';

const HANDLES = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];

export default function CanvasStage({
  campaign,
  photoConfig,
  nameConfig,
  activeLayer,
  onSelectLayer,
  onUpdateCampaignGeometry,
  onUpdatePhotoGeometry,
  onUpdateNameGeometry,
  onArtworkUpload,
  isPreviewMode,
  uploadingArtwork,
}) {
  const stageRef = useRef(null);
  const fileInputRef = useRef(null);
  const interactionRef = useRef(null);

  const canvasW = Number(campaign.canvas_width) || 1080;
  const canvasH = Number(campaign.canvas_height) || 1350;

  // Normalized percentage geometries (auto-converts any legacy pixel values > 100 to valid percentages)
  const campGeo = {
    x: normalizeCoord(campaign.campaign_x, canvasW, 0),
    y: normalizeCoord(campaign.campaign_y, canvasH, 0),
    w: Math.max(5, normalizeCoord(campaign.campaign_width, canvasW, 100)),
    h: Math.max(5, normalizeCoord(campaign.campaign_height, canvasH, 100)),
    rot: Number(campaign.campaign_rotation) || 0,
  };

  const photoGeo = {
    x: normalizeCoord(photoConfig?.x, canvasW, 30),
    y: normalizeCoord(photoConfig?.y, canvasH, 35),
    w: Math.max(5, normalizeCoord(photoConfig?.width, canvasW, 40)),
    h: Math.max(5, normalizeCoord(photoConfig?.height, canvasH, 30)),
    rot: Number(photoConfig?.rotation) || 0,
  };

  const nameGeo = {
    x: normalizeCoord(nameConfig?.x, canvasW, 20),
    y: normalizeCoord(nameConfig?.y, canvasH, 75),
    w: Math.max(5, normalizeCoord(nameConfig?.width, canvasW, 60)),
    h: Math.max(3, normalizeCoord(nameConfig?.height, canvasH, 10)),
    rot: Number(nameConfig?.rotation) || 0,
  };

  // Direct Pointer Interaction (Drag & Free 8-point Stretch/Resize)
  const handlePointerDown = (e, layerId, handle = 'move') => {
    if (isPreviewMode) return;
    // Campaign Artwork is permanently locked as base frame - no dragging or resizing
    if (layerId === 'campaign') return;
    e.stopPropagation();
    e.preventDefault();

    onSelectLayer(layerId);

    const stageEl = stageRef.current;
    if (!stageEl) return;
    const stageRect = stageEl.getBoundingClientRect();

    let initialGeo;
    if (layerId === 'campaign') {
      initialGeo = { ...campGeo };
    } else if (layerId === 'photo') {
      initialGeo = { ...photoGeo };
    } else if (layerId === 'name') {
      initialGeo = { ...nameGeo };
    }

    interactionRef.current = {
      layerId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialGeo,
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
    };
  };

  const handlePointerMove = useCallback((e) => {
    if (!interactionRef.current) return;
    e.preventDefault();

    const {
      layerId,
      handle,
      startX,
      startY,
      initialGeo,
      stageWidth,
      stageHeight,
    } = interactionRef.current;

    const deltaX = ((e.clientX - startX) / stageWidth) * 100;
    const deltaY = ((e.clientY - startY) / stageHeight) * 100;

    const minSize = 4; // minimum 4% size
    let newGeo = { ...initialGeo };

    if (handle === 'move') {
      newGeo.x = Math.round((initialGeo.x + deltaX) * 10) / 10;
      newGeo.y = Math.round((initialGeo.y + deltaY) * 10) / 10;
    } else {
      // 8-point handle stretching & resizing
      if (handle.includes('w')) {
        const potentialW = initialGeo.w - deltaX;
        if (potentialW >= minSize) {
          newGeo.x = Math.round((initialGeo.x + deltaX) * 10) / 10;
          newGeo.w = Math.round(potentialW * 10) / 10;
        }
      }
      if (handle.includes('e')) {
        const potentialW = initialGeo.w + deltaX;
        if (potentialW >= minSize) {
          newGeo.w = Math.round(potentialW * 10) / 10;
        }
      }
      if (handle.includes('n')) {
        const potentialH = initialGeo.h - deltaY;
        if (potentialH >= minSize) {
          newGeo.y = Math.round((initialGeo.y + deltaY) * 10) / 10;
          newGeo.h = Math.round(potentialH * 10) / 10;
        }
      }
      if (handle.includes('s')) {
        const potentialH = initialGeo.h + deltaY;
        if (potentialH >= minSize) {
          newGeo.h = Math.round(potentialH * 10) / 10;
        }
      }
    }

    if (layerId === 'campaign') return; // Artwork is permanently locked

    if (layerId === 'photo') {
      onUpdatePhotoGeometry({
        x: newGeo.x,
        y: newGeo.y,
        width: newGeo.w,
        height: newGeo.h,
      });
    } else if (layerId === 'name') {
      onUpdateNameGeometry({
        x: newGeo.x,
        y: newGeo.y,
        width: newGeo.w,
        height: newGeo.h,
      });
    }
  }, [onUpdateCampaignGeometry, onUpdatePhotoGeometry, onUpdateNameGeometry]);

  const handlePointerUp = useCallback(() => {
    interactionRef.current = null;
  }, []);

  // Global window listeners during active pointer drag ensures buttery smooth interaction
  useEffect(() => {
    const onWindowPointerMove = (e) => {
      if (interactionRef.current) {
        handlePointerMove(e);
      }
    };
    const onWindowPointerUp = () => {
      if (interactionRef.current) {
        handlePointerUp();
      }
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onArtworkUpload(file);
    }
    e.target.value = '';
  };

  const hasArtwork = Boolean(campaign.campaign_image_url);

  return (
    <div className="w-full">
      {/* Canvas Stage is ALWAYS rendered, whether artwork is uploaded yet or not */}
      <div
        id="editor-stage"
        ref={stageRef}
        className={`editor-stage checker ${isPreviewMode ? 'preview-mode' : ''}`}
        style={{
          aspectRatio: `${canvasW} / ${canvasH}`,
          maxHeight: '75vh',
          margin: '0 auto',
        }}
        onClick={(e) => {
          if (e.target === stageRef.current) {
            onSelectLayer(null);
          }
        }}
      >
        {/* LAYER 1: Campaign Artwork Base Layer (Permanently Locked Base Frame) */}
        <div
          id="campaign-layer"
          data-layer="campaign"
          className={`editable-layer ${hasArtwork ? 'artwork-locked' : ''}`}
          style={{
            left: `${campGeo.x}%`,
            top: `${campGeo.y}%`,
            width: `${campGeo.w}%`,
            height: `${campGeo.h}%`,
            transform: `rotate(${campGeo.rot}deg)`,
            pointerEvents: hasArtwork ? 'none' : 'auto',
            cursor: hasArtwork ? 'default' : 'pointer',
          }}
        >
          {hasArtwork ? (
            <img
              id="campaign-image"
              src={campaign.campaign_image_url}
              alt="Campaign artwork"
              draggable={false}
            />
          ) : (
            <div
              className="h-full w-full rounded-2xl border-2 border-dashed border-[#bda980] bg-[#faf6ed]/90 p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#935e20] transition-all"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#f4e6c8] text-[#935e20] shadow-sm">
                <Upload className="h-6 w-6" />
              </div>
              <h4 className="brand-serif mt-3 text-sm sm:text-base font-bold text-[#17362f]">
                Campaign Artwork Base Layer
              </h4>
              <p className="mt-1 max-w-xs text-[11px] sm:text-xs text-[#52665e]">
                Click or drag to upload frame design (PNG, JPG, or WEBP).
              </p>
              <button
                type="button"
                className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-[#1f4a3f] hover:bg-[#16382f] text-white px-4 py-2.5 text-xs font-bold shadow-md transition-all active:scale-95 min-h-[44px]"
              >
                {uploadingArtwork ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Uploading artwork...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Choose Artwork File</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* LAYER 2: Photo Area Placeholder / Mask */}
        {photoConfig?.enabled && (
          <div
            id="photo-layer"
            data-layer="photo"
            className={`editable-layer ${
              activeLayer === 'photo' && !isPreviewMode ? 'selected' : ''
            }`}
            style={{
              left: `${photoGeo.x}%`,
              top: `${photoGeo.y}%`,
              width: `${photoGeo.w}%`,
              height: `${photoGeo.h}%`,
              transform: `rotate(${photoGeo.rot}deg)`,
            }}
            onPointerDown={(e) => handlePointerDown(e, 'photo', 'move')}
          >
            {/* Guide Badge */}
            {!isPreviewMode && (
              <span className="layer-badge photo-badge">
                <UserRound className="h-3 w-3" />
                <span>Photo Area • {photoConfig.shape || 'Square'}</span>
              </span>
            )}

            <div
              id="photo-placeholder"
              className={`photo-placeholder ${
                photoConfig.shape === 'Circle' ? 'circle' : 'square'
              }`}
            >
              <UserRound className="h-8 w-8 sm:h-10 sm:w-10 opacity-90 text-[#1f4a3f] drop-shadow-sm" />
              <span className="mt-1 text-[10px] sm:text-xs font-black tracking-wider uppercase text-[#17362f] bg-white/80 px-2 py-0.5 rounded shadow-sm">
                Photo Area
              </span>
            </div>

            {!isPreviewMode && activeLayer === 'photo' && (
              <div className="selection-tools" aria-hidden="true">
                {HANDLES.map((handle) => (
                  <span
                    key={handle}
                    className="resize-handle"
                    data-handle={handle}
                    onPointerDown={(e) => handlePointerDown(e, 'photo', handle)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* LAYER 3: Name Area Typography Overlay */}
        {nameConfig?.enabled && (
          <div
            id="name-layer"
            data-layer="name"
            className={`editable-layer ${
              activeLayer === 'name' && !isPreviewMode ? 'selected' : ''
            }`}
            style={{
              left: `${nameGeo.x}%`,
              top: `${nameGeo.y}%`,
              width: `${nameGeo.w}%`,
              height: `${nameGeo.h}%`,
              transform: `rotate(${nameGeo.rot}deg)`,
            }}
            onPointerDown={(e) => handlePointerDown(e, 'name', 'move')}
          >
            {/* Guide Badge */}
            {!isPreviewMode && (
              <span className="layer-badge name-badge">
                <Sparkles className="h-3 w-3" />
                <span>Name Area</span>
              </span>
            )}

            <div
              id="name-display"
              className="name-display"
              style={{
                fontFamily: `"${nameConfig.font_family || 'DM Sans'}", sans-serif`,
                fontSize: `${nameConfig.font_size || 26}px`,
                fontWeight: nameConfig.font_weight === 'bold' ? '700' : '400',
                color: nameConfig.font_color || '#fff8e9',
                justifyContent:
                  nameConfig.alignment === 'left'
                    ? 'flex-start'
                    : nameConfig.alignment === 'right'
                    ? 'flex-end'
                    : 'center',
                textAlign: nameConfig.alignment || 'center',
                letterSpacing: `${nameConfig.letter_spacing ?? 1}px`,
              }}
            >
              YOUR NAME
            </div>

            {!isPreviewMode && activeLayer === 'name' && (
              <div className="selection-tools" aria-hidden="true">
                {HANDLES.map((handle) => (
                  <span
                    key={handle}
                    className="resize-handle"
                    data-handle={handle}
                    onPointerDown={(e) => handlePointerDown(e, 'name', handle)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden File Input for Artwork Upload */}
      <input
        id="campaign-artwork-input"
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Quick Helper Note & Toolbar */}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#52665e] px-1">
        <span className="flex items-center gap-1.5 bg-[#f9eedf] px-3 py-1.5 rounded-lg border border-[#e8dfcf]">
          <Sparkles className="h-3.5 w-3.5 text-[#db9b35]" />
          <span>Tap or drag Photo Area or Name Area to position and resize. Campaign artwork frame is fixed.</span>
        </span>
      </div>
    </div>
  );
}
