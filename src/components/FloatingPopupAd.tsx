import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { AdConfig, DEFAULT_AD_CONFIG } from '../services/supabaseService';

interface FloatingPopupAdProps {
  adConfig: AdConfig;
  isDramaModalOpen?: boolean;
  isPlayerOpen?: boolean;
  isAdminOpen?: boolean;
  isPhoneDevice?: boolean;
}

export const FloatingPopupAd: React.FC<FloatingPopupAdProps> = ({
  adConfig,
  isDramaModalOpen = false,
  isPlayerOpen = false,
  isAdminOpen = false,
  isPhoneDevice = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedForThisVisit, setDismissedForThisVisit] = useState(false);
  const [popupStyle, setPopupStyle] = useState<'center' | 'floating'>('center');
  const [renderCycle, setRenderCycle] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasShownThisVisitRef = useRef(false);

  const isEnabled = Boolean(adConfig?.enabled && adConfig?.showPopupAd !== false);

  const safeBannerKey = useMemo(() => {
    const raw = (adConfig?.banner728Key || DEFAULT_AD_CONFIG.banner728Key).trim();
    return raw.replace(/[^a-zA-Z0-9_-]/g, '') || DEFAULT_AD_CONFIG.banner728Key;
  }, [adConfig?.banner728Key]);

  const safeAdDomain = useMemo(() => {
    const raw = (adConfig?.adDomain || DEFAULT_AD_CONFIG.adDomain).trim();
    const cleaned = raw
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .replace(/[^a-zA-Z0-9.-]/g, '');
    return cleaned || DEFAULT_AD_CONFIG.adDomain;
  }, [adConfig?.adDomain]);

  const adHtmlString = useMemo(() => {
    const customHtml = adConfig?.customBannerHtml?.trim();
    if (customHtml) {
      return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>html,body{margin:0;padding:0;background:transparent;display:flex;justify-content:center;align-items:center;overflow:hidden;}</style>
  </head>
  <body>
    ${customHtml}
  </body>
</html>`;
    }

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>html,body{margin:0;padding:0;background:transparent;display:flex;justify-content:center;align-items:center;overflow:hidden;}</style>
  </head>
  <body>
    <script type="text/javascript">
      atOptions = {
        'key' : '${safeBannerKey}',
        'format' : 'iframe',
        'height' : 90,
        'width' : 728,
        'params' : {}
      };
    </script>
    <script type="text/javascript" src="https://${safeAdDomain}/${safeBannerKey}/invoke.js"></script>
  </body>
</html>`;
  }, [adConfig?.customBannerHtml, safeBannerKey, safeAdDomain]);

  const isBlocked = Boolean(isPlayerOpen || isDramaModalOpen || isAdminOpen);

  // Hide immediately if disabled, dismissed, or while Drama Page / Player / Admin Studio is open
  useEffect(() => {
    if (!isEnabled || dismissedForThisVisit || isBlocked) {
      setIsVisible(false);
    }
  }, [isEnabled, dismissedForThisVisit, isBlocked]);

  // Trigger ONCE per page load after initial 8-second delay (never repeats once shown or closed until page refresh)
  useEffect(() => {
    if (!isEnabled || dismissedForThisVisit || hasShownThisVisitRef.current || isBlocked) return;

    const initialTimer = window.setTimeout(() => {
      if (hasShownThisVisitRef.current || dismissedForThisVisit || isBlocked) {
        return;
      }
      hasShownThisVisitRef.current = true;
      setPopupStyle('center');
      setRenderCycle((c) => c + 1);
      setIsVisible(true);
    }, 8000);

    return () => {
      window.clearTimeout(initialTimer);
    };
  }, [isEnabled, dismissedForThisVisit, isBlocked]);

  // Inject Adsterra HTML via contentWindow.document.write (preserves real site origin)
  useEffect(() => {
    if (!isVisible || !isEnabled || dismissedForThisVisit) return;

    const iframe = iframeRef.current;
    const doc = iframe?.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(adHtmlString);
    doc.close();

    // Auto-close if ad creative is blocked or empty after 5s so no empty black box remains
    const emptyCheckTimer = window.setTimeout(() => {
      try {
        const body = iframeRef.current?.contentWindow?.document?.body;
        if (!body || body.querySelectorAll('iframe, img, a, ins, div, span, canvas').length === 0) {
          setIsVisible(false);
          setDismissedForThisVisit(true);
        }
      } catch {
        // Cross-origin frame populated cleanly
      }
    }, 5000);

    return () => {
      window.clearTimeout(emptyCheckTimer);
    };
  }, [isVisible, isEnabled, dismissedForThisVisit, renderCycle, adHtmlString]);

  const handleClose = () => {
    setIsVisible(false);
    setDismissedForThisVisit(true);
  };

  if (!isEnabled || dismissedForThisVisit || !isVisible || isBlocked) return null;

  if (popupStyle === 'center') {
    return (
      <div
        onClick={handleClose}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
        role="dialog"
        aria-modal="true"
        aria-label="Sponsored VIP Spotlight Offer"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[820px] p-[1.5px] rounded-2xl bg-gradient-to-r from-[#e50914] via-[#a855f7] to-[#f59e0b] shadow-[0_0_55px_rgba(229,9,20,0.45)] animate-slide-up"
        >
          <div className="bg-[#0b0c14]/95 backdrop-blur-xl rounded-[15px] p-4 sm:p-5 relative overflow-hidden">
            {/* Neon Corner Orbs */}
            <div className="pointer-events-none absolute -top-16 -left-16 w-48 h-48 rounded-full bg-[#e50914]/25 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-[#a855f7]/25 blur-3xl animate-pulse" />

            {/* Header Row */}
            <div className="relative z-10 flex items-center justify-between gap-3 pb-3 mb-3.5 border-b border-white/10">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-gradient-to-r from-[#e50914] via-[#d946ef] to-[#f59e0b] text-white font-black uppercase tracking-wider shadow-[0_0_18px_rgba(229,9,20,0.6)] animate-pulse ${
                    isPhoneDevice ? 'text-xs' : 'text-[11px]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ SPONSORED VIP FLASH DEAL</span>
                </span>
                <span className="text-[11px] font-bold text-zinc-400">
                  100% Free AsiaFlix Prime Support
                </span>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-[#e50914] text-white text-xs font-black border border-white/15 flex items-center gap-1 transition-all cursor-pointer shrink-0"
                aria-label="Close Sponsored Ad"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </div>

            {/* Sleek Cinema Ad Stage */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center rounded-xl bg-black/50 border border-white/10 p-3 sm:p-4 overflow-hidden">
              <iframe
                key={`popup-center-${renderCycle}-${safeBannerKey}`}
                ref={iframeRef}
                title="ad-popup-center"
                scrolling="no"
                frameBorder={0}
                width={728}
                height={90}
                className="mx-auto max-w-full overflow-hidden relative z-10 border-0 bg-transparent block transform scale-100 sm:scale-105"
              />
            </div>

            <div className="relative z-10 mt-3 flex items-center justify-between text-[11px] text-zinc-400">
              <span>Sponsored VIP Partner Offer</span>
              <button
                type="button"
                onClick={handleClose}
                className="text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer"
              >
                Continue to AsiaFlix Prime →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Bottom-Left Floating Cyber-Glass Ad Widget
  return (
    <aside
      aria-label="Floating Sponsored Widget"
      className="fixed bottom-4 left-4 z-[65] max-w-[770px] w-[calc(100vw-240px)] min-w-[340px] animate-slide-up"
    >
      <div className="p-[1.5px] rounded-2xl bg-gradient-to-r from-[#e50914] via-[#a855f7] to-[#f59e0b] shadow-[0_12px_40px_rgba(0,0,0,0.9)]">
        <div className="bg-[#0b0c14]/95 backdrop-blur-xl rounded-[15px] p-3 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -left-10 w-32 h-32 rounded-full bg-[#e50914]/20 blur-2xl animate-pulse" />

          <div className="relative z-10 flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#e50914] to-[#a855f7] text-white text-[10px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(229,9,20,0.45)] animate-pulse">
              <span>⚡ SPONSORED VIP FLASH DEAL</span>
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded-lg bg-white/10 hover:bg-[#e50914] text-zinc-200 hover:text-white border border-white/15 transition-colors cursor-pointer"
              aria-label="Dismiss Floating Ad"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="relative z-10 w-full flex items-center justify-center overflow-hidden rounded-lg bg-black/40 p-1">
            <iframe
              key={`popup-floating-${renderCycle}-${safeBannerKey}`}
              ref={iframeRef}
              title="ad-popup-floating"
              scrolling="no"
              frameBorder={0}
              width={728}
              height={90}
              className="mx-auto max-w-full overflow-hidden relative z-10 border-0 bg-transparent block"
            />
          </div>
        </div>
      </div>
    </aside>
  );
};
