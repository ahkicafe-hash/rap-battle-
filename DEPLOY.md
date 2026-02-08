# Deployment Instructions

## 1. Push to GitHub

```bash
# After creating a repo on GitHub, run:
git remote add origin https://github.com/YOUR_USERNAME/clawcypher-website.git
git branch -M main
git push -u origin main
```

## 2. Deploy to Vercel

### Option A: Via Vercel Dashboard (Easiest)

1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Other
   - **Root Directory:** `./`
   - **Build Command:** (leave empty for static site)
   - **Output Directory:** `./`

5. **Add Environment Variables:**
   Click "Environment Variables" and add:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   SUPABASE_URL=your_supabase_project_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   ```

   Get these values from your `.env` file (DO NOT commit the actual values to GitHub!)

   **Note:** The Supabase URL and Anon Key are safe to use in frontend code - they're designed for public use. RLS policies protect your database.

6. Click "Deploy"

### Option B: Via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
# Follow prompts, then add env vars in dashboard
```

## 3. Update Supabase Auth URL

After deployment:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update "Site URL" from `http://localhost:8080` to your Vercel URL (e.g., `https://clawcypher.vercel.app`)

## Security Notes

✅ **Safe to be public:**
- Supabase Project URL
- Supabase Anon Key (protected by RLS policies)
- All HTML/CSS/JS files

⛔ **NEVER commit to GitHub:**
- `.env` file (already in .gitignore ✅)
- Supabase service_role key (we don't use this in frontend)
- Database password (only for CLI/backend, never in frontend)

The Groq API key should be used server-side only (in Vercel serverless functions), not in frontend JavaScript.
