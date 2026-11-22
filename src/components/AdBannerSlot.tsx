import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { AdConfig } from '../services/supabaseService';

interface AdBannerSlotProps {
  slot: 'home' | 'modal' | 'footer';
  adConfig: AdConfig;
  isPhoneDevice?: boolean;
}

function sanitizeHttpUrl(rawUrl?: string): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  const trimmed = rawUrl.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // Try prefixing https:// only if user pasted bare domain
    if (!/^[a-zA-Z]+:/.test(trimmed) && trimmed.includes('.')) {
      try {
        const prefixed = new URL(`https://${trimmed}`);
        return prefixed.toString();
      } catch {
        return null;
      }
    }
  }
  return null;
}

export const AdBannerSlot: React.FC<AdBannerSlotProps> = ({
  slot,
  adConfig,
  isPhoneDevice = false,
}) => {
  const scriptContainerRef = useRef<HTMLDivElement>(null);
  const [imgError, setImgError] = useState(false);

  const isSlotVisible = useMemo(() => {
    if (!adConfig || !adConfig.enabled) return false;
    if (slot === 'home' && !adConfig.showHomeBanner) return false;
    if (slot === 'modal' && !adConfig.showModalBanner) return false;
    if (slot === 'footer' && !adConfig.showFooterBanner) return false;

    if (adConfig.mode === 'script') {
      return Boolean(adConfig.scriptHtml && adConfig.scriptHtml.trim());
    }

    return Boolean(
      (adConfig.customHeadline && adConfig.customHeadline.trim()) ||
        (adConfig.customImageUrl && adConfig.customImageUrl.trim()) ||
        (adConfig.customTargetUrl && adConfig.customTargetUrl.trim())
    );
  }, [adConfig, slot]);

  const usesDocumentWrite = useMemo(() => {
    if (adConfig?.mode !== 'script' || !adConfig.scriptHtml) return false;
    return /document\.write/i.test(adConfig.scriptHtml);
  }, [adConfig?.mode, adConfig?.scriptHtml]);

  const isolatedIframeSrcDoc = useMemo(() => {
    if (!usesDocumentWrite || !adConfig?.scriptHtml) return '';
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    background: transparent;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 90px;
    overflow: hidden;
    font-family: system-ui, -apple-system, sans-serif;
  }
</style>
</head>
<body>${adConfig.scriptHtml}</body>
</html>`;
  }, [usesDocumentWrite, adConfig?.scriptHtml]);

  useEffect(() => {
    setImgError(false);
  }, [adConfig?.customImageUrl]);

  useEffect(() => {
    if (!isSlotVisible || adConfig.mode !== 'script' || usesDocumentWrite) return;
    const container = scriptContainerRef.current;
    if (!container) return;

    container.replaceChildren();
    const rawHtml = adConfig.scriptHtml.trim();
    if (!rawHtml) return;

    try {
      const range = document.createRange();
      range.selectNode(container);
      const fragment = range.createContextualFragment(rawHtml);
      container.appendChild(fragment);
    } catch {
      // Fallback: ignore malformed HTML snippet quietly
    }

    return () => {
      if (scriptContainerRef.current) {
        scriptContainerRef.current.replaceChildren();
      }
    };
  }, [isSlotVisible, adConfig?.mode, adConfig?.scriptHtml, usesDocumentWrite, slot]);

  if (!isSlotVisible) return null;

  const safeTargetUrl = sanitizeHttpUrl(adConfig.customTargetUrl);
  const safeImageUrl = sanitizeHttpUrl(adConfig.customImageUrl);
  const badgeLabel = (adConfig.customBadgeText || 'SPONSORED PARTNER').trim();
  const headlineText = (
    adConfig.customHeadline || 'Featured Partner Offer — Support Free 1080p Streaming'
  ).trim();

  return (
    <div
      className={`relative bg-gradient-to-r from-[#11121a] via-[#161824] to-[#11121a] border border-white/10 rounded-2xl p-3 shadow-lg overflow-hidden transition-all ${
        slot === 'home' ? 'mb-5' : slot === 'footer' ? 'mt-10' : 'my-1'
      }`}
    >
      {/* Subtle ambient highlight */}
      <div className="pointer-events-none absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[#e50914]/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-amber-500/10 blur-2xl" />

      {/* Top-right Sponsored pill */}
      <span className="absolute top-2 right-2.5 z-10 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-zinc-400 border border-white/10 pointer-events-none">
        SPONSORED • AD
      </span>

      {adConfig.mode === 'script' ? (
        <div className="relative z-0 pt-3 pb-1 flex items-center justify-center min-h-[76px] w-full overflow-hidden">
          {usesDocumentWrite ? (
            <iframe
              title={`Sponsored Advertisement (${slot})`}
              srcDoc={isolatedIframeSrcDoc}
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
              className="w-full min-h-[96px] border-0 bg-transparent overflow-hidden rounded-xl"
              scrolling="no"
            />
          ) : (
            <div
              ref={scriptContainerRef}
              className="w-full flex items-center justify-center min-h-[76px] overflow-x-auto no-scrollbar"
            />
          )}
        </div>
      ) : (
        <a
          href={safeTargetUrl || '#'}
          target={safeTargetUrl ? '_blank' : undefined}
          rel={safeTargetUrl ? 'noopener noreferrer' : undefined}
          onClick={(e) => {
            if (!safeTargetUrl) e.preventDefault();
          }}
          className={`relative z-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 rounded-xl p-2 sm:p-2.5 transition-all group ${
            safeTargetUrl
              ? 'cursor-pointer hover:bg-white/[0.03]'
              : 'cursor-default'
          } ${
            !safeImageUrl || imgError
              ? 'bg-gradient-to-r from-[#e50914]/10 via-amber-500/10 to-purple-500/10 border border-white/[0.06]'
              : ''
          }`}
        >
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 pr-16 sm:pr-0">
            {safeImageUrl && !imgError ? (
              <div
                className={`shrink-0 overflow-hidden rounded-xl border border-white/15 bg-black/50 shadow-md ${
                  slot === 'modal'
                    ? 'w-28 h-16 sm:w-40 sm:h-20'
                    : isPhoneDevice
                    ? 'w-36 h-20'
                    : 'w-32 h-16 sm:w-48 sm:h-20'
                }`}
              >
                <img
                  src={safeImageUrl}
                  alt={headlineText}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#e50914]/25 to-amber-500/25 border border-amber-400/30 flex items-center justify-center shrink-0 shadow">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {badgeLabel}
              </span>
              <h4
                className={`font-black text-white leading-snug line-clamp-2 group-hover:text-amber-200 transition-colors ${
                  isPhoneDevice ? 'text-sm' : 'text-xs sm:text-sm'
                }`}
              >
                {headlineText}
              </h4>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end sm:pr-24">
            <span
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#e50914] to-[#ff2b54] text-white font-black shadow-[0_0_15px_rgba(229,9,20,0.45)] group-hover:scale-105 transition-all whitespace-nowrap ${
                isPhoneDevice ? 'text-xs' : 'text-xs'
              }`}
            >
              <span>Visit Sponsor →</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </span>
          </div>
        </a>
      )}
    </div>
  );
};
