import React, { useState, useMemo } from 'react';
import { DramaItem } from '../types/drama';
import { Wrench, AlertTriangle, CheckCircle2, Play, ShieldCheck, ArrowRight } from 'lucide-react';

interface LiveIssueBoardProps {
  dramas: DramaItem[];
  onSelectDrama: (drama: DramaItem) => void;
  onOpenSupport: () => void;
  isPhoneDevice?: boolean;
}

export const LiveIssueBoard: React.FC<LiveIssueBoardProps> = ({
  dramas,
  onSelectDrama,
  onOpenSupport,
  isPhoneDevice = false,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'issues' | 'fixed'>('all');

  const { activeIssues, resolvedFixes } = useMemo(() => {
    const seenIssues = new Set<string>();
    const seenFixed = new Set<string>();
    const issues: DramaItem[] = [];
    const fixed: DramaItem[] = [];

    for (const d of dramas) {
      if (!d || !d.id) continue;
      if (d.issueText && d.issueText.trim() && !seenIssues.has(d.id)) {
        seenIssues.add(d.id);
        issues.push(d);
      }
      if (d.issueFixedText && d.issueFixedText.trim() && !seenFixed.has(d.id)) {
        seenFixed.add(d.id);
        fixed.push(d);
      }
    }

    return { activeIssues: issues, resolvedFixes: fixed };
  }, [dramas]);

  const totalCount = activeIssues.length + resolvedFixes.length;

  // Compact healthy-status bar when zero issues or fixes exist
  if (totalCount === 0) {
    return (
      <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 my-6 w-full">
        <div
          className={`rounded-2xl bg-gradient-to-r from-emerald-950/35 via-[#111218] to-[#0d1117] border border-emerald-500/25 shadow-[0_8px_28px_rgba(16,185,129,0.1)] flex flex-wrap items-center justify-between gap-3 backdrop-blur-xl ${
            isPhoneDevice ? 'px-5 py-4' : 'px-4 sm:px-6 py-3'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)] animate-pulse shrink-0" />
            <p className={`font-extrabold text-emerald-200 tracking-wide ${isPhoneDevice ? 'text-base' : 'text-xs sm:text-sm'}`}>
              🟢 All 1080p Servers & Audio Tracks Operating 100% Smoothly
            </p>
          </div>

          <button
            onClick={onOpenSupport}
            className={`inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-black transition-all cursor-pointer shrink-0 ${
              isPhoneDevice ? 'px-4 py-2.5 text-sm' : 'px-3.5 py-1.5 text-xs'
            }`}
          >
            <AlertTriangle className={isPhoneDevice ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
            <span>⚠️ Report an Issue</span>
          </button>
        </div>
      </section>
    );
  }

  const showIssuesColumn = activeTab === 'all' || activeTab === 'issues';
  const showFixedColumn = activeTab === 'all' || activeTab === 'fixed';
  const isTwoCol = activeTab === 'all';

  return (
    <section className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 my-8 w-full">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#12131d] via-[#0e0f17] to-[#0a0b10] border border-white/10 shadow-[0_14px_45px_rgba(0,0,0,0.7)] p-5 sm:p-7 w-full backdrop-blur-xl">
        {/* Ambient futuristic neon glows */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-5 border-b border-white/[0.08]">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black uppercase tracking-wider bg-white/[0.06] border border-white/15 text-zinc-100 ${
                  isPhoneDevice ? 'text-xs' : 'text-[11px]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
                <span>LIVE CLOUD SHEET SYNC</span>
              </span>

              {activeIssues.length > 0 && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black bg-amber-500/15 border border-amber-500/35 text-amber-300 ${
                    isPhoneDevice ? 'text-xs' : 'text-[11px]'
                  }`}
                >
                  ⚠️ {activeIssues.length} Fixing
                </span>
              )}

              {resolvedFixes.length > 0 && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 ${
                    isPhoneDevice ? 'text-xs' : 'text-[11px]'
                  }`}
                >
                  ✅ {resolvedFixes.length} Fixed
                </span>
              )}
            </div>

            <h2
              className={`font-black text-white tracking-tight flex items-center gap-2.5 ${
                isPhoneDevice ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
              }`}
            >
              <span>🛠️ Live Issue Tracker & Fix Notice Board</span>
            </h2>

            <p className={`text-zinc-300 max-w-3xl leading-relaxed ${isPhoneDevice ? 'text-base' : 'text-xs sm:text-sm'}`}>
              Real-time transparency on reported link/audio issues and instant fixes synced from our live cloud sheet
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenSupport}
              className={`inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer ${
                isPhoneDevice ? 'px-5 py-3 text-sm' : 'px-4 py-2 text-xs'
              }`}
            >
              <AlertTriangle className={isPhoneDevice ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
              <span>⚠️ Report an Issue</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="relative z-10 flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-4 mb-5 border-b border-white/[0.06]">
          <button
            onClick={() => setActiveTab('all')}
            className={`rounded-xl font-black transition-all shrink-0 cursor-pointer ${
              isPhoneDevice ? 'px-4 py-2 text-sm' : 'px-3.5 py-1.5 text-xs'
            } ${
              activeTab === 'all'
                ? 'bg-white text-black shadow-lg'
                : 'bg-white/[0.05] hover:bg-white/10 text-zinc-300 border border-white/10'
            }`}
          >
            All Updates ({totalCount})
          </button>

          <button
            onClick={() => setActiveTab('issues')}
            className={`rounded-xl font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              isPhoneDevice ? 'px-4 py-2 text-sm' : 'px-3.5 py-1.5 text-xs'
            } ${
              activeTab === 'issues'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25'
            }`}
          >
            <span>⚠️ Active Issues ({activeIssues.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('fixed')}
            className={`rounded-xl font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              isPhoneDevice ? 'px-4 py-2 text-sm' : 'px-3.5 py-1.5 text-xs'
            } ${
              activeTab === 'fixed'
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-[0_0_16px_rgba(16,185,129,0.45)]'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25'
            }`}
          >
            <span>✅ Recently Fixed ({resolvedFixes.length})</span>
          </button>
        </div>

        {/* Two Side-by-Side Cyber-Glass Columns */}
        <div className={`relative z-10 grid gap-5 ${isTwoCol ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {/* COLUMN 1: ACTIVE ISSUES / BEING FIXED */}
          {showIssuesColumn && (
            <div className="rounded-2xl bg-gradient-to-br from-amber-950/25 via-[#151218]/90 to-[#0e0f15] border border-amber-500/35 shadow-[0_0_25px_rgba(245,158,11,0.1)] p-4 sm:p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-amber-500/20">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300">
                    <Wrench className={isPhoneDevice ? 'w-5 h-5' : 'w-4 h-4'} />
                  </div>
                  <div>
                    <h3 className={`font-black text-amber-200 ${isPhoneDevice ? 'text-lg' : 'text-sm sm:text-base'}`}>
                      ⚠️ Active Issues / Being Fixed
                    </h3>
                    <p className={`text-zinc-400 ${isPhoneDevice ? 'text-xs' : 'text-[11px]'}`}>
                      Our team is actively patching links & audio tracks
                    </p>
                  </div>
                </div>
                <span
                  className={`font-black rounded-full bg-amber-500/20 border border-amber-400/35 text-amber-200 shrink-0 ${
                    isPhoneDevice ? 'text-xs px-3 py-1' : 'text-[11px] px-2.5 py-0.5'
                  }`}
                >
                  {activeIssues.length} Active
                </span>
              </div>

              {activeIssues.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-zinc-400">
                  <ShieldCheck className="w-9 h-9 text-emerald-400/80 mb-2" />
                  <p className={`font-bold text-zinc-200 ${isPhoneDevice ? 'text-base' : 'text-xs sm:text-sm'}`}>
                    Zero Active Issues Reported Right Now
                  </p>
                  <p className={`text-zinc-500 mt-0.5 ${isPhoneDevice ? 'text-xs' : 'text-[11px]'}`}>
                    All active streams are running normally.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {activeIssues.map((drama) => (
                    <div
                      key={`issue-${drama.id}`}
                      onClick={() => onSelectDrama(drama)}
                      className={`group cursor-pointer rounded-xl bg-black/45 hover:bg-amber-500/[0.08] border border-amber-500/25 hover:border-amber-400/55 transition-all flex items-start gap-3.5 ${
                        isPhoneDevice ? 'p-4' : 'p-3'
                      }`}
                    >
                      <div
                        className={`relative rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-white/10 ${
                          isPhoneDevice ? 'w-20 h-28' : 'w-14 h-20'
                        }`}
                      >
                        <img
                          src={drama.poster}
                          alt={drama.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4
                            className={`font-black text-white group-hover:text-amber-300 transition-colors truncate ${
                              isPhoneDevice ? 'text-lg' : 'text-sm'
                            }`}
                          >
                            {drama.title}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black animate-pulse shrink-0 ${
                              isPhoneDevice ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5'
                            }`}
                          >
                            🔧 TEAM FIXING NOW
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded bg-white/10 text-zinc-300 font-bold ${
                              isPhoneDevice ? 'text-xs px-2 py-0.5' : 'text-[10px] px-1.5 py-0.5'
                            }`}
                          >
                            {drama.category}
                          </span>
                          <span className={`text-zinc-400 font-semibold ${isPhoneDevice ? 'text-xs' : 'text-[11px]'}`}>
                            {drama.releaseYear}
                          </span>
                        </div>

                        <p
                          className={`text-amber-100 font-bold leading-snug bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 ${
                            isPhoneDevice ? 'text-sm' : 'text-xs'
                          }`}
                        >
                          {drama.issueText}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* COLUMN 2: ISSUE FIXED & RESOLVED */}
          {showFixedColumn && (
            <div className="rounded-2xl bg-gradient-to-br from-emerald-950/25 via-[#10171a]/90 to-[#0d1118] border border-emerald-500/35 shadow-[0_0_25px_rgba(16,185,129,0.1)] p-4 sm:p-5 flex flex-col">
              <div className="flex items-center justify-between gap-2 pb-3 mb-3.5 border-b border-emerald-500/20">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300">
                    <CheckCircle2 className={isPhoneDevice ? 'w-5 h-5' : 'w-4 h-4'} />
                  </div>
                  <div>
                    <h3 className={`font-black text-emerald-200 ${isPhoneDevice ? 'text-lg' : 'text-sm sm:text-base'}`}>
                      ✅ Issue Fixed & Resolved
                    </h3>
                    <p className={`text-zinc-400 ${isPhoneDevice ? 'text-xs' : 'text-[11px]'}`}>
                      Verified live 1080p streams & repaired audio tracks
                    </p>
                  </div>
                </div>
                <span
                  className={`font-black rounded-full bg-emerald-500/20 border border-emerald-400/35 text-emerald-200 shrink-0 ${
                    isPhoneDevice ? 'text-xs px-3 py-1' : 'text-[11px] px-2.5 py-0.5'
                  }`}
                >
                  {resolvedFixes.length} Fixed
                </span>
              </div>

              {resolvedFixes.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-zinc-400">
                  <CheckCircle2 className="w-9 h-9 text-zinc-600 mb-2" />
                  <p className={`font-bold text-zinc-300 ${isPhoneDevice ? 'text-base' : 'text-xs sm:text-sm'}`}>
                    No Recent Fixes Listed
                  </p>
                  <p className={`text-zinc-500 mt-0.5 ${isPhoneDevice ? 'text-xs' : 'text-[11px]'}`}>
                    Resolved updates from our sheet will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {resolvedFixes.map((drama) => (
                    <div
                      key={`fixed-${drama.id}`}
                      onClick={() => onSelectDrama(drama)}
                      className={`group cursor-pointer rounded-xl bg-black/45 hover:bg-emerald-500/[0.08] border border-emerald-500/25 hover:border-emerald-400/60 transition-all flex items-start gap-3.5 ${
                        isPhoneDevice ? 'p-4' : 'p-3'
                      }`}
                    >
                      <div
                        className={`relative rounded-xl overflow-hidden shrink-0 bg-zinc-900 border border-white/10 ${
                          isPhoneDevice ? 'w-20 h-28' : 'w-14 h-20'
                        }`}
                      >
                        <img
                          src={drama.poster}
                          alt={drama.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h4
                            className={`font-black text-white group-hover:text-emerald-300 transition-colors truncate ${
                              isPhoneDevice ? 'text-lg' : 'text-sm'
                            }`}
                          >
                            {drama.title}
                          </h4>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-black shadow-[0_0_12px_rgba(16,185,129,0.25)] shrink-0 ${
                              isPhoneDevice ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5'
                            }`}
                          >
                            ✅ ISSUE FIXED & LIVE
                          </span>
                        </div>

                        <p
                          className={`text-emerald-100 font-bold leading-snug bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5 ${
                            isPhoneDevice ? 'text-sm' : 'text-xs'
                          }`}
                        >
                          {drama.issueFixedText}
                        </p>

                        <div className="pt-0.5 flex items-center justify-between gap-2">
                          <span className={`text-zinc-400 font-semibold ${isPhoneDevice ? 'text-xs' : 'text-[11px]'}`}>
                            {drama.category} • {drama.releaseYear}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectDrama(drama);
                            }}
                            className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-black shadow-[0_0_14px_rgba(16,185,129,0.35)] transition-all cursor-pointer ${
                              isPhoneDevice ? 'px-4 py-2 text-sm' : 'px-3 py-1 text-xs'
                            }`}
                          >
                            <Play className={`${isPhoneDevice ? 'w-3.5 h-3.5' : 'w-3 h-3'} fill-white`} />
                            <span>▶ Open Drama</span>
                            <ArrowRight className={isPhoneDevice ? 'w-3.5 h-3.5' : 'w-3 h-3'} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
