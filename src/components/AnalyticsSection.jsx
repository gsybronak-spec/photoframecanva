import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController,
} from 'chart.js';
import {
  TrendingUp,
  MessageCircle,
  Share2,
  Instagram,
  Facebook,
  DownloadCloud,
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  BarController
);

export default function AnalyticsSection({ metrics = {} }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const activeCampaigns = metrics.activeCampaigns ?? 0;
  const draftCampaigns = metrics.draftCampaigns ?? 0;
  const totalCampaigns = metrics.totalCampaigns ?? (activeCampaigns + draftCampaigns);
  const totalFrames = metrics.totalFrames ?? 0;
  const totalShares = metrics.totalShares ?? 0;

  const whatsappShares = metrics.whatsappShares ?? 0;
  const facebookShares = metrics.facebookShares ?? 0;
  const instagramShares = metrics.instagramShares ?? 0;
  const linkShares = metrics.linkShares ?? 0;
  const downloads = metrics.downloads ?? 0;

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    chartInstance.current = new ChartJS(ctx, {
      type: 'bar',
      data: {
        labels: ['Active Campaigns', 'Frames Generated', 'Total Shares'],
        datasets: [
          {
            data: [activeCampaigns, totalFrames, totalShares],
            backgroundColor: ['#417264', '#db9b35', '#be6c45'],
            borderRadius: 8,
            maxBarThickness: 54,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#17362f',
            titleFont: { family: 'DM Sans', weight: 'bold' },
            bodyFont: { family: 'DM Sans' },
            padding: 10,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: '#52665e',
              font: { family: 'DM Sans', weight: 'bold', size: 12 },
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(232, 223, 207, 0.6)' },
            ticks: {
              color: '#52665e',
              font: { family: 'DM Sans', size: 11 },
              stepSize: 1,
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [activeCampaigns, totalFrames, totalShares]);

  return (
    <section className="soft-card mt-10 rounded-[26px] p-5 sm:p-7 border border-[#e8dfcf] bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#79987e]">
            REAL ENGAGEMENT METRICS
          </p>
          <h2 className="brand-serif mt-1 text-2xl font-bold text-[#17362f]">
            Campaign Performance & Analytics
          </h2>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-full bg-[#eaf2ed] text-[#417264]">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="mt-6 h-56 sm:h-64 w-full">
        <canvas ref={chartRef} aria-label="Campaign metrics chart" />
      </div>

      {/* Social & Channel Breakdown (Real database events) */}
      <div className="mt-8 border-t border-[#e8dfcf] pt-5">
        <p className="text-xs font-bold uppercase tracking-wider text-[#52665e]">
          Platform Share & Download Breakdown
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
          {/* WhatsApp */}
          <div className="rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-3 text-center">
            <div className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-green-100 text-green-700">
              <MessageCircle className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#52665e]">WhatsApp</p>
            <p className="font-mono text-base font-extrabold text-[#17362f]">
              {whatsappShares}
            </p>
          </div>

          {/* Facebook */}
          <div className="rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-3 text-center">
            <div className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-blue-100 text-blue-700">
              <Facebook className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#52665e]">Facebook</p>
            <p className="font-mono text-base font-extrabold text-[#17362f]">
              {facebookShares}
            </p>
          </div>

          {/* Instagram */}
          <div className="rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-3 text-center">
            <div className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-pink-100 text-pink-700">
              <Instagram className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#52665e]">Instagram</p>
            <p className="font-mono text-base font-extrabold text-[#17362f]">
              {instagramShares}
            </p>
          </div>

          {/* Link / Direct */}
          <div className="rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-3 text-center">
            <div className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-[#eaf2ed] text-[#417264]">
              <Share2 className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#52665e]">Link / Referral</p>
            <p className="font-mono text-base font-extrabold text-[#17362f]">
              {linkShares}
            </p>
          </div>

          {/* Downloads */}
          <div className="rounded-xl border border-[#e8dfcf] bg-[#faf6ed] p-3 text-center">
            <div className="mx-auto grid h-7 w-7 place-items-center rounded-lg bg-[#fdf5e7] text-[#db9b35]">
              <DownloadCloud className="h-4 w-4" />
            </div>
            <p className="mt-2 text-xs font-semibold text-[#52665e]">Downloads</p>
            <p className="font-mono text-base font-extrabold text-[#17362f]">
              {downloads}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
