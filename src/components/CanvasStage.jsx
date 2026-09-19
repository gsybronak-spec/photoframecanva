import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Upload, UserRound, Sparkles, RefreshCw, ZoomIn, ZoomOut, Check } from 'lucide-react';

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

  // Fallback geometries if undefined
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

  // Direct Pointer Interaction (Drag & Free 8-point Stretch/Resize)
  const handlePointerDown = (e, layerId, handle = 'move') => {
    if (isPreviewMode) return;
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

    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
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
      // Free unconstrained horizontal and vertical stretch
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

    if (layerId === 'campaign') {
      onUpdateCampaignGeometry({
        campaign_x: newGeo.x,
        campaign_y: newGeo.y,
        campaign_width: newGeo.w,
        campaign_height: newGeo.h,
      });
    } else if (layerId === 'photo') {
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
  };

  const handlePointerUp = (e) => {
    if (interactionRef.current) {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch (err) {}
      interactionRef.current = null;
    }
  };

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
      {/* If No Artwork Uploaded Yet -> Show Upload State */}
      {!hasArtwork && (
        <div
          id="upload-state"
          className="checker rounded-[24px] border-2 border-dashed border-[#bda980] p-8 sm:p-12 text-center transition-all hover:border-[#935e20] flex flex-col items-center justify-center"
          style={{
            aspectRatio: `${campaign.canvas_width || 1080} / ${campaign.canvas_height || 1350}`,
            maxHeight: '65vh',
            margin: '0 auto',
          }}
        >
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#f4e6c8] text-[#935e20] shadow-sm">
            <Upload className="h-8 w-8" />
          </div>

          <h3 className="brand-serif mt-5 text-xl font-bold text-[#17362f]">
            Upload Campaign Artwork
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-xs sm:text-sm leading-6 text-[#52665e]">
            Upload your complete campaign design (PNG, JPG, or WEBP). It will become your interactive base artwork layer.
          </p>

          <label
            htmlFor="campaign-artwork-input"
            className={`mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#1f4a3f] hover:bg-[#16382f] text-white px-6 py-3.5 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 ${
              uploadingArtwork ? 'opacity-70 pointer-events-none' : ''
            }`}
          >
            {uploadingArtwork ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Uploading artwork to storage...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Choose Artwork File</span>
              </>
            )}
          </label>
          <input
            id="campaign-artwork-input"
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* Interactive Canvas Stage */}
      {hasArtwork && (
        <div>
          <div
            id="editor-stage"
            ref={stageRef}
            className={`editor-stage checker ${isPreviewMode ? 'preview-mode' : ''}`}
            style={{
              aspectRatio: `${campaign.canvas_width || 1080} / ${campaign.canvas_height || 1350}`,
              maxHeight: '75vh',
              margin: '0 auto',
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onClick={() => {
              // Click background deselects handles if needed
            }}
          >
            {/* LAYER 1: Campaign Artwork Base Layer (Requirement 7) */}
            <div
              id="campaign-layer"
              data-layer="campaign"
              className={`editable-layer ${
                activeLayer === 'campaign' && !isPreviewMode ? 'selected' : ''
              }`}
              style={{
                left: `${campGeo.x}%`,
                top: `${campGeo.y}%`,
                width: `${campGeo.w}%`,
                height: `${campGeo.h}%`,
                transform: `rotate(${campGeo.rot}deg)`,
              }}
              onPointerDown={(e) => handlePointerDown(e, 'campaign', 'move')}
            >
              <img
                id="campaign-image"
                src={campaign.campaign_image_url}
                alt="Campaign artwork"
                draggable={false}
              />

              {/* 8 Resize Handles */}
              {!isPreviewMode && activeLayer === 'campaign' && (
                <div className="selection-tools" aria-hidden="true">
                  {HANDLES.map((handle) => (
                    <span
                      key={handle}
                      className="resize-handle"
                      data-handle={handle}
                      onPointerDown={(e) => handlePointerDown(e, 'campaign', handle)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* LAYER 2: Photo Area Placeholder / Mask (Requirement 8) */}
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
                <div
                  id="photo-placeholder"
                  className={`photo-placeholder ${
                    photoConfig.shape === 'Circle' ? 'circle' : 'square'
                  }`}
                >
                  <UserRound className="h-8 w-8 sm:h-10 sm:w-10 opacity-90" />
                  <span className="mt-1 text-[10px] sm:text-xs font-bold tracking-wider uppercase opacity-95">
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

            {/* LAYER 3: Name Area Typography Overlay (Requirement 9) */}
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

          {/* Quick Helper Note & Toolbar */}
          <div className="mt-3 flex items-center justify-between text-xs text-[#52665e] px-1">
            <span className="flex items-center gap-1.5 bg-[#f9eedf] px-3 py-1.5 rounded-lg border border-[#e8dfcf]">
              <Sparkles className="h-3.5 w-3.5 text-[#db9b35]" />
              <span>Direct manipulation: drag to move, drag 8 handles to stretch/resize freely.</span>
            </span>

            <button
              type="button"
              onClick={() => {
                onUpdateCampaignGeometry({
                  campaign_x: 0,
                  campaign_y: 0,
                  campaign_width: 100,
                  campaign_height: 100,
                  campaign_rotation: 0,
                });
              }}
              title="Reset artwork to full stage"
              className="text-[11px] font-bold text-[#1f4a3f] hover:underline"
            >
              Fit Stage (100%)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
