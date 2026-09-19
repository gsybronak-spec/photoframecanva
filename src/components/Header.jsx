import React from 'react';
import { Flower2, ShieldCheck, LogOut, Plus } from 'lucide-react';

export default function Header({ onNewCampaign, onLogout, activeCampaignCount = 0 }) {
  return (
    <header className="hero-surface grain text-white border-b border-[#285d4e]/50">
      <div className="max-w-[1140px] mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full border border-[#f5d99d]/40 bg-[#f2c35e]/15 text-[#f4c35d] shadow-sm">
              <Flower2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d6e5dc]">
                YOGFRAME PORTAL
              </p>
              <p className="brand-serif text-2xl font-semibold tracking-tight text-[#faf6ed]">
                YogFrame Admin
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5d99d]/30 bg-white/10 px-3 py-1 text-[11px] font-bold text-[#fce8b8] backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-[#f5c75a]" />
              <span>ADMIN CONSOLE</span>
            </span>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Log out of admin session"
                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/20 hover:bg-black/40 px-3 py-1 text-[11px] font-medium text-white/90 transition-colors"
              >
                <LogOut className="h-3 w-3" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#c0d8cb]">
              CAMPAIGN MANAGEMENT & ASSET STUDIO
            </p>
            <h1 className="brand-serif text-2xl sm:text-3xl lg:text-4xl font-bold mt-1.5 leading-tight text-white">
              Create, Frame & Distribute Custom Artwork
            </h1>
            <p className="mt-2.5 max-w-2xl text-xs sm:text-sm leading-6 text-[#d5e4dc]">
              Upload campaign artwork as your base layer, directly drag, stretch and rotate, configure custom photo masks and typography, and generate isolated public links.
            </p>
          </div>

          {onNewCampaign && (
            <button
              onClick={onNewCampaign}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#db9b35] hover:bg-[#e6a844] text-[#17362f] px-4 py-2.5 text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 whitespace-nowrap self-start sm:self-end"
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
