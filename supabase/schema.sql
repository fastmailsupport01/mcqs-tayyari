-- MCQs Tayyari — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → paste → Run
create table if not exists subjects (
  slug text primary key,
  name text not null,
  icon text default '📝',
  description text default '',
  display_order int default 0,
  created_at timestamptz default now()
);
create table if not exists mcqs (
  id bigint generated always as identity primary key,
  subject_slug text not null references subjects(slug) on delete cascade,
  paper_id text,
  question text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option char(1) not null check (correct_option in ('A','B','C','D')),
  explanation text default '',
  difficulty text default 'medium' check (difficulty in ('easy','medium','hard')),
  is_active boolean default true,
  updated_at timestamptz default now()
);
create index if not exists mcqs_subject_idx on mcqs(subject_slug);
create index if not exists mcqs_paper_idx on mcqs(paper_id);
create index if not exists mcqs_active_idx on mcqs(is_active);
create table if not exists past_papers (
  paper_id text primary key,
  title text not null,
  exam_body text default 'PPSC',
  year int,
  total_mcqs int default 0,
  created_at timestamptz default now()
);
insert into subjects (slug, name, icon, description, display_order) values
  ('computer-science','Computer Science','💻','Fundamentals, hardware, software and IT concepts.',1),
  ('english','English','🔤','Grammar, vocabulary, synonyms, antonyms, comprehension.',2),
  ('urdu','Urdu','📖','Urdu adab, grammar and classical literature.',3),
  ('islamiyat','Islamiyat','🕌','Seerah, pillars of Islam and Islamic history.',4),
  ('everyday-science','Everyday Science','🔬','Physics, chemistry and biology basics.',5),
  ('pak-study','Pak Study','🇵🇰','History, geography and constitution of Pakistan.',6),
  ('general-knowledge','General Knowledge','🌍','World GK, capitals, organizations, personalities.',7),
  ('current-affairs','Current Affairs','📰','National and international current affairs.',8),
  ('basic-mathematics','Basic Mathematics','➗','Arithmetic, algebra and problem solving for PPSC.',9),
  ('past-papers','Past Papers','📝','Solved PPSC past papers 1–1000, structured mocks.',10)
on conflict (slug) do nothing;
alter table subjects enable row level security;
alter table mcqs enable row level security;
alter table past_papers enable row level security;
drop policy if exists "public read subjects" on subjects;
create policy "public read subjects" on subjects for select using (true);
drop policy if exists "public read mcqs" on mcqs;
create policy "public read mcqs" on mcqs for select using (is_active = true);
drop policy if exists "public read past_papers" on past_papers;
create policy "public read past_papers" on past_papers for select using (true);
