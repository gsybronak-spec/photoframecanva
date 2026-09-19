import React from 'react';
import { Leaf, PenLine, Images, Send } from 'lucide-react';

export default function MetricsRow({ metrics = {} }) {
  const activeCount = metrics.activeCampaigns ?? 0;
  const draftCount = metrics.draftCampaigns ?? 0;
  const framesCount = metrics.totalFrames ?? 0;
  const sharesCount = metrics.totalShares ?? 0;

  return (
    <section aria-label="Campaign metrics" className="-mt-5 grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
      {/* 1. Active Campaigns */}
      <article className="soft-card rounded-2xl p-4 sm:p-5 border border-[#e8dfcf] bg-white transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf2ed] text-[#417264]">
            <Leaf className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#79987e]">LIVE</span>
        </div>
        <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#17362f]">
          {String(activeCount).padStart(2, '0')}
        </p>
        <p className="mt-1 text-xs font-semibold text-[#52665e]">
          Active Campaigns
        </p>
      </article>

      {/* 2. Draft Campaigns */}
      <article className="soft-card rounded-2xl p-4 sm:p-5 border border-[#e8dfcf] bg-white transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#faece5] text-[#be6c45]">
            <PenLine className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#be6c45]">WIP</span>
        </div>
        <p className="mt-3 text-2xl sm:text-3xl font-extrabold text-[#17362f]">
          {String(draftCount).padStart(2, '0')}
        </p>
        <p className="mt-1 text-xs font-semibold text-[#52665e]">
          Draft Campaigns
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

      {/* 4. Total Shares */}
      <article className="soft-card rounded-2xl p-4 sm:p-5 border border-[#e8dfcf] bg-white transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#eaf2ed] text-[#417264]">
            <Send className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#417264]">REACH</span>
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
