import { supabase, ADMIN_EMAIL, ADMIN_EMAILS } from '../lib/supabase';
import { DramaItem, AudioType, DramaCategory, DramaStatus, ReleaseNotification, EpisodeItem, WatchlistEntry } from '../types/drama';

export interface SupabaseTitleRow {
  id: string;
  title: string;
  slug: string;
  content_type: string;
  release_year: number;
  description: string;
  poster_url: string;
  backdrop_url: string;
  status: string;
  is_featured: boolean;
  is_trending: boolean;
  is_published: boolean;
  created_at: string;
}

export interface SupabaseAudioRow {
  id: string;
  title_id: string;
  audio_type: string;
  language_label?: string;
  quality_label?: string;
}

export interface SupabaseUploadRow {
  id: string;
  title_id: string;
  audio_version_id?: string;
  upload_format: string;
  display_label?: string;
  telegram_url: string;
  episode_number?: number;
  episode_start?: number;
  episode_end?: number;
  sort_order: number;
}

// Fetch all published titles with audio versions and uploads
export async function fetchDramasFromSupabase(): Promise<DramaItem[] | null> {
  try {
    const { data: titles, error: titlesError } = await supabase
      .from('titles')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (titlesError || !titles || titles.length === 0) {
      console.warn('Supabase fetch notice: no published titles or error', titlesError);
      return null;
    }

    const titleIds = titles.map((t) => t.id);

    // Fetch audios
    const { data: audioRows } = await supabase
      .from('audio_versions')
      .select('*')
      .in('title_id', titleIds);

    // Fetch uploads
    const { data: uploadRows } = await supabase
      .from('uploads')
      .select('*')
      .in('title_id', titleIds)
      .order('sort_order', { ascending: true });

    const dramas: DramaItem[] = titles.map((t) => {
      const audios = (audioRows || []).filter((a) => a.title_id === t.id);
      const uploads = (uploadRows || []).filter((u) => u.title_id === t.id);

      const availableAudios: AudioType[] = audios.length > 0
        ? (Array.from(new Set(audios.map((a) => (a.audio_type === 'Original' ? 'Original / Eng Sub' : a.audio_type)))) as AudioType[])
        : ['Hindi Dubbed'];

      const episodes: EpisodeItem[] = uploads.map((u, idx) => {
        const foundAudio = audios.find((a) => a.id === u.audio_version_id);
        const mappedAudio = foundAudio 
          ? (foundAudio.audio_type === 'Original' ? 'Original / Eng Sub' : foundAudio.audio_type as AudioType)
          : availableAudios[0] || 'Hindi Dubbed';

        return {
          id: u.id,
          episodeNumber: u.episode_number || (u.upload_format === 'complete_series' ? 'Full Pack' : idx + 1),
          title: u.display_label || `${t.title} ${u.upload_format}`,
          audio: mappedAudio,
          telegramUrl: u.telegram_url,
          duration: u.upload_format === 'complete_series' ? 'Full Binge' : '60m',
          quality: '1080p FHD',
          isMerged: u.upload_format === 'merged_episodes' || u.upload_format === 'complete_series',
          format: (u.upload_format === 'complete_series' ? 'merged' : 'single') as any,
        };
      });

      // Map content_type
      let category: DramaCategory = 'K-Drama';
      if (t.content_type === 'C-Drama') category = 'C-Drama';
      else if (t.content_type === 'Movie') category = 'Asian Movies';
      else if (t.content_type === 'Other Drama') category = 'Hollywood / Bollywood';

      // Map status
      let status: DramaStatus = 'Now Streaming (Ongoing)';
      if (t.status === 'Completed' || t.status === 'Released') status = 'Completed (Full Series)';
      else if (t.status === 'Coming Soon') status = 'Coming Soon';

      const mainTelegram = uploads[0]?.telegram_url || 'https://t.me/+yJH68LvfrT9hZDVl';

      return {
        id: t.slug || t.id,
        title: t.title,
        category,
        releaseYear: t.release_year || 2026,
        status,
        rating: 9.3,
        poster: t.poster_url || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=700',
        backdrop: t.backdrop_url || t.poster_url || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1400',
        synopsis: t.description || 'Watch on AsiaFlix Prime Private Channel in clean 1080p FHD.',
        cast: ['AsiaFlix Exclusive'],
        tags: [category, availableAudios[0] || 'Hindi Dubbed'],
        scheduleInfo: uploads.length > 0 ? `${uploads.length} Uploads` : '1080p FHD Drops',
        availableAudios,
        defaultAudio: availableAudios[0] || 'Hindi Dubbed',
        isFeatured: t.is_featured,
        isTrending: t.is_trending,
        totalEpisodes: uploads.length || 16,
        qualityBadge: '1080p FHD',
        telegramUrl: mainTelegram,
        episodes: episodes.length > 0 ? episodes : [
          {
            id: `ep-${t.id}-1`,
            episodeNumber: 'Full Pack',
            title: `${t.title} 1080p FHD Pack`,
            audio: availableAudios[0] || 'Hindi Dubbed',
            telegramUrl: mainTelegram,
            duration: 'Full Series',
            quality: '1080p FHD',
            isMerged: true,
          },
        ],
      };
    });

    return dramas;
  } catch (err) {
    console.error('Failed to query Supabase database:', err);
    return null;
  }
}

// Fetch published release notifications from Supabase (filtering out hidden system and user rows)
export async function fetchNotificationsFromSupabase(): Promise<ReleaseNotification[] | null> {
  try {
    const { data, error } = await supabase
      .from('release_notifications')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data || data.length === 0) return null;

    // Hide any system snapshot or user account rows
    const publicNotifs = data.filter((n) => !n.heading?.startsWith('__'));

    return publicNotifs.map((n) => ({
      id: n.id,
      title: n.heading,
      message: n.message || '',
      timestamp: new Date(n.created_at || Date.now()).toLocaleDateString(),
      isRead: false,
      type: 'announcement',
    }));
  } catch {
    return null;
  }
}

export const SNAPSHOT_SYSTEM_KEY_V2 = '__SYSTEM_SHEET_SNAPSHOT_V2__';

// Fetch Google Sheet catalog snapshot from Supabase hidden system row
export async function fetchSheetSnapshotFromSupabase(key: string = SNAPSHOT_SYSTEM_KEY_V2): Promise<Record<string, any> | null> {
  try {
    const { data, error } = await supabase
      .from('release_notifications')
      .select('id, heading, message')
      .eq('heading', key)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    const parsed = JSON.parse(data[0].message || '{}');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (err) {
    console.warn('Error reading sheet snapshot from Supabase:', err);
    return null;
  }
}

// Upsert Google Sheet catalog snapshot into Supabase hidden system row
export async function saveSheetSnapshotToSupabase(snapshotObj: Record<string, any>, key: string = SNAPSHOT_SYSTEM_KEY_V2): Promise<boolean> {
  try {
    const messageJson = JSON.stringify(snapshotObj);

    const { data: existing } = await supabase
      .from('release_notifications')
      .select('id')
      .eq('heading', key)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from('release_notifications')
        .update({
          message: messageJson,
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);

      return !error;
    } else {
      const { error } = await supabase
        .from('release_notifications')
        .insert({
          heading: key,
          message: messageJson,
          is_published: true,
          published_at: new Date().toISOString(),
        });

      return !error;
    }
  } catch (err) {
    console.warn('Error saving sheet snapshot to Supabase:', err);
    return false;
  }
}

// Purge old spam notifications and historical completed catalog blasts from Supabase
export async function cleanupOldSpamNotificationsFromSupabase(): Promise<boolean> {
  try {
    const { data: rows, error: fetchErr } = await supabase
      .from('release_notifications')
      .select('id, heading, message')
      .eq('is_published', true);

    if (fetchErr || !rows || rows.length === 0) return true;

    const spamIds: string[] = [];
    const oldYearsPattern = /\((?:201[0-9]|202[0-4])\)/; // (2010)-(2024)

    rows.forEach((r) => {
      if (r.heading?.startsWith('__')) return; // keep system snapshots and accounts
      const msg = r.message || '';
      const heading = r.heading || '';

      const isOldSpamTemplate = 
        msg.includes('Audio Added —') ||
        msg.includes('New Episodes Added (') ||
        msg.includes('New Series/Movie Added (') ||
        msg.includes('Ep Added (') ||
        msg.includes('Episodes Added (');

      // Purge notifications on old catalog titles (2016-2024) unless they explicitly indicate Coming Soon
      const isOldCatalogSpam = oldYearsPattern.test(heading) && !msg.toLowerCase().includes('coming soon');

      if (isOldSpamTemplate || isOldCatalogSpam) {
        spamIds.push(r.id);
      }
    });

    if (spamIds.length > 0) {
      await supabase
        .from('release_notifications')
        .delete()
        .in('id', spamIds);
    }

    return true;
  } catch (err) {
    console.warn('Error cleaning old spam notifications from Supabase:', err);
    return false;
  }
}

// Delete a single notification from Supabase
export async function deleteNotificationFromSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('release_notifications')
      .delete()
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

// Clear all public notifications from Supabase
export async function clearAllNotificationsFromSupabase(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('release_notifications')
      .select('id, heading');
    
    if (error || !data) return false;
    const deleteIds = data.filter((r) => !r.heading?.startsWith('__')).map((r) => r.id);
    if (deleteIds.length > 0) {
      await supabase
        .from('release_notifications')
        .delete()
        .in('id', deleteIds);
    }
    return true;
  } catch {
    return false;
  }
}

// Admin add drama to Supabase
export async function insertDramaIntoSupabase(drama: {
  title: string;
  category: DramaCategory;
  releaseYear: number;
  description: string;
  posterUrl: string;
  backdropUrl?: string;
  status: string;
  audio: AudioType;
  telegramUrl: string;
  uploadFormat?: string;
  episodesCount?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const slug = drama.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    // Map category to schema check constraint ('K-Drama','C-Drama','Other Drama','Movie')
    let contentType = 'K-Drama';
    if (drama.category === 'C-Drama') contentType = 'C-Drama';
    else if (drama.category === 'Asian Movies') contentType = 'Movie';
    else if (drama.category === 'Hollywood / Bollywood') contentType = 'Other Drama';

    // Map status to schema check ('Coming Soon','Ongoing','Completed','Released')
    let status = 'Ongoing';
    if (drama.status.includes('Completed')) status = 'Completed';
    else if (drama.status.includes('Coming')) status = 'Coming Soon';

    // 1. Insert title
    const { data: titleData, error: titleError } = await supabase
      .from('titles')
      .insert({
        title: drama.title,
        slug,
        content_type: contentType,
        release_year: drama.releaseYear,
        description: drama.description,
        poster_url: drama.posterUrl,
        backdrop_url: drama.backdropUrl || drama.posterUrl,
        status,
        is_featured: false,
        is_trending: true,
        is_published: true,
      })
      .select()
      .single();

    if (titleError) {
      return { success: false, error: titleError.message };
    }

    // 2. Insert audio version
    const { data: audioData, error: audioError } = await supabase
      .from('audio_versions')
      .insert({
        title_id: titleData.id,
        audio_type: drama.audio,
        language_label: drama.audio,
        quality_label: '1080p FHD',
      })
      .select()
      .single();

    if (audioError) {
      console.warn('Audio version insert error:', audioError);
    }

    // 3. Insert upload
    const { error: uploadError } = await supabase
      .from('uploads')
      .insert({
        title_id: titleData.id,
        audio_version_id: audioData ? audioData.id : null,
        upload_format: drama.uploadFormat || 'complete_series',
        display_label: `${drama.title} FHD Pack`,
        telegram_url: drama.telegramUrl,
        sort_order: 1,
      });

    if (uploadError) {
      console.warn('Upload row insert error:', uploadError);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error' };
  }
}

// Admin add notification into Supabase
export async function insertNotificationIntoSupabase(
  heading: string,
  message: string,
  titleId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('release_notifications')
      .insert({
        title_id: titleId || null,
        heading,
        message,
        is_published: true,
        published_at: new Date().toISOString(),
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Database error' };
  }
}

export interface CloudUserData {
  email: string;
  password?: string;
  watchlist: WatchlistEntry[];
  watchedEpisodesMap: Record<string, (number | string)[]>;
}

// 100% persistent Cloud Account & Watchlist Sync stored in Supabase release_notifications
export async function syncUserAccountWithSupabase(
  email: string,
  password?: string,
  mode: 'login' | 'signup' | 'fetch' = 'login',
  currentLocalWatchlist: WatchlistEntry[] = [],
  currentLocalWatchedEpisodes: Record<string, (number | string)[]> = {}
): Promise<{
  success: boolean;
  user?: { id: string; email: string };
  watchlist?: WatchlistEntry[];
  watchedEpisodesMap?: Record<string, (number | string)[]>;
  error?: string;
}> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    const headingKey = `__USER_ACCOUNT__:${normalizedEmail}`;

    const { data: rows, error: selectError } = await supabase
      .from('release_notifications')
      .select('id, heading, message')
      .eq('heading', headingKey)
      .limit(1);

    if (selectError) {
      console.warn('Account lookup notice:', selectError);
    }

    const existingRow = rows && rows.length > 0 ? rows[0] : null;

    if (mode === 'signup') {
      if (!password || password.length < 4) {
        return { success: false, error: 'Password must be at least 4 characters' };
      }

      if (existingRow) {
        // If account already exists and password matches, log the user in seamlessly!
        try {
          const accountData: CloudUserData = JSON.parse(existingRow.message || '{}');
          if (accountData.password === password) {
            return {
              success: true,
              user: { id: normalizedEmail, email: normalizedEmail },
              watchlist: accountData.watchlist || currentLocalWatchlist,
              watchedEpisodesMap: accountData.watchedEpisodesMap || currentLocalWatchedEpisodes,
            };
          } else {
            return {
              success: false,
              error: 'An account with this email already exists. Please switch to Sign In with your password.',
            };
          }
        } catch {}
      }

      // Create new account row with current local watchlist & episodes
      const newAccountData: CloudUserData = {
        email: normalizedEmail,
        password,
        watchlist: currentLocalWatchlist,
        watchedEpisodesMap: currentLocalWatchedEpisodes,
      };

      if (existingRow) {
        await supabase
          .from('release_notifications')
          .update({
            message: JSON.stringify(newAccountData),
            is_published: true,
            published_at: new Date().toISOString(),
          })
          .eq('id', existingRow.id);
      } else {
        await supabase
          .from('release_notifications')
          .insert({
            heading: headingKey,
            message: JSON.stringify(newAccountData),
            is_published: true,
            published_at: new Date().toISOString(),
          });
      }

      return {
        success: true,
        user: { id: normalizedEmail, email: normalizedEmail },
        watchlist: newAccountData.watchlist,
        watchedEpisodesMap: newAccountData.watchedEpisodesMap,
      };
    }

    if (mode === 'login') {
      if (!existingRow) {
        return {
          success: false,
          error: 'Account not found — click Sign Up to create your free account.',
        };
      }

      try {
        const accountData: CloudUserData = JSON.parse(existingRow.message || '{}');
        if (accountData.password && password && accountData.password !== password) {
          return { success: false, error: 'Incorrect password. Please try again.' };
        }

        return {
          success: true,
          user: { id: normalizedEmail, email: normalizedEmail },
          watchlist: accountData.watchlist || [],
          watchedEpisodesMap: accountData.watchedEpisodesMap || {},
        };
      } catch {
        return { success: false, error: 'Failed to read account data' };
      }
    }

    // mode === 'fetch' (silent session restoration on page load)
    if (mode === 'fetch') {
      if (!existingRow) {
        return {
          success: true,
          user: { id: normalizedEmail, email: normalizedEmail },
          watchlist: [],
          watchedEpisodesMap: {},
        };
      }

      try {
        const accountData: CloudUserData = JSON.parse(existingRow.message || '{}');
        return {
          success: true,
          user: { id: normalizedEmail, email: normalizedEmail },
          watchlist: accountData.watchlist || [],
          watchedEpisodesMap: accountData.watchedEpisodesMap || {},
        };
      } catch {
        return {
          success: true,
          user: { id: normalizedEmail, email: normalizedEmail },
          watchlist: [],
          watchedEpisodesMap: {},
        };
      }
    }

    return { success: false, error: 'Invalid mode' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Cloud account sync failed' };
  }
}

// Save updated user watchlist and watched episodes to Supabase
export async function saveUserWatchlistToSupabase(
  email: string,
  watchlist: WatchlistEntry[],
  watchedEpisodesMap: Record<string, (number | string)[]>
): Promise<boolean> {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return false;
    const headingKey = `__USER_ACCOUNT__:${normalizedEmail}`;

    const { data: rows } = await supabase
      .from('release_notifications')
      .select('id, message')
      .eq('heading', headingKey)
      .limit(1);

    if (rows && rows.length > 0) {
      let existingData: CloudUserData = { email: normalizedEmail, watchlist: [], watchedEpisodesMap: {} };
      try {
        existingData = JSON.parse(rows[0].message || '{}');
      } catch {}

      existingData.watchlist = watchlist;
      existingData.watchedEpisodesMap = watchedEpisodesMap;

      const { error } = await supabase
        .from('release_notifications')
        .update({
          message: JSON.stringify(existingData),
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .eq('id', rows[0].id);

      return !error;
    } else {
      const accountData: CloudUserData = {
        email: normalizedEmail,
        watchlist,
        watchedEpisodesMap,
      };

      const { error } = await supabase
        .from('release_notifications')
        .insert({
          heading: headingKey,
          message: JSON.stringify(accountData),
          is_published: true,
          published_at: new Date().toISOString(),
        });

      return !error;
    }
  } catch (err) {
    console.warn('Error saving user watchlist to Supabase:', err);
    return false;
  }
}

// Supabase Email & Password Login for Admin or User
export async function loginWithSupabaseAuth(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { user: null, error: error.message };

    const userEmail = data.user?.email?.toLowerCase();
    const isAdmin = Boolean(userEmail && ADMIN_EMAILS.some((e) => e.toLowerCase() === userEmail));
    return { user: data.user, isAdmin, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Authentication failed' };
  }
}

// User Sign Up
export async function signUpWithSupabaseAuth(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    if (error) return { user: null, error: error.message };
    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: err?.message || 'Sign up failed' };
  }
}

// User Sign Out
export async function signOutFromSupabase() {
  try {
    await supabase.auth.signOut();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// Get current Supabase user session
export async function getActiveSupabaseUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user || null;
  } catch {
    return null;
  }
}

// Fetch Supabase Table Counts and Connectivity Stats
export async function fetchSupabaseStats(): Promise<{
  connected: boolean;
  titlesCount: number;
  audiosCount: number;
  uploadsCount: number;
  notificationsCount: number;
  error?: string;
}> {
  try {
    const [titlesRes, audiosRes, uploadsRes, notifsRes] = await Promise.all([
      supabase.from('titles').select('*', { count: 'exact', head: true }),
      supabase.from('audio_versions').select('*', { count: 'exact', head: true }),
      supabase.from('uploads').select('*', { count: 'exact', head: true }),
      supabase.from('release_notifications').select('*', { count: 'exact', head: true }),
    ]);

    const hasError = titlesRes.error && titlesRes.error.code !== 'PGRST116';
    if (hasError) {
      return {
        connected: false,
        titlesCount: 0,
        audiosCount: 0,
        uploadsCount: 0,
        notificationsCount: 0,
        error: titlesRes.error?.message,
      };
    }

    return {
      connected: true,
      titlesCount: titlesRes.count || 0,
      audiosCount: audiosRes.count || 0,
      uploadsCount: uploadsRes.count || 0,
      notificationsCount: notifsRes.count || 0,
    };
  } catch (err: any) {
    return {
      connected: false,
      titlesCount: 0,
      audiosCount: 0,
      uploadsCount: 0,
      notificationsCount: 0,
      error: err?.message,
    };
  }
}

// 1-Click Seeder: Push initial Asian drama catalog into Supabase tables
export async function seedCatalogToSupabase(
  dramas: DramaItem[],
  onProgress?: (current: number, total: number, name: string) => void
): Promise<{ seeded: number; errors: number; lastError?: string }> {
  let seeded = 0;
  let errors = 0;
  let lastError: string | undefined = undefined;

  for (let i = 0; i < dramas.length; i++) {
    const d = dramas[i];
    if (onProgress) onProgress(i + 1, dramas.length, d.title);

    try {
      const slug = d.id || d.title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      let contentType = 'K-Drama';
      if (d.category === 'C-Drama') contentType = 'C-Drama';
      else if (d.category === 'Asian Movies') contentType = 'Movie';
      else if (d.category === 'Hollywood / Bollywood') contentType = 'Other Drama';

      let status = 'Ongoing';
      if (d.status.includes('Completed')) status = 'Completed';
      else if (d.status.includes('Coming')) status = 'Coming Soon';

      // 1. Insert title
      const { data: titleData, error: tErr } = await supabase
        .from('titles')
        .upsert(
          {
            title: d.title,
            slug,
            content_type: contentType,
            release_year: d.releaseYear,
            description: d.synopsis || `${d.title} in clean 1080p FHD.`,
            poster_url: d.poster,
            backdrop_url: d.backdrop,
            status,
            is_featured: !!d.isFeatured,
            is_trending: !!d.isTrending,
            is_published: true,
          },
          { onConflict: 'slug' }
        )
        .select()
        .single();

      if (tErr || !titleData) {
        errors++;
        lastError = tErr ? tErr.message : 'Unknown database error';
        console.error('Supabase title insert error:', tErr);
        continue;
      }

      // 2. Insert audio versions
      const audiosToInsert = d.availableAudios && d.availableAudios.length > 0 
        ? d.availableAudios 
        : [d.defaultAudio || 'Hindi Dubbed'];

      for (const aud of audiosToInsert) {
        const { data: audioData, error: aErr } = await supabase
          .from('audio_versions')
          .insert({
            title_id: titleData.id,
            audio_type: aud,
            language_label: aud,
            quality_label: d.qualityBadge || '1080p FHD',
          })
          .select()
          .single();

        if (aErr) {
          console.warn('Audio insert error:', aErr);
        }

        // 3. Insert upload row
        await supabase
          .from('uploads')
          .insert({
            title_id: titleData.id,
            audio_version_id: audioData ? audioData.id : null,
            upload_format: d.episodes.length > 1 ? 'single_episode' : 'complete_series',
            display_label: `${d.title} (${aud})`,
            telegram_url: d.telegramUrl || 'https://t.me/+yJH68LvfrT9hZDVl',
            sort_order: 1,
          });
      }

      seeded++;
    } catch (err: any) {
      errors++;
      lastError = err?.message || 'Exception during seeding';
    }
  }

  return { seeded, errors, lastError };
}

