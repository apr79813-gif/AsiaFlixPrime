// AsiaFlix Prime Background Service Worker for Native OS Push Notifications
// Runs even when tabs are minimized or closed.

const LOGO_URL = 'https://raw.githubusercontent.com/apr79813-gif/asiaflix-bot/main/logo.png';
const TARGET_SITE_URL = 'https://asiaflixprime.pages.dev/';

let SUPABASE_URL = 'https://wzkipjjgbszldkvwkydv.supabase.co';
let SUPABASE_ANON_KEY = 'sb_publishable_JndNcOb-db3xo84Me6FEXA_QqUn2ocY';

const DB_NAME = 'asiaflix_sw_notif_db';
const STORE_NAME = 'shown_ids';
const CHECK_INTERVAL_MS = 45000;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

const shownSwNotifIds = new Set();
let dbLoaded = false;
let bgTimerId = null;

function openNotifDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  });
}

async function loadShownIdsFromDB() {
  if (dbLoaded) return;
  try {
    const db = await openNotifDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const keys = req.result || [];
        keys.forEach((k) => shownSwNotifIds.add(String(k)));
        dbLoaded = true;
        resolve();
      };
      req.onerror = () => {
        dbLoaded = true;
        resolve();
      };
    });
  } catch {
    dbLoaded = true;
  }
}

async function persistShownIdsToDB(ids) {
  if (!ids || ids.length === 0) return;
  ids.forEach((id) => shownSwNotifIds.add(String(id)));
  try {
    const db = await openNotifDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const now = Date.now();
      ids.forEach((id) => {
        store.put({ id: String(id), ts: now });
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Fallback to in-memory set only
  }
}

function isInternalRecord(heading) {
  if (!heading) return true;
  const h = String(heading).trim();
  if (h.startsWith('__')) return true;
  const internalTokens = [
    '__CATALOG_SYNC__',
    '__ANALYTICS_EVENT__',
    '__USER_WATCHLIST__',
    '__USER_ACCOUNT__',
    '__ADMIN_NOTICE__',
    '__SYSTEM_SHEET_SNAPSHOT',
  ];
  return internalTokens.some((token) => h.includes(token));
}

async function hasVisibleClientTab() {
  try {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    return clientList.some((client) => client.visibilityState === 'visible');
  } catch {
    return false;
  }
}

async function fetchLatestNotifications() {
  const endpoints = [
    `${SUPABASE_URL}/rest/v1/release_notifications?select=*&is_published=eq.true&order=created_at.desc&limit=5`,
    `${SUPABASE_URL}/rest/v1/notifications?select=*&order=created_at.desc&limit=5`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch {
      // Try fallback endpoint silently
    }
  }
  return [];
}

async function checkSupabaseNotificationsInBackground() {
  await loadShownIdsFromDB();

  // Avoid duplicate alerts when an active foreground tab is already handling live sync & display
  const foregroundActive = await hasVisibleClientTab();
  if (foregroundActive) return;

  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
    return;
  }

  const rows = await fetchLatestNotifications();
  if (!rows || rows.length === 0) return;

  const now = Date.now();
  const newlyShownIds = [];

  for (const row of rows) {
    const id = row.id ? String(row.id) : '';
    const title = row.heading || row.title || '';
    const message = row.message || row.body || 'New update available on AsiaFlix Prime!';
    const posterUrl = row.poster_url || row.posterUrl || undefined;

    if (!id || isInternalRecord(title)) continue;
    if (shownSwNotifIds.has(id)) continue;

    if (row.created_at) {
      const createdMs = new Date(row.created_at).getTime();
      if (!isNaN(createdMs) && now - createdMs > MAX_AGE_MS) {
        newlyShownIds.push(id);
        continue;
      }
    }

    try {
      await self.registration.showNotification(title, {
        body: message,
        icon: posterUrl || LOGO_URL,
        image: posterUrl || undefined,
        badge: LOGO_URL,
        tag: id,
        renotify: true,
        silent: false,
        vibrate: [200, 100, 200],
        data: {
          url: TARGET_SITE_URL,
          notifId: id,
        },
      });
      newlyShownIds.push(id);
    } catch {
      // Ignore individual notification error
    }
  }

  if (newlyShownIds.length > 0) {
    await persistShownIdsToDB(newlyShownIds);
  }
}

function startBackgroundPolling() {
  if (bgTimerId !== null) return;
  bgTimerId = setInterval(() => {
    checkSupabaseNotificationsInBackground();
  }, CHECK_INTERVAL_MS);
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      startBackgroundPolling();
      return loadShownIdsFromDB();
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      try {
        payload = { body: event.data.text() };
      } catch {
        payload = {};
      }
    }
  }

  const title = payload.title || payload.heading || 'AsiaFlix Prime';
  const body = payload.body || payload.message || 'New 1080p FHD episode ready to watch!';
  const posterUrl = payload.icon || payload.posterUrl || payload.poster_url || undefined;
  const tag = payload.tag || payload.id || `asiaflix-push-${Date.now()}`;

  event.waitUntil(
    loadShownIdsFromDB().then(async () => {
      if (shownSwNotifIds.has(String(tag))) return;
      await self.registration.showNotification(title, {
        body,
        icon: posterUrl || LOGO_URL,
        image: posterUrl || undefined,
        badge: LOGO_URL,
        tag: String(tag),
        renotify: true,
        silent: false,
        vibrate: [200, 100, 200],
        data: {
          url: payload.url || TARGET_SITE_URL,
          notifId: String(tag),
        },
      });
      await persistShownIdsToDB([String(tag)]);
    })
  );
});

self.addEventListener('periodicsync', (event) => {
  if (!event.tag || event.tag === 'asiaflix-bg-notifs') {
    event.waitUntil(checkSupabaseNotificationsInBackground());
  }
});

self.addEventListener('sync', (event) => {
  if (!event.tag || event.tag === 'asiaflix-bg-notifs') {
    event.waitUntil(checkSupabaseNotificationsInBackground());
  }
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'CONFIG') {
    if (data.supabaseUrl) SUPABASE_URL = data.supabaseUrl;
    if (data.supabaseKey) SUPABASE_ANON_KEY = data.supabaseKey;
    startBackgroundPolling();
  } else if (data.type === 'MARK_SHOWN' && Array.isArray(data.ids)) {
    event.waitUntil(
      loadShownIdsFromDB().then(() => persistShownIdsToDB(data.ids))
    );
  } else if (data.type === 'CHECK_NOTIFICATIONS') {
    event.waitUntil(checkSupabaseNotificationsInBackground());
  } else if (data.type === 'SHOW_NOTIFICATION' && data.payload) {
    const p = data.payload;
    const tag = String(p.tag || `asiaflix-sw-${Date.now()}`);
    event.waitUntil(
      loadShownIdsFromDB().then(async () => {
        await self.registration.showNotification(p.title || 'AsiaFlix Prime', {
          body: p.body || 'New 1080p episode ready to stream!',
          icon: p.icon || LOGO_URL,
          image: p.image || p.icon || undefined,
          badge: LOGO_URL,
          tag,
          renotify: true,
          silent: false,
          vibrate: [200, 100, 200],
          data: {
            url: p.url || TARGET_SITE_URL,
            notifId: tag,
          },
        });
        await persistShownIdsToDB([tag]);
      })
    );
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || TARGET_SITE_URL;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (
          client.url &&
          (client.url.includes('asiaflixprime.pages.dev') || client.url.startsWith(self.location.origin)) &&
          'focus' in client
        ) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
