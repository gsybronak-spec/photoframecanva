import React, { useRef, useState } from 'react';
import { Flower2, User, Image as ImageIcon, ArrowRight, AlertCircle, CheckCircle2, UploadCloud } from 'lucide-react';

export default function UserScreen1Input({
  campaign,
  userName,
  setUserName,
  userPhotoUrl,
  onPhotoSelected,
  onContinue,
}) {
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|webp)$/i)) {
      setErrorMessage('Please choose a valid image file (JPG, PNG, or WEBP).');
      return;
    }

    setErrorMessage('');
    onPhotoSelected(file);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (!userName || !userName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!userPhotoUrl) {
      setErrorMessage('Please choose a photo from your gallery.');
      return;
    }

    setErrorMessage('');
    onContinue();
  };

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-6 sm:py-8">
      {/* Brand Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#e8dfcf]/80">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-full border border-[#f5d99d]/60 bg-[#f2c35e]/20 text-[#db9b35] shadow-sm">
            <Flower2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-[#79987e]">
              YOGFRAME PORTAL
            </p>
            <p className="brand-serif text-lg font-bold text-[#17362f] tracking-tight">
              Personalized Yoga Frame
            </p>
          </div>
        </div>

        <span className="rounded-full border border-[#79987e]/30 bg-[#eaf2ed] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#1f4a3f]">
          Official
        </span>
      </div>

      {/* Campaign Artwork Presentation Card */}
      <div className="mt-5 overflow-hidden rounded-[24px] border border-[#e8dfcf] bg-white soft-card">
        {campaign.campaign_image_url ? (
          <div
            className="relative w-full max-h-[340px] overflow-hidden bg-[#e9e1d1] checker flex items-center justify-center"
            style={{
              aspectRatio: `${campaign.canvas_width || 1080} / ${campaign.canvas_height || 1350}`,
            }}
          >
            <img
              src={campaign.campaign_image_url}
              alt={campaign.name}
              className="h-full w-full object-contain pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-3 right-3 text-white">
              <span className="inline-block rounded-md bg-[#db9b35] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#17362f] shadow-sm">
                {campaign.district ? `${campaign.district} District` : 'Active Campaign'}
              </span>
              <h2 className="brand-serif mt-1 text-base sm:text-lg font-bold drop-shadow-md truncate">
                {campaign.name}
              </h2>
            </div>
          </div>
        ) : (
          <div
            className="grid place-items-center bg-[#f5efe4] text-xs text-gray-500"
            style={{
              aspectRatio: `${campaign.canvas_width || 1080} / ${campaign.canvas_height || 1350}`,
            }}
          >
            Campaign artwork loading...
          </div>
        )}

        {campaign.description && (
          <div className="p-4 bg-white border-t border-[#e8dfcf]/60">
            <p className="text-xs text-[#52665e] leading-relaxed">
              {campaign.description}
            </p>
          </div>
        )}
      </div>

      {/* User Input Form */}
      <form onSubmit={handleFormSubmit} className="soft-card mt-5 rounded-[26px] bg-white p-5 border border-[#e8dfcf]">
        <div className="space-y-4">
          {/* 1. Name Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52665e]" htmlFor="user-fullname">
              1. Enter Your Full Name *
            </label>
            <div className="relative mt-1.5">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="user-fullname"
                type="text"
                required
                maxLength={40}
                placeholder="e.g. Priyansh Sharma"
                value={userName}
                onChange={(e) => {
                  setUserName(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full rounded-xl border border-[#e5dccd] bg-[#fdfbf6] py-3 pl-10 pr-4 text-sm font-medium text-[#17362f] placeholder-gray-400 focus:border-[#db9b35] focus:outline-none focus:ring-2 focus:ring-[#db9b35]/20 shadow-inner"
              />
            </div>
            <p className="mt-1 text-[11px] text-[#79987e]">
              This name will be styled in the official event typography.
            </p>
          </div>

          {/* 2. Gallery Photo Upload (Strictly No Camera) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52665e]">
              2. Select Your Photo from Gallery *
            </label>

            {userPhotoUrl ? (
              <div className="mt-1.5 flex items-center justify-between rounded-xl border border-[#c4dcce] bg-[#eaf2ed] p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={userPhotoUrl}
                    alt="Uploaded user preview"
                    className="h-12 w-12 rounded-lg object-cover border border-white shadow-sm"
                  />
                  <div>
                    <span className="flex items-center gap-1 text-xs font-bold text-[#1f4a3f]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <span>Photo Selected</span>
                    </span>
                    <p className="text-[10px] text-[#52665e]">Ready for frame adjustment</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-[#bda980] bg-white px-2.5 py-1.5 text-xs font-bold text-[#17362f] hover:bg-[#f6efe4] transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="mt-1.5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#bda980] bg-[#fdfbf6] p-6 text-center cursor-pointer hover:border-[#db9b35] hover:bg-[#faf4ec] transition-all"
              >
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#f4e6c8] text-[#935e20] shadow-sm">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <p className="mt-2.5 text-xs sm:text-sm font-bold text-[#17362f]">
                  Choose Photo from Device Gallery
                </p>
                <p className="mt-1 text-[11px] text-[#79987e]">
                  JPG, PNG, or WEBP supported
                </p>
              </div>
            )}

            {/* Hidden File Input - STRICTLY Gallery (NO capture="camera") */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Validation Error Banner */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#faece5] p-3 text-xs font-bold text-[#be6c45]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Primary CTA Button */}
        <button
          type="submit"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f4a3f] hover:bg-[#16382f] py-4 px-6 text-sm font-bold text-white shadow-lg transition-all active:scale-95"
        >
          <span>Continue to Adjust Photo</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
