import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AdConfig, DEFAULT_AD_CONFIG } from '../services/supabaseService';

interface AdBannerSlotProps {
  slot: 'home' | 'modal' | 'footer';
  adConfig: AdConfig;
  isPhoneDevice?: boolean;
}

function sanitizeHttpUrl(rawUrl?: string): string | null {
  if (!rawUrl || !rawUrl.trim()) return null;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

export const AdBannerSlot: React.FC<AdBannerSlotProps> = ({
  slot,
  adConfig,
  isPhoneDevice = false,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const nativeIframeRef = useRef<HTMLIFrameElement>(null);
  const nativeContainerRef = useRef<HTMLDivElement>(null);
  const [adUnavailable, setAdUnavailable] = useState(false);

  const isSlotVisible = useMemo(() => {
    if (!adConfig || !adConfig.enabled) return false;
    if (slot === 'home' && !adConfig.showHomeBanner) return false;
    if (slot === 'modal' && !adConfig.showModalBanner) return false;
    if (slot === 'footer' && !adConfig.showFooterNative) return false;
    return true;
  }, [adConfig, slot]);

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

  const safeNativeScriptSrc = useMemo(() => {
    return (
      sanitizeHttpUrl(adConfig?.nativeScriptSrc) ||
      DEFAULT_AD_CONFIG.nativeScriptSrc
    );
  }, [adConfig?.nativeScriptSrc]);

  const safeNativeContainerId = useMemo(() => {
    const raw = (adConfig?.nativeContainerId || DEFAULT_AD_CONFIG.nativeContainerId).trim();
    return raw.replace(/[^a-zA-Z0-9_-]/g, '') || DEFAULT_AD_CONFIG.nativeContainerId;
  }, [adConfig?.nativeContainerId]);

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

  const customNativeUsesDocWrite = useMemo(() => {
    if (slot !== 'footer' || !adConfig?.customNativeHtml) return false;
    return /document\.write/i.test(adConfig.customNativeHtml);
  }, [slot, adConfig?.customNativeHtml]);

  const customNativeHtmlString = useMemo(() => {
    if (!customNativeUsesDocWrite || !adConfig?.customNativeHtml) return '';
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>html,body{margin:0;padding:0;background:transparent;color:#ffffff;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;}</style>
  </head>
  <body>
    ${adConfig.customNativeHtml}
  </body>
</html>`;
  }, [customNativeUsesDocWrite, adConfig?.customNativeHtml]);

  const nativeGridCustomCss = useMemo(() => {
    const id = safeNativeContainerId;
    return `
      #${id} {
        width: 100%;
      }
      #${id} a {
        display: flex;
        flex-direction: column;
        gap: 8px;
        text-decoration: none;
        border-radius: 16px;
        padding: 10px;
        background: linear-gradient(160deg, rgba(255,255,255,0.045), rgba(14,15,24,0.92));
        border: 1px solid rgba(255,255,255,0.12);
        box-shadow: 0 8px 24px rgba(0,0,0,0.55), 0 0 18px rgba(229,9,20,0.14);
        transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        overflow: hidden;
      }
      #${id} a:hover {
        transform: translateY(-4px);
        border-color: rgba(245,158,11,0.65);
        box-shadow: 0 14px 32px rgba(229,9,20,0.28), 0 0 22px rgba(168,85,247,0.28);
      }
      #${id} img {
        border-radius: 14px !important;
        border: 1px solid rgba(255,255,255,0.14) !important;
        box-shadow: 0 6px 20px rgba(0,0,0,0.6) !important;
        object-fit: cover !important;
        transition: transform 0.35s ease !important;
      }
      #${id} a:hover img {
        transform: scale(1.03);
      }
      #${id} [class*="title"],
      #${id} p,
      #${id} span,
      #${id} h3,
      #${id} h4 {
        color: #ffffff !important;
        font-weight: 800 !important;
        letter-spacing: 0.01em;
        transition: color 0.2s ease;
      }
      #${id} a:hover [class*="title"],
      #${id} a:hover p,
      #${id} a:hover h3,
      #${id} a:hover h4 {
        color: #fcd34d !important;
      }
    `;
  }, [safeNativeContainerId]);

  // Reset adUnavailable whenever config changes
  useEffect(() => {
    setAdUnavailable(false);
  }, [
    slot,
    adConfig?.enabled,
    adConfig?.banner728Key,
    adConfig?.adDomain,
    adConfig?.customBannerHtml,
    adConfig?.nativeScriptSrc,
    adConfig?.nativeContainerId,
    adConfig?.customNativeHtml,
  ]);

  // Execute 728x90 Leaderboard inside iframe via contentWindow.document.write (preserves real site origin)
  useEffect(() => {
    if (!isSlotVisible || adUnavailable || (slot !== 'home' && slot !== 'modal')) return;

    const iframe = iframeRef.current;
    const doc = iframe?.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(adHtmlString);
    doc.close();

    const timer = window.setTimeout(() => {
      try {
        const body = iframeRef.current?.contentWindow?.document?.body;
        if (!body) {
          setAdUnavailable(true);
          return;
        }
        const renderedNodes = body.querySelectorAll('iframe, img, a, ins, div, span, canvas');
        if (renderedNodes.length === 0) {
          setAdUnavailable(true);
        }
      } catch {
        // Cross-origin frame populated cleanly — keep visible
      }
    }, 5000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isSlotVisible, adUnavailable, slot, adHtmlString]);

  // Execute Footer NativeBanner (with document.write iframe fallback if custom HTML uses document.write)
  useEffect(() => {
    if (!isSlotVisible || adUnavailable || slot !== 'footer') return;

    if (customNativeUsesDocWrite) {
      const iframe = nativeIframeRef.current;
      const doc = iframe?.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(customNativeHtmlString);
      doc.close();

      const timer = window.setTimeout(() => {
        try {
          const body = nativeIframeRef.current?.contentWindow?.document?.body;
          if (!body || body.querySelectorAll('iframe, img, a, ins, div, span').length === 0) {
            setAdUnavailable(true);
          }
        } catch {}
      }, 5000);

      return () => {
        window.clearTimeout(timer);
      };
    }

    const host = nativeContainerRef.current;
    if (!host) return;

    host.replaceChildren();
    let timerId: number | undefined;

    const customNative = adConfig?.customNativeHtml?.trim();
    if (customNative) {
      try {
        const range = document.createRange();
        range.selectNode(host);
        const fragment = range.createContextualFragment(customNative);
        host.appendChild(fragment);
      } catch {
        setAdUnavailable(true);
      }
    } else {
      const containerDiv = document.createElement('div');
      containerDiv.id = safeNativeContainerId;

      const adScript = document.createElement('script');
      adScript.async = true;
      adScript.setAttribute('data-cfasync', 'false');
      adScript.src = safeNativeScriptSrc;
      adScript.onerror = () => {
        setAdUnavailable(true);
      };

      host.appendChild(adScript);
      host.appendChild(containerDiv);

      timerId = window.setTimeout(() => {
        if (containerDiv.children.length === 0 && !containerDiv.textContent?.trim()) {
          setAdUnavailable(true);
        }
      }, 5000);
    }

    return () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      if (nativeContainerRef.current) {
        nativeContainerRef.current.replaceChildren();
      }
    };
  }, [
    isSlotVisible,
    adUnavailable,
    slot,
    adConfig?.customNativeHtml,
    customNativeUsesDocWrite,
    customNativeHtmlString,
    safeNativeScriptSrc,
    safeNativeContainerId,
  ]);

  if (!isSlotVisible || adUnavailable) return null;

  const wrapperClass =
    slot === 'modal'
      ? 'w-full my-3'
      : 'max-w-[1600px] mx-auto my-5 px-4 sm:px-6 lg:px-8 w-full';

  return (
    <section className={wrapperClass} aria-label={`Sponsored ${slot} slot`}>
      {slot === 'footer' && <style>{nativeGridCustomCss}</style>}

      {/* Multi-layered Glowing Gradient Border */}
      <div className="p-[1.5px] rounded-2xl bg-gradient-to-r from-[#e50914] via-[#a855f7] to-[#f59e0b] shadow-[0_0_35px_rgba(229,9,20,0.22)]">
        {/* Inner Dark Velvet Glass Container */}
        <div className="bg-[#0b0c14]/95 backdrop-blur-xl rounded-[15px] p-4 relative overflow-hidden">
          {/* Subtle Animated Radial Neon Glow Orbs in Corners */}
          <div className="pointer-events-none absolute -top-16 -left-16 w-48 h-48 rounded-full bg-radial from-[#e50914]/25 via-[#a855f7]/10 to-transparent blur-2xl animate-pulse" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 w-52 h-52 rounded-full bg-radial from-[#f59e0b]/25 via-[#a855f7]/15 to-transparent blur-2xl animate-pulse" />
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-24 rounded-full bg-[#a855f7]/[0.06] blur-3xl" />

          {/* VIP Neon Spotlight Header Bar */}
          <div className="relative z-10 flex items-center justify-between gap-2 pb-3 mb-3 border-b border-white/[0.08]">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#e50914] via-[#d946ef] to-[#f59e0b] text-white font-black uppercase tracking-wider shadow-[0_0_16px_rgba(229,9,20,0.45)] ${
                isPhoneDevice ? 'text-[11px]' : 'text-[10px]'
              }`}
            >
              <span>🔥 VIP PARTNER SPOTLIGHT • SPECIAL OFFER</span>
            </span>
            <span
              className={`font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/[0.06] text-amber-300 border border-amber-400/25 ${
                isPhoneDevice ? 'text-[10px]' : 'text-[9px]'
              }`}
            >
              SPONSORED SHOWCASE
            </span>
          </div>

          {/* Ad Content Body */}
          {slot === 'home' || slot === 'modal' ? (
            <div className="relative z-10 w-full flex items-center justify-center gap-4 py-1 overflow-hidden">
              {/* Left VIP Flanking Card (Wide Screens on Home Slot) */}
              {slot === 'home' && (
                <div className="hidden xl:flex flex-col justify-center gap-1 flex-1 min-w-[200px] max-w-[280px] h-[96px] px-4 rounded-xl bg-gradient-to-br from-[#e50914]/15 via-[#14111d]/90 to-[#0e0f17] border border-red-500/30 shadow-[0_0_20px_rgba(229,9,20,0.14)]">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>⚡ High-Speed 1080p VIP Partner</span>
                  </div>
                  <p className="text-[11px] font-semibold text-zinc-300 leading-snug">
                    Supporting free 1080p Hindi Dubbed &amp; Fan Dubbed releases on AsiaFlix Prime.
                  </p>
                </div>
              )}

              {/* Centered Scaled 728x90 Leaderboard Banner */}
              <div className="shrink-0 flex items-center justify-center py-1.5 px-2 rounded-xl bg-black/40 border border-white/[0.07] shadow-inner">
                <iframe
                  key={`${slot}-${safeBannerKey}-${safeAdDomain}-${adConfig.customBannerHtml ? 'custom' : 'default'}`}
                  ref={iframeRef}
                  title={`ad-${slot}`}
                  scrolling="no"
                  frameBorder={0}
                  width={728}
                  height={90}
                  className={`mx-auto max-w-full overflow-hidden relative z-10 border-0 bg-transparent block transform origin-center ${
                    slot === 'modal' ? 'scale-100 sm:scale-105' : 'scale-105 sm:scale-110'
                  }`}
                />
              </div>

              {/* Right Pulsing Explore Offer Flanking Card (Wide Screens on Home Slot) */}
              {slot === 'home' && (
                <div className="hidden xl:flex flex-col items-center justify-center gap-1.5 flex-1 min-w-[200px] max-w-[280px] h-[96px] px-4 rounded-xl bg-gradient-to-br from-[#a855f7]/15 via-[#14111d]/90 to-[#f59e0b]/15 border border-amber-400/30 shadow-[0_0_20px_rgba(168,85,247,0.16)] text-center">
                  <span className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#e50914] via-[#ec4899] to-[#f59e0b] text-white text-xs font-black tracking-wide shadow-[0_0_18px_rgba(245,158,11,0.4)] animate-pulse">
                    Explore Offer ↗
                  </span>
                  <span className="text-[11px] font-bold text-zinc-300">
                    Verified Partner Deals • Zero Token
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="relative z-10 w-full flex items-center justify-center overflow-hidden">
              {customNativeUsesDocWrite ? (
                <iframe
                  key={`footer-native-iframe-${safeNativeContainerId}`}
                  ref={nativeIframeRef}
                  title={`ad-${slot}`}
                  scrolling="no"
                  frameBorder={0}
                  className="w-full min-h-[120px] border-0 bg-transparent overflow-hidden relative z-10 block"
                />
              ) : (
                <div
                  ref={nativeContainerRef}
                  className="w-full flex items-center justify-center overflow-x-auto no-scrollbar"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
