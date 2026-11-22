import React, { useEffect, useMemo, useRef } from 'react';
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
  const nativeContainerRef = useRef<HTMLDivElement>(null);

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

  const leaderboardSrcDoc = useMemo(() => {
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

  const customNativeSrcDoc = useMemo(() => {
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

  useEffect(() => {
    if (!isSlotVisible || slot !== 'footer' || customNativeUsesDocWrite) return;
    const host = nativeContainerRef.current;
    if (!host) return;

    host.replaceChildren();

    const customNative = adConfig?.customNativeHtml?.trim();
    if (customNative) {
      try {
        const range = document.createRange();
        range.selectNode(host);
        const fragment = range.createContextualFragment(customNative);
        host.appendChild(fragment);
      } catch {
        // Ignore malformed custom HTML quietly
      }
    } else {
      const adScript = document.createElement('script');
      adScript.async = true;
      adScript.setAttribute('data-cfasync', 'false');
      adScript.src = safeNativeScriptSrc;

      const containerDiv = document.createElement('div');
      containerDiv.id = safeNativeContainerId;

      host.appendChild(adScript);
      host.appendChild(containerDiv);
    }

    return () => {
      if (nativeContainerRef.current) {
        nativeContainerRef.current.replaceChildren();
      }
    };
  }, [
    isSlotVisible,
    slot,
    adConfig?.customNativeHtml,
    customNativeUsesDocWrite,
    safeNativeScriptSrc,
    safeNativeContainerId,
  ]);

  if (!isSlotVisible) return null;

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
              title={`AsiaFlix Sponsored Leaderboard (${slot})`}
              srcDoc={leaderboardSrcDoc}
              width={728}
              height={95}
              scrolling="no"
              frameBorder={0}
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
              className="mx-auto max-w-full overflow-hidden border-0 bg-transparent block"
            />
          </div>
        ) : (
          <div className="relative z-10 w-full min-h-[110px] flex items-center justify-center overflow-hidden">
            {customNativeUsesDocWrite ? (
              <iframe
                key={`footer-native-iframe-${safeNativeContainerId}`}
                title="AsiaFlix Sponsored Native Banner"
                srcDoc={customNativeSrcDoc}
                scrolling="no"
                frameBorder={0}
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-top-navigation-by-user-activation"
                className="w-full min-h-[140px] border-0 bg-transparent overflow-hidden block"
              />
            ) : (
              <div
                ref={nativeContainerRef}
                className="w-full flex items-center justify-center min-h-[110px] overflow-x-auto no-scrollbar"
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
};
