import React, { useState, useEffect, useCallback } from 'react';
import { Flower2, AlertTriangle, HelpCircle, RefreshCw } from 'lucide-react';
import UserScreen1Input from './UserScreen1Input';
import UserScreen2Adjust from './UserScreen2Adjust';
import UserScreen3Result from './UserScreen3Result';

export default function UserPortal({ slug }) {
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null); // 'NOT_FOUND' | 'UNAVAILABLE' | 'SERVER_ERROR'
  const [errorMessage, setErrorMessage] = useState('');

  // User Session State
  const [step, setStep] = useState(1); // 1: Input, 2: Adjust, 3: Result
  const [userName, setUserName] = useState('');
  const [userPhotoFile, setUserPhotoFile] = useState(null);
  const [userPhotoUrl, setUserPhotoUrl] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);

  // Fetch campaign by slug (Strict Isolation)
  const fetchCampaign = useCallback(async () => {
    if (!slug) {
      setErrorStatus('NOT_FOUND');
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorStatus(null);

    try {
      const res = await fetch(`/api/campaigns/by-slug/${encodeURIComponent(slug)}`);

      if (res.status === 404) {
        setErrorStatus('NOT_FOUND');
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load campaign');
      }

      const data = await res.json();
      const camp = data.campaign;

      if (!camp) {
        setErrorStatus('NOT_FOUND');
        setLoading(false);
        return;
      }

      // Check Active status
      if (camp.status !== 'Active') {
        setErrorStatus('UNAVAILABLE');
        setCampaign(camp);
        setLoading(false);
        return;
      }

      setCampaign(camp);
    } catch (err) {
      console.error('Error loading campaign:', err);
      setErrorStatus('SERVER_ERROR');
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // Photo selection handler
  const handlePhotoSelected = (file) => {
    setUserPhotoFile(file);
    const objectUrl = URL.createObjectURL(file);
    setUserPhotoUrl(objectUrl);
  };

  // Reset user session for "Make Another YogFrame"
  const handleMakeAnother = () => {
    setUserName('');
    setUserPhotoFile(null);
    setUserPhotoUrl(null);
    setGeneratedImage(null);
    setStep(1);
  };

  // Loading State
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf6ed] p-4 text-center">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[#eaf2ed] text-[#1f4a3f] shadow-sm">
          <Flower2 className="h-8 w-8 animate-pulse text-[#1f4a3f]" />
        </div>
        <p className="brand-serif mt-4 text-lg font-bold text-[#17362f]">
          Loading YogFrame Campaign...
        </p>
        <p className="mt-1 text-xs text-[#79987e]">
          Preparing official artwork composition
        </p>
      </div>
    );
  }

  // Error State: Campaign Not Found
  if (errorStatus === 'NOT_FOUND') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf6ed] p-6 text-center">
        <div className="max-w-md rounded-[28px] border border-[#e8dfcf] bg-white p-7 shadow-lg">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#faece5] text-[#be6c45] shadow-sm">
            <HelpCircle className="h-7 w-7" />
          </div>
          <span className="mt-3 inline-block text-[10px] font-bold uppercase tracking-wider text-[#be6c45]">
            INVALID LINK
          </span>
          <h2 className="brand-serif mt-1 text-2xl font-bold text-[#17362f]">
            Campaign Not Found
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#52665e] leading-relaxed">
            The campaign you are looking for does not exist or the link may be incomplete.
          </p>
          <div className="mt-4 rounded-xl bg-[#faf6ed] p-3 text-xs font-mono text-[#79987e] border border-[#e8dfcf]">
            Slug: /{slug || 'unknown'}
          </div>
        </div>
      </div>
    );
  }

  // Error State: Campaign Unavailable (Draft / Paused / Archived)
  if (errorStatus === 'UNAVAILABLE') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf6ed] p-6 text-center">
        <div className="max-w-md rounded-[28px] border border-[#e8dfcf] bg-white p-7 shadow-lg">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fdf5e7] text-[#db9b35] shadow-sm">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <span className="mt-3 inline-block text-[10px] font-bold uppercase tracking-wider text-[#db9b35]">
            CURRENTLY INACTIVE
          </span>
          <h2 className="brand-serif mt-1 text-2xl font-bold text-[#17362f]">
            This campaign is currently unavailable.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-[#52665e] leading-relaxed">
            "{campaign?.name || slug}" is currently in {campaign?.status || 'Draft'} status and is not accepting frame submissions at this moment.
          </p>
        </div>
      </div>
    );
  }

  // Active Campaign User Flow
  return (
    <div className="app-shell min-h-screen">
      {step === 1 && (
        <UserScreen1Input
          campaign={campaign}
          userName={userName}
          setUserName={setUserName}
          userPhotoUrl={userPhotoUrl}
          onPhotoSelected={handlePhotoSelected}
          onContinue={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <UserScreen2Adjust
          campaign={campaign}
          photoConfig={campaign.photo_config}
          nameConfig={campaign.name_config}
          userName={userName}
          userPhotoUrl={userPhotoUrl}
          onBack={() => setStep(1)}
          onGenerateSuccess={(result) => {
            setGeneratedImage(result);
            setStep(3);
          }}
        />
      )}

      {step === 3 && generatedImage && (
        <UserScreen3Result
          campaign={campaign}
          userName={userName}
          generatedImage={generatedImage}
          onMakeAnother={handleMakeAnother}
        />
      )}
    </div>
  );
}
