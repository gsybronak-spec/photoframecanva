import React, { useState } from 'react';
import { ShieldCheck, Lock, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminAuthModal({ onAuthenticated }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please verify credentials.');
      }

      localStorage.setItem('yogframe_admin_token', data.token);
      onAuthenticated(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17362f]/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md rounded-[28px] border border-[#e8dfcf] bg-white p-6 sm:p-8 shadow-2xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#eaf2ed] text-[#1f4a3f] shadow-sm">
          <ShieldCheck className="h-7 w-7 text-[#1f4a3f]" />
        </div>

        <div className="mt-4 text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#79987e]">
            RESTRICTED ACCESS
          </span>
          <h2 className="brand-serif text-2xl font-bold text-[#17362f]">
            YogFrame Admin Portal
          </h2>
          <p className="mt-1 text-xs text-[#52665e]">
            Please enter your administrator passkey to access campaign studio and management controls.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#52665e]">
              Admin Password
            </label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter admin password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#e5dccd] bg-[#fdfbf6] py-3 pl-10 pr-4 text-sm text-[#17362f] placeholder-gray-400 focus:border-[#db9b35] focus:outline-none focus:ring-2 focus:ring-[#db9b35]/20 shadow-inner"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-[#faece5] p-3 text-xs font-bold text-[#be6c45]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f4a3f] hover:bg-[#16382f] py-3.5 px-4 text-sm font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-60"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Studio</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] text-[#79987e]">
          Protected by server-side verification and session token.
        </p>
      </div>
    </div>
  );
}
