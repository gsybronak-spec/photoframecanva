import React from 'react';
import { Layers, Leaf, Images, DownloadCloud, Send } from 'lucide-react';

export default function MetricsRow({ metrics = {} }) {
  const activeCount = metrics.activeCampaigns ?? 0;
  const draftCount = metrics.draftCampaigns ?? 0;
  const totalCampaigns = metrics.totalCampaigns ?? (activeCount + draftCount);
  const framesCount = metrics.totalFrames ?? 0;
  const downloadsCount = metrics.downloads ?? 0;
  const sharesCount = metrics.totalShares ?? 0;

  return (
    <section aria-label="Campaign metrics" className="-mt-5 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {/* 1. Total Campaigns */}
      <article className="soft-card rounded-2xl p-4 sm:p-5 border border-[#e8dfcf] bg-white transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#f5ede0] text-[#1f4a3f]">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#79987e]">TOTAL</span>
        </div>
        <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#17362f]">
          {Number(totalCampaigns).toLocaleString('en-IN')}
        </p>
        <p className="mt-1 text-xs font-semibold text-[#52665e]">
          Total Campaigns
        </p>
      </article>

      {/* 2. Active Campaigns */}
      <article className="soft-card rounded-2xl p-4 sm:p-5 border border-[#e8dfcf] bg-white transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf2ed] text-[#417264]">
            <Leaf className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#79987e]">LIVE</span>
        </div>
        <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#17362f]">
          {Number(activeCount).toLocaleString('en-IN')}
        </p>
        <p className="mt-1 text-xs font-semibold text-[#52665e]">
          Active Campaigns
        </p>
      </article>

      {/* 3. Total Frames Created */}
      <article className="soft-card rounded-2xl p-4 sm:p-5 border border-[#e8dfcf] bg-white transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#fdf5e7] text-[#db9b35]">
            <Images className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#db9b35]">OUTPUT</span>
        </div>
        <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#17362f]">
          {Number(framesCount).toLocaleString('en-IN')}
        </p>
        <p className="mt-1 text-xs font-semibold text-[#52665e]">
          Total Frames Created
        </p>
      </article>

      {/* 4. Total Downloads */}
      <article className="soft-card rounded-2xl p-4 sm:p-5 border border-[#e8dfcf] bg-white transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#e6f0fa] text-[#2563eb]">
            <DownloadCloud className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb]">DOWNLOADS</span>
        </div>
        <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#17362f]">
          {Number(downloadsCount).toLocaleString('en-IN')}
        </p>
        <p className="mt-1 text-xs font-semibold text-[#52665e]">
          Total Downloads
        </p>
      </article>

      {/* 5. Total Shares */}
      <article className="soft-card col-span-2 sm:col-span-1 rounded-2xl p-4 sm:p-5 border border-[#e8dfcf] bg-white transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#faece5] text-[#be6c45]">
            <Send className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#be6c45]">REACH</span>
        </div>
        <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#17362f]">
          {Number(sharesCount).toLocaleString('en-IN')}
        </p>
        <p className="mt-1 text-xs font-semibold text-[#52665e]">
          Total Shares
        </p>
      </article>
    </section>
  );
}
