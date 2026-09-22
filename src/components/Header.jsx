import React from 'react';
import { ShieldCheck, LogOut, Plus } from 'lucide-react';

export default function Header({ onNewCampaign, onLogout, activeCampaignCount = 0 }) {
  return (
    <header className="hero-surface grain text-white border-b border-[#285d4e]/50">
      <div className="max-w-[1140px] mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/gujarat-yog-board-logo.png"
              alt="Gujarat State Yog Board"
              className="h-11 w-11 sm:h-12 sm:w-12 object-contain rounded-full bg-white/95 p-0.5 shadow-md shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] sm:tracking-[0.24em] text-[#d6e5dc] truncate">
                GUJARAT STATE YOG BOARD
              </p>
              <p className="brand-serif text-xl sm:text-2xl font-semibold tracking-tight text-[#faf6ed] truncate">
                YogBoardFrame Admin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#f5d99d]/30 bg-white/10 px-3 py-1 text-[11px] font-bold text-[#fce8b8] backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-[#f5c75a]" />
              <span>ADMIN CONSOLE</span>
            </span>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Log out of admin session"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full border border-white/20 bg-black/25 hover:bg-black/40 px-3.5 py-2 text-xs font-semibold text-white transition-colors active:scale-95"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="text-xs">Logout</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c0d8cb]">
              CAMPAIGN MANAGEMENT & ASSET STUDIO
            </p>
            <h1 className="brand-serif text-2xl sm:text-3xl lg:text-4xl font-bold mt-1.5 leading-tight text-white">
              Create, Frame & Distribute Custom Artwork
            </h1>
            <p className="mt-2 max-w-2xl text-xs sm:text-sm leading-5 sm:leading-6 text-[#d5e4dc]">
              Upload campaign artwork as your fixed base frame, configure custom photo masks and typography, and generate isolated public links.
            </p>
          </div>

          {onNewCampaign && (
            <button
              onClick={onNewCampaign}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-[#db9b35] hover:bg-[#e6a844] text-[#17362f] px-4 py-2.5 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 whitespace-nowrap self-start sm:self-end"
            >
              <Plus className="h-4 w-4" />
              <span>New Campaign</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
