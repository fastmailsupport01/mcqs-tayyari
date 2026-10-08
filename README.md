# MCQs Tayyari — PPSC Test Preparation
Free PPSC preparation site: subject-wise MCQs, past papers, and a true
one-paper exam simulator (100 MCQs / 90 min / −0.25 negative marking).
Stack: Static site (HTML/CSS/JS) · Supabase (PostgreSQL for MCQs) ·
GitHub (code) · Render (hosting) — custom domain mcqstayyari.com
attached later in Render Dashboard.
## Setup (one time)
1. Supabase — create a project at supabase.com, then SQL Editor → paste
   supabase/schema.sql → Run. Copy Project URL + anon key from
   Project Settings → API into js/config.js.
2. Add MCQs — Supabase Dashboard → Table Editor → mcqs table
   (or CSV import). Columns: subject_slug, question, option_a…d,
   correct_option (A/B/C/D), explanation.
3. GitHub — push this folder to a repo.
4. Render — New → Static Site → connect the repo. render.yaml
   handles the rest. Every GitHub push auto-redeploys.
5. Domain — Render Dashboard → Custom Domains → add mcqstayyari.com.
## Guest mode
No login anywhere. Practice stats live in the visitor's own browser
(localStorage). Supabase exposes read-only public access via RLS policies.
## AdSense
Ad placeholders are marked ad-slot in the pages. Paste the AdSense code
after approval.
