import React, { useState } from 'react';
import {
  Download,
  Share2,
  CheckCircle2,
  Copy,
  Check,
  RotateCcw,
  MessageCircle,
  Facebook,
  Instagram,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

function sanitizeFilename(text) {
  return text
    .toString()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

export default function UserScreen3Result({
  campaign,
  userName,
  generatedImage,
  onMakeAnother,
}) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const campaignUrl = `${window.location.origin}/campaign/${campaign.slug}`;
  const frameUrl = generatedImage.objectUrl || generatedImage.localDataUrl;

  // Log strictly anonymous event to backend (zero user data sent)
  const logEvent = async (eventType) => {
    try {
      await fetch(`/api/campaigns/${campaign.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
        }),
      });
    } catch (e) {
      console.warn('Anonymous event logging warning:', e);
    }
  };

  // 1. Download Action
  const handleDownload = async () => {
    setDownloading(true);
    try {
      logEvent('download');

      const campSlug = sanitizeFilename(campaign.name || 'Campaign');
      const userSlug = sanitizeFilename(userName || 'Supporter');
      const filename = `YogFrame-${campSlug}-${userSlug}.png`;

      const link = document.createElement('a');
      link.href = frameUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  // 2. Native Share
  const handleNativeShare = async () => {
    logEvent('link');

    if (navigator.share) {
      try {
        // Try sharing file if blob conversion succeeds
        let filesArray = [];
        try {
          const res = await fetch(frameUrl);
          const blob = await res.blob();
          const campSlug = sanitizeFilename(campaign.name || 'Campaign');
          const userSlug = sanitizeFilename(userName || 'Supporter');
          const file = new File([blob], `YogFrame-${campSlug}-${userSlug}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            filesArray = [file];
          }
        } catch (e) {}

        if (filesArray.length > 0) {
          await navigator.share({
            title: `${campaign.name} — My YogFrame`,
            text: `Here is my personalized YogFrame for ${campaign.name}! Create yours at: ${campaignUrl}`,
            files: filesArray,
          });
          return;
        } else {
          await navigator.share({
            title: `${campaign.name} — My YogFrame`,
            text: `Here is my personalized YogFrame for ${campaign.name}! Create yours at: ${campaignUrl}`,
            url: campaignUrl,
          });
          return;
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleDownload();
        }
      }
    } else {
      handleDownload();
    }
  };

  // 3. WhatsApp Share
  const handleWhatsApp = () => {
    logEvent('whatsapp');
    const shareText = `Check out my personalized YogFrame for *${campaign.name}*! 🧘\n\nCreate your own customized frame here:\n${campaignUrl}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  // 4. Facebook Share
  const handleFacebook = () => {
    logEvent('facebook');
    // Using actual YogFrame campaign URL, NOT canva.com!
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(campaignUrl)}`;
    window.open(url, '_blank', 'width=600,height=500');
  };

  // 5. Instagram Share Workflow
  const handleInstagram = () => {
    logEvent('instagram');
    handleDownload();
    alert('Your YogFrame image has been downloaded! Open Instagram to share it to your Story or Feed.');
  };

  // 6. Copy Campaign Link
  const handleCopyLink = () => {
    logEvent('link');
    navigator.clipboard.writeText(campaignUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="w-full max-w-[480px] mx-auto px-4 py-5 sm:py-8">
      {/* Celebration Header */}
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf2ed] text-[#1f4a3f] shadow-sm">
          <CheckCircle2 className="h-7 w-7 text-[#1f4a3f]" />
        </div>
        <span className="mt-2.5 inline-block text-[10px] font-bold uppercase tracking-widest text-[#79987e]">
          SUCCESSFULLY GENERATED
        </span>
        <h2 className="brand-serif text-2xl font-bold text-[#17362f]">
          Your YogFrame is Ready!
        </h2>
        <p className="mt-1 text-xs text-[#52665e]">
          Download your high-resolution frame or share it with friends and family.
        </p>
      </div>

      {/* Generated Result Display Card */}
      <div className="soft-card mt-5 overflow-hidden rounded-[26px] bg-white p-3 border border-[#e8dfcf] shadow-md">
        <div className="relative w-full aspect-[4/5] overflow-hidden rounded-2xl bg-[#e9e1d1] checker flex items-center justify-center">
          <img
            src={frameUrl}
            alt={`Personalized frame for ${userName}`}
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>
      </div>

      {/* Primary Action Buttons: Download & Native Share */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#1f4a3f] hover:bg-[#16382f] py-3.5 px-4 text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-95"
        >
          <Download className="h-4 w-4" />
          <span>{downloading ? 'Downloading...' : 'Download Image'}</span>
        </button>

        <button
          type="button"
          onClick={handleNativeShare}
          className="flex items-center justify-center gap-2 rounded-xl border border-[#bda980] bg-[#db9b35] hover:bg-[#e6a844] py-3.5 px-4 text-xs sm:text-sm font-bold text-[#17362f] shadow-md transition-all active:scale-95"
        >
          <Share2 className="h-4 w-4" />
          <span>Share Frame</span>
        </button>
      </div>

      {/* Social Sharing Channels */}
      <div className="soft-card mt-4 rounded-2xl bg-white p-4 border border-[#e8dfcf]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#52665e] text-center">
          Share Instantly On
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex flex-col items-center justify-center rounded-xl border border-[#c4dcce] bg-[#f0fbf4] p-3 text-[#1f4a3f] hover:bg-[#e3f7eb] transition-colors"
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#25D366] text-white shadow-sm">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span className="mt-1.5 text-[11px] font-bold">WhatsApp</span>
          </button>

          {/* Facebook */}
          <button
            type="button"
            onClick={handleFacebook}
            className="flex flex-col items-center justify-center rounded-xl border border-blue-100 bg-[#f0f5fc] p-3 text-[#1877F2] hover:bg-[#e4edfa] transition-colors"
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#1877F2] text-white shadow-sm">
              <Facebook className="h-4 w-4" />
            </div>
            <span className="mt-1.5 text-[11px] font-bold">Facebook</span>
          </button>

          {/* Instagram */}
          <button
            type="button"
            onClick={handleInstagram}
            className="flex flex-col items-center justify-center rounded-xl border border-pink-100 bg-[#fdf2f7] p-3 text-[#E4405F] hover:bg-[#fae4f0] transition-colors"
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-sm">
              <Instagram className="h-4 w-4" />
            </div>
            <span className="mt-1.5 text-[11px] font-bold">Instagram</span>
          </button>
        </div>
      </div>

      {/* Campaign Referral Link Box */}
      <div className="mt-4 rounded-2xl border border-[#e8dfcf] bg-[#faf6ed] p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#52665e]">
              Invite Others to Make a Frame
            </p>
            <p className="truncate font-mono text-xs font-bold text-[#1f4a3f]">
              {campaignUrl}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-[#bda980] bg-white px-2.5 py-1.5 text-xs font-bold text-[#17362f] hover:bg-[#f6efe4] transition-colors shadow-sm"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-gray-500" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Make Another YogFrame Button */}
      <div className="mt-5">
        <button
          type="button"
          onClick={onMakeAnother}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e8dfcf] bg-white py-3.5 px-4 text-xs sm:text-sm font-bold text-[#17362f] hover:bg-[#f6efe4] transition-colors shadow-sm active:scale-95"
        >
          <RotateCcw className="h-4 w-4 text-[#79987e]" />
          <span>Make Another YogFrame</span>
        </button>
        <p className="mt-2 text-center text-[10px] text-[#79987e]">
          Create another frame for family or friends under this same campaign.
        </p>
      </div>
    </div>
  );
}
