-- ==============================================================================
-- AsiaFlix Prime - Complete Supabase PostgreSQL Database Schema
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ==============================================================================

-- 1. Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Clean Reset: Safely remove old/conflicting project tables if they exist
DROP TABLE IF EXISTS uploads CASCADE;
DROP TABLE IF EXISTS audio_versions CASCADE;
DROP TABLE IF EXISTS release_notifications CASCADE;
DROP TABLE IF EXISTS titles CASCADE;

-- ------------------------------------------------------------------------------
-- 3. Create 'titles' table (Dramas & Movies Master Catalog)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS titles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'K-Drama' CHECK (content_type IN ('K-Drama', 'C-Drama', 'Other Drama', 'Movie')),
  release_year INTEGER DEFAULT 2026,
  description TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  status TEXT DEFAULT 'Ongoing' CHECK (status IN ('Ongoing', 'Completed', 'Coming Soon', 'Released')),
  is_featured BOOLEAN DEFAULT FALSE,
  is_trending BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_titles_published ON titles (is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_titles_slug ON titles (slug);

-- ------------------------------------------------------------------------------
-- 4. Create 'audio_versions' table (Hindi Dubbed, Original / Eng Sub, etc.)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audio_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  audio_type TEXT NOT NULL DEFAULT 'Hindi Dubbed',
  language_label TEXT,
  quality_label TEXT DEFAULT '1080p FHD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audio_versions_title_id ON audio_versions (title_id);

-- ------------------------------------------------------------------------------
-- 5. Create 'uploads' table (Telegram Stream & Download Links / Episodes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  audio_version_id UUID REFERENCES audio_versions(id) ON DELETE SET NULL,
  upload_format TEXT DEFAULT 'complete_series' CHECK (upload_format IN ('complete_series', 'single_episode', 'merged_episodes')),
  display_label TEXT,
  telegram_url TEXT NOT NULL,
  episode_number INTEGER,
  episode_start INTEGER,
  episode_end INTEGER,
  sort_order INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploads_title_id ON uploads (title_id);

-- ------------------------------------------------------------------------------
-- 6. Create 'release_notifications' table (Alerts & Announcements)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS release_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id UUID REFERENCES titles(id) ON DELETE SET NULL,
  heading TEXT NOT NULL,
  message TEXT,
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_published ON release_notifications (is_published, created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. Configure Row Level Security (RLS) & Access Policies
-- ------------------------------------------------------------------------------
ALTER TABLE titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE release_notifications ENABLE ROW LEVEL SECURITY;

-- Allow everyone (anon and authenticated users) to read published titles
DROP POLICY IF EXISTS "Public read titles" ON titles;
CREATE POLICY "Public read titles" ON titles
  FOR SELECT USING (is_published = TRUE);

-- Allow Admin & Seeder to insert/update titles
DROP POLICY IF EXISTS "Allow write titles" ON titles;
CREATE POLICY "Allow write titles" ON titles
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Audio versions policies
DROP POLICY IF EXISTS "Public read audio_versions" ON audio_versions;
CREATE POLICY "Public read audio_versions" ON audio_versions
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Allow write audio_versions" ON audio_versions;
CREATE POLICY "Allow write audio_versions" ON audio_versions
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Uploads policies
DROP POLICY IF EXISTS "Public read uploads" ON uploads;
CREATE POLICY "Public read uploads" ON uploads
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Allow write uploads" ON uploads;
CREATE POLICY "Allow write uploads" ON uploads
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Notifications policies
DROP POLICY IF EXISTS "Public read release_notifications" ON release_notifications;
CREATE POLICY "Public read release_notifications" ON release_notifications
  FOR SELECT USING (is_published = TRUE);

DROP POLICY IF EXISTS "Allow write release_notifications" ON release_notifications;
CREATE POLICY "Allow write release_notifications" ON release_notifications
  FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- ------------------------------------------------------------------------------
-- 8. Explicit Role Privileges (CRITICAL: Grants API access to anon and authenticated roles)
-- ------------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.titles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.audio_versions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.uploads TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.release_notifications TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ==============================================================================
-- DONE! Your Supabase database is now 100% ready for AsiaFlix Prime!
-- Next step: Open Admin Studio -> Database Sync -> Click "Sync Master Catalog"
-- ==============================================================================
