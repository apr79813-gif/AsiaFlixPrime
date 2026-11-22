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

    // Detect blocked/empty creative so an empty black box is never left visible
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
      ? 'w-full my-2'
      : 'max-w-[1600px] mx-auto my-4 px-4 sm:px-6 lg:px-8 w-full';

  return (
    <section className={wrapperClass} aria-label={`Sponsored ${slot} slot`}>
      <div className="relative bg-gradient-to-r from-[#0e0f17] via-[#151722] to-[#0e0f17] border border-white/10 rounded-2xl p-3 sm:p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.65)] overflow-hidden">
        {/* Ambient Cyber-Glass Accent Glow */}
        <div className="pointer-events-none absolute -top-12 -left-12 w-36 h-36 rounded-full bg-[#e50914]/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 w-36 h-36 rounded-full bg-amber-500/10 blur-2xl" />

        {/* Subtle Cyber-Glass Header Bar */}
        <div className="relative z-10 flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/[0.06]">
          <span
            className={`font-black uppercase tracking-wider text-amber-300 flex items-center gap-1 ${
              isPhoneDevice ? 'text-[11px]' : 'text-[10px]'
            }`}
          >
            <span>⚡ SPONSORED PARTNER</span>
          </span>
          <span
            className={`font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 border border-white/10 ${
              isPhoneDevice ? 'text-[10px]' : 'text-[9px]'
            }`}
          >
            ADSTERRA VIP
          </span>
        </div>

        {/* Ad Content Body */}
        {slot === 'home' || slot === 'modal' ? (
          <div className="relative z-10 w-full flex items-center justify-center overflow-hidden">
            <iframe
              key={`${slot}-${safeBannerKey}-${safeAdDomain}-${adConfig.customBannerHtml ? 'custom' : 'default'}`}
              ref={iframeRef}
              title={`ad-${slot}`}
              scrolling="no"
              frameBorder={0}
              width={728}
              height={90}
              className="mx-auto max-w-full overflow-hidden relative z-10 border-0 bg-transparent block"
            />
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
    </section>
  );
};
