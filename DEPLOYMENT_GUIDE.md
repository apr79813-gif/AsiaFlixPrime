# AsiaFlix Prime - Complete GitHub, Netlify & Supabase Setup Guide

Yeh complete step-by-step guide hai jisse aap apni nayi modern React + Vite website ko GitHub par upload karke Netlify par live kar sakte hain, aur Supabase database ko 1-click mein configure kar sakte hain.

---

## 🗄️ PART 1: Supabase Database Setup (Sirf 2 Minutes)

Aapke Supabase project mein abhi tables nahi hain, isliye humne ready-made script `supabase-schema.sql` create kar di hai:

1. [Supabase Dashboard](https://supabase.com/dashboard) open karein aur apne project par click karein.
2. Left side menu mein **SQL Editor** (`>_`) icon par click karein.
3. **+ New query** par click karein.
4. Repository ki `supabase-schema.sql` file ka poora code copy karein aur SQL Editor mein paste kar dein.
5. Bottom-right mein green **Run** button click karein.
   * ✅ Yeh automatically `titles`, `audio_versions`, `uploads`, aur `release_notifications` tables create kar dega.
   * ✅ Sare foreign keys, indexes aur security policies (RLS) set ho jayenge.
6. **Data Kaise Fill Karein (1-Click Seeder):**
   * Website open karein -> Footer mein `🛡️ Admin Studio` open karein (ya `Alt+A` dabayein).
   * **Database Sync** tab par jayein.
   * **Sync Master Catalog** button dabayein -> Saare 26+ curated Hindi Dubbed K-Dramas & Movies direct cloud database mein upload ho jayenge!

---

## 🐙 PART 2: Project ko GitHub par Push Karna

Pehle aapke GitHub repo mein sirf simple `index.html` tha. Ab yeh complete modern Vite + React app hai.

### Option A: Terminal / Git CLI Se
Apne local computer folder mein terminal open karein aur yeh commands run karein:

```bash
# 1. Purane files ko update karne ke liye git initialize karein (agar nahi hai)
git init

# 2. Sari nayi files stage karein
git add .

# 3. Commit karein
git commit -m "Upgrade to AsiaFlix Prime React + Vite with Supabase & Google Sheets"

# 4. Apne GitHub repository ka main branch set karein
git branch -M main

# 5. Remote URL add karein (apne repo ka link dalein):
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
# Agar pehle se remote add hai, toh:
# git remote set-url origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git

# 6. GitHub par push karein:
git push -u origin main --force
```

### Option B: GitHub Desktop Se
1. GitHub Desktop open karein aur apna existing repository select karein.
2. Is project ke files ko us folder mein paste kar dein (dhyaan rahe `node_modules` copy na karein, sirf source files).
3. GitHub Desktop automatically sari changes detect kar lega.
4. Summary mein "Upgrade to AsiaFlix Prime React" likh kar **Commit to main** karein aur **Push origin** par click karein.

---

## 🌐 PART 3: Netlify Setup & Automatic Deployment

Humne repository ke andar `netlify.toml` aur `public/_redirects` already create kar diya hai taaki build aur routes 100% fail-proof chalein.

1. [Netlify Dashboard](https://app.netlify.com) par jayein.
2. Agar pehle se site connected hai:
   * **Site configuration** -> **Build & deploy** -> **Continuous Deployment** check karein:
     * **Base directory**: (khali chhod dein ya `/`)
     * **Build command**: `npm run build`
     * **Publish directory**: `dist`
3. **Environment Variables Add Karein:**
   * Netlify mein **Site configuration** -> **Environment variables** par click karein.
   * **Add a variable** click karein aur yeh do variables add karein:
     * Key: `VITE_SUPABASE_URL`
     * Value: `https://wzkipjjgbszldkvwkydv.supabase.co`
     * Key: `VITE_SUPABASE_ANON_KEY`
     * Value: `sb_publishable_JndNcOb-db3xo84Me6FEXA_QqUn2ocY`
4. **Trigger Deploy:**
   * **Deploys** tab mein jakar **Trigger deploy** -> **Deploy site** par click karein.
   * Netlify automatic `npm install` karega, `npm run build` karega aur 1-2 minutes mein aapki site live ho jayegi!

---

## 🔄 PART 4: Google Sheets Aur Supabase Dono Ek Sath Kaise Kaam Karenge?

* **Smart Hybrid Architecture**:
  * Website sabse pehle **Supabase Cloud Database** se latest 1080p links aur titles fetch karti hai.
  * Sath hi sath aapki **Google Sheet CSV** ko bhi fetch karti hai.
  * Agar Supabase mein koi title naya hai toh wo bhi load hota hai, aur agar Google Sheet mein koi title add kiya gaya hai toh wo automatically catalog mein merge ho jata hai.
  * Isse aapka purana Google Sheet workflow bhi chalta rahega aur naya Supabase database bhi!
